#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
统计分析算法模块
提供描述性统计、推断统计、时间序列、相关性和异常检测。

特性：
1. 基于输入结构的结果缓存
2. 输入字段验证
3. NumPy 结果的 JSON 安全转换
"""

import pandas as pd
import numpy as np
from scipy import stats
from scipy.stats import pearsonr, spearmanr
from statsmodels.tsa.seasonal import seasonal_decompose
from statsmodels.tsa.stattools import acf, pacf
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import DBSCAN
from typing import Dict, List, Any, Tuple, Optional
import logging
from datetime import datetime, timedelta
from functools import lru_cache
import hashlib
import json

def clean_for_json(obj):
    """清理数据中的NaN和Infinity值，使其可以被JSON序列化"""
    if isinstance(obj, dict):
        return {k: clean_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_for_json(item) for item in obj]
    elif isinstance(obj, (float, np.floating)):
        if not np.isfinite(obj):
            return None
        return float(obj) if isinstance(obj, np.floating) else obj
    elif isinstance(obj, np.integer):
        return int(obj)
    return obj

class StatisticalAnalyzer:
    """统计分析器。
    
    实现特性：
    - 缓存重复计算结果
    - 验证分析所需字段
    - 记录运行时间
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self._cache = {}  # 简单的内存缓存
        self._cache_ttl = 300  # 5分钟缓存过期
        self._cache_timestamps = {}
    
    def _get_cache_key(self, df: pd.DataFrame) -> str:
        """生成数据框的缓存键"""
        # 使用记录数、列名和类型分布生成缓存签名
        data_str = f"{len(df)}_{df.columns.tolist()}_{df['type'].value_counts().to_dict()}"
        return hashlib.md5(data_str.encode()).hexdigest()
    
    def _get_from_cache(self, key: str) -> Optional[Dict[str, Any]]:
        """从缓存获取结果"""
        if key in self._cache:
            timestamp = self._cache_timestamps.get(key)
            if timestamp and (datetime.now() - timestamp).seconds < self._cache_ttl:
                self.logger.info(f"Cache hit for key: {key[:8]}...")
                return self._cache[key]
            else:
                # 缓存过期，清理
                del self._cache[key]
                del self._cache_timestamps[key]
        return None
    
    def _save_to_cache(self, key: str, value: Dict[str, Any]):
        """保存结果到缓存"""
        self._cache[key] = value
        self._cache_timestamps[key] = datetime.now()
        # 限制缓存大小
        if len(self._cache) > 100:
            oldest_key = min(self._cache_timestamps, key=self._cache_timestamps.get)
            del self._cache[oldest_key]
            del self._cache_timestamps[oldest_key]
    
    def _validate_dataframe(self, df: pd.DataFrame) -> bool:
        """验证数据框的有效性"""
        if df is None or len(df) == 0:
            raise ValueError("DataFrame is empty")
        
        required_columns = ['type', 'timestamp']
        missing_cols = [col for col in required_columns if col not in df.columns]
        if missing_cols:
            raise ValueError(f"Missing required columns: {missing_cols}")
        
        return True
        
    def run_comprehensive_analysis(self, df: pd.DataFrame) -> Dict[str, Any]:
        """运行综合统计分析并返回各分析部分及运行时间。"""
        start_time = datetime.now()
        
        try:
            # 数据验证
            self._validate_dataframe(df)
            
            # 检查缓存
            cache_key = self._get_cache_key(df)
            cached_result = self._get_from_cache(cache_key)
            if cached_result:
                self.logger.info(f"Returning cached result (saved {(datetime.now() - start_time).total_seconds():.3f}s)")
                return cached_result
            
            # 执行分析
            results = {
                "descriptiveStatistics": self._descriptive_statistics(df),
                "inferentialStatistics": self._inferential_statistics(df), 
                "timeSeriesAnalysis": self._time_series_analysis(df),
                "correlationAnalysis": self._correlation_analysis(df),
                "anomalyDetection": self._anomaly_detection(df),
                "performanceMetrics": self._calculate_performance_metrics(start_time)
            }
            
            # 清理所有NaN和Infinity值
            cleaned_results = clean_for_json(results)
            
            # 保存到缓存
            self._save_to_cache(cache_key, cleaned_results)
            
            elapsed = (datetime.now() - start_time).total_seconds()
            self.logger.info(f"Analysis completed in {elapsed:.3f}s for {len(df)} records")
            
            return cleaned_results
            
        except Exception as e:
            self.logger.error(f"Statistical analysis failed: {e}", exc_info=True)
            raise
    
    def _descriptive_statistics(self, df: pd.DataFrame) -> Dict[str, Any]:
        """描述性统计。"""
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        results = {
            "basicStats": {
                "count": int(len(df)),
                "mean": df[numeric_cols].mean().to_dict() if len(numeric_cols) > 0 else {},
                "std": df[numeric_cols].std().to_dict() if len(numeric_cols) > 0 else {},
                "min": df[numeric_cols].min().to_dict() if len(numeric_cols) > 0 else {},
                "max": df[numeric_cols].max().to_dict() if len(numeric_cols) > 0 else {}
            },
            "distributionMetrics": {},
            "variabilityMeasures": {},
            "centralTendency": {}
        }
        
        # 1. 均值、中位数、众数
        if 'magnitude' in df.columns:
            magnitude_data = df['magnitude'].dropna()
            if len(magnitude_data) > 0:
                results["centralTendency"] = {
                    "mean": float(magnitude_data.mean()),
                    "median": float(magnitude_data.median()),
                    "mode": float(magnitude_data.mode().iloc[0]) if not magnitude_data.mode().empty else None
                }
        
        # 2. 标准差、方差、变异系数
        if 'magnitude' in df.columns:
            magnitude_data = df['magnitude'].dropna()
            if len(magnitude_data) > 0:
                mean_val = magnitude_data.mean()
                results["variabilityMeasures"] = {
                    "standardDeviation": float(magnitude_data.std()),
                    "variance": float(magnitude_data.var()),
                    "coefficientOfVariation": float(magnitude_data.std() / mean_val) if mean_val != 0 else 0,
                    "range": float(magnitude_data.max() - magnitude_data.min())
                }
        
        # 3. 分位数分析
        if 'magnitude' in df.columns:
            magnitude_data = df['magnitude'].dropna()
            if len(magnitude_data) > 0:
                results["distributionMetrics"] = {
                    "q25": float(magnitude_data.quantile(0.25)),
                    "q50": float(magnitude_data.quantile(0.50)),
                    "q75": float(magnitude_data.quantile(0.75)),
                    "iqr": float(magnitude_data.quantile(0.75) - magnitude_data.quantile(0.25)),
                    "skewness": float(stats.skew(magnitude_data)),
                    "kurtosis": float(stats.kurtosis(magnitude_data))
                }
        
        # 4-8. 频率分布、4维数据透视表（时间×地理×类型×严重性）
        type_counts = df['type'].value_counts().to_dict()
        
        # 构建4维透视表
        pivot_analysis = {}
        
        # 维度1: 时间 - 按日期分组
        if 'timestamp' in df.columns:
            df_temp = df.copy()
            df_temp['date'] = pd.to_datetime(df_temp['timestamp']).dt.date
            time_groups = df_temp.groupby(['date', 'type']).size()
            time_dimension = {}
            for (date, hazard_type), count in time_groups.items():
                key = f"{str(date)}_{hazard_type}"
                time_dimension[key] = int(count)
            pivot_analysis['timeDimension'] = time_dimension
        
        # 维度2: 地理 - 按坐标区域分组（简化为经纬度区间）
        if 'coordinates' in df.columns:
            df_temp = df.copy()
            # 将坐标转换为区域网格（10度为一格）
            df_temp['geo_region'] = df_temp['coordinates'].apply(
                lambda x: f"({int(x[0]//10)*10},{int(x[1]//10)*10})" if isinstance(x, list) and len(x) >= 2 else "unknown"
            )
            geo_groups = df_temp.groupby(['geo_region', 'type']).size()
            geo_dimension = {}
            for (region, hazard_type), count in geo_groups.items():
                key = f"{region}_{hazard_type}"
                geo_dimension[key] = int(count)
            pivot_analysis['geoDimension'] = geo_dimension
        
        # 维度3: 类型 - 基础统计
        pivot_analysis['typeDimension'] = type_counts
        
        # 维度4: 严重性 - 按severity分组
        if 'severity' in df.columns:
            severity_groups = df.groupby(['severity', 'type']).size()
            severity_dimension = {}
            for (severity, hazard_type), count in severity_groups.items():
                key = f"{severity}_{hazard_type}"
                severity_dimension[key] = int(count)
            pivot_analysis['severityDimension'] = severity_dimension
        
        # 多维交叉分析
        if 'severity' in df.columns:
            cross_analysis = df.groupby(['type', 'severity']).size().to_dict()
            pivot_analysis['crossAnalysis'] = {f"{k[0]}_×_{k[1]}": int(v) for k, v in cross_analysis.items()}
        
        results["typeDistribution"] = {
            "counts": type_counts,
            "percentages": {k: v/len(df)*100 for k, v in type_counts.items()},
            "mostCommon": df['type'].mode().iloc[0] if not df['type'].mode().empty else "未分类",
            "fourDimensionalPivot": pivot_analysis  # 4维透视表数据
        }
        
        return results
    
    def _inferential_statistics(self, df: pd.DataFrame) -> Dict[str, Any]:
        """推断统计。"""
        results = {
            "confidenceIntervals": {},
            "hypothesisTests": {},
            "regressionAnalysis": {}
        }
        
        # 1. 置信区间计算
        if 'magnitude' in df.columns:
            magnitude_data = df['magnitude'].dropna()
            if len(magnitude_data) > 1:
                confidence_level = 0.95
                n = len(magnitude_data)
                mean = magnitude_data.mean()
                std_err = stats.sem(magnitude_data)
                ci = stats.t.interval(confidence_level, n-1, loc=mean, scale=std_err)
                
                results["confidenceIntervals"]["magnitude"] = {
                    "mean": float(mean),
                    "confidenceLevel": confidence_level,
                    "lowerBound": float(ci[0]),
                    "upperBound": float(ci[1]),
                    "marginOfError": float(ci[1] - mean)
                }
        
        # 不同类型的震级 t 检验
        if 'type' in df.columns and 'magnitude' in df.columns:
            # 不同类型的震级比较
            earthquake_data = df[df['type'] == 'EARTHQUAKE']['magnitude'].dropna()
            volcano_data = df[df['type'] == 'VOLCANO']['magnitude'].dropna()
            
            if len(earthquake_data) > 1 and len(volcano_data) > 1:
                t_stat, p_value = stats.ttest_ind(earthquake_data, volcano_data)
                results["hypothesisTests"]["magnitudeDifference"] = {
                    "testType": "Two-sample t-test",
                    "tStatistic": float(t_stat),
                    "pValue": float(p_value),
                    "significant": p_value < 0.05
                }
        
        # 时间与震级的线性回归
        if len(df) > 10:
            # 简单线性回归：时间 vs 震级
            df_with_magnitude = df.dropna(subset=['magnitude'])
            if len(df_with_magnitude) > 2:
                # 将时间转为数值
                df_with_magnitude = df_with_magnitude.copy()
                df_with_magnitude['timestamp_numeric'] = pd.to_datetime(df_with_magnitude['timestamp']).astype(np.int64)
                
                x = df_with_magnitude['timestamp_numeric']
                y = df_with_magnitude['magnitude']
                
                slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
                
                results["regressionAnalysis"] = {
                    "slope": float(slope),
                    "intercept": float(intercept), 
                    "rSquared": float(r_value**2),
                    "pValue": float(p_value),
                    "standardError": float(std_err)
                }
        
        return results
    
    def _time_series_analysis(self, df: pd.DataFrame) -> Dict[str, Any]:
        """时间序列分析。"""
        results = {
            "movingAverages": {},
            "trendAnalysis": {},
            "seasonalDecomposition": {},
            "autocorrelation": {}
        }
        
        try:
            # 按日聚合数据
            df['date'] = pd.to_datetime(df['timestamp']).dt.date
            daily_counts = df.groupby('date').size().reset_index(name='count')
            daily_counts['date'] = pd.to_datetime(daily_counts['date'])
            daily_counts = daily_counts.set_index('date').sort_index()
            
            if len(daily_counts) > 7:
                # 1. 移动平均
                daily_counts['ma_7'] = daily_counts['count'].rolling(window=7, min_periods=1).mean()
                daily_counts['ma_14'] = daily_counts['count'].rolling(window=14, min_periods=1).mean()
                daily_counts['ma_30'] = daily_counts['count'].rolling(window=30, min_periods=1).mean()
                
                results["movingAverages"] = {
                    "ma7": daily_counts['ma_7'].iloc[-1] if len(daily_counts) >= 7 else None,
                    "ma14": daily_counts['ma_14'].iloc[-1] if len(daily_counts) >= 14 else None,
                    "ma30": daily_counts['ma_30'].iloc[-1] if len(daily_counts) >= 30 else None
                }
                
                # 2. 趋势分析
                x = np.arange(len(daily_counts))
                y = daily_counts['count'].values
                slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
                
                trend_direction = "increasing" if slope > 0.1 else ("decreasing" if slope < -0.1 else "stable")
                
                results["trendAnalysis"] = {
                    "slope": float(slope),
                    "direction": trend_direction,
                    "rSquared": float(r_value**2),
                    "significance": float(p_value)
                }
                
                # 3. 季节性分解
                if len(daily_counts) >= 30:  # 至少需要30天数据
                    try:
                        # 使用周期=7（周季节性）
                        decomposition = seasonal_decompose(
                            daily_counts['count'], 
                            model='additive', 
                            period=7,
                            extrapolate_trend='freq'
                        )
                        
                        results["seasonalDecomposition"] = {
                            "hasSeasonal": True,
                            "trendComponent": float(decomposition.trend.dropna().mean()),
                            "seasonalStrength": float(np.std(decomposition.seasonal.dropna())),
                            "residualVariance": float(np.var(decomposition.resid.dropna()))
                        }
                    except:
                        results["seasonalDecomposition"] = {"hasSeasonal": False}
                
                # 4. 自相关分析
                if len(daily_counts) > 10:
                    autocorr = acf(daily_counts['count'], nlags=min(10, len(daily_counts)-1), fft=False)
                    results["autocorrelation"] = {
                        "lag1": float(autocorr[1]) if len(autocorr) > 1 else 0,
                        "lag7": float(autocorr[7]) if len(autocorr) > 7 else 0,
                        "significantLags": [i for i, val in enumerate(autocorr[1:], 1) if abs(val) > 0.2]
                    }
        
        except Exception as e:
            self.logger.warning(f"Time series analysis failed: {e}")
            
        return results
    
    def _correlation_analysis(self, df: pd.DataFrame) -> Dict[str, Any]:
        """相关性分析。"""
        results = {
            "pearsonCorrelation": {},
            "spearmanCorrelation": {},
            "mutualInformation": {}
        }
        
        # 数值列相关性
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        if len(numeric_cols) >= 2:
            # 1. 皮尔逊相关
            pearson_corr = df[numeric_cols].corr(method='pearson')
            results["pearsonCorrelation"] = pearson_corr.to_dict()
            
            # 2. 斯皮尔曼相关
            spearman_corr = df[numeric_cols].corr(method='spearman')
            results["spearmanCorrelation"] = spearman_corr.to_dict()
        
        # 按类型组合统计出现比例
        if 'type' in df.columns:
            type_counts = df.groupby('type').size()
            type_correlation = {}
            
            for type1 in type_counts.index:
                for type2 in type_counts.index:
                    if type1 < type2:  # 避免重复
                        # 计算共现次数
                        cooccurrence = len(df[df['type'].isin([type1, type2])])
                        total = len(df)
                        correlation_strength = cooccurrence / total
                        type_correlation[f"{type1}-{type2}"] = correlation_strength
            
            results["typeCorrelations"] = type_correlation
        
        return results
    
    def _anomaly_detection(self, df: pd.DataFrame) -> Dict[str, Any]:
        """异常检测。"""
        results = {
            "outlierDetection": {},
            "anomalyStatistics": {}
        }
        
        # 1. IQR方法检测异常值
        if 'magnitude' in df.columns:
            magnitude_data = df['magnitude'].dropna()
            if len(magnitude_data) > 4:
                Q1 = magnitude_data.quantile(0.25)
                Q3 = magnitude_data.quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                
                outliers = magnitude_data[(magnitude_data < lower_bound) | (magnitude_data > upper_bound)]
                
                results["outlierDetection"]["iqrMethod"] = {
                    "outlierCount": len(outliers),
                    "outlierRate": len(outliers) / len(magnitude_data) * 100,
                    "lowerBound": float(lower_bound),
                    "upperBound": float(upper_bound),
                    "outlierValues": outliers.tolist()
                }
        
        # 2. Z-score方法检测异常值
        if 'magnitude' in df.columns:
            magnitude_data = df['magnitude'].dropna()
            if len(magnitude_data) > 2:
                z_scores = np.abs(stats.zscore(magnitude_data))
                z_threshold = 3  # 3σ准则
                z_outliers = magnitude_data[z_scores > z_threshold]
                
                results["outlierDetection"]["zscoreMethod"] = {
                    "outlierCount": len(z_outliers),
                    "outlierRate": len(z_outliers) / len(magnitude_data) * 100,
                    "threshold": z_threshold,
                    "outlierValues": z_outliers.tolist()
                }
        
        # 异常统计总结
        total_outliers_iqr = results["outlierDetection"].get("iqrMethod", {}).get("outlierCount", 0)
        total_outliers_z = results["outlierDetection"].get("zscoreMethod", {}).get("outlierCount", 0)
        
        results["anomalyStatistics"] = {
            "totalRecords": len(df),
            "iqrOutliers": total_outliers_iqr,
            "zscoreOutliers": total_outliers_z,
            "consensusOutliers": min(total_outliers_iqr, total_outliers_z),  # 两种方法都认为的异常值
            "dataQualityScore": max(0, 100 - max(total_outliers_iqr, total_outliers_z) / len(df) * 100)
        }
        
        return results
    
    def _calculate_performance_metrics(self, start_time: datetime = None) -> Dict[str, Any]:
        """计算运行时间和缓存状态。"""
        elapsed_ms = 0
        if start_time:
            elapsed_ms = (datetime.now() - start_time).total_seconds() * 1000
        
        return {
            "analysisSections": 5,
            "processingTime": f"{elapsed_ms:.2f}ms" if elapsed_ms > 0 else "<50ms",
            "libraryBased": "NumPy + SciPy + Statsmodels + Scikit-learn",
            "cacheEnabled": True,
            "cacheSize": len(self._cache),
            "parallelProcessing": False
        }
