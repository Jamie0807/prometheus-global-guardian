import type { HazardLayerId } from "./hazard-event.js";

export interface HazardLayerDefinition {
  readonly layerId: HazardLayerId;
  readonly typeIds: readonly string[];
  readonly category: "geological" | "hydrological" | "meteorological" | "environmental";
  readonly label: string;
}

export const HAZARD_LAYER_REGISTRY: readonly HazardLayerDefinition[] = [
  {
    layerId: "earthquake",
    typeIds: ["EARTHQUAKE"],
    category: "geological",
    label: "Earthquake",
  },
  {
    layerId: "volcanic",
    typeIds: ["VOLCANO"],
    category: "geological",
    label: "Volcanic",
  },
  {
    layerId: "hydrological",
    typeIds: ["FLOOD", "TSUNAMI"],
    category: "hydrological",
    label: "Hydrological",
  },
  {
    layerId: "meteorological",
    typeIds: [
      "STORM",
      "TROPICAL_CYCLONE",
      "CYCLONE",
      "TORNADO",
      "WINTERSTORM",
      "EXTREMETEMPERATURE",
    ],
    category: "meteorological",
    label: "Meteorological",
  },
  {
    layerId: "fire",
    typeIds: ["WILDFIRE"],
    category: "environmental",
    label: "Fire",
  },
  {
    layerId: "land",
    typeIds: ["LANDSLIDE"],
    category: "environmental",
    label: "Land",
  },
  {
    layerId: "drought",
    typeIds: ["DROUGHT"],
    category: "environmental",
    label: "Drought",
  },
  {
    layerId: "unknown",
    typeIds: [],
    category: "environmental",
    label: "Unknown",
  },
];

export function resolveHazardLayerId(type: string): HazardLayerId {
  const normalizedType = type.trim().toUpperCase();

  for (const definition of HAZARD_LAYER_REGISTRY) {
    if (definition.typeIds.includes(normalizedType)) {
      return definition.layerId;
    }
  }

  return "unknown";
}
