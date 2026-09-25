"""编排综合数据分析、缓存和运行指标。"""

import asyncio
import hashlib
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from typing import Any

import numpy as np

from analytics.etl_processor import ETLProcessor
from analytics.prediction_models import PredictionEngine
from analytics.risk_assessment import RiskAssessor
from analytics.statistical_algorithms import StatisticalAnalyzer
from app.schemas.requests import AnalysisRequest
from app.schemas.responses import AnalysisResponse


CACHE_TTL = 300
CACHE_MAX_SIZE = 100


class AnalyticsService:
    def __init__(self) -> None:
        self.cache: dict[str, dict[str, Any]] = {}
        self.metrics_data = {
            "total_requests": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "avg_processing_time": 0,
        }
        self.statistical_analyzer = StatisticalAnalyzer()
        self.prediction_engine = PredictionEngine()
        self.etl_processor = ETLProcessor()
        self.risk_assessor = RiskAssessor()

    def cache_key(self, request: AnalysisRequest) -> str:
        serialized = json.dumps(
            request.model_dump(mode="json"),
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=True,
        )
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    def _get_cached_analysis(self, key: str) -> AnalysisResponse | None:
        cache_entry = self.cache.get(key)
        if cache_entry is None:
            return None
        if datetime.now() - cache_entry["timestamp"] >= timedelta(seconds=CACHE_TTL):
            del self.cache[key]
            return None
        return cache_entry["data"]

    def _save_cached_analysis(self, key: str, response: AnalysisResponse) -> None:
        if len(self.cache) >= CACHE_MAX_SIZE:
            oldest_key = min(
                self.cache,
                key=lambda cache_key: self.cache[cache_key]["timestamp"],
            )
            del self.cache[oldest_key]
        self.cache[key] = {"data": response, "timestamp": datetime.now()}

    def run_comprehensive_analysis(self, request: AnalysisRequest) -> dict[str, Any]:
        dataframe = self.etl_processor.convert_to_dataframe(
            [hazard.model_dump() for hazard in request.hazards]
        )
        with ThreadPoolExecutor(max_workers=3) as executor:
            statistical_task = executor.submit(
                self.statistical_analyzer.run_comprehensive_analysis, dataframe
            )
            prediction_task = executor.submit(
                self.prediction_engine.generate_predictions, dataframe
            )
            risk_task = executor.submit(
                self.risk_assessor.calculate_comprehensive_risk, dataframe
            )
            statistical_results = statistical_task.result()
            prediction_results = prediction_task.result()
            risk_results = risk_task.result()
        return {
            "statistics": statistical_results,
            "predictions": prediction_results,
            "riskAssessment": risk_results,
            "dataQuality": self.etl_processor.assess_data_quality(dataframe),
            "processingInfo": {
                "totalRecords": len(dataframe),
                "timeRange": request.timeRange,
                "analysisType": request.analysisType,
            },
        }

    def run_statistics(self, request: AnalysisRequest) -> dict[str, Any]:
        dataframe = self.etl_processor.convert_to_dataframe(
            [hazard.model_dump() for hazard in request.hazards]
        )
        return self.statistical_analyzer.run_comprehensive_analysis(dataframe)

    def run_predictions(self, request: AnalysisRequest) -> dict[str, Any]:
        dataframe = self.etl_processor.convert_to_dataframe(
            [hazard.model_dump() for hazard in request.hazards]
        )
        return self.prediction_engine.generate_predictions(dataframe)

    def run_etl(self, request: AnalysisRequest) -> dict[str, Any]:
        dataframe = self.etl_processor.convert_to_dataframe(
            [hazard.model_dump() for hazard in request.hazards]
        )
        processed_data = self.etl_processor.process_data(dataframe)
        quality_metrics = self.etl_processor.assess_data_quality(processed_data)
        processed_data_clean = processed_data.replace({np.nan: None})
        return {
            "processedData": processed_data_clean.to_dict("records"),
            "qualityMetrics": quality_metrics,
            "recordsProcessed": len(processed_data),
        }

    def run_risk_assessment(self, request: AnalysisRequest) -> dict[str, Any]:
        dataframe = self.etl_processor.convert_to_dataframe(
            [hazard.model_dump() for hazard in request.hazards]
        )
        return self.risk_assessor.calculate_comprehensive_risk(dataframe)

    async def comprehensive_analysis(self, request: AnalysisRequest) -> AnalysisResponse:
        started_at = datetime.now()
        self.metrics_data["total_requests"] += 1
        key = self.cache_key(request)
        cached_response = self._get_cached_analysis(key)
        if cached_response is not None:
            self.metrics_data["cache_hits"] += 1
            return cached_response
        self.metrics_data["cache_misses"] += 1
        analysis_data = await asyncio.to_thread(self.run_comprehensive_analysis, request)
        processing_time = (datetime.now() - started_at).total_seconds()
        processing_time_ms = processing_time * 1000
        self.metrics_data["avg_processing_time"] = (
            self.metrics_data["avg_processing_time"]
            * (self.metrics_data["total_requests"] - 1)
            + processing_time_ms
        ) / self.metrics_data["total_requests"]
        analysis_data["performance"] = {
            "processingTimeMs": round(processing_time_ms, 2),
            "recordsProcessed": analysis_data["processingInfo"]["totalRecords"],
            "parallelExecution": True,
            "cacheEnabled": True,
        }
        response = AnalysisResponse(
            success=True,
            data=analysis_data,
            processingTime=processing_time,
            timestamp=datetime.now().isoformat(),
        )
        self._save_cached_analysis(key, response)
        return response

    async def statistics(self, request: AnalysisRequest) -> dict[str, Any]:
        return await asyncio.to_thread(self.run_statistics, request)

    async def predictions(self, request: AnalysisRequest) -> dict[str, Any]:
        return await asyncio.to_thread(self.run_predictions, request)

    async def etl(self, request: AnalysisRequest) -> dict[str, Any]:
        return await asyncio.to_thread(self.run_etl, request)

    async def risk_assessment(self, request: AnalysisRequest) -> dict[str, Any]:
        return await asyncio.to_thread(self.run_risk_assessment, request)

    def metrics(self) -> dict[str, Any]:
        cache_hit_rate = (
            self.metrics_data["cache_hits"]
            / max(1, self.metrics_data["cache_hits"] + self.metrics_data["cache_misses"])
        ) * 100
        return {
            "totalRequests": self.metrics_data["total_requests"],
            "cacheHits": self.metrics_data["cache_hits"],
            "cacheMisses": self.metrics_data["cache_misses"],
            "cacheHitRate": f"{cache_hit_rate:.1f}%",
            "cacheSize": len(self.cache),
            "avgProcessingTime": f"{self.metrics_data['avg_processing_time']:.2f}ms",
            "timestamp": datetime.now().isoformat(),
        }

    def clear_cache(self) -> None:
        self.cache.clear()
