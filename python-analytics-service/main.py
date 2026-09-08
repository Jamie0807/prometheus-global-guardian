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

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import List, Dict, Any, Literal, Optional, Tuple
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
import hashlib
import json
from functools import wraps
import asyncio

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
class HazardData(BaseModel):
    id: str
    type: str = "unknown"
    title: str = "Unknown Event"
    coordinates: List[float] = [0.0, 0.0]
    timestamp: str
    magnitude: Optional[float] = None
    severity: Optional[str] = None
    source: str = "DisasterAWARE"
    populationExposed: Optional[int] = None

class AnalysisRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hazards: List[HazardData]
    analysisType: str = "comprehensive"
    timeRange: int = 30  # days
    time_dim: Literal["year", "quarter", "month", "week", "day", "date_only"] = "month"
    geo_dim: Literal["region", "continent", "geo_grid"] = "region"
    aggfunc: Literal["count", "sum", "mean"] = "count"
    time_range: Optional[Tuple[str, str]] = None
    regions: Optional[List[str]] = None
    types: Optional[List[str]] = None
    severities: Optional[List[str]] = None
    time_window: int = Field(default=7, gt=0)

    @field_validator("time_range")
    @classmethod
    def validate_time_range(cls, value: Optional[Tuple[str, str]]) -> Optional[Tuple[str, str]]:
        if value is None:
            return None

        for timestamp in value:
            try:
                datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            except ValueError as exc:
                raise ValueError("time_range must contain ISO 8601 timestamps") from exc

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

def get_cache_key(data: List[Dict]) -> str:
    """生成请求数据的缓存键"""
    if not data:
        return "empty"
    # 使用数据长度、类型分布和时间戳范围生成键
    types = [d.get('type', 'unknown') for d in data[:10]]
    key_str = f"{len(data)}_{sorted(types)}_{data[0].get('timestamp', '')}_{data[-1].get('timestamp', '')}"
    return hashlib.md5(key_str.encode()).hexdigest()

def cache_response(ttl: int = CACHE_TTL):
    """缓存装饰器"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 从request中提取hazards数据生成缓存键
            request = kwargs.get('request') or (args[0] if args else None)
            if not request or not hasattr(request, 'hazards'):
                return await func(*args, **kwargs)
            
            cache_key = get_cache_key([h.model_dump() for h in request.hazards])
            
            # 检查缓存
            if cache_key in GLOBAL_CACHE:
                cache_entry = GLOBAL_CACHE[cache_key]
                if (datetime.now() - cache_entry['timestamp']).seconds < ttl:
                    REQUEST_METRICS["cache_hits"] += 1
                    logger.info(f"Cache hit for {func.__name__}: {cache_key[:8]}...")
                    return cache_entry['data']
                else:
                    # 缓存过期
                    del GLOBAL_CACHE[cache_key]
            
            REQUEST_METRICS["cache_misses"] += 1
            
            # 执行函数
            result = await func(*args, **kwargs)
            
            # 保存到缓存
            if len(GLOBAL_CACHE) >= CACHE_MAX_SIZE:
                # 删除最旧的条目
                oldest_key = min(GLOBAL_CACHE, key=lambda k: GLOBAL_CACHE[k]['timestamp'])
                del GLOBAL_CACHE[oldest_key]
            
            GLOBAL_CACHE[cache_key] = {
                'data': result,
                'timestamp': datetime.now()
            }
            
            return result
        return wrapper
    return decorator

# 初始化分析引擎
statistical_analyzer = StatisticalAnalyzer()
prediction_engine = PredictionEngine()
etl_processor = ETLProcessor()
risk_assessor = RiskAssessor()

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
async def comprehensive_analysis(request: AnalysisRequest):
    """综合数据分析接口 - 替代TypeScript的23种统计算法
    
    优化：
    - 并行处理三个分析任务
    - 批量数据验证
    - 性能监控
    """
    start_time = datetime.now()
    REQUEST_METRICS["total_requests"] += 1
    
    try:
        # 数据验证和限制
        if len(request.hazards) > 1000:
            logger.warning(f"Large dataset detected: {len(request.hazards)} records, limiting to 1000")
            request.hazards = request.hazards[:1000]
        
        # 转换数据格式
        df = etl_processor.convert_to_dataframe([hazard.model_dump() for hazard in request.hazards])
        
        # 并行执行三个分析任务（使用asyncio）
        loop = asyncio.get_event_loop()
        statistical_task = loop.run_in_executor(None, statistical_analyzer.run_comprehensive_analysis, df)
        prediction_task = loop.run_in_executor(None, prediction_engine.generate_predictions, df)
        risk_task = loop.run_in_executor(None, risk_assessor.calculate_comprehensive_risk, df)
        
        # 等待所有任务完成
        statistical_results, prediction_results, risk_results = await asyncio.gather(
            statistical_task, prediction_task, risk_task
        )
        
        # 组合结果
        analysis_data = {
            "statistics": statistical_results,
            "predictions": prediction_results,
            "riskAssessment": risk_results,
            "dataQuality": etl_processor.assess_data_quality(df),
            "processingInfo": {
                "totalRecords": len(df),
                "timeRange": request.timeRange,
                "analysisType": request.analysisType
            }
        }
        
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
            "recordsProcessed": len(df),
            "parallelExecution": True,
            "cacheEnabled": True
        }
        
        return AnalysisResponse(
            success=True,
            data=analysis_data,
            processingTime=processing_time,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/api/v1/statistics")
async def statistical_analysis(request: AnalysisRequest):
    """专门的统计分析接口 - 23种算法"""
    try:
        df = etl_processor.convert_to_dataframe([hazard.model_dump() for hazard in request.hazards])
        results = statistical_analyzer.run_comprehensive_analysis(df)
        return {"success": True, "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/predictions")
async def prediction_analysis(request: AnalysisRequest):
    """专门的预测分析接口 - 5个回归模型"""
    try:
        df = etl_processor.convert_to_dataframe([hazard.model_dump() for hazard in request.hazards])
        results = prediction_engine.generate_predictions(df)
        return {"success": True, "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/etl/process")
async def etl_processing(request: AnalysisRequest):
    """ETL数据处理接口"""
    try:
        df = etl_processor.convert_to_dataframe([hazard.model_dump() for hazard in request.hazards])
        processed_data = etl_processor.process_data(df)
        quality_metrics = etl_processor.assess_data_quality(processed_data)
        
        # 将NaN替换为None以便JSON序列化
        processed_data_clean = processed_data.replace({np.nan: None})
        
        return {
            "success": True, 
            "data": {
                "processedData": processed_data_clean.to_dict('records'),
                "qualityMetrics": quality_metrics,
                "recordsProcessed": len(processed_data)
            }
        }
    except Exception as e:
        logger.error(f"ETL processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/risk-assessment")
async def risk_assessment(request: AnalysisRequest):
    """风险评估接口"""
    try:
        df = etl_processor.convert_to_dataframe([hazard.model_dump() for hazard in request.hazards])
        risk_results = risk_assessor.calculate_comprehensive_risk(df)
        return {"success": True, "data": risk_results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========== 新增：统一数据模型和质量监控API ==========

class UnifiedDataRequest(BaseModel):
    """统一模型数据请求"""
    usgs_data: Optional[List[Dict]] = None
    nasa_data: Optional[List[Dict]] = None
    gdacs_data: Optional[List[Dict]] = None

class QualityCheckRequest(BaseModel):
    """质量检查请求"""
    hazards: List[HazardData]
    source: str = "unknown"

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
async def get_quality_history(limit: int = 10):
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
