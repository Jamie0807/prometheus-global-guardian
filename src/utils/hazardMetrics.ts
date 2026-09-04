interface HazardIntensityInput {
  magnitude?: unknown;
  geometry?: {
    magnitudeValue?: unknown;
    magnitude?: unknown;
  };
  properties?: {
    magnitude?: unknown;
    magnitudeValue?: unknown;
    mag?: unknown;
  };
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function getHazardIntensity(hazard: HazardIntensityInput): number | null {
  const candidates = [
    hazard.magnitude,
    hazard.geometry?.magnitudeValue,
    hazard.geometry?.magnitude,
    hazard.properties?.magnitude,
    hazard.properties?.magnitudeValue,
    hazard.properties?.mag,
  ];

  for (const candidate of candidates) {
    const value = toFiniteNumber(candidate);
    if (value !== null) {
      return value;
    }
  }

  return null;
}
