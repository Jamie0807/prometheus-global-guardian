#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
向本地服务发送健康检查、分析、预测和风险评估请求的冒烟脚本。
"""

import requests
import json
from datetime import datetime, timedelta
import random

BASE_URL = "http://localhost:8001"

def generate_test_data(count=100):
    """生成测试数据"""
    types = ['EARTHQUAKE', 'VOLCANO', 'STORM', 'FLOOD', 'WILDFIRE']
    severities = ['HIGH', 'MODERATE', 'LOW']
    
    hazards = []
    base_time = datetime.now()
    
    for i in range(count):
        hazard = {
            "id": f"test-{i}",
            "type": random.choice(types),
            "title": f"Test Hazard {i}",
            "coordinates": [
                round(random.uniform(-180, 180), 4),
                round(random.uniform(-90, 90), 4)
            ],
            "timestamp": (base_time - timedelta(days=random.randint(0, 30))).isoformat(),
            "magnitude": round(random.uniform(4.0, 8.0), 1),
            "severity": random.choice(severities),
            "source": "TEST",
            "populationExposed": random.randint(1000, 100000)
        }
        hazards.append(hazard)
    
    return hazards

def test_health_check():
    """测试健康检查"""
    print("\n=== Testing Health Check ===")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.status_code == 200

def test_comprehensive_analysis():
    """测试综合分析"""
    print("\n=== Testing Comprehensive Analysis ===")
    
    test_data = generate_test_data(50)
    
    payload = {
        "hazards": test_data,
        "analysisType": "comprehensive",
        "timeRange": 30
    }
    
    response = requests.post(
        f"{BASE_URL}/api/v1/analyze",
        json=payload,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Processing Time: {result['processingTime']:.2f}s")
        print(f"Success: {result['success']}")
        
        # 仅输出响应中的统计摘要
        if 'data' in result and 'statistics' in result['data']:
            stats = result['data']['statistics']
            print("\nStatistics Overview:")
            if 'descriptiveStatistics' in stats:
                print(f"  - Basic Stats: {stats['descriptiveStatistics'].get('basicStats', {}).get('count', 0)} records")
            if 'timeSeriesAnalysis' in stats:
                print(f"  - Time Series: {stats['timeSeriesAnalysis']}")
        
        return True
    else:
        print(f"Error: {response.text}")
        return False

def test_statistical_analysis():
    """测试统计分析"""
    print("\n=== Testing Statistical Analysis ===")
    
    test_data = generate_test_data(30)
    
    payload = {
        "hazards": test_data,
        "analysisType": "statistical"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/v1/statistics",
        json=payload
    )
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Success: {result['success']}")
        return True
    return False

def test_prediction_analysis():
    """测试预测分析"""
    print("\n=== Testing Prediction Analysis ===")
    
    test_data = generate_test_data(40)
    
    payload = {
        "hazards": test_data
    }
    
    response = requests.post(
        f"{BASE_URL}/api/v1/predictions",
        json=payload
    )
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Success: {result['success']}")
        
        if 'data' in result:
            predictions = result['data']
            print("\nPrediction Models:")
            for model_name, model_data in predictions.items():
                if isinstance(model_data, dict) and 'type' in model_data:
                    print(f"  - {model_data['type']}: {model_data.get('accuracy', 'N/A')}%")
        
        return True
    return False

def test_risk_assessment():
    """测试风险评估"""
    print("\n=== Testing Risk Assessment ===")
    
    test_data = generate_test_data(60)
    
    payload = {
        "hazards": test_data
    }
    
    response = requests.post(
        f"{BASE_URL}/api/v1/risk-assessment",
        json=payload
    )
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Success: {result['success']}")
        
        if 'data' in result and 'overallRiskScore' in result['data']:
            risk_data = result['data']['overallRiskScore']
            print(f"\nRisk Score: {risk_data.get('score', 'N/A')}")
            print(f"Risk Level: {risk_data.get('level', 'N/A')}")
        
        return True
    return False

def main():
    """运行所有测试"""
    print("=" * 60)
    print("Python Analytics Service - Test Suite")
    print("=" * 60)
    
    tests = [
        ("Health Check", test_health_check),
        ("Comprehensive Analysis", test_comprehensive_analysis),
        ("Statistical Analysis", test_statistical_analysis),
        ("Prediction Analysis", test_prediction_analysis),
        ("Risk Assessment", test_risk_assessment)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            success = test_func()
            results.append((test_name, success))
        except Exception as e:
            print(f"\n❌ Test failed: {e}")
            results.append((test_name, False))
    
    # 打印测试总结
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    total = len(results)
    passed = sum(1 for _, success in results if success)
    print(f"\nTotal: {passed}/{total} tests passed")
    print("=" * 60)

if __name__ == "__main__":
    print("\n⚠️  Make sure the Python Analytics Service is running on http://localhost:8001")
    print("   Start it with: python main.py\n")
    
    input("Press Enter to start testing...")
    main()
