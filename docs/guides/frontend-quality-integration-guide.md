# 前端集成数据质量监控 - 使用指南

## 概述

新增的数据质量监控和统一模型API已成功集成到前端界面中。

## 新增文件

### 1. API 客户端函数

**文件**: `src/api/pythonAnalytics.ts`

新增5个API调用函数：

```typescript
// 数据质量评估
export async function assessDataQuality(hazards: any[], source: string = 'unknown'): Promise<any>

// 转换为统一数据模型
export async function transformToUnifiedModel(hazards: any[], source: string): Promise<any>

// 合并多数据源
export async function mergeMultiSourceData(
  usgsData?: any[],
  nasaData?: any[],
  gdacsData?: any[]
): Promise<any>

// 获取质量阈值配置
export async function getQualityThresholds(): Promise<any>

// 获取质量历史记录
export async function getQualityHistory(limit: number = 10): Promise<any>
```

### 2. 数据质量监控组件

**文件**: `src/components/DataQualityMonitor.tsx`

全新的React组件，用于展示五维数据质量评估结果。

**功能**:
- 📊 综合质量评分展示
- 📈 五维质量评估可视化（完整性、准确性、一致性、时效性、有效性）
- ⚠️ 问题清单
- 💡 改进建议
- 🎨 美观的渐变色设计
- 📱 响应式布局

### 3. 分析页面集成

**文件**: `src/components/AnalyticsPage.tsx`

在分析页面中新增"数据质量"标签页。

## 使用方法

### 方法1: 在分析页面查看（推荐）

1. **启动服务**
```bash
# 启动Python后端服务
cd python-analytics-service
python3 main.py

# 启动前端服务（另一个终端）
npm run dev
```

2. **打开应用**
   - 访问 `http://localhost:5173`
   - 点击"数据分析"按钮
   - 选择"✓ 数据质量"标签页

3. **查看质量报告**
   - 综合质量评分（0-100分）
   - 五维质量详情
   - 发现的问题列表
   - 改进建议

### 方法2: 独立使用组件

在任何React组件中导入使用：

```typescript
import DataQualityMonitor from './components/DataQualityMonitor';

function MyComponent() {
  const [hazards, setHazards] = useState([]);
  
  return (
    <DataQualityMonitor 
      hazards={hazards} 
      source="USGS" 
    />
  );
}
```

### 方法3: 直接调用API

```typescript
import { assessDataQuality } from './api/pythonAnalytics';

async function checkQuality() {
  const hazards = [/* 灾害数据 */];
  const result = await assessDataQuality(hazards, 'USGS');
  
  console.log('Overall Score:', result.data.overallScore);
  console.log('Status:', result.data.status);
  console.log('Issues:', result.data.issues);
}
```

## 界面展示

### 数据质量标签页

访问路径：数据分析 → ✓ 数据质量

**显示内容**:

1. **综合评分卡片**（渐变蓝紫色背景）
   - 总体质量得分（大号数字）
   - 状态徽章（PASS/FAIL/WARNING）
   - 数据源和记录数

2. **五维质量评估**（网格布局）
   - 完整性 (Completeness)
   - 准确性 (Accuracy)
   - 一致性 (Consistency)
   - 时效性 (Timeliness)
   - 有效性 (Validity)
   
   每个维度显示：
   - 当前得分百分比
   - 进度条（绿色=达标，红色=不达标）
   - 阈值标准

3. **问题列表**（黄色警告框）
   - 检测到的所有数据质量问题
   - 清晰的问题描述
   - 问题数量统计

4. **改进建议**（蓝色信息框）
   - 针对性的改进建议
   - 可操作的修复方案
   - 建议数量统计

## API 调用示例

### 1. 评估单个数据源质量

```typescript
import { assessDataQuality } from '../api/pythonAnalytics';

const usgsHazards = [
  {
    id: "us7000m9ux",
    type: "earthquake",
    properties: {
      magnitude: 5.8,
      timestamp: "2024-12-01T10:30:00Z",
      // ...
    }
  }
];

const quality = await assessDataQuality(usgsHazards, 'USGS');
console.log(quality.data.overallScore); // 90.8
```

### 2. 转换为统一模型

```typescript
import { transformToUnifiedModel } from '../api/pythonAnalytics';

const unified = await transformToUnifiedModel(nasaData, 'NASA');
console.log(unified.data.records); // 统一格式的记录
console.log(unified.data.schema);  // 字段列表
```

### 3. 合并多数据源

```typescript
import { mergeMultiSourceData } from '../api/pythonAnalytics';

const merged = await mergeMultiSourceData(
  usgsData,   // USGS地震数据
  nasaData,   // NASA环境事件
  gdacsData   // GDACS全球灾害
);

console.log(merged.data.unified_records);      // 合并后的数据
console.log(merged.data.merged_quality);       // 合并数据质量
console.log(merged.data.source_comparison);    // 数据源对比
```

### 4. 获取质量阈值

```typescript
import { getQualityThresholds } from '../api/pythonAnalytics';

const thresholds = await getQualityThresholds();
console.log(thresholds.data);
// {
//   completeness: 0.9,
//   accuracy: 0.95,
//   consistency: 0.98,
//   timeliness: 0.85,
//   validity: 0.95
// }
```

### 5. 查看历史趋势

```typescript
import { getQualityHistory } from '../api/pythonAnalytics';

const history = await getQualityHistory(10);
console.log(history.data.history); // 最近10次评估记录
```

## 组件属性

### DataQualityMonitor Props

| 属性 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| hazards | any[] | 是 | - | 灾害数据数组 |
| source | string | 否 | 'unknown' | 数据源标识 |

## 样式定制

组件使用 Tailwind CSS 样式，可以轻松定制：

```typescript
// 修改主题色
const getScoreColor = (score: number): string => {
  if (score >= 0.95) return 'text-green-600';  // 优秀
  if (score >= 0.85) return 'text-yellow-600'; // 良好
  return 'text-red-600';                        // 需改进
};
```

## 错误处理

所有API调用都包含完善的错误处理：

```typescript
try {
  const result = await assessDataQuality(hazards, 'USGS');
  if (result.success) {
    // 处理成功结果
  }
} catch (error) {
  console.error('Quality assessment failed:', error.message);
  // 显示用户友好的错误提示
}
```

## 性能优化

### 1. 自动缓存

API客户端实现了智能缓存机制：
- 相同数据的请求会返回缓存结果
- 缓存时间：5分钟
- 最大缓存数：100个请求

### 2. 请求重试

失败的请求会自动重试：
- 最多重试3次
- 指数退避策略（2^n秒）
- 5xx错误重试，4xx错误不重试

### 3. 超时控制

所有请求都有超时保护：
- 默认超时：30秒
- 健康检查：5秒
- 可自定义超时时间

## 开发调试

### 启用调试日志

```typescript
// 在浏览器控制台查看
localStorage.debug = 'analytics:*';
```

### 测试单个API

```typescript
// 在浏览器控制台运行
import { assessDataQuality } from './api/pythonAnalytics';

const testData = [{
  id: "test-1",
  type: "earthquake",
  properties: { magnitude: 5.0, timestamp: new Date().toISOString() }
}];

assessDataQuality(testData, 'TEST').then(console.log);
```

## 常见问题

### Q1: 质量得分一直很低怎么办？

**A**: 检查以下几点：
1. 数据源是否正确（USGS/NASA/GDACS）
2. 时间戳格式是否正确（ISO 8601）
3. 必填字段是否完整（id, type, timestamp, coordinates）
4. 查看"问题列表"和"改进建议"

### Q2: 组件不显示怎么办？

**A**: 确认：
1. Python后端服务是否运行（端口8001）
2. 数据是否为空（至少需要1条记录）
3. 浏览器控制台是否有错误

### Q3: 如何自定义质量阈值？

**A**: 修改Python后端配置：
```python
# python-analytics-service/analytics/quality_monitor.py
QUALITY_THRESHOLDS = {
    'completeness': 0.90,  # 修改为你需要的值
    'accuracy': 0.95,
    # ...
}
```

### Q4: 可以评估历史数据吗？

**A**: 可以，使用 `getQualityHistory()` API：
```typescript
const history = await getQualityHistory(20); // 最近20次
```

## 下一步扩展

可以考虑的功能增强：

1. **实时监控仪表板** - 实时显示质量趋势
2. **质量告警** - 低于阈值时自动通知
3. **导出报告** - 导出PDF/Excel质量报告
4. **对比分析** - 对比不同时间段的质量变化
5. **自动修复** - 一键修复常见质量问题

## 总结

现在你可以在前端通过以下方式使用数据质量监控：

✅ **在分析页面** - 点击"数据质量"标签页
✅ **独立组件** - 导入 `DataQualityMonitor` 使用
✅ **API调用** - 直接调用 `assessDataQuality()` 等函数

所有功能已完全集成并可立即使用！🎉
