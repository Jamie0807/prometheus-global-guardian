#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ETL数据处理器
将传入的灾害记录转换为统一数据模型，并提供清洗和质量评估。
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any
import logging
from datetime import datetime

from .unified_model import UnifiedHazardModel
from .quality_monitor import DataQualityMonitor

class ETLProcessor:
    """ETL数据流水线处理器 - 集成统一模型和质量监控"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.unified_model = UnifiedHazardModel()
        self.quality_monitor = DataQualityMonitor()
        
    def convert_to_dataframe(self, hazards: List[Dict]) -> pd.DataFrame:
        """将JSON数据转换为Pandas DataFrame"""
        try:
            if not hazards:
                return pd.DataFrame()
            
            df = pd.DataFrame(hazards)
            
            # 数据类型转换
            if 'timestamp' in df.columns:
                df['timestamp'] = pd.to_datetime(df['timestamp'])
            
            if 'magnitude' in df.columns:
                df['magnitude'] = pd.to_numeric(df['magnitude'], errors='coerce')
            
            if 'populationExposed' in df.columns:
                df['populationExposed'] = pd.to_numeric(df['populationExposed'], errors='coerce')
            
            return df
            
        except Exception as e:
            self.logger.error(f"DataFrame conversion failed: {e}")
            raise
    
    def process_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transform阶段：数据清洗、标准化、去重"""
        try:
            # 1. 去除重复数据
            df = df.drop_duplicates(subset=['id'], keep='first')
            
            # 2. 处理缺失值
            df = self._handle_missing_values(df)
            
            # 3. 异常值检测与修复
            df = self._handle_outliers(df)
            
            # 4. 数据标准化
            df = self._standardize_data(df)
            
            return df
            
        except Exception as e:
            self.logger.error(f"Data processing failed: {e}")
            raise
    
    def assess_data_quality(self, df: pd.DataFrame, source: str = 'unknown') -> Dict[str, Any]:
        """评估数据质量 - 使用五维质量监控体系"""
        try:
            # 使用新的质量监控器
            quality_report = self.quality_monitor.assess_quality(df, source)
            
            # 转换为API兼容格式
            overall_score = quality_report['overall_score'] * 100  # 转换为0-100分制
            
            return {
                "overallScore": float(round(overall_score, 1)),
                "targetScore": 95.0,  # 目标质量分数
                "detailChecks": {
                    "completeness": quality_report['dimensions']['completeness']['score'],
                    "accuracy": quality_report['dimensions']['accuracy']['score'],
                    "consistency": quality_report['dimensions']['consistency']['score'],
                    "timeliness": quality_report['dimensions']['timeliness']['score'],
                    "validity": quality_report['dimensions']['validity']['score']
                },
                "totalRecords": quality_report['record_count'],
                "status": quality_report['overall_status'],
                "issues": quality_report['issues'],
                "recommendations": quality_report['recommendations'],
                "detailed_report": quality_report  # 完整报告
            }
            
        except Exception as e:
            self.logger.error(f"Quality assessment failed: {e}")
            return {"error": str(e)}
    
    def transform_to_unified_model(self, hazards: List[Dict], source: str) -> pd.DataFrame:
        """将原始数据转换为统一模型"""
        try:
            if source.upper() == 'USGS':
                return self.unified_model.transform_usgs_to_unified(hazards)
            elif source.upper() == 'NASA':
                return self.unified_model.transform_nasa_to_unified(hazards)
            elif source.upper() == 'GDACS':
                return self.unified_model.transform_gdacs_to_unified(hazards)
            else:
                self.logger.warning(f"Unknown source: {source}, using generic conversion")
                return self.convert_to_dataframe(hazards)
        except Exception as e:
            self.logger.error(f"Unified model transformation failed for {source}: {e}")
            raise
    
    def merge_multi_source_data(self, 
                                usgs_data: List[Dict] = None,
                                nasa_data: List[Dict] = None, 
                                gdacs_data: List[Dict] = None) -> Dict[str, Any]:
        """
        合并多数据源并进行质量评估
        
        返回:
        {
            'unified_data': DataFrame,
            'source_quality_reports': [...],
            'merged_quality': {...},
            'source_comparison': {...}
        }
        """
        try:
            dataframes = []
            quality_reports = []
            
            # 转换USGS数据
            if usgs_data:
                usgs_df = self.unified_model.transform_usgs_to_unified(usgs_data)
                dataframes.append(usgs_df)
                usgs_quality = self.quality_monitor.assess_quality(usgs_df, 'USGS')
                quality_reports.append(usgs_quality)
            
            # 转换NASA数据
            if nasa_data:
                nasa_df = self.unified_model.transform_nasa_to_unified(nasa_data)
                dataframes.append(nasa_df)
                nasa_quality = self.quality_monitor.assess_quality(nasa_df, 'NASA')
                quality_reports.append(nasa_quality)
            
            # 转换GDACS数据
            if gdacs_data:
                gdacs_df = self.unified_model.transform_gdacs_to_unified(gdacs_data)
                dataframes.append(gdacs_df)
                gdacs_quality = self.quality_monitor.assess_quality(gdacs_df, 'GDACS')
                quality_reports.append(gdacs_quality)
            
            # 合并数据源
            unified_df = self.unified_model.merge_sources(*dataframes)
            
            # 对合并后的数据进行整体质量评估
            merged_quality = self.quality_monitor.assess_quality(unified_df, 'MERGED')
            
            # 比较数据源质量
            source_comparison = self.quality_monitor.compare_sources(quality_reports)
            
            return {
                'unified_data': unified_df,
                'total_records': len(unified_df),
                'source_records': {
                    'USGS': len(dataframes[0]) if usgs_data and len(dataframes) > 0 else 0,
                    'NASA': len(dataframes[1]) if nasa_data and len(dataframes) > 1 else 0,
                    'GDACS': len(dataframes[2]) if gdacs_data and len(dataframes) > 2 else 0
                },
                'merged_quality': merged_quality,
                'source_quality_reports': quality_reports,
                'source_comparison': source_comparison
            }
            
        except Exception as e:
            self.logger.error(f"Multi-source merge failed: {e}")
            raise
    
    def _handle_missing_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """处理缺失值"""
        # magnitude缺失值用中位数填充
        if 'magnitude' in df.columns:
            median_magnitude = df['magnitude'].median()
            if pd.isna(median_magnitude):
                median_magnitude = 5.0  # 默认值
            df['magnitude'] = df['magnitude'].fillna(median_magnitude)
        
        # severity缺失值用默认值
        if 'severity' in df.columns:
            df['severity'] = df['severity'].fillna('UNKNOWN')
        
        return df
    
    def _handle_outliers(self, df: pd.DataFrame) -> pd.DataFrame:
        """处理异常值 - 使用3σ原则"""
        if 'magnitude' in df.columns:
            magnitude_data = df['magnitude'].dropna()
            if len(magnitude_data) > 2:
                mean = magnitude_data.mean()
                std = magnitude_data.std()
                
                # 3σ原则：超出±3σ的值视为异常
                lower_bound = mean - 3 * std
                upper_bound = mean + 3 * std
                
                # 将异常值替换为边界值
                df.loc[df['magnitude'] < lower_bound, 'magnitude'] = lower_bound
                df.loc[df['magnitude'] > upper_bound, 'magnitude'] = upper_bound
        
        return df
    
    def _standardize_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """数据标准化"""
        # 统一类型命名
        type_mapping = {
            'earthquake': 'EARTHQUAKE',
            'volcano': 'VOLCANO',
            'storm': 'STORM',
            'flood': 'FLOOD',
            'wildfire': 'WILDFIRE'
        }
        
        if 'type' in df.columns:
            df['type'] = df['type'].str.upper()
            df['type'] = df['type'].replace(type_mapping)
        
        return df
    
    def _check_completeness(self, df: pd.DataFrame) -> float:
        """检查数据完整性"""
        required_fields = ['id', 'type', 'timestamp', 'coordinates']
        completeness_scores = []
        
        for field in required_fields:
            if field in df.columns:
                non_null_ratio = df[field].notna().sum() / len(df)
                completeness_scores.append(non_null_ratio)
        
        return np.mean(completeness_scores) if completeness_scores else 0.0
    
    def _check_accuracy(self, df: pd.DataFrame) -> float:
        """检查数据准确性"""
        # 时间戳格式准确性
        if 'timestamp' in df.columns:
            valid_timestamps = pd.to_datetime(df['timestamp'], errors='coerce').notna().sum()
            return valid_timestamps / len(df)
        return 1.0
    
    def _check_consistency(self, df: pd.DataFrame) -> float:
        """检查数据一致性"""
        # 检查类型一致性
        if 'type' in df.columns:
            valid_types = ['EARTHQUAKE', 'VOLCANO', 'STORM', 'FLOOD', 'WILDFIRE', 
                          'HURRICANE', 'TYPHOON', 'DROUGHT', 'LANDSLIDE']
            consistent = df['type'].isin(valid_types).sum()
            return consistent / len(df)
        return 1.0
    
    def _check_validity(self, df: pd.DataFrame) -> float:
        """检查震级、坐标、时间戳和类型字段的有效性。"""
        validity_scores = []
        
        # 震级有效性（0-10）
        if 'magnitude' in df.columns:
            non_null_count = df['magnitude'].notna().sum()
            if non_null_count > 0:
                valid_magnitude = df['magnitude'].between(0, 10, inclusive='both').sum()
                validity_scores.append(valid_magnitude / non_null_count)
            else:
                validity_scores.append(0.8)
        
        # 坐标有效性（经度-180到180，纬度-90到90）
        if 'coordinates' in df.columns:
            valid_coords = df['coordinates'].apply(
                lambda x: isinstance(x, list) and len(x) >= 2 and 
                         -180 <= x[0] <= 180 and -90 <= x[1] <= 90
            ).sum()
            validity_scores.append(valid_coords / len(df))
        
        # 时间戳有效性
        if 'timestamp' in df.columns:
            valid_timestamps = pd.to_datetime(df['timestamp'], errors='coerce').notna().sum()
            validity_scores.append(valid_timestamps / len(df))
        
        # 类型有效性
        if 'type' in df.columns:
            valid_types = df['type'].notna().sum()
            validity_scores.append(valid_types / len(df))
        
        # 计算平均分
        final_score = np.mean(validity_scores) if validity_scores else 0.5
        return float(final_score) if not pd.isna(final_score) else 0.5
    
    def _check_timeliness(self, df: pd.DataFrame) -> float:
        """根据记录时间与当前时间的差值计算时效评分。"""
        if 'timestamp' not in df.columns or len(df) == 0:
            return 0.5
        
        try:
            timestamps = pd.to_datetime(df['timestamp'], errors='coerce').dropna()
            if len(timestamps) == 0:
                return 0.3
            
            now = pd.Timestamp.now()
            time_diffs = (now - timestamps).dt.total_seconds()
            
            # 根据时间差评分：
            # 0-24小时：1.0
            # 24-72小时：0.9
            # 72小时-7天：0.8
            # 7-30天：0.7
            # >30天：0.6
            scores = []
            for diff in time_diffs:
                hours = diff / 3600
                if hours <= 24:
                    scores.append(1.0)
                elif hours <= 72:
                    scores.append(0.9)
                elif hours <= 168:  # 7天
                    scores.append(0.8)
                elif hours <= 720:  # 30天
                    scores.append(0.7)
                else:
                    scores.append(0.6)
            
            return float(np.mean(scores))
        except Exception as e:
            self.logger.error(f"Timeliness check failed: {e}")
            return 0.5
        if 'timestamp' in df.columns:
            try:
                df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce', utc=True)
                now_utc = pd.Timestamp.now(tz='UTC')
                cutoff_date = now_utc - pd.Timedelta(days=90)
                recent_data = df[df['timestamp'] > cutoff_date]
                return float(len(recent_data) / len(df)) if len(df) > 0 else 0.0
            except Exception as e:
                logger.error(f"Timeliness check failed: {str(e)}")
                return 0.5
        return 1.0
