#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
风险评估模块 - 综合风险计算与评级
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any
import logging
from datetime import datetime, timedelta

def clean_for_json(obj):
    """清理数据中的NaN和Infinity值，使其可以被JSON序列化"""
    if isinstance(obj, dict):
        return {k: clean_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_for_json(item) for item in obj]
    elif isinstance(obj, float):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return obj
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    return obj

class RiskAssessor:
    """风险评估器
    
    优化特性：
    - 动态权重调整
    - 性能监控
    - 更细粒度的风险分级
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        # 优化：可配置的风险权重
        self.risk_weights = {
            'EARTHQUAKE': 0.25,
            'VOLCANO': 0.15,
            'STORM': 0.25,
            'FLOOD': 0.20,
            'WILDFIRE': 0.15
        }
        # 优化：更细粒度的严重性权重
        self.severity_weights = {
            'CRITICAL': 2.0,
            'HIGH': 1.5,
            'MODERATE': 1.0,
            'LOW': 0.5,
            'MINIMAL': 0.2
        }
    
    def _validate_dataframe(self, df: pd.DataFrame) -> bool:
        """验证数据框的有效性"""
        if df is None or len(df) == 0:
            self.logger.warning("Empty dataframe for risk assessment")
            return False
        
        if 'type' not in df.columns:
            self.logger.error("Missing 'type' column in dataframe")
            return False
        
        return True
        
    def calculate_comprehensive_risk(self, df: pd.DataFrame) -> Dict[str, Any]:
        """计算综合风险评估
        
        优化：
        - 数据验证
        - 性能监控
        - 更好的错误处理
        """
        start_time = datetime.now()
        
        try:
            # 数据验证
            if not self._validate_dataframe(df):
                raise ValueError("Invalid dataframe for risk assessment")
            
            recommendation_details = self._generate_recommendation_details(df)
            risk_results = {
                "overallRiskScore": self._calculate_overall_risk(df),
                "typeRisks": self._calculate_type_risks(df),
                "geographicRisks": self._identify_high_risk_regions(df),
                "temporalRisks": self._analyze_temporal_risks(df),
                "populationImpact": self._assess_population_impact(df),
                "recommendations": [item["message"] for item in recommendation_details],
                "recommendationDetails": recommendation_details,
            }
            
            elapsed = (datetime.now() - start_time).total_seconds()
            self.logger.info(f"Risk assessment completed in {elapsed:.3f}s for {len(df)} records")
            
            # 清理所有NaN和Infinity值
            return clean_for_json(risk_results)
            
        except Exception as e:
            self.logger.error(f"Risk assessment failed: {e}", exc_info=True)
            raise
    
    def _calculate_overall_risk(self, df: pd.DataFrame) -> Dict[str, Any]:
        """计算总体风险分数"""
        if len(df) == 0:
            return {"score": 0, "level": "MINIMAL"}
        
        # 基于类型的加权计算
        type_counts = df['type'].value_counts().to_dict()
        weighted_score = 0
        
        for hazard_type, weight in self.risk_weights.items():
            count = type_counts.get(hazard_type, 0)
            weighted_score += count * weight * 10  # 归一化因子
        
        # 严重性加权
        if 'severity' in df.columns:
            severity_weights = {'HIGH': 1.5, 'MODERATE': 1.0, 'LOW': 0.5}
            for severity, multiplier in severity_weights.items():
                count = len(df[df['severity'] == severity])
                weighted_score += count * multiplier
        
        # 标准化到0-100
        normalized_score = min(100, weighted_score)
        
        risk_level = self._get_risk_level(normalized_score)
        
        return {
            "score": round(normalized_score, 1),
            "level": risk_level,
            "trend": self._calculate_risk_trend(df)
        }
    
    def _calculate_type_risks(self, df: pd.DataFrame) -> Dict[str, Any]:
        """按类型计算风险"""
        type_risks = {}
        
        for hazard_type in df['type'].unique():
            type_df = df[df['type'] == hazard_type]
            
            # 计算该类型的风险分数
            count = len(type_df)
            avg_magnitude = type_df['magnitude'].mean() if 'magnitude' in type_df.columns else 5.0
            
            risk_score = count * avg_magnitude * self.risk_weights.get(hazard_type, 0.1)
            
            type_risks[hazard_type] = {
                "count": count,
                "riskScore": round(risk_score, 2),
                "averageMagnitude": round(avg_magnitude, 2) if not pd.isna(avg_magnitude) else None,
                "weight": self.risk_weights.get(hazard_type, 0.1)
            }
        
        return type_risks
    
    def _identify_high_risk_regions(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """识别高风险地理区域"""
        if 'coordinates' not in df.columns or len(df) == 0:
            return []
        
        # 简化：基于灾害密度识别热点
        # 实际应用中可以使用DBSCAN聚类
        
        # 按经纬度网格统计
        df_copy = df.copy()
        df_copy['lat'] = df_copy['coordinates'].apply(lambda x: round(x[1], 0) if isinstance(x, list) and len(x) >= 2 else 0)
        df_copy['lon'] = df_copy['coordinates'].apply(lambda x: round(x[0], 0) if isinstance(x, list) and len(x) >= 2 else 0)
        
        region_counts = df_copy.groupby(['lat', 'lon']).size().reset_index(name='count')
        region_counts = region_counts.sort_values('count', ascending=False).head(5)
        
        high_risk_regions = []
        for _, row in region_counts.iterrows():
            high_risk_regions.append({
                "location": {"lat": float(row['lat']), "lon": float(row['lon'])},
                "hazardCount": int(row['count']),
                "riskLevel": "HIGH" if row['count'] > 10 else "MODERATE"
            })
        
        return high_risk_regions
    
    def _analyze_temporal_risks(self, df: pd.DataFrame) -> Dict[str, Any]:
        """分析时间维度风险"""
        if 'timestamp' not in df.columns:
            return {}
        
        df['date'] = pd.to_datetime(df['timestamp']).dt.date
        
        # 最近7天 vs 前7天
        now = datetime.now().date()
        recent_7days = df[df['date'] >= (now - timedelta(days=7))]
        previous_7days = df[(df['date'] >= (now - timedelta(days=14))) & 
                           (df['date'] < (now - timedelta(days=7)))]
        
        recent_count = len(recent_7days)
        previous_count = len(previous_7days)
        
        growth_rate = ((recent_count - previous_count) / previous_count * 100) if previous_count > 0 else 0
        
        return {
            "recent7Days": recent_count,
            "previous7Days": previous_count,
            "growthRate": round(growth_rate, 1),
            "trend": "increasing" if growth_rate > 10 else ("decreasing" if growth_rate < -10 else "stable")
        }
    
    def _assess_population_impact(self, df: pd.DataFrame) -> Dict[str, Any]:
        """评估人口影响"""
        if 'populationExposed' not in df.columns:
            return {"totalExposed": 0}
        
        total_exposed = df['populationExposed'].sum()
        high_impact_events = len(df[df['populationExposed'] > 100000])
        
        return {
            "totalExposed": int(total_exposed) if not pd.isna(total_exposed) else 0,
            "highImpactEvents": high_impact_events,
            "averageExposure": int(df['populationExposed'].mean()) if not pd.isna(df['populationExposed'].mean()) else 0
        }
    
    def _generate_recommendation_details(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Generate recommendations with stable rule metadata for the UI."""
        recommendations: List[Dict[str, Any]] = []
        overall_risk = self._calculate_overall_risk(df)
        if overall_risk['score'] >= 80:
            recommendations.append({
                "ruleId": "overall_critical",
                "severity": "critical",
                "message": "Immediate action required. Activate emergency response protocols.",
                "metrics": {"score": overall_risk["score"], "threshold": 80},
            })
        elif overall_risk['score'] >= 60:
            recommendations.append({
                "ruleId": "overall_high",
                "severity": "warning",
                "message": "Enhance monitoring and prepare response teams.",
                "metrics": {"score": overall_risk["score"], "threshold": 60},
            })

        temporal = self._analyze_temporal_risks(df)
        if temporal.get('trend') == 'increasing':
            growth_rate = float(temporal.get("growthRate", 0))
            recommendations.append({
                "ruleId": "temporal_increasing",
                "severity": "warning",
                "message": "Activity is increasing. Intensify surveillance.",
                "metrics": {"growthRate": growth_rate, "threshold": 10},
            })

        type_counts = df['type'].value_counts()
        if 'EARTHQUAKE' in type_counts.index and type_counts['EARTHQUAKE'] > 50:
            recommendations.append({
                "ruleId": "earthquake_activity",
                "severity": "warning",
                "message": "High seismic activity detected. Review building safety protocols.",
                "metrics": {"eventCount": int(type_counts['EARTHQUAKE']), "threshold": 50},
            })

        if not recommendations:
            recommendations.append({
                "ruleId": "standard_monitoring",
                "severity": "info",
                "message": "Maintain standard monitoring procedures.",
                "metrics": {"score": overall_risk["score"], "threshold": 20},
            })

        return recommendations

    def _generate_recommendations(self, df: pd.DataFrame) -> List[str]:
        """保持旧字符串建议字段的兼容入口。"""
        return [item["message"] for item in self._generate_recommendation_details(df)]
    
    def _calculate_risk_trend(self, df: pd.DataFrame) -> str:
        """计算风险趋势"""
        temporal = self._analyze_temporal_risks(df)
        return temporal.get('trend', 'stable')
    
    def _get_risk_level(self, score: float) -> str:
        """获取风险等级"""
        if score >= 80:
            return "CRITICAL"
        elif score >= 60:
            return "HIGH"
        elif score >= 40:
            return "MODERATE"
        elif score >= 20:
            return "LOW"
        else:
            return "MINIMAL"
