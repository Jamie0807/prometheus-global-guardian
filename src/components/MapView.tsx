import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { Tile3DLayer } from "@deck.gl/geo-layers";
import { CesiumIonLoader } from "@loaders.gl/3d-tiles";
import type { Hazard, MapViewProps } from "../types";
import { fetchHazardsActive } from "../api/disasteraware";
import { config } from "../config";
import { HAZARD_COLORS, defaultColor } from "../config/hazardColors";

const MapView: React.FC<MapViewProps> = ({
  filter,
  mapStyle,
  onDataUpdate
}) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [disasters, setDisasters] = useState<Hazard[]>([]);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const showHeatmapRef = useRef(false);
  const deckOverlay = useRef<MapboxOverlay | null>(null);
  const isFirstMapStyle = useRef(true); // mapStyle effect 首次执行跳过，避免与 load 事件重复初始化
  // LOD 阈值：zoom < CLUSTER_MAX 使用聚合图层，zoom >= BUILDINGS_MIN 启用 3D 建筑
  const LOD_THRESHOLDS = { CLUSTER_MAX: 8, BUILDINGS_MIN: 14 };

  useEffect(() => {
    if (map.current) return;
    mapboxgl.accessToken = config.mapbox.token;
    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: `mapbox://styles/mapbox/${mapStyle}`,
      projection: "globe",
      center: [0, 20],
      zoom: 1.5
    });

    map.current.on("load", () => {
      map.current?.setFog({
        color: "rgb(186, 210, 235)",
        "high-color": "rgb(36, 92, 223)",
        "horizon-blend": 0.02,
        "space-color": "rgb(11, 11, 25)",
        "star-intensity": 0.6
      });
      fetchDisasters();
      initializeHeatmapLayer();
      initializeLODLayers();
      initialize3DBuildings();
      // 注册 zoom 事件，实现基于视距的 LOD 动态切换
      map.current?.on('zoom', () => {
        if (map.current) applyLOD(map.current.getZoom());
      });
      applyLOD(1.5);
    });

    // 初始化 deck.gl overlay（仅在配置了外部 3D Tiles URL 时）
    if (config.tiles3d.enabled) {
      deckOverlay.current = new MapboxOverlay({ layers: [] });
      map.current.addControl(deckOverlay.current as any);
    }

    return () => {
      if (deckOverlay.current) {
        map.current?.removeControl(deckOverlay.current as any);
        deckOverlay.current = null;
      }
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (map.current && disasters.length > 0) {
      addMarkersToMap(
        filter === "ALL" ? disasters : disasters.filter(d => d.type === filter)
      );
    }
  }, [filter, disasters, mapStyle]);

  // 当 mapStyle 改变时更新地图样式，并重新初始化所有自定义图层
  useEffect(() => {
    // 首次渲染时 map 已由 load 事件初始化，跳过避免重复初始化导致图层冲突
    if (isFirstMapStyle.current) {
      isFirstMapStyle.current = false;
      return;
    }
    if (map.current && mapStyle) {
      map.current.setStyle(`mapbox://styles/mapbox/${mapStyle}`);
      map.current.once("styledata", () => {
        // style 切换后所有自定义图层被清除，需要重新初始化
        initializeHeatmapLayer();
        initializeLODLayers();
        initialize3DBuildings();
        const filtered = filter === "ALL" ? disasters : disasters.filter(d => d.type === filter);
        addMarkersToMap(filtered);
        if (disasters.length > 0) {
          updateHeatmapData(disasters);
          updateLODSource(disasters);
        }
        applyLOD(map.current!.getZoom());
      });
    }
  }, [mapStyle]);

  const fetchDisasterAwareHazards = async (): Promise<Hazard[]> => {
    try {
      const data = await fetchHazardsActive(
        filter === "ALL" ? "EVENT" : filter
      );
      return data.map((hazard: any) => ({
        id: hazard.hazard_ID || `da-${Date.now()}`,
        title: hazard.hazard_Name || "Unknown Hazard",
        type: hazard.type_ID || "UNKNOWN",
        geometry:
          hazard.latitude && hazard.longitude
            ? {
                type: "Point",
                coordinates: [hazard.longitude, hazard.latitude]
              }
            : { type: "Point", coordinates: [0, 0] },
        description:
          hazard.description ||
          hazard.hazard_Name ||
          "No description available",
        source: hazard.creator || "DisasterAware",
        severity: hazard.severity_ID,
        timestamp: hazard.create_Date
      }));
    } catch (error) {
      console.warn("DisasterAware API failed", error);
      return [];
    }
  };

  const fetchDisasters = async () => {
    try {
      // Prefer using the DisasterAware API; if it fails, fall back to other data sources.
      const res = await fetchDisasterAwareHazards();
      if (res.length > 0) {
        setDisasters(res);
        onDataUpdate(res);
      } else {
        const [usgs, nasa, gdacs] = await Promise.allSettled([
          fetchUSGSEarthquakes(),
          fetchNASAEONET(),
          fetchGDACS()
        ]);

        const all: Hazard[] = [];
        [usgs, nasa, gdacs].forEach(res => {
          if (res.status === "fulfilled" && res.value.length > 0)
            all.push(...res.value);
        });
        setDisasters(all);
        onDataUpdate(all);
      }
    } catch (err) {
      console.error("Error loading disasters:", err);
    }
  };

  // Fetch from USGS Earthquake API
  async function fetchUSGSEarthquakes(): Promise<Hazard[]> {
    try {
      const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson');
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.features
        .map((feature: any) => ({
          id: feature.id,
          title: feature.properties.title || feature.properties.place,
          type: 'EARTHQUAKE',
          severity: feature.properties.mag >= 6.0 ? 'WARNING' as const : 
                  feature.properties.mag >= 5.0 ? 'WATCH' as const : 'ADVISORY' as const,
          description: `Magnitude ${feature.properties.mag} earthquake - ${feature.properties.place}`,
          geometry: feature.geometry,
          magnitude: feature.properties.mag,
          time: new Date(feature.properties.time).toISOString(),
          source: 'USGS'
        }));
    } catch (error) {
      console.error('USGS fetch error:', error);
      return [];
    }
  }

  // Fetch from NASA EONET
  async function fetchNASAEONET(): Promise<Hazard[]> {
    try {
      const response = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=300');
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.events
        .map((event: any) => {
          const category = event.categories[0]?.title || 'UNKNOWN';
          const hazardType = mapNASACategoryToType(category);
          
          const geom = event.geometry[event.geometry.length - 1];
          
          return {
            id: event.id,
            title: event.title,
            type: hazardType,
            severity: 'ADVISORY' as const,
            description: `${category} - ${event.title}`,
            geometry: {
              type: geom.type,
              coordinates: geom.coordinates
            },
            time: geom.date,
            source: 'NASA EONET'
          };
        });
    } catch (error) {
      console.error('NASA EONET fetch error:', error);
      return [];
    }
  }

  // Fetch from GDACS
  async function fetchGDACS(): Promise<Hazard[]> {
    try {
      const response = await fetch('https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH');
      if (!response.ok) return [];
      
      const geojson = await response.json();
      const features = geojson.features || [];
      const results: Hazard[] = [];

      features.forEach((feature: any) => {
        const { geometry, properties } = feature;
        if (!geometry?.coordinates) return;
        
        const title = properties.name || properties.eventname || 'Unknown Event';
        const description = properties.description || properties.htmldescription || '';
        const hazardType = detectHazardTypeFromTitle(title.concat(' ', description, ' ', properties.severitydata.severitytext || ''));
        const severity =
          properties.alertlevel === 'Red' ? 'WARNING' :
          properties.alertlevel === 'Orange' ? 'WATCH' :
          'ADVISORY';

        results.push({
          id: `gdacs-${properties.eventid || Date.now()}`,
          title,
          type: hazardType,
          severity,
          description,
          geometry,
          source: 'GDACS',
          url: properties.url?.report || undefined
        });
      });

      return results;
    } catch (error) {
      console.error('GDACS fetch error:', error);
      return [];
    }
  }


  const mapNASACategoryToType = (category: string): string => {
    if (category.includes("Wildfires")) return "WILDFIRE";
    if (category.includes("Volcanoes")) return "VOLCANO";
    if (category.includes("Floods")) return "FLOOD";
    if (category.includes("Severe Storms")) return "STORM";
    if (category.includes("Drought")) return "DROUGHT";
    if (category.includes("Landslides")) return "LANDSLIDE";
    return "UNKNOWN";
  };

  const detectHazardTypeFromTitle = (title: string): string => {
    const t = title.toLowerCase();
    if (t.includes("earthquake")) return "EARTHQUAKE";
    if (t.includes("flood")) return "FLOOD";
    if (
      t.includes("cyclone") ||
      t.includes("hurricane") ||
      t.includes("typhoon")
    )
      return "TROPICAL_CYCLONE";
    if (t.includes("volcano")) return "VOLCANO";
    if (t.includes("drought")) return "DROUGHT";
    if (t.includes("tsunami")) return "TSUNAMI";
    if (t.includes("storm")) return "STORM";
    return "UNKNOWN";
  };
  // LOD：基于聚合的中远景图层（zoom < CLUSTER_MAX）
  const initializeLODLayers = () => {
    if (!map.current) return;
    // 防御性检查：避免 style 切换后重复添加
    if (map.current.getSource('hazards-lod')) return;
    map.current.addSource('hazards-lod', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: true,
      clusterMaxZoom: LOD_THRESHOLDS.CLUSTER_MAX,
      clusterRadius: 50
    });
    // 聚合气泡圆
    map.current.addLayer({
      id: 'lod-clusters',
      type: 'circle',
      source: 'hazards-lod',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': ['step', ['get', 'point_count'], '#3b82f6', 20, '#f59e0b', 50, '#ef4444'],
        'circle-radius': ['step', ['get', 'point_count'], 18, 20, 28, 50, 38],
        'circle-stroke-width': 2,
        'circle-stroke-color': 'rgba(255,255,255,0.8)',
        'circle-opacity': 0.85
      }
    });
    // 聚合数量标签
    map.current.addLayer({
      id: 'lod-cluster-count',
      type: 'symbol',
      source: 'hazards-lod',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12
      },
      paint: { 'text-color': '#fff' }
    });
    // 未聚合的散点（中等缩放级别的单点）
    map.current.addLayer({
      id: 'lod-unclustered',
      type: 'circle',
      source: 'hazards-lod',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['coalesce', ['get', 'color'], '#888888'],
        'circle-radius': 6,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
        'circle-opacity': 0.9
      }
    });
    ['lod-clusters', 'lod-cluster-count', 'lod-unclustered'].forEach(id => {
      map.current!.setLayoutProperty(id, 'visibility', 'none');
    });
  };

  // 3D 建筑模型：方案二
  // 配置了 VITE_3D_TILES_URL 时，使用 deck.gl Tile3DLayer 加载标准 3D Tiles（支持 Cesium ion / Google / 自建）
  // 未配置时自动回退到 fill-extrusion
  const initialize3DBuildings = () => {
    if (!map.current) return;

    if (config.tiles3d.enabled && config.tiles3d.url) {
      // deck.gl Tile3DLayer 支持标准 3D Tiles tileset.json
      // 支持 Cesium ion Bearer token 认证
      const loadOptions: Record<string, any> = {};
      if (config.tiles3d.cesiumIonToken) {
        loadOptions['cesium-ion'] = { accessToken: config.tiles3d.cesiumIonToken };
      }

      const tile3DLayer = new Tile3DLayer({
        id: 'deck-3d-tiles',
        data: config.tiles3d.url,
        // 使用 loaders 数组传入 CesiumIonLoader 支持 Cesium ion 认证格式
        loaders: [CesiumIonLoader],
        loadOptions,
        opacity: 0.9,
        onTilesetLoad: (tileset: any) => {
          console.info('[deck.gl 3D Tiles] tileset 加载成功，建筑数量:', tileset.gpuMemoryUsageInBytes);
        },
        onTileLoad: () => {
          // 瓦片加载后刷新 overlay
          if (deckOverlay.current) {
            deckOverlay.current.setProps({ layers: [tile3DLayer] });
          }
        },
      });

      if (deckOverlay.current) {
        deckOverlay.current.setProps({ layers: [tile3DLayer] });
        console.info('[deck.gl 3D Tiles] Tile3DLayer 已挂载到 Mapbox overlay');
      }
    } else {
      // 回退模式：fill-extrusion（无需外部数据源）
      if (map.current.getLayer('3d-buildings')) return;
      try {
        map.current.addLayer(
          {
            id: '3d-buildings',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: LOD_THRESHOLDS.BUILDINGS_MIN,
            paint: {
              'fill-extrusion-color': '#aab5c0',
              'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14, 0, 14.5, ['get', 'height']],
              'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 14, 0, 14.5, ['get', 'min_height']],
              'fill-extrusion-opacity': 0.65
            }
          },
          'waterway-label'
        );
        map.current.setLayoutProperty('3d-buildings', 'visibility', 'none');
        console.info('[3D Buildings] 回退到 fill-extrusion 模式');
      } catch (e) {
        console.warn('[3D Buildings] fill-extrusion 加载失败（样式不支持）:', e);
      }
    }
  };

  // 更新 LOD GeoJSON 数据源
  const updateLODSource = (hazards: Hazard[]) => {
    if (!map.current || !map.current.getSource('hazards-lod')) return;
    const features = hazards
      .filter(h => h.geometry?.coordinates)
      .map(h => ({
        type: 'Feature' as const,
        properties: {
          id: h.id,
          title: h.title,
          type: h.type,
          severity: h.severity,
          color: HAZARD_COLORS[h.type] || defaultColor
        },
        geometry: {
          type: 'Point' as const,
          coordinates: h.geometry.coordinates as [number, number]
        }
      }));
    (map.current.getSource('hazards-lod') as mapboxgl.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features
    });
  };

  // 根据当前 zoom 动态切换渲染层级（LOD 调度核心）
  const applyLOD = (zoom: number) => {
    if (!map.current) return;
    const isHeatmapMode = showHeatmapRef.current;
    // 动态查找实际存在的建筑图层（model 加载失败时回退到 fill-extrusion）
    const buildingLayerId = map.current.getLayer('city-3d-model')
      ? 'city-3d-model'
      : map.current.getLayer('3d-buildings')
        ? '3d-buildings'
        : null;
    if (buildingLayerId) {
      map.current.setLayoutProperty(
        buildingLayerId, 'visibility',
        !isHeatmapMode && zoom >= LOD_THRESHOLDS.BUILDINGS_MIN ? 'visible' : 'none'
      );
    }
    if (isHeatmapMode) return;
    const useCluster = zoom < LOD_THRESHOLDS.CLUSTER_MAX;
    ['lod-clusters', 'lod-cluster-count', 'lod-unclustered'].forEach(id => {
      if (map.current!.getLayer(id)) {
        map.current!.setLayoutProperty(id, 'visibility', useCluster ? 'visible' : 'none');
      }
    });
    markers.current.forEach(marker => {
      marker.getElement().style.display = useCluster ? 'none' : 'block';
    });
  };

  const initializeHeatmapLayer = () => {
    if (!map.current) return;
    // 防御性检查：避免重复添加
    if (map.current.getSource('hazards-heat')) return;
    
    // Add heatmap source
    map.current.addSource('hazards-heat', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });

    // Add heatmap layer
    map.current.addLayer({
      id: 'hazards-heatmap',
      type: 'heatmap',
      source: 'hazards-heat',
      maxzoom: 15,
      paint: {
        // Increase the heatmap weight based on severity
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'magnitude'],
          0, 0,
          6, 1
        ],
        // Increase the heatmap color intensity by zoom level
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 1,
          15, 3
        ],
        // Color ramp for heatmap
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(33,102,172,0)',
          0.2, 'rgb(103,169,207)',
          0.4, 'rgb(209,229,240)',
          0.6, 'rgb(253,219,199)',
          0.8, 'rgb(239,138,98)',
          1, 'rgb(178,24,43)'
        ],
        // Adjust the heatmap radius by zoom level
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 2,
          15, 20
        ],
        // Transition from heatmap to circle layer by zoom level
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7, 1,
          15, 0
        ]
      }
    }, 'waterway-label');

    map.current.setLayoutProperty('hazards-heatmap', 'visibility', 'none');
  };

  const updateHeatmapData = (hazards: Hazard[]) => {
    if (!map.current || !map.current.getSource('hazards-heat')) return;

    const features = hazards
      .filter(h => h.geometry?.coordinates)
      .map(h => ({
        type: 'Feature' as const,
        properties: {
          magnitude: h.magnitude || 3,
          type: h.type
        },
        geometry: {
          type: 'Point' as const,
          coordinates: h.geometry.coordinates
        }
      }));

    const source = map.current.getSource('hazards-heat') as mapboxgl.GeoJSONSource;
    source.setData({
      type: 'FeatureCollection',
      features
    });
  };

  const toggleHeatmap = () => {
    if (!map.current) return;
    const newVisibility = !showHeatmap;
    showHeatmapRef.current = newVisibility;
    setShowHeatmap(newVisibility);

    map.current.setLayoutProperty(
      'hazards-heatmap',
      'visibility',
      newVisibility ? 'visible' : 'none'
    );

    if (newVisibility) {
      // 进入热力图模式：隐藏 LOD 聚合图层和 Marker
      ['lod-clusters', 'lod-cluster-count', 'lod-unclustered'].forEach(id => {
        if (map.current!.getLayer(id)) {
          map.current!.setLayoutProperty(id, 'visibility', 'none');
        }
      });
      markers.current.forEach(marker => {
        marker.getElement().style.display = 'none';
      });
    } else {
      // 退出热力图模式：交由 LOD 恢复对应层级渲染
      applyLOD(map.current.getZoom());
    }
  };

  useEffect(() => {
    if (map.current && disasters.length > 0) {
      updateHeatmapData(disasters);
      updateLODSource(disasters);
    }
  }, [disasters]);

  const addMarkersToMap = (hazards: any[]) => {
    markers.current.forEach(m => m.remove());
    markers.current = [];
    hazards.forEach(h => {
      const coords = h.geometry?.coordinates;
      if (!coords) return;
      const color = HAZARD_COLORS[h.type] || defaultColor;
      const el = document.createElement("div");
      el.className = "disaster-marker";
      el.style.width = "18px";
      el.style.height = "18px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = color;
      el.style.border = "2px solid white";
      // 使用 ref 避免 stale closure 问题
      el.style.display = showHeatmapRef.current ? 'none' : 'block';
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div class="popup-title">${h.title}</div>
        <div class="popup-info">
            <strong>Type:</strong> ${h.type.replace(/_/g, " ")}<br>
            <strong>Severity:</strong> ${h.severity}<br>
            <strong>Description:</strong> ${h.description}<br>
            <strong>Platform:</strong> Prometheus Global Guardian
        </div>
      `);
      const marker = new mapboxgl.Marker(el)
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(map.current!);
      markers.current.push(marker);
    });
    // 添加完所有 Marker 后，依据当前 zoom 应用 LOD 可见性
    if (map.current) applyLOD(map.current.getZoom());
  };

  return (
    <>
      <div ref={mapContainer} style={{ width: "100vw", height: "100vh" }} />
      <div className="heatmap-toggle">
        <button
          onClick={toggleHeatmap}
          className={`toggle-button ${showHeatmap ? 'active' : ''}`}
          title={showHeatmap ? 'Show Markers' : 'Show Heatmap'}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
          </svg>
          <span>{showHeatmap ? 'Markers' : 'Heatmap'}</span>
        </button>
      </div>
    </>
  );
};

export default MapView;
