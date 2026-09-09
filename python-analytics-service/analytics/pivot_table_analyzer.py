#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
4维数据透视表分析引擎
Four-Dimensional Pivot Table Analyzer

实现时间×地理×类型×严重性的多维度数据分析
支持动态切片、趋势分析、风险评分等高级功能
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from scipy.stats import linregress
from typing import Dict, List, Any, Tuple, Optional, Union
import logging

logger = logging.getLogger(__name__)


class FourDimensionalPivotTable:
    """4维数据透视表分析引擎
    
    维度说明：
    - 时间维度：year/quarter/month/week/day/hour
    - 地理维度：region/continent/lat_bin/lng_bin
    - 类型维度：hazard type (EARTHQUAKE, VOLCANO, etc.)
    - 严重性维度：severity level (WARNING/WATCH/ADVISORY)
    
    核心功能：
    - 多维度透视表构建
    - 动态切片查询
    - 趋势分析
    - 风险评分
    - 多维度联合查询
    """
    
    def __init__(self, df: pd.DataFrame):
        """初始化，预处理数据
        
        Args:
            df: 原始数据DataFrame，需包含基础字段
        """
        self.df = df.copy()
        self._preprocess_data()
        logger.info(f"4维透视表初始化完成，数据量: {len(self.df)}")
    
    def _preprocess_data(self):
        """数据预处理：时间解析、地理分组、类型标准化"""
        # 1. 时间维度：解析时间戳，提取多层级时间特征
        if 'date' in self.df.columns:
            self.df['timestamp'] = pd.to_datetime(self.df['date'], errors='coerce')
        elif 'timestamp' in self.df.columns:
            self.df['timestamp'] = pd.to_datetime(self.df['timestamp'], errors='coerce')
        else:
            logger.warning("未找到时间字段，使用当前时间")
            self.df['timestamp'] = pd.Timestamp.now()
        
        # 提取时间特征
        self.df['year'] = self.df['timestamp'].dt.year
        self.df['quarter'] = self.df['timestamp'].dt.quarter
        self.df['month'] = self.df['timestamp'].dt.month
        self.df['week'] = self.df['timestamp'].dt.isocalendar().week
        self.df['day'] = self.df['timestamp'].dt.day
        self.df['hour'] = self.df['timestamp'].dt.hour
        self.df['date_only'] = self.df['timestamp'].dt.date
        self.df['year_month'] = self.df['timestamp'].dt.to_period('M').astype(str)
        
        # 2. 地理维度：经纬度分组，地理区域分类
        if 'coordinates' in self.df.columns:
            # 从coordinates数组提取经纬度
            self.df['lng'] = self.df['coordinates'].apply(
                lambda x: x[0] if isinstance(x, (list, tuple)) and len(x) >= 2 else 0
            )
            self.df['lat'] = self.df['coordinates'].apply(
                lambda x: x[1] if isinstance(x, (list, tuple)) and len(x) >= 2 else 0
            )
        else:
            # 如果没有coordinates字段，尝试直接使用lat/lng
            if 'lat' not in self.df.columns:
                self.df['lat'] = 0
            if 'lng' not in self.df.columns:
                self.df['lng'] = 0
        
        # 地理区域分类
        self.df['region'] = self.df.apply(self._classify_region, axis=1)
        self.df['continent'] = self.df.apply(self._classify_continent, axis=1)
        
        # 经纬度网格分组（10度为一格）
        self.df['lat_bin'] = (self.df['lat'] // 10).astype(int) * 10
        self.df['lng_bin'] = (self.df['lng'] // 10).astype(int) * 10
        self.df['geo_grid'] = self.df.apply(
            lambda row: f"({row['lat_bin']},{row['lng_bin']})", axis=1
        )
        
        # 3. 类型维度：标准化灾害类型
        if 'type' in self.df.columns:
            self.df['type_category'] = self.df['type'].str.upper()
        else:
            self.df['type_category'] = 'UNKNOWN'
        
        # 4. 严重性维度：三级分类和数值化
        if 'severity' in self.df.columns:
            self.df['severity_level'] = self.df['severity'].map({
                'WARNING': 3,
                'WATCH': 2,
                'ADVISORY': 1
            }).fillna(0)
        else:
            self.df['severity'] = 'UNKNOWN'
            self.df['severity_level'] = 0
        
        logger.info("数据预处理完成")
    
    def _classify_region(self, row) -> str:
        """地理区域分类算法"""
        lat, lng = row.get('lat', 0), row.get('lng', 0)
        
        # 亚太地区
        if -10 <= lat <= 60 and 60 <= lng <= 180:
            return 'Asia-Pacific'
        # 北美地区
        elif 15 <= lat <= 75 and -170 <= lng <= -50:
            return 'North America'
        # 欧洲地区
        elif 35 <= lat <= 70 and -10 <= lng <= 60:
            return 'Europe'
        # 南美地区
        elif -60 <= lat <= 15 and -85 <= lng <= -30:
            return 'South America'
        # 非洲地区
        elif -35 <= lat <= 40 and -20 <= lng <= 55:
            return 'Africa'
        else:
            return 'Other'
    
    def _classify_continent(self, row) -> str:
        """大洲分类"""
        lat, lng = row.get('lat', 0), row.get('lng', 0)
        
        if -10 <= lat <= 80 and 25 <= lng <= 180:
            return 'Asia'
        elif 15 <= lat <= 75 and -170 <= lng <= -50:
            return 'North America'
        elif 35 <= lat <= 70 and -10 <= lng <= 60:
            return 'Europe'
        elif -60 <= lat <= 15 and -85 <= lng <= -30:
            return 'South America'
        elif -35 <= lat <= 40 and -20 <= lng <= 55:
            return 'Africa'
        elif -50 <= lat <= -10 and 110 <= lng <= 180:
            return 'Oceania'
        else:
            return 'Antarctica'
    
    def create_4d_pivot(self, 
                        time_dim: str = 'month',
                        geo_dim: str = 'region', 
                        type_dim: str = 'type_category',
                        severity_dim: str = 'severity',
                        aggfunc: str = 'count',
                        values_col: str = 'id') -> pd.DataFrame:
        """构建4维数据透视表
        
        Args:
            time_dim: 时间维度 (year/quarter/month/week/day/hour/date_only/year_month)
            geo_dim: 地理维度 (region/continent/lat_bin/lng_bin/geo_grid)
            type_dim: 类型维度 (type_category)
            severity_dim: 严重性维度 (severity/severity_level)
            aggfunc: 聚合函数 (count/sum/mean/max/min)
            values_col: 聚合的值列
        
        Returns:
            4维透视表 (MultiIndex DataFrame)
        """
        try:
            # 确保values_col存在
            if values_col not in self.df.columns:
                values_col = self.df.columns[0]  # 使用第一列
            
            pivot_4d = pd.pivot_table(
                self.df,
                values=values_col,
                index=[time_dim, geo_dim],  # 行索引：时间×地理
                columns=[type_dim, severity_dim],  # 列索引：类型×严重性
                aggfunc=aggfunc,
                fill_value=0
            )
            
            logger.info(f"4维透视表构建成功，维度: {pivot_4d.shape}")
            return pivot_4d
        except Exception as e:
            logger.error(f"构建透视表失败: {str(e)}")
            return pd.DataFrame()
    
    def slice_by_time(self, pivot_table: pd.DataFrame, time_value: Any) -> pd.DataFrame:
        """时间维度切片"""
        try:
            return pivot_table.loc[time_value]
        except KeyError:
            logger.warning(f"时间值 {time_value} 不存在")
            return pd.DataFrame()
    
    def slice_by_geo(self, pivot_table: pd.DataFrame, geo_value: str) -> pd.DataFrame:
        """地理维度切片"""
        try:
            return pivot_table.xs(geo_value, level=1)
        except KeyError:
            logger.warning(f"地理值 {geo_value} 不存在")
            return pd.DataFrame()
    
    def slice_by_type(self, pivot_table: pd.DataFrame, type_value: str) -> pd.DataFrame:
        """类型维度切片"""
        try:
            return pivot_table.xs(type_value, level=0, axis=1)
        except KeyError:
            logger.warning(f"类型值 {type_value} 不存在")
            return pd.DataFrame()
    
    def slice_by_severity(self, pivot_table: pd.DataFrame, severity_value: str) -> pd.DataFrame:
        """严重性维度切片"""
        try:
            return pivot_table.xs(severity_value, level=1, axis=1)
        except KeyError:
            logger.warning(f"严重性值 {severity_value} 不存在")
            return pd.DataFrame()
    
    def multi_dimensional_query(self, 
                                 time_range: Optional[Tuple[datetime, datetime]] = None,
                                 regions: Optional[List[str]] = None,
                                 types: Optional[List[str]] = None,
                                 severities: Optional[List[str]] = None) -> pd.DataFrame:
        """多维度联合查询
        
        Args:
            time_range: 时间范围 (start_date, end_date)
            regions: 地理区域列表
            types: 灾害类型列表
            severities: 严重性级别列表
        
        Returns:
            过滤后的DataFrame
        
        Example:
            查询"过去7天，亚太地区，地震类型，WARNING级别"的数据
            result = analyzer.multi_dimensional_query(
                time_range=(datetime.now() - timedelta(days=7), datetime.now()),
                regions=['Asia-Pacific'],
                types=['EARTHQUAKE'],
                severities=['WARNING']
            )
        """
        df_filtered = self.df.copy()
        
        # 时间过滤
        if time_range:
            start_date, end_date = time_range
            df_filtered = df_filtered[
                (df_filtered['timestamp'] >= start_date) & 
                (df_filtered['timestamp'] <= end_date)
            ]
        
        # 地理过滤
        if regions:
            df_filtered = df_filtered[df_filtered['region'].isin(regions)]
        
        # 类型过滤
        if types:
            types_upper = [t.upper() for t in types]
            df_filtered = df_filtered[df_filtered['type_category'].isin(types_upper)]
        
        # 严重性过滤
        if severities:
            severities_upper = [s.upper() for s in severities]
            df_filtered = df_filtered[df_filtered['severity'].isin(severities_upper)]
        
        logger.info(f"多维度查询完成，结果: {len(df_filtered)} 条")
        return df_filtered
    
    def trend_analysis_4d(self, time_window: int = 7) -> pd.DataFrame:
        """4维趋势分析：时间×地理×类型×严重性的趋势变化
        
        Args:
            time_window: 时间窗口（天数）
        
        Returns:
            趋势分析结果DataFrame
        """
        results = {}
        
        # 获取最近N天数据
        end_date = self.df['timestamp'].max()
        start_date = end_date - timedelta(days=time_window)
        
        df_recent = self.df[self.df['timestamp'] >= start_date]
        
        if len(df_recent) == 0:
            logger.warning("时间窗口内没有数据")
            return pd.DataFrame()
        
        # 按日期分组，计算每个维度组合的趋势
        for region in df_recent['region'].unique():
            for hazard_type in df_recent['type_category'].unique():
                for severity in df_recent['severity'].unique():
                    key = f"{region}_{hazard_type}_{severity}"
                    
                    subset = df_recent[
                        (df_recent['region'] == region) &
                        (df_recent['type_category'] == hazard_type) &
                        (df_recent['severity'] == severity)
                    ]
                    
                    if len(subset) > 0:
                        daily_counts = subset.groupby('date_only').size()
                        
                        # 计算趋势（线性回归斜率）
                        if len(daily_counts) >= 3:
                            try:
                                x = np.arange(len(daily_counts))
                                y = daily_counts.values
                                slope, intercept, r_value, p_value, std_err = linregress(x, y)
                                
                                results[key] = {
                                    'region': region,
                                    'type': hazard_type,
                                    'severity': severity,
                                    'total_count': len(subset),
                                    'daily_average': float(daily_counts.mean()),
                                    'trend_slope': float(slope),
                                    'trend_direction': 'increasing' if slope > 0.1 else ('decreasing' if slope < -0.1 else 'stable'),
                                    'r_squared': float(r_value ** 2),
                                    'p_value': float(p_value)
                                }
                            except Exception as e:
                                logger.warning(f"趋势计算失败 {key}: {str(e)}")
        
        if not results:
            logger.warning("没有足够数据进行趋势分析")
            return pd.DataFrame()
        
        return pd.DataFrame.from_dict(results, orient='index')
    
    def risk_score_4d(self, time_window: int = 7) -> pd.DataFrame:
        """4维风险评分：综合时间、地理、类型、严重性计算风险分数
        
        Args:
            time_window: 时间窗口（天数）
        
        Returns:
            风险评分结果DataFrame，按risk_score降序排列
        """
        # 获取最近N天数据
        end_date = self.df['timestamp'].max()
        start_date = end_date - timedelta(days=time_window)
        df_recent = self.df[self.df['timestamp'] >= start_date]
        
        if len(df_recent) == 0:
            logger.warning("时间窗口内没有数据")
            return pd.DataFrame()
        
        risk_scores = []
        
        for region in df_recent['region'].unique():
            for hazard_type in df_recent['type_category'].unique():
                subset = df_recent[
                    (df_recent['region'] == region) &
                    (df_recent['type_category'] == hazard_type)
                ]
                
                if len(subset) > 0:
                    # 计算风险分数
                    frequency_score = len(subset) / time_window  # 日均频率
                    severity_score = subset['severity_level'].mean()  # 平均严重性
                    recent_score = len(subset[subset['timestamp'] >= end_date - timedelta(days=1)]) * 2  # 最近1天权重加倍
                    
                    total_risk = (
                        frequency_score * 0.4 +
                        severity_score * 0.4 +
                        recent_score * 0.2
                    )
                    
                    risk_scores.append({
                        'region': region,
                        'type': hazard_type,
                        'risk_score': float(total_risk),
                        'frequency': float(frequency_score),
                        'severity': float(severity_score),
                        'recency': float(recent_score),
                        'total_events': len(subset),
                        'time_window': time_window
                    })
        
        if not risk_scores:
            return pd.DataFrame()
        
        return pd.DataFrame(risk_scores).sort_values('risk_score', ascending=False)
    
    def get_summary_statistics(self) -> Dict[str, Any]:
        """获取4维数据的汇总统计
        
        Returns:
            包含各维度统计信息的字典
        """
        summary = {
            'total_records': len(self.df),
            'time_range': {
                'start': str(self.df['timestamp'].min()),
                'end': str(self.df['timestamp'].max()),
                'days': (self.df['timestamp'].max() - self.df['timestamp'].min()).days
            },
            'geographic_distribution': {
                'regions': self.df['region'].value_counts().to_dict(),
                'continents': self.df['continent'].value_counts().to_dict()
            },
            'type_distribution': self.df['type_category'].value_counts().to_dict(),
            'severity_distribution': self.df['severity'].value_counts().to_dict(),
            'dimensions': {
                'time_unique': len(self.df['date_only'].unique()),
                'geo_unique': len(self.df['region'].unique()),
                'type_unique': len(self.df['type_category'].unique()),
                'severity_unique': len(self.df['severity'].unique())
            }
        }
        
        return summary
    
    def export_pivot_to_dict(self, pivot_table: pd.DataFrame) -> Dict[str, Any]:
        """将透视表转换为可JSON序列化的字典
        
        Args:
            pivot_table: Pandas透视表
        
        Returns:
            字典格式的透视表数据
        """
        try:
            # 将MultiIndex转换为字符串键
            result = {}
            for idx in pivot_table.index:
                if isinstance(idx, tuple):
                    key = '_×_'.join(str(i) for i in idx)
                else:
                    key = str(idx)
                
                row_data = {}
                for col in pivot_table.columns:
                    if isinstance(col, tuple):
                        col_key = '_×_'.join(str(c) for c in col)
                    else:
                        col_key = str(col)
                    
                    value = pivot_table.loc[idx, col]
                    if pd.notna(value):
                        row_data[col_key] = float(value) if isinstance(value, (int, float)) else str(value)
                
                result[key] = row_data
            
            return result
        except Exception as e:
            logger.error(f"导出透视表失败: {str(e)}")
            return {}


# 便捷函数
def create_pivot_analyzer(data: Union[pd.DataFrame, List[Dict]]) -> FourDimensionalPivotTable:
    """创建4维透视表分析器的便捷函数
    
    Args:
        data: DataFrame或字典列表
    
    Returns:
        FourDimensionalPivotTable实例
    """
    if isinstance(data, list):
        df = pd.DataFrame(data)
    else:
        df = data
    
    return FourDimensionalPivotTable(df)


if __name__ == "__main__":
    # 测试代码
    print("4维数据透视表分析引擎已加载")
    print("使用方法：")
    print("  from analytics.pivot_table_analyzer import FourDimensionalPivotTable")
    print("  analyzer = FourDimensionalPivotTable(your_dataframe)")
    print("  pivot = analyzer.create_4d_pivot()")
