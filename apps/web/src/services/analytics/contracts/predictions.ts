/**
 * 定义分析服务的预测数据契约与解析逻辑。
 */
import {
  AnalyticsContractError,
  parseFiniteNumber,
  parseNumberMap,
  parseRecord,
  parseString,
} from "./common";

export type PredictionStatus = "ready" | "insufficient_data" | "failed";

interface PredictionModelBase {
  reason: string;
  dataPoints: number;
  minimumDataPoints: number;
}

export interface ReadyPredictionModelResult extends PredictionModelBase {
  status: "ready";
  confidence: number;
  accuracy: number;
  predictions: { next7Days: number[]; confidenceInterval?: Record<string, number> };
}

export interface UnavailablePredictionModelResult extends PredictionModelBase {
  status: "insufficient_data" | "failed";
  confidence: null;
}

export type PredictionModelResult = ReadyPredictionModelResult | UnavailablePredictionModelResult;

interface OverallPredictionBase {
  reason: string;
  riskLevel: string;
  modelWeights: Record<string, number>;
  recommendation: string;
}

export interface ReadyOverallPredictionAssessment extends OverallPredictionBase {
  status: "ready";
  overallRiskScore: number;
  averageAccuracy: number;
  confidence: number;
}

export interface InsufficientOverallPredictionAssessment extends OverallPredictionBase {
  status: "insufficient_data";
  overallRiskScore: number;
  averageAccuracy: null;
  confidence: null;
}

export interface FailedOverallPredictionAssessment extends OverallPredictionBase {
  status: "failed";
  overallRiskScore: null;
  riskLevel: "UNKNOWN";
  averageAccuracy: null;
  confidence: null;
}

export type OverallPredictionAssessment =
  | ReadyOverallPredictionAssessment
  | InsufficientOverallPredictionAssessment
  | FailedOverallPredictionAssessment;

export interface PredictionsData {
  earthquakePrediction: PredictionModelResult;
  volcanoPrediction: PredictionModelResult;
  stormPrediction: PredictionModelResult;
  floodPrediction: PredictionModelResult;
  wildfirePrediction: PredictionModelResult;
  overallRiskAssessment: OverallPredictionAssessment;
}

function parsePredictionStatus(value: unknown, path: string): PredictionStatus {
  const status = parseString(value, path);
  if (status === "ready" || status === "insufficient_data" || status === "failed") {
    return status;
  }
  throw new AnalyticsContractError(path);
}

function integer(value: unknown, path: string, min = 0): number {
  const parsed = parseFiniteNumber(value, path);
  if (!Number.isInteger(parsed) || parsed < min) throw new AnalyticsContractError(path);
  return parsed;
}

function bounded(value: unknown, path: string, max: number): number {
  const parsed = parseFiniteNumber(value, path);
  if (parsed < 0 || parsed > max) throw new AnalyticsContractError(path);
  return parsed;
}

function parsePredictionsArray(
  value: unknown,
  path: string,
): ReadyPredictionModelResult["predictions"] {
  const record = parseRecord(value, path);
  if (!Array.isArray(record.next7Days)) {
    throw new AnalyticsContractError(`${path}.next7Days`);
  }
  const predictions: ReadyPredictionModelResult["predictions"] = {
    next7Days: record.next7Days.map((item, index) =>
      parseFiniteNumber(item, `${path}.next7Days.${index}`),
    ),
  };
  if ("confidenceInterval" in record) {
    predictions.confidenceInterval = parseNumberMap(
      record.confidenceInterval,
      `${path}.confidenceInterval`,
    );
  }
  return predictions;
}

function parseModel(value: unknown, path: string): PredictionModelResult {
  const record = parseRecord(value, path);
  const status = parsePredictionStatus(record.status, `${path}.status`);
  const reason = parseString(record.reason, `${path}.reason`);
  const dataPoints = integer(record.dataPoints, `${path}.dataPoints`);
  const minimumDataPoints = integer(record.minimumDataPoints, `${path}.minimumDataPoints`, 1);

  if (status === "ready") {
    const confidence = bounded(record.confidence, `${path}.confidence`, 1);
    const accuracy = bounded(record.accuracy, `${path}.accuracy`, 100);
    if (dataPoints < minimumDataPoints) {
      throw new AnalyticsContractError(`${path}.dataPoints`);
    }
    return {
      status,
      reason,
      dataPoints,
      minimumDataPoints,
      confidence,
      accuracy,
      predictions: parsePredictionsArray(record.predictions, `${path}.predictions`),
    };
  }

  if (record.confidence !== null) {
    throw new AnalyticsContractError(`${path}.confidence`);
  }
  if ("accuracy" in record) {
    throw new AnalyticsContractError(`${path}.accuracy`);
  }
  if ("predictions" in record) {
    throw new AnalyticsContractError(`${path}.predictions`);
  }
  return { status, reason, dataPoints, minimumDataPoints, confidence: null };
}

function parseOverall(value: unknown, path: string): OverallPredictionAssessment {
  const record = parseRecord(value, path);
  const status = parsePredictionStatus(record.status, `${path}.status`);
  const reason = parseString(record.reason, `${path}.reason`);
  const modelWeights = parseNumberMap(record.modelWeights, `${path}.modelWeights`);
  const recommendation = parseString(record.recommendation, `${path}.recommendation`);

  if (status === "failed") {
    if (record.overallRiskScore !== null) {
      throw new AnalyticsContractError(`${path}.overallRiskScore`);
    }
    if (record.riskLevel !== "UNKNOWN") {
      throw new AnalyticsContractError(`${path}.riskLevel`);
    }
    if (record.averageAccuracy !== null) {
      throw new AnalyticsContractError(`${path}.averageAccuracy`);
    }
    if (record.confidence !== null) {
      throw new AnalyticsContractError(`${path}.confidence`);
    }
    if (Object.keys(modelWeights).length !== 0) {
      throw new AnalyticsContractError(`${path}.modelWeights`);
    }
    if (recommendation !== "") {
      throw new AnalyticsContractError(`${path}.recommendation`);
    }
    return {
      status,
      reason,
      overallRiskScore: null,
      riskLevel: "UNKNOWN",
      averageAccuracy: null,
      confidence: null,
      modelWeights,
      recommendation,
    };
  }

  if (status === "ready") {
    const overallRiskScore = bounded(record.overallRiskScore, `${path}.overallRiskScore`, 100);
    const riskLevel = parseString(record.riskLevel, `${path}.riskLevel`);
    const averageAccuracy = bounded(record.averageAccuracy, `${path}.averageAccuracy`, 100);
    const confidence = bounded(record.confidence, `${path}.confidence`, 1);
    return {
      status,
      reason,
      overallRiskScore,
      riskLevel,
      averageAccuracy,
      confidence,
      modelWeights,
      recommendation,
    };
  }
  const overallRiskScore = bounded(record.overallRiskScore, `${path}.overallRiskScore`, 100);
  const riskLevel = parseString(record.riskLevel, `${path}.riskLevel`);
  if (record.averageAccuracy !== null) {
    throw new AnalyticsContractError(`${path}.averageAccuracy`);
  }
  if (record.confidence !== null) {
    throw new AnalyticsContractError(`${path}.confidence`);
  }
  return {
    status,
    reason,
    overallRiskScore,
    riskLevel,
    averageAccuracy: null,
    confidence: null,
    modelWeights,
    recommendation,
  };
}

export function parsePredictions(value: unknown): PredictionsData {
  const record = parseRecord(value, "data");
  return {
    earthquakePrediction: parseModel(record.earthquakePrediction, "data.earthquakePrediction"),
    volcanoPrediction: parseModel(record.volcanoPrediction, "data.volcanoPrediction"),
    stormPrediction: parseModel(record.stormPrediction, "data.stormPrediction"),
    floodPrediction: parseModel(record.floodPrediction, "data.floodPrediction"),
    wildfirePrediction: parseModel(record.wildfirePrediction, "data.wildfirePrediction"),
    overallRiskAssessment: parseOverall(record.overallRiskAssessment, "data.overallRiskAssessment"),
  };
}
