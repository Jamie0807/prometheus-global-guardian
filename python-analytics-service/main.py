#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Prometheus Global Guardian - Python Analytics Service
高性能数据分析微服务，替代TypeScript统计算法实现

优化特性：
- 请求级缓存机制
- 并发处理支持
- 批量数据优化
- 性能监控
"""

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Annotated, List, Dict, Any, Literal, Optional, Tuple
import math
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
import hashlib
import json
import uuid
import asyncio
from concurrent.futures import ThreadPoolExecutor

from analytics.statistical_algorithms import StatisticalAnalyzer
from analytics.prediction_models import PredictionEngine
from analytics.etl_processor import ETLProcessor
from analytics.risk_assessment import RiskAssessor
from analytics.pivot_table_analyzer import FourDimensionalPivotTable
from security import AdminAccess, get_cors_origins

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 初始化FastAPI应用
app = FastAPI(
    title="Prometheus Analytics Service",
    description="Python-powered data analytics microservice for hazard monitoring",
    version="1.0.0"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-Analytics-Admin-Token"],
)

# 数据模型定义
MAX_HAZARDS = 1_000
MAX_FILTER_VALUES = 100
MAX_SOURCE_RECORDS = 1_000
MAX_FILTER_TEXT_LENGTH = 128

FilterText = Annotated[str, Field(min_length=1, max_length=MAX_FILTER_TEXT_LENGTH)]


class HazardData(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=128)
    type: str = Field(default="unknown", min_length=1, max_length=64)
    title: str = Field(default="Unknown Event", min_length=1, max_length=256)
    coordinates: List[float] = Field(default_factory=lambda: [0.0, 0.0], min_length=2, max_length=2)
    timestamp: str = Field(min_length=1, max_length=64)
    magnitude: Optional[float] = Field(default=None, ge=-20, le=20, allow_inf_nan=False)
    severity: Optional[str] = Field(default=None, min_length=1, max_length=64)
    source: str = Field(default="DisasterAWARE", min_length=1, max_length=64)
    populationExposed: Optional[int] = Field(default=None, ge=0, le=1_000_000_000)

    @field_validator("id", "type", "title", "timestamp", "severity", "source")
    @classmethod
    def validate_text_fields(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and not value.strip():
            raise ValueError("text fields must not be blank")
        return value

    @field_validator("coordinates")
    @classmethod
    def validate_coordinates(cls, value: List[float]) -> List[float]:
        longitude, latitude = value
        if not all(math.isfinite(coordinate) for coordinate in value):
            raise ValueError("coordinates must contain finite numbers")
        if not -180 <= longitude <= 180 or not -90 <= latitude <= 90:
            raise ValueError("coordinates must be [longitude, latitude] within valid ranges")
        return value

class AnalysisRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hazards: List[HazardData] = Field(min_length=1, max_length=MAX_HAZARDS)
    analysisType: str = "comprehensive"
    timeRange: int = Field(default=30, ge=1, le=3_650)  # days
    time_dim: Literal["year", "quarter", "month", "week", "day", "date_only"] = "month"
    geo_dim: Literal["region", "continent", "geo_grid"] = "region"
    aggfunc: Literal["count", "sum", "mean"] = "count"
    time_range: Optional[Tuple[str, str]] = None
    regions: Optional[List[FilterText]] = Field(default=None, max_length=MAX_FILTER_VALUES)
    types: Optional[List[FilterText]] = Field(default=None, max_length=MAX_FILTER_VALUES)
    severities: Optional[List[FilterText]] = Field(default=None, max_length=MAX_FILTER_VALUES)
    time_window: int = Field(default=7, ge=1, le=365)

    @field_validator("time_range")
    @classmethod
    def validate_time_range(cls, value: Optional[Tuple[str, str]]) -> Optional[Tuple[str, str]]:
        if value is None:
            return None

        parsed_timestamps = []
        for timestamp in value:
            try:
                parsed_timestamps.append(datetime.fromisoformat(timestamp.replace("Z", "+00:00")))
            except ValueError as exc:
                raise ValueError("time_range must contain ISO 8601 timestamps") from exc

        if parsed_timestamps[0] > parsed_timestamps[1]:
            raise ValueError("time_range start must not be after its end")

        return value

    @field_validator("regions", "types", "severities")
    @classmethod
    def validate_filter_values(cls, value: Optional[List[str]]) -> Optional[List[str]]:
        if value is not None and any(not item.strip() for item in value):
            raise ValueError("filter values must not be blank")
        return value

class AnalysisResponse(BaseModel):
    success: bool
    data: Dict[str, Any]
    processingTime: float
    timestamp: str

# 全局缓存配置
GLOBAL_CACHE = {}
CACHE_TTL = 300  # 5分钟缓存
CACHE_MAX_SIZE = 100

# 性能监控
REQUEST_METRICS = {
    "total_requests": 0,
    "cache_hits": 0,
    "cache_misses": 0,
    "avg_processing_time": 0
}


@app.middleware("http")
async def attach_request_id(request: Request, call_next):
    request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-Id"] = request_id
    return response


def raise_analysis_internal_error(request: Request) -> None:
    logger.exception("Analysis request failed [request_id=%s]", request.state.request_id)
    raise HTTPException(
        status_code=500,
        detail={
            "code": "ANALYSIS_INTERNAL_ERROR",
            "message": "Analysis service failed to process the request.",
            "requestId": request.state.request_id,
        },
    )

def get_analysis_cache_key(request: AnalysisRequest) -> str:
    payload = request.model_dump(mode="json")
    serialized = json.dumps(
        payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True
    )
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def get_cached_analysis(key: str) -> Optional[AnalysisResponse]:
    cache_entry = GLOBAL_CACHE.get(key)
    if cache_entry is None:
        return None

    if datetime.now() - cache_entry["timestamp"] >= timedelta(seconds=CACHE_TTL):
        del GLOBAL_CACHE[key]
        return None

    return cache_entry["data"]


def save_cached_analysis(key: str, response: AnalysisResponse) -> None:
    if len(GLOBAL_CACHE) >= CACHE_MAX_SIZE:
        oldest_key = min(GLOBAL_CACHE, key=lambda cache_key: GLOBAL_CACHE[cache_key]["timestamp"])
        del GLOBAL_CACHE[oldest_key]

    GLOBAL_CACHE[key] = {"data": response, "timestamp": datetime.now()}

# 初始化分析引擎
statistical_analyzer = StatisticalAnalyzer()
prediction_engine = PredictionEngine()
etl_processor = ETLProcessor()
risk_assessor = RiskAssessor()


def run_comprehensive_analysis(request: AnalysisRequest) -> Dict[str, Any]:
    dataframe = etl_processor.convert_to_dataframe(
        [hazard.model_dump() for hazard in request.hazards]
    )

    with ThreadPoolExecutor(max_workers=3) as executor:
        statistical_task = executor.submit(
            statistical_analyzer.run_comprehensive_analysis, dataframe
        )
        prediction_task = executor.submit(
            prediction_engine.generate_predictions, dataframe
        )
        risk_task = executor.submit(
            risk_assessor.calculate_comprehensive_risk, dataframe
        )
        statistical_results = statistical_task.result()
        prediction_results = prediction_task.result()
        risk_results = risk_task.result()

    return {
        "statistics": statistical_results,
        "predictions": prediction_results,
        "riskAssessment": risk_results,
        "dataQuality": etl_processor.assess_data_quality(dataframe),
        "processingInfo": {
            "totalRecords": len(dataframe),
            "timeRange": request.timeRange,
            "analysisType": request.analysisType,
        },
    }


def run_statistics(request: AnalysisRequest) -> Dict[str, Any]:
    dataframe = etl_processor.convert_to_dataframe(
        [hazard.model_dump() for hazard in request.hazards]
    )
    return statistical_analyzer.run_comprehensive_analysis(dataframe)


def run_predictions(request: AnalysisRequest) -> Dict[str, Any]:
    dataframe = etl_processor.convert_to_dataframe(
        [hazard.model_dump() for hazard in request.hazards]
    )
    return prediction_engine.generate_predictions(dataframe)


def run_etl(request: AnalysisRequest) -> Dict[str, Any]:
    dataframe = etl_processor.convert_to_dataframe(
        [hazard.model_dump() for hazard in request.hazards]
    )
    processed_data = etl_processor.process_data(dataframe)
    quality_metrics = etl_processor.assess_data_quality(processed_data)
    processed_data_clean = processed_data.replace({np.nan: None})

    return {
        "processedData": processed_data_clean.to_dict("records"),
        "qualityMetrics": quality_metrics,
        "recordsProcessed": len(processed_data),
    }


def run_risk_assessment(request: AnalysisRequest) -> Dict[str, Any]:
    dataframe = etl_processor.convert_to_dataframe(
        [hazard.model_dump() for hazard in request.hazards]
    )
    return risk_assessor.calculate_comprehensive_risk(dataframe)

@app.get("/")
async def root():
    return {
        "service": "Prometheus Analytics Service", 
        "status": "running",
        "version": "1.0.0",
        "features": [
            "23 Statistical Algorithms",
            "5 Prediction Models", 
            "ETL Processing",
            "Risk Assessment"
        ]
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/metrics")
async def get_metrics(_: AdminAccess):
    """获取性能指标"""
    cache_hit_rate = (REQUEST_METRICS["cache_hits"] / 
                     max(1, REQUEST_METRICS["cache_hits"] + REQUEST_METRICS["cache_misses"])) * 100
    
    return {
        "totalRequests": REQUEST_METRICS["total_requests"],
        "cacheHits": REQUEST_METRICS["cache_hits"],
        "cacheMisses": REQUEST_METRICS["cache_misses"],
        "cacheHitRate": f"{cache_hit_rate:.1f}%",
        "cacheSize": len(GLOBAL_CACHE),
        "avgProcessingTime": f"{REQUEST_METRICS['avg_processing_time']:.2f}ms",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/cache/clear")
async def clear_cache(_: AdminAccess):
    """清除缓存"""
    GLOBAL_CACHE.clear()
    return {"success": True, "message": "Cache cleared"}

@app.post("/api/v1/analyze", response_model=AnalysisResponse)
async def comprehensive_analysis(request: AnalysisRequest, http_request: Request):
    """综合数据分析接口 - 替代TypeScript的23种统计算法
    
    优化：
    - 并行处理三个分析任务
    - 批量数据验证
    - 性能监控
    """
    start_time = datetime.now()
    REQUEST_METRICS["total_requests"] += 1
    cache_key = get_analysis_cache_key(request)
    cached_response = get_cached_analysis(cache_key)
    if cached_response is not None:
        REQUEST_METRICS["cache_hits"] += 1
        return cached_response

    REQUEST_METRICS["cache_misses"] += 1
    
    try:
        analysis_data = await asyncio.to_thread(run_comprehensive_analysis, request)
        
        processing_time = (datetime.now() - start_time).total_seconds()
        processing_time_ms = processing_time * 1000
        
        # 更新平均处理时间
        REQUEST_METRICS["avg_processing_time"] = (
            (REQUEST_METRICS["avg_processing_time"] * (REQUEST_METRICS["total_requests"] - 1) + 
             processing_time_ms) / REQUEST_METRICS["total_requests"]
        )
        
        # 添加性能指标到响应
        analysis_data["performance"] = {
            "processingTimeMs": round(processing_time_ms, 2),
            "recordsProcessed": analysis_data["processingInfo"]["totalRecords"],
            "parallelExecution": True,
            "cacheEnabled": True
        }
        
        response = AnalysisResponse(
            success=True,
            data=analysis_data,
            processingTime=processing_time,
            timestamp=datetime.now().isoformat()
        )
        save_cached_analysis(cache_key, response)
        return response
        
    except Exception:
        raise_analysis_internal_error(http_request)

@app.post("/api/v1/statistics")
async def statistical_analysis(request: AnalysisRequest, http_request: Request):
    """专门的统计分析接口 - 23种算法"""
    try:
        results = await asyncio.to_thread(run_statistics, request)
        return {"success": True, "data": results}
    except Exception:
        raise_analysis_internal_error(http_request)

@app.post("/api/v1/predictions")
async def prediction_analysis(request: AnalysisRequest, http_request: Request):
    """专门的预测分析接口 - 5个回归模型"""
    try:
        results = await asyncio.to_thread(run_predictions, request)
        return {"success": True, "data": results}
    except Exception:
        raise_analysis_internal_error(http_request)

@app.post("/api/v1/etl/process")
async def etl_processing(request: AnalysisRequest, http_request: Request):
    """ETL数据处理接口"""
    try:
        return {"success": True, "data": await asyncio.to_thread(run_etl, request)}
    except Exception:
        raise_analysis_internal_error(http_request)

@app.post("/api/v1/risk-assessment")
async def risk_assessment(request: AnalysisRequest, http_request: Request):
    """风险评估接口"""
    try:
        risk_results = await asyncio.to_thread(run_risk_assessment, request)
        return {"success": True, "data": risk_results}
    except Exception:
        raise_analysis_internal_error(http_request)

# ========== 新增：统一数据模型和质量监控API ==========

class UnifiedDataRequest(BaseModel):
    """统一模型数据请求"""
    model_config = ConfigDict(extra="forbid")

    usgs_data: Optional[List[Dict[str, Any]]] = Field(default=None, max_length=MAX_SOURCE_RECORDS)
    nasa_data: Optional[List[Dict[str, Any]]] = Field(default=None, max_length=MAX_SOURCE_RECORDS)
    gdacs_data: Optional[List[Dict[str, Any]]] = Field(default=None, max_length=MAX_SOURCE_RECORDS)

class QualityCheckRequest(BaseModel):
    """质量检查请求"""
    model_config = ConfigDict(extra="forbid")

    hazards: List[HazardData] = Field(min_length=1, max_length=MAX_HAZARDS)
    source: str = Field(default="unknown", min_length=1, max_length=64)

    @field_validator("source")
    @classmethod
    def validate_source(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("source must not be blank")
        return value

@app.post("/api/v1/quality/assess")
async def assess_data_quality(request: QualityCheckRequest):
    """
    五维数据质量评估接口
    
    评估维度：
    - 完整性 (Completeness)
    - 准确性 (Accuracy)
    - 一致性 (Consistency)
    - 时效性 (Timeliness)
    - 有效性 (Validity)
    """
    try:
        df = etl_processor.convert_to_dataframe([hazard.model_dump() for hazard in request.hazards])
        quality_report = etl_processor.assess_data_quality(df, request.source)
        
        return {
            "success": True,
            "data": quality_report
        }
    except Exception as e:
        logger.error(f"Quality assessment error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/unified-model/transform")
async def transform_to_unified_model(request: QualityCheckRequest):
    """
    将数据转换为统一模型
    
    支持的数据源：USGS, NASA, GDACS
    返回标准化的DataFrame Schema
    """
    try:
        hazards_data = [hazard.model_dump() for hazard in request.hazards]
        unified_df = etl_processor.transform_to_unified_model(hazards_data, request.source)
        
        # 转换为JSON可序列化格式
        unified_df_clean = unified_df.replace({np.nan: None})
        
        return {
            "success": True,
            "data": {
                "records": unified_df_clean.to_dict('records'),
                "total_records": len(unified_df),
                "schema": list(unified_df.columns),
                "source": request.source
            }
        }
    except Exception as e:
        logger.error(f"Unified model transformation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/unified-model/merge")
async def merge_multi_source(request: UnifiedDataRequest):
    """
    合并多数据源为统一模型
    
    功能：
    - 转换各数据源到统一Schema
    - 去重和数据清洗
    - 各数据源质量评估
    - 数据源质量对比
    """
    try:
        result = etl_processor.merge_multi_source_data(
            usgs_data=request.usgs_data,
            nasa_data=request.nasa_data,
            gdacs_data=request.gdacs_data
        )
        
        # 转换DataFrame为JSON可序列化格式
        unified_df = result['unified_data']
        unified_df_clean = unified_df.replace({np.nan: None})
        
        return {
            "success": True,
            "data": {
                "unified_records": unified_df_clean.to_dict('records'),
                "total_records": result['total_records'],
                "source_records": result['source_records'],
                "merged_quality": result['merged_quality'],
                "source_quality_reports": result['source_quality_reports'],
                "source_comparison": result['source_comparison']
            }
        }
    except Exception as e:
        logger.error(f"Multi-source merge error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/quality/thresholds")
async def get_quality_thresholds():
    """获取质量监控阈值配置"""
    return {
        "success": True,
        "data": etl_processor.quality_monitor.QUALITY_THRESHOLDS
    }

@app.get("/api/v1/quality/history")
async def get_quality_history(limit: int = Query(default=10, ge=1, le=100)):
    """获取质量评估历史记录"""
    try:
        history = etl_processor.quality_monitor.get_quality_trend(limit)
        return {
            "success": True,
            "data": {
                "history": history,
                "count": len(history)
            }
        }
    except Exception as e:
        logger.error(f"Quality history error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== 4维数据透视表API端点 ====================

@app.post("/api/v1/pivot/create")
async def create_4d_pivot_table(request: AnalysisRequest):
    """创建4维数据透视表（时间×地理×类型×严重性）
    
    Query Parameters:
        - time_dim: 时间维度 (year/quarter/month/week/day/date_only)
        - geo_dim: 地理维度 (region/continent/geo_grid)
        - type_dim: 类型维度 (type_category)
        - severity_dim: 严重性维度 (severity)
        - aggfunc: 聚合函数 (count/sum/mean)
    """
    try:
        start_time = asyncio.get_event_loop().time()
        df = pd.DataFrame([h.model_dump() for h in request.hazards])
        
        # 创建4维透视表分析器
        analyzer = FourDimensionalPivotTable(df)
        
        # 构建透视表
        pivot_table = analyzer.create_4d_pivot(
            time_dim=request.time_dim,
            geo_dim=request.geo_dim,
            type_dim='type_category',
            severity_dim='severity',
            aggfunc=request.aggfunc,
            values_col='id' if request.aggfunc == 'count' else 'magnitude'
        )
        
        # 获取汇总统计
        summary = analyzer.get_summary_statistics()
        
        # 导出为字典格式
        pivot_dict = analyzer.export_pivot_to_dict(pivot_table)
        
        processing_time = asyncio.get_event_loop().time() - start_time
        
        logger.info(f"4维透视表创建成功，处理时间: {processing_time:.3f}s")
        
        return {
            "success": True,
            "data": {
                "pivot_table": pivot_dict,
                "summary": summary,
                "dimensions": {
                    "rows": len(pivot_table.index),
                    "columns": len(pivot_table.columns)
                }
            },
            "processingTime": processing_time,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"4D pivot creation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/pivot/query")
async def multi_dimensional_query(request: AnalysisRequest):
    """多维度联合查询
    
    Request Body:
        - hazards: 数据列表
        - time_range: 时间范围 [start_date, end_date]
        - regions: 地理区域列表
        - types: 灾害类型列表
        - severities: 严重性级别列表
    """
    try:
        start_time = asyncio.get_event_loop().time()
        df = pd.DataFrame([h.model_dump() for h in request.hazards])
        
        analyzer = FourDimensionalPivotTable(df)
        
        # 解析查询参数
        time_range = None
        if request.time_range:
            time_range = (
                pd.to_datetime(request.time_range[0]),
                pd.to_datetime(request.time_range[1])
            )
        
        regions = request.regions
        types = request.types
        severities = request.severities
        
        # 执行多维度查询
        result_df = analyzer.multi_dimensional_query(
            time_range=time_range,
            regions=regions,
            types=types,
            severities=severities
        )
        
        processing_time = asyncio.get_event_loop().time() - start_time
        
        return {
            "success": True,
            "data": {
                "results": result_df.to_dict('records'),
                "total_count": len(result_df),
                "query_params": {
                    "time_range": request.time_range,
                    "regions": regions,
                    "types": types,
                    "severities": severities
                }
            },
            "processingTime": processing_time,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Multi-dimensional query error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/pivot/trend-analysis")
async def analyze_4d_trends(request: AnalysisRequest):
    """4维趋势分析（识别上升/下降趋势）
    
    Query Parameters:
        - time_window: 时间窗口（天数，默认7天）
    """
    try:
        start_time = asyncio.get_event_loop().time()
        df = pd.DataFrame([h.model_dump() for h in request.hazards])
        
        analyzer = FourDimensionalPivotTable(df)
        
        time_window = request.time_window
        
        # 执行趋势分析
        trend_df = analyzer.trend_analysis_4d(time_window=time_window)
        
        if trend_df.empty:
            return {
                "success": True,
                "data": {
                    "trends": [],
                    "message": "时间窗口内数据不足",
                    "time_window": time_window
                },
                "processingTime": asyncio.get_event_loop().time() - start_time,
                "timestamp": datetime.now().isoformat()
            }
        
        # 提取上升趋势的高危组合
        high_risk_trends = trend_df[
            (trend_df['trend_direction'] == 'increasing') &
            (trend_df['severity'] == 'WARNING')
        ].sort_values('trend_slope', ascending=False)
        
        processing_time = asyncio.get_event_loop().time() - start_time
        
        return {
            "success": True,
            "data": {
                "all_trends": trend_df.to_dict('records'),
                "high_risk_trends": high_risk_trends.to_dict('records'),
                "statistics": {
                    "total_combinations": len(trend_df),
                    "increasing": len(trend_df[trend_df['trend_direction'] == 'increasing']),
                    "stable": len(trend_df[trend_df['trend_direction'] == 'stable']),
                    "decreasing": len(trend_df[trend_df['trend_direction'] == 'decreasing']),
                    "high_risk_count": len(high_risk_trends)
                },
                "time_window": time_window
            },
            "processingTime": processing_time,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"4D trend analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/pivot/risk-score")
async def calculate_4d_risk_scores(request: AnalysisRequest):
    """4维风险评分（综合时间、地理、类型、严重性）
    
    Query Parameters:
        - time_window: 时间窗口（天数，默认7天）
    """
    try:
        start_time = asyncio.get_event_loop().time()
        df = pd.DataFrame([h.model_dump() for h in request.hazards])
        
        analyzer = FourDimensionalPivotTable(df)
        
        time_window = request.time_window
        
        # 计算风险评分
        risk_df = analyzer.risk_score_4d(time_window=time_window)
        
        if risk_df.empty:
            return {
                "success": True,
                "data": {
                    "risk_scores": [],
                    "message": "时间窗口内数据不足",
                    "time_window": time_window
                },
                "processingTime": asyncio.get_event_loop().time() - start_time,
                "timestamp": datetime.now().isoformat()
            }
        
        # Top 10 高风险区域
        top_risks = risk_df.head(10)
        
        processing_time = asyncio.get_event_loop().time() - start_time
        
        return {
            "success": True,
            "data": {
                "all_risk_scores": risk_df.to_dict('records'),
                "top_10_risks": top_risks.to_dict('records'),
                "statistics": {
                    "total_combinations": len(risk_df),
                    "max_risk_score": float(risk_df['risk_score'].max()),
                    "avg_risk_score": float(risk_df['risk_score'].mean()),
                    "min_risk_score": float(risk_df['risk_score'].min())
                },
                "time_window": time_window
            },
            "processingTime": processing_time,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"4D risk scoring error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/pivot/summary")
async def get_4d_summary(request: AnalysisRequest):
    """获取4维数据的汇总统计信息"""
    try:
        start_time = asyncio.get_event_loop().time()
        df = pd.DataFrame([h.model_dump() for h in request.hazards])
        
        analyzer = FourDimensionalPivotTable(df)
        summary = analyzer.get_summary_statistics()
        
        processing_time = asyncio.get_event_loop().time() - start_time
        
        return {
            "success": True,
            "data": summary,
            "processingTime": processing_time,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"4D summary error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== 结束 4维数据透视表API ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8001, 
        reload=True,
        log_level="info"
    )
