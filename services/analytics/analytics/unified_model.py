#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
统一数据模型 - 基于Pandas建立的标准化灾害数据模型
实现多数据源的统一Schema转换
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any
from datetime import datetime
import logging


class UnifiedHazardModel:
    """统一灾害数据模型 - 标准化DataFrame Schema"""
    
    # 定义统一的数据模型Schema
    SCHEMA = {
        'id': 'string',
        'type': 'category',          # 灾害类型：earthquake, wildfire, flood等
        'source': 'category',         # 数据源：USGS, NASA, GDACS
        'timestamp': 'datetime64[ns]',
        'latitude': 'float64',
        'longitude': 'float64',
        'magnitude': 'float64',       # 震级/强度
        'severity': 'category',       # 严重程度：low, medium, high, critical
        'title': 'string',
        'description': 'string',
        'populationExposed': 'float64',
        'confidence': 'float64'       # 数据置信度 0-1
    }
    
    # 严重程度阈值定义
    SEVERITY_THRESHOLDS = {
        'earthquake': {'low': 3.0, 'medium': 5.0, 'high': 6.5, 'critical': 7.5},
        'wildfire': {'low': 100, 'medium': 1000, 'high': 5000, 'critical': 10000},
        'flood': {'low': 0, 'medium': 0, 'high': 0, 'critical': 0},
        'default': {'low': 0, 'medium': 0, 'high': 0, 'critical': 0}
    }
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def create_empty_dataframe(self) -> pd.DataFrame:
        """创建具有统一字段和非字符串列类型的空 DataFrame。"""
        df = pd.DataFrame(columns=list(self.SCHEMA.keys()))
        # 应用数据类型
        for col, dtype in self.SCHEMA.items():
            if dtype == 'category':
                df[col] = pd.Categorical(df[col])
            elif dtype != 'string':  # string类型默认即可
                df[col] = df[col].astype(dtype)
        return df
    
    def calculate_severity(self, hazard_type: str, magnitude: float) -> str:
        """根据灾害类型和震级计算严重程度"""
        thresholds = self.SEVERITY_THRESHOLDS.get(hazard_type, self.SEVERITY_THRESHOLDS['default'])
        
        if magnitude >= thresholds['critical']:
            return 'critical'
        elif magnitude >= thresholds['high']:
            return 'high'
        elif magnitude >= thresholds['medium']:
            return 'medium'
        else:
            return 'low'
    
    def transform_usgs_to_unified(self, usgs_data: List[Dict]) -> pd.DataFrame:
        """
        转换USGS地震数据到统一模型
        
        USGS数据格式示例:
        {
            "id": "us7000m9ux",
            "properties": {
                "mag": 5.8,
                "place": "California",
                "time": 1701234567890,
                "title": "M 5.8 - California"
            },
            "geometry": {
                "coordinates": [-118.123, 34.567, 10.0]
            }
        }
        """
        if not usgs_data:
            return self.create_empty_dataframe()
        
        transformed = []
        for item in usgs_data:
            try:
                properties = item.get('properties', {})
                geometry = item.get('geometry', {})
                coords = geometry.get('coordinates', [0, 0, 0])
                
                magnitude = float(properties.get('mag', 0))
                
                record = {
                    'id': item.get('id', ''),
                    'type': 'earthquake',
                    'source': 'USGS',
                    'timestamp': pd.to_datetime(properties.get('time', 0), unit='ms', utc=True),
                    'latitude': float(coords[1]) if len(coords) > 1 else 0.0,
                    'longitude': float(coords[0]) if len(coords) > 0 else 0.0,
                    'magnitude': magnitude,
                    'severity': self.calculate_severity('earthquake', magnitude),
                    'title': properties.get('title', ''),
                    'description': properties.get('place', ''),
                    'populationExposed': 0.0,  # USGS不提供此数据
                    'confidence': 0.95  # USGS数据高可信度
                }
                transformed.append(record)
            except Exception as e:
                self.logger.warning(f"Failed to transform USGS record: {e}")
                continue
        
        if not transformed:
            return self.create_empty_dataframe()
        
        df = pd.DataFrame(transformed)
        return self._apply_schema(df)
    
    def transform_nasa_to_unified(self, nasa_data: List[Dict]) -> pd.DataFrame:
        """
        转换NASA EONET数据到统一模型
        
        NASA数据格式示例:
        {
            "id": "EONET_12345",
            "title": "Wildfire - California",
            "categories": [{"title": "wildfires"}],
            "geometry": [
                {
                    "date": "2024-01-15T00:00:00Z",
                    "coordinates": [-118.123, 34.567]
                }
            ]
        }
        """
        if not nasa_data:
            return self.create_empty_dataframe()
        
        transformed = []
        for event in nasa_data:
            try:
                # 获取分类
                categories = event.get('categories', [])
                event_type = categories[0].get('title', 'unknown').lower() if categories else 'unknown'
                
                # 映射NASA类型到标准类型
                type_mapping = {
                    'wildfires': 'wildfire',
                    'severe storms': 'storm',
                    'floods': 'flood',
                    'volcanoes': 'volcano'
                }
                hazard_type = type_mapping.get(event_type, event_type)
                
                # 获取最新几何位置
                geometries = event.get('geometry', [])
                if not geometries:
                    continue
                
                latest_geo = geometries[-1]
                coords = latest_geo.get('coordinates', [0, 0])
                
                # NASA 记录未提供 magnitude，使用固定代理值。
                estimated_magnitude = 500.0
                
                record = {
                    'id': event.get('id', ''),
                    'type': hazard_type,
                    'source': 'NASA',
                    'timestamp': pd.to_datetime(latest_geo.get('date', datetime.now().isoformat()), utc=True),
                    'latitude': float(coords[1]) if len(coords) > 1 else 0.0,
                    'longitude': float(coords[0]) if len(coords) > 0 else 0.0,
                    'magnitude': estimated_magnitude,
                    'severity': self.calculate_severity(hazard_type, estimated_magnitude),
                    'title': event.get('title', ''),
                    'description': event.get('description', ''),
                    'populationExposed': 0.0,
                    'confidence': 0.85  # NASA数据较高可信度
                }
                transformed.append(record)
            except Exception as e:
                self.logger.warning(f"Failed to transform NASA record: {e}")
                continue
        
        if not transformed:
            return self.create_empty_dataframe()
        
        df = pd.DataFrame(transformed)
        return self._apply_schema(df)
    
    def transform_gdacs_to_unified(self, gdacs_data: List[Dict]) -> pd.DataFrame:
        """
        转换GDACS全球灾害数据到统一模型
        
        GDACS数据格式示例:
        {
            "id": "gdacs_123",
            "eventtype": "EQ",
            "alertlevel": "Orange",
            "name": "Earthquake M6.5",
            "fromdate": "2024-01-15T12:00:00",
            "latitude": 34.567,
            "longitude": -118.123,
            "severitydata": {
                "magnitude": 6.5
            },
            "population": {
                "value": 1000000
            }
        }
        """
        if not gdacs_data:
            return self.create_empty_dataframe()
        
        transformed = []
        for item in gdacs_data:
            try:
                # 映射GDACS事件类型
                event_type_mapping = {
                    'EQ': 'earthquake',
                    'FL': 'flood',
                    'TC': 'cyclone',
                    'VO': 'volcano',
                    'WF': 'wildfire'
                }
                
                event_type = item.get('eventtype', 'unknown')
                hazard_type = event_type_mapping.get(event_type, 'unknown')
                
                severity_data = item.get('severitydata', {})
                magnitude = float(severity_data.get('magnitude', 0))
                
                population = item.get('population', {})
                pop_exposed = float(population.get('value', 0))
                
                # 将 GDACS 警报级别映射到置信度
                alert_levels = {'Red': 0.95, 'Orange': 0.85, 'Green': 0.70}
                alert_level = item.get('alertlevel', 'Green')
                confidence = alert_levels.get(alert_level, 0.75)
                
                record = {
                    'id': str(item.get('id', '')),
                    'type': hazard_type,
                    'source': 'GDACS',
                    'timestamp': pd.to_datetime(item.get('fromdate', datetime.now().isoformat()), utc=True),
                    'latitude': float(item.get('latitude', 0)),
                    'longitude': float(item.get('longitude', 0)),
                    'magnitude': magnitude,
                    'severity': self.calculate_severity(hazard_type, magnitude),
                    'title': item.get('name', ''),
                    'description': item.get('description', ''),
                    'populationExposed': pop_exposed,
                    'confidence': confidence
                }
                transformed.append(record)
            except Exception as e:
                self.logger.warning(f"Failed to transform GDACS record: {e}")
                continue
        
        if not transformed:
            return self.create_empty_dataframe()
        
        df = pd.DataFrame(transformed)
        return self._apply_schema(df)
    
    def _apply_schema(self, df: pd.DataFrame) -> pd.DataFrame:
        """补齐统一字段并尝试转换为配置的数据类型。"""
        for col, dtype in self.SCHEMA.items():
            if col not in df.columns:
                # 添加缺失列
                if dtype == 'category':
                    df[col] = pd.Categorical([])
                elif dtype == 'datetime64[ns]':
                    df[col] = pd.NaT
                elif dtype == 'float64':
                    df[col] = np.nan
                else:
                    df[col] = ''
            else:
                # 转换数据类型
                try:
                    if dtype == 'category':
                        df[col] = df[col].astype('category')
                    elif dtype != 'string':
                        df[col] = df[col].astype(dtype)
                except Exception as e:
                    self.logger.warning(f"Failed to convert column {col} to {dtype}: {e}")
        
        # 确保列顺序一致
        df = df[list(self.SCHEMA.keys())]
        return df
    
    def merge_sources(self, *dataframes: pd.DataFrame) -> pd.DataFrame:
        """合并多个数据源，去重并排序"""
        if not dataframes:
            return self.create_empty_dataframe()
        
        # 过滤空DataFrame
        valid_dfs = [df for df in dataframes if not df.empty]
        if not valid_dfs:
            return self.create_empty_dataframe()
        
        # 合并所有数据源
        merged = pd.concat(valid_dfs, ignore_index=True)
        
        # 去重（基于id和timestamp）
        merged = merged.drop_duplicates(subset=['id', 'timestamp'], keep='first')
        
        # 按时间戳降序排序
        merged = merged.sort_values('timestamp', ascending=False)
        
        # 重置索引
        merged = merged.reset_index(drop=True)
        
        return merged
