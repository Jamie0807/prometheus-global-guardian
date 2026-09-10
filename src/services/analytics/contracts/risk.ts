import {
  AnalyticsContractError,
  parseFiniteNumber,
  parseOptionalFiniteNumber,
  parseRecord,
  parseString,
  parseStringArray,
} from "./common";

export interface RiskAssessmentData {
  overallRiskScore: { score: number; level: string };
  typeRisks: Record<string, { count: number; riskScore: number; averageMagnitude: number | null }>;
  geographicRisks: Array<{
    location: { lat: number; lon: number };
    hazardCount: number;
    riskLevel: string;
  }>;
  temporalRisks: TemporalRisks;
  recommendations: string[];
  recommendationDetails: Array<{
    ruleId: string;
    severity: string;
    message: string;
    metrics: Record<string, string | number | boolean | null>;
  }>;
}

export interface TemporalRiskData {
  recent7Days: number;
  previous7Days: number;
  growthRate: number;
  trend: "increasing" | "decreasing" | "stable";
}

export type TemporalRisks = TemporalRiskData | null;
const integer = (v: unknown, p: string) => {
  const n = parseFiniteNumber(v, p);
  if (!Number.isInteger(n) || n < 0) throw new AnalyticsContractError(p);
  return n;
};
const score = (v: unknown, p: string) => {
  const n = parseFiniteNumber(v, p);
  if (n < 0 || n > 100) throw new AnalyticsContractError(p);
  return n;
};
function temporalRisks(value: unknown, path: string): TemporalRisks {
  const record = parseRecord(value, path);
  if (Object.keys(record).length === 0) return null;
  const trend = parseString(record.trend, `${path}.trend`);
  if (trend !== "increasing" && trend !== "decreasing" && trend !== "stable") {
    throw new AnalyticsContractError(`${path}.trend`);
  }
  return {
    recent7Days: integer(record.recent7Days, `${path}.recent7Days`),
    previous7Days: integer(record.previous7Days, `${path}.previous7Days`),
    growthRate: parseFiniteNumber(record.growthRate, `${path}.growthRate`),
    trend,
  };
}
function metrics(value: unknown, path: string): Record<string, string | number | boolean | null> {
  const r = parseRecord(value, path);
  return Object.fromEntries(
    Object.entries(r).map(([k, v]) => {
      if (v === null || typeof v === "string" || typeof v === "boolean") return [k, v];
      if (typeof v === "number" && Number.isFinite(v)) return [k, v];
      throw new AnalyticsContractError(`${path}.[key]`);
    }),
  );
}
export function parseRiskAssessment(value: unknown): RiskAssessmentData {
  const r = parseRecord(value, "data");
  const overall = parseRecord(r.overallRiskScore, "data.overallRiskScore");
  const types = parseRecord(r.typeRisks, "data.typeRisks");
  const geo = r.geographicRisks;
  if (!Array.isArray(geo)) throw new AnalyticsContractError("data.geographicRisks");
  return {
    overallRiskScore: {
      score: score(overall.score, "data.overallRiskScore.score"),
      level: parseString(overall.level, "data.overallRiskScore.level"),
    },
    typeRisks: Object.fromEntries(
      Object.entries(types).map(([k, v]) => {
        const typePath = "data.typeRisks.[key]";
        const t = parseRecord(v, typePath);
        return [
          k,
          {
            count: integer(t.count, `${typePath}.count`),
            riskScore: score(t.riskScore, `${typePath}.riskScore`),
            averageMagnitude:
              parseOptionalFiniteNumber(t.averageMagnitude, `${typePath}.averageMagnitude`) ?? null,
          },
        ];
      }),
    ),
    geographicRisks: geo.map((v, i) => {
      const g = parseRecord(v, `data.geographicRisks.${i}`);
      const loc = parseRecord(g.location, `data.geographicRisks.${i}.location`);
      return {
        location: {
          lat: parseFiniteNumber(loc.lat, `data.geographicRisks.${i}.location.lat`),
          lon: parseFiniteNumber(loc.lon, `data.geographicRisks.${i}.location.lon`),
        },
        hazardCount: integer(g.hazardCount, `data.geographicRisks.${i}.hazardCount`),
        riskLevel: parseString(g.riskLevel, `data.geographicRisks.${i}.riskLevel`),
      };
    }),
    temporalRisks: temporalRisks(r.temporalRisks, "data.temporalRisks"),
    recommendations: parseStringArray(r.recommendations, "data.recommendations"),
    recommendationDetails: (Array.isArray(r.recommendationDetails)
      ? r.recommendationDetails
      : (() => {
          throw new AnalyticsContractError("data.recommendationDetails");
        })()
    ).map((v, i) => {
      const d = parseRecord(v, `data.recommendationDetails.${i}`);
      return {
        ruleId: parseString(d.ruleId, `data.recommendationDetails.${i}.ruleId`),
        severity: parseString(d.severity, `data.recommendationDetails.${i}.severity`),
        message: parseString(d.message, `data.recommendationDetails.${i}.message`),
        metrics: metrics(d.metrics, `data.recommendationDetails.${i}.metrics`),
      };
    }),
  };
}
