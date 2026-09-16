#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
用于手动检查 `pivot_table_analyzer.py` 主要 API 的示例脚本。
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from analytics.pivot_table_analyzer import FourDimensionalPivotTable, create_pivot_analyzer
import pandas as pd
import numpy as np
from datetime import datetime, timedelta


def generate_test_data(n=1000):
    """生成测试数据"""
    np.random.seed(42)
    
    # 生成过去 30 天的时间范围
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)
    
    dates = pd.date_range(start=start_date, end=end_date, periods=n)
    
    # 灾害类型
    types = ['EARTHQUAKE', 'VOLCANO', 'FLOOD', 'WILDFIRE', 'STORM', 'TSUNAMI', 'DROUGHT']
    
    # 严重性
    severities = ['WARNING', 'WATCH', 'ADVISORY']
    
    # 生成随机数据
    data = []
    for i in range(n):
        # 随机经纬度（覆盖全球）
        lat = np.random.uniform(-90, 90)
        lng = np.random.uniform(-180, 180)
        
        data.append({
            'id': f'hazard-{i}',
            'type': np.random.choice(types),
            'date': dates[i].isoformat(),
            'coordinates': [lng, lat],
            'severity': np.random.choice(severities, p=[0.2, 0.5, 0.3]),  # 权重分布
            'magnitude': np.random.uniform(4.0, 8.0) if np.random.rand() > 0.3 else None,
            'title': f'Test Event {i}',
            'source': 'TEST_DATA'
        })
    
    return data


def test_basic_functionality():
    """测试基础功能"""
    print("=" * 60)
    print("测试1：基础功能测试")
    print("=" * 60)
    
    # 生成测试数据
    test_data = generate_test_data(500)
    print(f"✓ 生成测试数据: {len(test_data)} 条")
    
    # 创建分析器
    analyzer = create_pivot_analyzer(test_data)
    print(f"✓ 创建分析器成功")
    
    # 获取汇总统计
    summary = analyzer.get_summary_statistics()
    print(f"\n汇总统计：")
    print(f"  - 总记录数: {summary['total_records']}")
    print(f"  - 时间范围: {summary['time_range']['days']} 天")
    print(f"  - 地理区域数: {summary['dimensions']['geo_unique']}")
    print(f"  - 灾害类型数: {summary['dimensions']['type_unique']}")
    print(f"  - 严重性级别数: {summary['dimensions']['severity_unique']}")
    
    print("\n✓ 基础功能测试通过\n")


def test_pivot_table_creation():
    """测试透视表创建"""
    print("=" * 60)
    print("测试2：4维透视表创建")
    print("=" * 60)
    
    test_data = generate_test_data(500)
    analyzer = FourDimensionalPivotTable(pd.DataFrame(test_data))
    
    # 测试不同维度组合
    test_cases = [
        {
            'time_dim': 'month',
            'geo_dim': 'region',
            'desc': '月份 × 地理区域'
        },
        {
            'time_dim': 'week',
            'geo_dim': 'continent',
            'desc': '周 × 大洲'
        },
        {
            'time_dim': 'date_only',
            'geo_dim': 'geo_grid',
            'desc': '日期 × 地理网格'
        }
    ]
    
    for i, case in enumerate(test_cases, 1):
        pivot = analyzer.create_4d_pivot(
            time_dim=case['time_dim'],
            geo_dim=case['geo_dim']
        )
        print(f"\n{i}. {case['desc']}")
        print(f"   维度: {pivot.shape}")
        print(f"   总计数: {pivot.values.sum():.0f}")
    
    print("\n✓ 透视表创建测试通过\n")


def test_multi_dimensional_query():
    """测试多维度查询"""
    print("=" * 60)
    print("测试3：多维度联合查询")
    print("=" * 60)
    
    test_data = generate_test_data(500)
    analyzer = FourDimensionalPivotTable(pd.DataFrame(test_data))
    
    # 测试案例1：过去7天 + 特定区域 + 特定类型
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)
    
    result1 = analyzer.multi_dimensional_query(
        time_range=(start_date, end_date),
        regions=['Asia-Pacific', 'North America'],
        types=['EARTHQUAKE', 'VOLCANO'],
        severities=['WARNING']
    )
    
    print(f"\n查询1: 过去7天 + 亚太/北美 + 地震/火山 + WARNING")
    print(f"  结果数量: {len(result1)}")
    if len(result1) > 0:
        print(f"  平均震级: {result1['magnitude'].mean():.2f}")
        print(f"  地理分布: {dict(result1['region'].value_counts())}")
    
    # 测试案例2：全部数据 + 特定严重性
    result2 = analyzer.multi_dimensional_query(
        severities=['WARNING']
    )
    
    print(f"\n查询2: 全部时间 + WARNING级别")
    print(f"  结果数量: {len(result2)}")
    print(f"  类型分布: {dict(result2['type_category'].value_counts().head(3))}")
    
    print("\n✓ 多维度查询测试通过\n")


def test_trend_analysis():
    """测试趋势分析"""
    print("=" * 60)
    print("测试4：4维趋势分析")
    print("=" * 60)
    
    test_data = generate_test_data(500)
    analyzer = FourDimensionalPivotTable(pd.DataFrame(test_data))
    
    # 执行趋势分析
    trends = analyzer.trend_analysis_4d(time_window=7)
    
    if not trends.empty:
        print(f"\n趋势分析结果:")
        print(f"  总组合数: {len(trends)}")
        
        # 统计趋势方向
        direction_counts = trends['trend_direction'].value_counts()
        print(f"\n  趋势分布:")
        for direction, count in direction_counts.items():
            print(f"    {direction}: {count}")
        
        # 显示前 5 个上升趋势
        increasing_trends = trends[trends['trend_direction'] == 'increasing'].sort_values('trend_slope', ascending=False)
        if len(increasing_trends) > 0:
            print(f"\n  Top 5 上升趋势:")
            for idx, row in increasing_trends.head(5).iterrows():
                print(f"    {row['region']} - {row['type']} - {row['severity']}: 斜率={row['trend_slope']:.3f}")
    else:
        print("  数据不足，无法进行趋势分析")
    
    print("\n✓ 趋势分析测试通过\n")


def test_risk_scoring():
    """测试风险评分"""
    print("=" * 60)
    print("测试5：4维风险评分")
    print("=" * 60)
    
    test_data = generate_test_data(500)
    analyzer = FourDimensionalPivotTable(pd.DataFrame(test_data))
    
    # 计算风险评分
    risk_scores = analyzer.risk_score_4d(time_window=7)
    
    if not risk_scores.empty:
        print(f"\n风险评分结果:")
        print(f"  总组合数: {len(risk_scores)}")
        print(f"  最高风险分: {risk_scores['risk_score'].max():.2f}")
        print(f"  平均风险分: {risk_scores['risk_score'].mean():.2f}")
        
        # 前 10 个高风险区域
        print(f"\n  Top 10 高风险区域:")
        for idx, row in risk_scores.head(10).iterrows():
            print(f"    {row['region']} - {row['type']}: {row['risk_score']:.2f} (频率={row['frequency']:.2f}, 严重性={row['severity']:.2f})")
    else:
        print("  数据不足，无法进行风险评分")
    
    print("\n✓ 风险评分测试通过\n")


def test_slicing_operations():
    """测试切片操作"""
    print("=" * 60)
    print("测试6：动态切片操作")
    print("=" * 60)
    
    test_data = generate_test_data(500)
    analyzer = FourDimensionalPivotTable(pd.DataFrame(test_data))
    
    # 创建透视表
    pivot = analyzer.create_4d_pivot(
        time_dim='month',
        geo_dim='region'
    )
    
    print(f"\n原始透视表维度: {pivot.shape}")
    
    # 测试不同切片
    if len(pivot) > 0:
        # 按地理区域切片
        regions = pivot.index.get_level_values(1).unique()
        if len(regions) > 0:
            first_region = regions[0]
            region_slice = analyzer.slice_by_geo(pivot, first_region)
            print(f"\n地理切片 ({first_region}):")
            print(f"  维度: {region_slice.shape}")
            print(f"  总计数: {region_slice.values.sum():.0f}")
        
        # 按类型切片
        types = pivot.columns.get_level_values(0).unique()
        if len(types) > 0:
            first_type = types[0]
            type_slice = analyzer.slice_by_type(pivot, first_type)
            print(f"\n类型切片 ({first_type}):")
            print(f"  维度: {type_slice.shape}")
            print(f"  总计数: {type_slice.values.sum():.0f}")
    
    print("\n✓ 切片操作测试通过\n")


def test_performance():
    """测试性能"""
    print("=" * 60)
    print("测试7：性能测试")
    print("=" * 60)
    
    import time
    
    sizes = [100, 500, 1000, 5000]
    
    print(f"\n数据规模性能测试:")
    for size in sizes:
        test_data = generate_test_data(size)
        
        start = time.time()
        analyzer = FourDimensionalPivotTable(pd.DataFrame(test_data))
        init_time = time.time() - start
        
        start = time.time()
        pivot = analyzer.create_4d_pivot()
        pivot_time = time.time() - start
        
        start = time.time()
        risk = analyzer.risk_score_4d()
        risk_time = time.time() - start
        
        print(f"\n  数据量: {size}")
        print(f"    初始化: {init_time*1000:.2f}ms")
        print(f"    透视表: {pivot_time*1000:.2f}ms")
        print(f"    风险评分: {risk_time*1000:.2f}ms")
        print(f"    总耗时: {(init_time+pivot_time+risk_time)*1000:.2f}ms")
    
    print("\n✓ 性能测试完成\n")


def run_all_tests():
    """运行所有测试"""
    print("\n" + "=" * 60)
    print("4维数据透视表功能测试套件")
    print("=" * 60 + "\n")
    
    try:
        test_basic_functionality()
        test_pivot_table_creation()
        test_multi_dimensional_query()
        test_trend_analysis()
        test_risk_scoring()
        test_slicing_operations()
        test_performance()
        
        print("=" * 60)
        print("✓ 所有测试通过！")
        print("=" * 60 + "\n")
        
    except Exception as e:
        print(f"\n✗ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    run_all_tests()
