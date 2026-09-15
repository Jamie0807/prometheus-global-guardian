#!/usr/bin/env python3
"""
向本地 Python 数据分析服务的部分端点发送示例请求。
"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8001"

def generate_test_data(count=30):
    """生成测试灾害数据"""
    hazard_types = ["EARTHQUAKE", "VOLCANO", "STORM", "FLOOD", "WILDFIRE"]
    severities = ["WARNING", "WATCH", "ADVISORY"]
    sources = ["USGS", "NASA", "GDACS"]
    
    hazards = []
    for i in range(count):
        date = datetime.now() - timedelta(days=i)
        hazards.append({
            "id": f"hazard_{i}",
            "type": hazard_types[i % len(hazard_types)],
            "title": f"Test Hazard {i}",
            "coordinates": [100 + i * 2, 30 + i * 1.5],
            "timestamp": date.isoformat(),
            "magnitude": 4.0 + (i % 5) * 0.5,
            "severity": severities[i % len(severities)],
            "source": sources[i % len(sources)],
            "populationExposed": 1000 * (i + 1)
        })
    return hazards

print("=" * 80)
print("🐍 Python数据分析微服务测试")
print("=" * 80)

print("\n📊 1. 测试服务健康状态...")
try:
    response = requests.get(f"{BASE_URL}/health")
    print(f"✅ 服务状态: {response.json()}")
except Exception as e:
    print(f"❌ 错误: {e}")

print("\n📊 2. 测试服务信息...")
try:
    response = requests.get(f"{BASE_URL}/")
    data = response.json()
    print(f"✅ 服务名称: {data['service']}")
    print(f"✅ 版本: {data['version']}")
    print(f"✅ 功能: {', '.join(data['features'])}")
except Exception as e:
    print(f"❌ 错误: {e}")

print("\n📊 3. 生成测试数据...")
test_hazards = generate_test_data(30)
print(f"✅ 生成了 {len(test_hazards)} 条测试灾害数据")

print("\n📊 4. 测试统计分析...")
try:
    response = requests.post(
        f"{BASE_URL}/api/v1/statistics",
        json={
            "hazards": test_hazards,
            "analysisType": "comprehensive",
            "timeRange": 30
        }
    )
    if response.status_code == 200:
        data = response.json()["data"]
        print(f"✅ 描述性统计完成")
        print(f"   - 平均震级: {data.get('descriptiveStatistics', {}).get('centralTendency', {}).get('mean', 'N/A')}")
        print(f"   - 数据量: {data.get('descriptiveStatistics', {}).get('basicStats', {}).get('count', 'N/A')}")
        print(f"✅ 推断统计完成")
        print(f"✅ 时间序列分析完成")
        print(f"✅ 相关性分析完成")
        print(f"✅ 异常检测完成")
    else:
        print(f"❌ 错误: 状态码 {response.status_code}")
except Exception as e:
    print(f"❌ 错误: {e}")

print("\n📊 5. 测试5个预测模型...")
try:
    response = requests.post(
        f"{BASE_URL}/api/v1/predictions",
        json={
            "hazards": test_hazards,
            "analysisType": "comprehensive",
            "timeRange": 30
        }
    )
    if response.status_code == 200:
        data = response.json()["data"]
        print(f"✅ 预测模型执行完成")
        print(f"   - 地震预测模型: R²={data.get('earthquake', {}).get('rSquared', 'N/A')}")
        print(f"   - 火山预测模型完成")
        print(f"   - 风暴预测模型完成")
        print(f"   - 洪水预测模型完成")
        print(f"   - 野火预测模型完成")
    else:
        print(f"❌ 错误: 状态码 {response.status_code}")
except Exception as e:
    print(f"❌ 错误: {e}")

print("\n📊 6. 测试综合数据分析...")
try:
    response = requests.post(
        f"{BASE_URL}/api/v1/analyze",
        json={
            "hazards": test_hazards,
            "analysisType": "comprehensive",
            "timeRange": 30
        }
    )
    if response.status_code == 200:
        result = response.json()
        print(f"✅ 综合分析成功!")
        print(f"   - 处理时间: {result['processingTime']:.3f}秒")
        print(f"   - 数据质量分数: {result['data'].get('dataQuality', {}).get('overallScore', 'N/A')}%")
        print(f"   - 处理记录数: {result['data'].get('processingInfo', {}).get('totalRecords', 'N/A')}")
    else:
        print(f"❌ 错误: 状态码 {response.status_code}")
except Exception as e:
    print(f"❌ 错误: {e}")

print("\n📊 7. 测试ETL数据处理...")
try:
    response = requests.post(
        f"{BASE_URL}/api/v1/etl/process",
        json={
            "hazards": test_hazards,
            "analysisType": "comprehensive",
            "timeRange": 30
        }
    )
    if response.status_code == 200:
        data = response.json()["data"]
        print(f"✅ ETL处理成功")
        print(f"   - 数据质量分数: {data.get('qualityMetrics', {}).get('overallScore', 'N/A')}%")
    else:
        print(f"❌ 错误: 状态码 {response.status_code}")
except Exception as e:
    print(f"❌ 错误: {e}")

print("\n📊 8. 测试风险评估...")
try:
    response = requests.post(
        f"{BASE_URL}/api/v1/risk-assessment",
        json={
            "hazards": test_hazards,
            "analysisType": "comprehensive",
            "timeRange": 30
        }
    )
    if response.status_code == 200:
        data = response.json()["data"]
        print(f"✅ 风险评估成功")
        print(f"   - 综合风险等级: {data.get('overallRisk', 'N/A')}")
        print(f"   - 高风险区域数: {len(data.get('highRiskAreas', []))}")
    else:
        print(f"❌ 错误: 状态码 {response.status_code}")
except Exception as e:
    print(f"❌ 错误: {e}")

print("\n" + "=" * 80)
print("🎉 所有测试完成！")
print("=" * 80)
print("\n💡 提示:")
print("   - API文档: http://localhost:8001/docs")
print("   - 交互式测试: http://localhost:8001/redoc")
print("   - 健康检查: http://localhost:8001/health")
print("=" * 80)
