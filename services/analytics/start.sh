#!/bin/bash
# 启动Python数据分析服务的简化脚本

cd "$(dirname "$0")"

echo "========================================="
echo "🐍 启动Python数据分析微服务"
echo "========================================="
echo ""
echo "📍 当前目录: $(pwd)"
echo "📦 检查依赖..."

# 检查Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装"
    exit 1
fi

echo "✅ Python版本: $(python3 --version)"

# 检查uvicorn
if ! python3 -c "import uvicorn" 2>/dev/null; then
    echo "❌ uvicorn未安装，正在安装..."
    pip install -r requirements.txt
fi

echo "✅ 依赖检查完成"
echo ""
echo "🚀 启动服务..."
echo "📡 服务地址: http://localhost:8001"
echo "📚 API文档: http://localhost:8001/docs"
echo ""
echo "按 Ctrl+C 停止服务"
echo "========================================="
echo ""

# 启动服务
python3 -c "
import uvicorn
import sys
sys.path.insert(0, '.')
from main import app

if __name__ == '__main__':
    uvicorn.run(
        app,
        host='0.0.0.0',
        port=8001,
        log_level='info'
    )
"
