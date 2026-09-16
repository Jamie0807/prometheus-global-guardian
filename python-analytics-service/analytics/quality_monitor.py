#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据质量监控 - 五维质量评估体系
实现完整性、准确性、一致性、时效性、有效性监控
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Tuple
from datetime import datetime, timedelta
import logging


class DataQualityMonitor:
    """数据质量监控器 - 五维质量评估"""
    
    # 质量阈值配置
    QUALITY_THRESHOLDS = {
        'completeness': 0.90,      # 完整性 ≥ 90%
        'accuracy': 0.95,          # 准确性 ≥ 95%
        'consistency': 0.98,       # 一致性 ≥ 98%
        'timeliness': 0.85,        # 时效性 ≥ 85%
        'validity': 0.95           # 有效性 ≥ 95%
    }
    
    # 必填字段定义
    REQUIRED_FIELDS = ['id', 'type', 'timestamp', 'latitude', 'longitude']
    
    # 数据范围约束
    DATA_CONSTRAINTS = {
        'latitude': (-90, 90),
        'longitude': (-180, 180),
        'magnitude': (0, 10),
        'populationExposed': (0, float('inf')),
        'confidence': (0, 1)
    }
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.quality_history: List[Dict] = []

    @staticmethod
    def _bounded_score(value: Any) -> float:
        """确保质量评分为有限值，并处于文档定义的 0..1 范围内。"""
        try:
            numeric_value = float(value)
        except (TypeError, ValueError):
            return 0.0

        if not np.isfinite(numeric_value):
            return 0.0
        return round(float(np.clip(numeric_value, 0.0, 1.0)), 4)
    
    def assess_quality(self, df: pd.DataFrame, source: str = 'unknown') -> Dict[str, Any]:
        """
        综合评估数据质量
        
        返回格式:
        {
            'overall_score': 0.95,
            'dimensions': {
                'completeness': {'score': 0.98, 'status': 'pass', 'details': {...}},
                'accuracy': {...},
                ...
            },
            'issues': [...],
            'recommendations': [...]
        }
        """
        if df.empty:
            return self._empty_quality_report(source)
        
        # 评估各个维度
        dimension_results = {
            'completeness': self._check_completeness(df),
            'accuracy': self._check_accuracy(df),
            'consistency': self._check_consistency(df),
            'timeliness': self._check_timeliness(df),
            'validity': self._check_validity(df),
        }

        for dimension_name, dimension_data in dimension_results.items():
            dimension_data['score'] = self._bounded_score(dimension_data.get('score'))
            dimension_data['status'] = (
                'pass'
                if dimension_data['score'] >= self.QUALITY_THRESHOLDS[dimension_name]
                else 'fail'
            )
        
        # 计算综合得分（加权平均）
        weights = {
            'completeness': 0.25,
            'accuracy': 0.25,
            'consistency': 0.20,
            'timeliness': 0.15,
            'validity': 0.15
        }
        
        overall_score = (
            dimension_results['completeness']['score'] * weights['completeness'] +
            dimension_results['accuracy']['score'] * weights['accuracy'] +
            dimension_results['consistency']['score'] * weights['consistency'] +
            dimension_results['timeliness']['score'] * weights['timeliness'] +
            dimension_results['validity']['score'] * weights['validity']
        )
        overall_score = self._bounded_score(overall_score)
        
        # 收集所有问题
        all_issues = []
        all_recommendations = []
        
        for dimension_data in dimension_results.values():
            all_issues.extend(dimension_data.get('issues', []))
            all_recommendations.extend(dimension_data.get('recommendations', []))
        
        report = {
            'source': source,
            'timestamp': datetime.now().isoformat(),
            'record_count': len(df),
            'overall_score': round(overall_score, 4),
            'overall_status': 'pass' if overall_score >= 0.85 else 'warning' if overall_score >= 0.70 else 'fail',
            'dimensions': {
                **dimension_results,
            },
            'issues': all_issues,
            'recommendations': all_recommendations
        }
        
        # 记录历史
        self.quality_history.append(report)
        
        return report
    
    def _check_completeness(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        维度1: 完整性检查
        检查必填字段是否完整、缺失值比例
        """
        issues = []
        recommendations = []
        
        # 检查必填字段
        missing_fields = [field for field in self.REQUIRED_FIELDS if field not in df.columns]
        if missing_fields:
            issues.append(f"Missing required fields: {', '.join(missing_fields)}")
            recommendations.append(f"Add missing fields: {', '.join(missing_fields)}")
        
        # 计算各字段完整度
        field_completeness = {}
        total_completeness = 0
        
        for col in df.columns:
            non_null_count = df[col].notna().sum()
            completeness_rate = non_null_count / len(df) if len(df) > 0 else 0
            field_completeness[col] = round(completeness_rate, 4)
            
            if col in self.REQUIRED_FIELDS and completeness_rate < 1.0:
                missing_count = len(df) - non_null_count
                issues.append(f"Required field '{col}' has {missing_count} missing values")
                recommendations.append(f"Fill missing values in '{col}' field")
            
            total_completeness += completeness_rate
        
        avg_completeness = total_completeness / len(df.columns) if len(df.columns) > 0 else 0
        
        return {
            'score': round(avg_completeness, 4),
            'status': 'pass' if avg_completeness >= self.QUALITY_THRESHOLDS['completeness'] else 'fail',
            'field_completeness': field_completeness,
            'missing_fields': missing_fields,
            'issues': issues,
            'recommendations': recommendations
        }
    
    def _check_accuracy(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        维度2: 准确性检查
        检查数据范围、格式、异常值
        """
        issues = []
        recommendations = []
        out_of_range_count = 0
        total_checks = 0
        
        # 检查数值范围
        for field, (min_val, max_val) in self.DATA_CONSTRAINTS.items():
            if field in df.columns:
                valid_data = df[field].notna()
                total_checks += valid_data.sum()
                
                out_of_range = valid_data & ((df[field] < min_val) | (df[field] > max_val))
                out_of_range_count += out_of_range.sum()
                
                if out_of_range.any():
                    count = out_of_range.sum()
                    issues.append(f"Field '{field}' has {count} values out of range [{min_val}, {max_val}]")
                    recommendations.append(f"Validate and correct out-of-range values in '{field}'")
        
        # 检查坐标有效性
        if 'latitude' in df.columns and 'longitude' in df.columns:
            invalid_coords = (df['latitude'] == 0) & (df['longitude'] == 0)
            if invalid_coords.any():
                count = invalid_coords.sum()
                issues.append(f"{count} records have invalid coordinates (0, 0)")
                recommendations.append("Update records with valid geographic coordinates")
                out_of_range_count += count
                total_checks += len(df)
        
        # 计算准确性得分
        accuracy_score = 1 - (out_of_range_count / total_checks) if total_checks > 0 else 1.0
        
        return {
            'score': round(accuracy_score, 4),
            'status': 'pass' if accuracy_score >= self.QUALITY_THRESHOLDS['accuracy'] else 'fail',
            'out_of_range_count': int(out_of_range_count),
            'total_checks': int(total_checks),
            'issues': issues,
            'recommendations': recommendations
        }
    
    def _check_consistency(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        维度3: 一致性检查
        检查数据格式统一性、类型一致性、重复记录
        """
        issues = []
        recommendations = []
        inconsistency_count = 0
        
        # 检查重复记录
        if 'id' in df.columns:
            duplicate_count = df['id'].duplicated().sum()
            if duplicate_count > 0:
                issues.append(f"Found {duplicate_count} duplicate IDs")
                recommendations.append("Remove or merge duplicate records")
                inconsistency_count += duplicate_count
        
        # 检查类型一致性
        type_inconsistencies = 0
        if 'type' in df.columns:
            # 检查是否有未知类型
            known_types = {'EARTHQUAKE', 'WILDFIRE', 'FLOOD', 'VOLCANO', 'CYCLONE', 'STORM'}
            normalized_types = df['type'].dropna().astype(str).str.upper()
            unknown_types = set(normalized_types.unique()) - known_types
            if unknown_types:
                issues.append(f"Found unknown hazard types: {', '.join(unknown_types)}")
                recommendations.append("Standardize hazard type naming")
                type_inconsistencies = normalized_types.isin(unknown_types).sum()
                inconsistency_count += type_inconsistencies
        
        # 检查源一致性
        if 'source' in df.columns:
            known_sources = {'USGS', 'NASA', 'GDACS', 'DISASTERAWARE'}
            normalized_sources = df['source'].dropna().astype(str).str.upper()
            unknown_sources = set(normalized_sources.unique()) - known_sources
            if unknown_sources:
                issues.append(f"Found unknown data sources: {', '.join(unknown_sources)}")
                recommendations.append("Verify and standardize data source names")
                inconsistency_count += normalized_sources.isin(unknown_sources).sum()
        
        # 检查严重程度一致性
        if 'severity' in df.columns:
            known_severities = {'LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'MODERATE', 'WARNING', 'WATCH'}
            normalized_severities = df['severity'].dropna().astype(str).str.upper()
            unknown_severities = set(normalized_severities.unique()) - known_severities
            if unknown_severities:
                issues.append(f"Found invalid severity levels: {', '.join(map(str, unknown_severities))}")
                recommendations.append("Recalculate severity levels using standard thresholds")
                inconsistency_count += normalized_severities.isin(unknown_severities).sum()
        
        total_records = len(df)
        consistency_score = 1 - (inconsistency_count / total_records) if total_records > 0 else 1.0
        
        return {
            'score': round(consistency_score, 4),
            'status': 'pass' if consistency_score >= self.QUALITY_THRESHOLDS['consistency'] else 'fail',
            'inconsistency_count': int(inconsistency_count),
            'duplicate_count': int(duplicate_count) if 'id' in df.columns else 0,
            'issues': issues,
            'recommendations': recommendations
        }
    
    def _check_timeliness(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        维度4: 时效性检查
        检查数据新鲜度、更新频率
        """
        issues = []
        recommendations = []
        
        if 'timestamp' not in df.columns or df['timestamp'].isna().all():
            return {
                'score': 0.0,
                'status': 'fail',
                'issues': ['Timestamp field is missing or empty'],
                'recommendations': ['Add valid timestamp data']
            }
        
        try:
            now = pd.Timestamp.now(tz='UTC')
            timestamps = pd.to_datetime(df['timestamp'], utc=True)
            
            # 计算数据年龄
            ages = (now - timestamps).dt.total_seconds() / 3600  # 转换为小时
            
            # 定义时效性等级
            # < 1天: 优秀 (1.0)
            # 1-7天: 良好 (0.9)
            # 7-30天: 一般 (0.7)
            # > 30天: 过时 (0.5)
            
            recent_count = (ages <= 24).sum()           # 1天内
            week_count = ((ages > 24) & (ages <= 168)).sum()  # 1-7天
            month_count = ((ages > 168) & (ages <= 720)).sum()  # 7-30天
            old_count = (ages > 720).sum()              # 30天以上
            
            total = len(df)
            timeliness_score = (
                (recent_count * 1.0 + 
                 week_count * 0.9 + 
                 month_count * 0.7 + 
                 old_count * 0.5) / total
            ) if total > 0 else 0
            
            # 检查未来时间戳（异常）
            future_count = (timestamps.dt.tz_localize(None) > now.tz_localize(None)).sum() if timestamps.dt.tz is not None else (timestamps > now).sum()
            if future_count > 0:
                issues.append(f"{future_count} records have future timestamps")
                recommendations.append("Correct records with future timestamps")
            
            # 检查过时数据
            if old_count > 0:
                issues.append(f"{old_count} records are older than 30 days")
                recommendations.append("Update or archive outdated records")
            
            return {
                'score': round(timeliness_score, 4),
                'status': 'pass' if timeliness_score >= self.QUALITY_THRESHOLDS['timeliness'] else 'fail',
                'age_distribution': {
                    'recent_1day': int(recent_count),
                    'recent_7days': int(week_count),
                    'recent_30days': int(month_count),
                    'older_30days': int(old_count)
                },
                'future_timestamps': int(future_count),
                'issues': issues,
                'recommendations': recommendations
            }
        except Exception as e:
            self.logger.error(f"Timeliness check failed: {e}")
            return {
                'score': 0.0,
                'status': 'error',
                'issues': [f"Failed to assess timeliness: {str(e)}"],
                'recommendations': ['Check timestamp format and data']
            }
    
    def _check_validity(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        维度5: 有效性检查
        检查数据逻辑合理性、业务规则符合性
        """
        issues = []
        recommendations = []
        invalid_count = 0
        total_checks = 0
        
        # 检查置信度合理性
        if 'confidence' in df.columns:
            total_checks += len(df)
            low_confidence = df['confidence'] < 0.5
            invalid_count += low_confidence.sum()
            
            if low_confidence.any():
                count = low_confidence.sum()
                issues.append(f"{count} records have low confidence (<0.5)")
                recommendations.append("Review and verify low-confidence records")
        
        # 检查严重程度与震级匹配
        if 'severity' in df.columns and 'magnitude' in df.columns and 'type' in df.columns:
            for hazard_type in df['type'].unique():
                type_mask = df['type'] == hazard_type
                type_data = df[type_mask]
                
                # 简单检查：critical级别应该有较高的magnitude
                critical_mask = type_data['severity'].astype(str).str.upper() == 'CRITICAL'
                if critical_mask.any():
                    critical_data = type_data[critical_mask]
                    low_mag_critical = critical_data['magnitude'] < 5.0  # 示例阈值
                    
                    if low_mag_critical.any():
                        count = low_mag_critical.sum()
                        issues.append(f"{count} {hazard_type} records marked 'critical' have low magnitude")
                        recommendations.append(f"Recalculate severity for {hazard_type} events")
                        invalid_count += count
                        total_checks += len(critical_data)
        
        # 检查人口暴露合理性
        if 'populationExposed' in df.columns:
            # 检查异常高的人口值（可能是错误）
            if df['populationExposed'].max() > 100_000_000:  # 1亿人口
                extreme_pop = df['populationExposed'] > 100_000_000
                count = extreme_pop.sum()
                issues.append(f"{count} records have unrealistic population exposure (>100M)")
                recommendations.append("Verify population exposure calculations")
                invalid_count += count
            total_checks += len(df)
        
        validity_score = 1 - (invalid_count / total_checks) if total_checks > 0 else 1.0
        
        return {
            'score': round(validity_score, 4),
            'status': 'pass' if validity_score >= self.QUALITY_THRESHOLDS['validity'] else 'fail',
            'invalid_count': int(invalid_count),
            'total_checks': int(total_checks),
            'issues': issues,
            'recommendations': recommendations
        }
    
    def _empty_quality_report(self, source: str) -> Dict[str, Any]:
        """返回空数据集的质量报告"""
        return {
            'source': source,
            'timestamp': datetime.now().isoformat(),
            'record_count': 0,
            'overall_score': 0.0,
            'overall_status': 'fail',
            'dimensions': {},
            'issues': ['No data to assess'],
            'recommendations': ['Ensure data is being collected properly']
        }
    
    def get_quality_trend(self, limit: int = 10) -> List[Dict]:
        """获取质量趋势（最近N次评估）"""
        return self.quality_history[-limit:] if self.quality_history else []
    
    def compare_sources(self, reports: List[Dict]) -> Dict[str, Any]:
        """比较不同数据源的质量"""
        if not reports:
            return {}
        
        comparison = {
            'sources': [],
            'average_scores': {},
            'best_source': None,
            'worst_source': None
        }
        
        for report in reports:
            source = report.get('source', 'unknown')
            score = report.get('overall_score', 0)
            
            comparison['sources'].append({
                'source': source,
                'score': score,
                'status': report.get('overall_status', 'unknown'),
                'record_count': report.get('record_count', 0)
            })
            
            comparison['average_scores'][source] = score
        
        if comparison['average_scores']:
            comparison['best_source'] = max(comparison['average_scores'], 
                                           key=comparison['average_scores'].get)
            comparison['worst_source'] = min(comparison['average_scores'], 
                                            key=comparison['average_scores'].get)
        
        return comparison
