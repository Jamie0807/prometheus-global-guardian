# 数据分析功能优化 - 快速使用指南

## 🚀 快速开始

### 1. 启动Python分析服务

```bash
cd python-analytics-service
python main.py
```

服务将在 `http://localhost:8001` 启动

### 2. 启动前端开发服务

```bash
npm run dev
```

前端将在 `http://localhost:5173` 启动

### 3. 访问数据分析页面

在应用中点击"📊 数据分析"按钮即可访问优化后的分析功能。

---

## 📊 新增功能说明

### 1. 性能监控端点

查看实时性能指标：
```bash
curl http://localhost:8001/metrics
```

返回示例：
```json
{
  "totalRequests": 150,
  "cacheHits": 45,
  "cacheMisses": 105,
  "cacheHitRate": "30.0%",
  "cacheSize": 15,
  "avgProcessingTime": "423.45ms",
  "timestamp": "2025-12-01T10:30:00.000Z"
}
```

### 2. 缓存管理

清除缓存：
```bash
curl -X POST http://localhost:8001/cache/clear
```

### 3. 自动重试机制

前端会自动重试失败的请求（最多3次），无需手动干预：
- 第1次重试：2秒后
- 第2次重试：4秒后
- 第3次重试：8秒后

### 4. 数据缓存

系统会自动缓存分析结果，相同数据不会重复分析。缓存有效期：5分钟

---

## 💡 性能优化效果

### 首次分析
- **100条数据**：约 400-600ms
- **500条数据**：约 1200ms
- **1000条数据**：约 2500ms

### 缓存命中
- **任意数据量**：< 10ms

### 并发处理
- 统计分析、预测模型、风险评估并行执行
- 总处理时间减少 40-60%

---

## 🔧 配置选项

### Python服务配置

编辑 `python-analytics-service/main.py`：

```python
# 缓存配置
CACHE_TTL = 300  # 缓存有效期（秒）
CACHE_MAX_SIZE = 100  # 最大缓存条目数

# 请求限制
MAX_DATA_SIZE = 1000  # 单次请求最大数据量
```

### 前端配置

编辑 `src/api/pythonAnalytics.ts`：

```typescript
const REQUEST_TIMEOUT = 30000;  // 请求超时时间（毫秒）
const MAX_RETRIES = 3;  // 最大重试次数
```

---

## 🎯 使用技巧

### 1. 优化大数据集处理

对于超过1000条的数据：
```typescript
// 系统会自动限制为前1000条
const result = await getStatistics(hazards);  // 自动处理
```

### 2. 监控缓存效率

定期检查缓存命中率：
```bash
# 查看当前指标
curl http://localhost:8001/metrics

# 如果命中率低于30%，考虑调整缓存策略
```

### 3. 手动清除缓存

数据更新后强制重新分析：
```bash
curl -X POST http://localhost:8001/cache/clear
```

或在前端点击"🔄 重新分析"按钮

### 4. 错误恢复

如果分析失败：
1. 系统会自动重试（最多3次）
2. 可手动点击"🔄 重新尝试"按钮
3. 检查Python服务是否运行
4. 查看浏览器控制台的详细错误

---

## 📈 监控与调试

### 查看Python服务日志

```bash
cd python-analytics-service
python main.py

# 日志会显示：
# - 每个请求的处理时间
# - 缓存命中/未命中
# - 错误详情
```

### 浏览器控制台

打开开发者工具（F12），查看：
- 网络请求详情
- API响应时间
- 错误堆栈信息

### 性能分析

```bash
# 1. 查看总体指标
curl http://localhost:8001/metrics

# 2. 检查服务健康
curl http://localhost:8001/health

# 3. 查看服务信息
curl http://localhost:8001/
```

---

## ⚠️ 常见问题

### Q1: 为什么第一次分析很慢？

**A**: 第一次需要：
- 加载Python库
- 训练模型
- 计算统计指标

后续相同数据会使用缓存，响应速度<10ms

### Q2: 如何提高缓存命中率？

**A**: 
- 避免频繁更改数据筛选条件
- 使用相同的数据量进行分析
- 增加缓存有效期（编辑CACHE_TTL）

### Q3: 分析失败怎么办？

**A**: 检查：
1. Python服务是否运行（`http://localhost:8001/health`）
2. 数据是否有效（至少5条记录）
3. 网络连接是否正常
4. 查看Python服务控制台的错误日志

### Q4: 如何处理大数据集？

**A**: 系统会自动：
- 限制单次请求为1000条
- 使用分批处理
- 应用数据采样

建议：对超大数据集使用数据筛选功能

### Q5: 缓存会影响实时性吗？

**A**: 
- 缓存有效期仅5分钟
- 数据变化时自动失效
- 可手动清除缓存强制更新

---

## 📚 API文档

### 统计分析
```typescript
import { getStatistics } from './api/pythonAnalytics';

const result = await getStatistics(hazards);
// 返回23种统计算法结果
```

### 预测分析
```typescript
import { getPredictions } from './api/pythonAnalytics';

const result = await getPredictions(hazards, 'predictions', 30);
// 返回5个预测模型结果（30天预测窗口）
```

### 风险评估
```typescript
import { getRiskAssessment } from './api/pythonAnalytics';

const result = await getRiskAssessment(hazards);
// 返回综合风险评估
```

### 服务健康检查
```typescript
import { checkHealth } from './api/pythonAnalytics';

const isOnline = await checkHealth();
// 返回 true/false
```

---

## 🎨 用户界面改进

### 1. 实时状态显示
- 🟢 **就绪**：服务在线，可进行分析
- 🔴 **离线**：服务不可用
- 🟡 **检测中**：正在检查服务状态

### 2. 智能提示
- ✅ 分析完成提示
- ⚠️ 错误详情说明
- 💾 缓存使用提示
- 🔄 自动重试进度

### 3. 交互优化
- 一键重新分析
- 自动刷新选项
- 流畅的图表切换
- 响应式布局

---

## 🔐 安全建议

### 生产环境部署

1. **启用HTTPS**
```python
# main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # 限制域名
    allow_credentials=True,
    allow_methods=["GET", "POST"],  # 限制方法
    allow_headers=["*"],
)
```

2. **添加认证**
```python
from fastapi import Header, HTTPException

async def verify_token(x_token: str = Header(...)):
    if x_token != "secret-token":
        raise HTTPException(status_code=401, detail="Invalid token")
```

3. **限流保护**
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/api/v1/analyze")
@limiter.limit("10/minute")
async def comprehensive_analysis(...):
    ...
```

---

## 📊 性能基准测试

运行基准测试：
```bash
cd python-analytics-service
python -m pytest tests/test_performance.py
```

预期结果：
- ✅ 100条数据 < 600ms
- ✅ 500条数据 < 1500ms
- ✅ 1000条数据 < 3000ms
- ✅ 缓存命中 < 10ms

---

## 🚀 未来路线图

### 即将推出
- [ ] Redis缓存支持
- [ ] WebSocket实时更新
- [ ] 更多预测模型（ARIMA、Prophet）
- [ ] 数据预加载
- [ ] 离线缓存

### 长期计划
- [ ] 分布式处理
- [ ] 负载均衡
- [ ] GPU加速
- [ ] 实时流数据处理
- [ ] 自定义算法插件

---

## 💬 反馈与支持

遇到问题或有建议？
1. 查看控制台日志
2. 检查 `/metrics` 端点
3. 查看 OPTIMIZATION_SUMMARY.md
4. 提交Issue或Pull Request

---

## 📝 更新日志

### v1.1.0 (2025-12-01)
- ✨ 添加缓存机制
- ⚡ 并行处理支持
- 🔧 增强错误处理
- 📊 性能监控
- 🎨 UI/UX改进

### v1.0.0 (2025-11-01)
- 🎉 初始版本发布
- 📊 23种统计算法
- 🔮 5个预测模型
- ⚠️ 风险评估系统

---

**享受优化后的数据分析体验！** 🎉
