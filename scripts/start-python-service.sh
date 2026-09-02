#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 快速启动Python数据分析服务脚本

echo "=========================================="
echo "Prometheus Python Analytics Service"
echo "=========================================="
echo ""

# 检查Python版本
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python3 is not installed"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
echo "✅ Found: $PYTHON_VERSION"
echo ""

# 进入服务目录
cd "$PROJECT_ROOT/python-analytics-service"

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment exists"
fi
echo ""

# 激活虚拟环境
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# 安装依赖
echo "📥 Installing dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo ""

# 启动服务
echo "=========================================="
echo "🚀 Starting Python Analytics Service"
echo "=========================================="
echo ""
echo "📍 Service URL: http://localhost:8001"
echo "📚 API Docs: http://localhost:8001/docs"
echo "🔍 Health Check: http://localhost:8001/health"
echo ""
echo "Press Ctrl+C to stop the service"
echo ""

# 启动FastAPI服务
python main.py
