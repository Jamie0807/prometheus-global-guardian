# 前端数据质量监控集成指南

## 概述

已成功在前端集成Pandas统一数据模型和五维质量监控功能。用户可以通过Web界面实时查看数据质量状况。

## 新增前端组件

### 1. API客户端函数

**位置**: `src/api/pythonAnalytics.ts`

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

**位置**: `src/components/DataQualityMonitor.tsx`

功能特性：
- ✅ 实时五维质量评估展示
- ✅ 可视化质量得分和进度条
- ✅ 问题清单和改进建议
- ✅ 动态颜色编码（绿色=优秀，黄色=警告，红色=失败）
- ✅ 质量阈值对比

## 使用方法

### 1. 在分析页面查看数据质量

1. 打开应用：`http://localhost:5173`
2. 点击 **"分析"** 按钮进入分析页面
3. 点击 **"✓ 数据质量"** 标签页
4. 自动显示当前数据集的五维质量评估

### 2. 质量评估指标说明

#### 完整性 (Completeness) - 阈值 90%
- 评估必填字段是否完整
- 检查缺失值比例
- 显示每个字段的完整度

#### 准确性 (Accuracy) - 阈值 95%
- 验证数据范围是否合理
- 检查坐标有效性（经纬度）
- 识别异常值和格式错误

#### 一致性 (Consistency) - 阈值 98%
- 检查重复记录
- 验证数据类型统一性
- 确保严重程度分级一致

#### 时效性 (Timeliness) - 阈值 85%
- 评估数据新鲜度
- 分析数据年龄分布
- 识别过时数据

#### 有效性 (Validity) - 阈值 95%
- 检查业务逻辑合理性
- 验证严重程度与震级匹配
- 识别不合理的数据值

### 3. 界面元素说明

#### 总体得分卡
```
┌────────────────────────────────┐
│ 数据质量综合评分                │
│ 数据源: DisasterAWARE          │
│ 记录数: 100                    │
│                         90.8   │
│                         PASS   │
└────────────────────────────────┘
```

#### 五维质量卡片
```
┌─────────────────┐  ┌─────────────────┐
│ 完整性          │  │ 准确性          │
│          100%   │  │          93.3%  │
│ ████████████    │  │ ██████████▒▒    │
│ 阈值: 90%       │  │ 阈值: 95%       │
└─────────────────┘  └─────────────────┘
```

#### 问题列表
```
⚠️ 发现的问题 (2)
  • 3 records are older than 30 days
  • Field 'magnitude' has 1 values out of range
```

#### 改进建议
```
ℹ️ 改进建议 (2)
  → Update or archive outdated records
  → Validate and correct out-of-range values
```

## 代码示例

### 在自定义组件中使用

```typescript
import { assessDataQuality } from '../api/pythonAnalytics';

const MyComponent = () => {
  const [quality, setQuality] = useState(null);
  
  const checkQuality = async (hazards) => {
    try {
      const result = await assessDataQuality(hazards, 'USGS');
      if (result.success) {
        setQuality(result.data);
        console.log('Overall Score:', result.data.overallScore);
        console.log('Status:', result.data.status);
      }
    } catch (error) {
      console.error('Quality check failed:', error);
    }
  };
  
  return (
    <button onClick={() => checkQuality(myHazards)}>
      检查质量
    </button>
  );
};
```

### 多数据源合并

```typescript
import { mergeMultiSourceData } from '../api/pythonAnalytics';

const mergeData = async () => {
  try {
    const result = await mergeMultiSourceData(
      usgsEarthquakes,  // USGS地震数据
      nasaWildfires,    // NASA野火数据
      gdacsAlerts       // GDACS全球警报
    );
    
    if (result.success) {
      // 统一的数据记录
      const unifiedRecords = result.data.unified_records;
      
      // 各数据源质量对比
      const comparison = result.data.source_comparison;
      console.log('Best source:', comparison.best_source);
      console.log('Worst source:', comparison.worst_source);
      
      // 合并后的整体质量
      const mergedQuality = result.data.merged_quality;
      console.log('Merged quality score:', mergedQuality.overall_score);
    }
  } catch (error) {
    console.error('Merge failed:', error);
  }
};
```

## 视觉设计

### 颜色方案

```css
/* 质量状态颜色 */
.quality-excellent { color: #4CAF50; }  /* 绿色 - 优秀 (≥95%) */
.quality-good      { color: #8BC34A; }  /* 浅绿 - 良好 (85-95%) */
.quality-warning   { color: #FF9800; }  /* 橙色 - 警告 (70-85%) */
.quality-poor      { color: #F44336; }  /* 红色 - 差 (<70%) */

/* 状态徽章 */
.badge-pass    { background: #E8F5E9; color: #2E7D32; }
.badge-warning { background: #FFF3E0; color: #F57C00; }
.badge-fail    { background: #FFEBEE; color: #C62828; }
```

### 响应式布局

- **桌面端**: 5列网格显示五维指标
- **平板端**: 2列网格
- **移动端**: 单列堆叠

## 性能优化

1. **自动缓存**: 相同数据集不会重复评估
2. **按需加载**: 只在切换到"数据质量"标签时加载
3. **异步更新**: 不阻塞主界面渲染
4. **错误处理**: 优雅降级，不影响其他功能

## 故障排除

### 问题1: 质量标签不显示

**原因**: Python服务未启动或端口不通

**解决**:
```bash
cd python-analytics-service
python3.13 main.py
```

### 问题2: 质量评估失败

**原因**: 数据格式不符合要求

**解决**: 检查hazards数据是否包含必需字段：
- `id` (string)
- `type` (string)
- `timestamp` (ISO格式)
- `coordinates` (数组 [lon, lat])

### 问题3: 显示"暂无质量评估数据"

**原因**: hazards数组为空或未传入

**解决**: 确保在地图上加载了灾害数据

## 测试验证

### 手动测试步骤

1. 启动服务：
```bash
# 终端1: Python服务
cd python-analytics-service && python3.13 main.py

# 终端2: 前端服务
npm run dev
```

2. 访问 `http://localhost:5173`

3. 等待地图加载灾害数据

4. 点击"分析"按钮

5. 切换到"✓ 数据质量"标签

6. 验证显示：
   - ✅ 总体得分卡片
   - ✅ 五维质量指标
   - ✅ 问题列表（如有）
   - ✅ 改进建议（如有）

### API测试

使用浏览器开发者工具Console：

```javascript
// 测试质量评估
fetch('http://localhost:8001/api/v1/quality/assess', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    hazards: [{
      id: 'test-001',
      type: 'earthquake',
      title: 'Test Event',
      coordinates: [-118.0, 34.0],
      timestamp: new Date().toISOString(),
      magnitude: 5.5
    }],
    source: 'TEST'
  })
})
.then(r => r.json())
.then(d => console.log(d));
```

## 下一步增强

### 计划中的功能

1. **质量历史图表**: 展示质量得分随时间变化的趋势
2. **质量对比视图**: 并排对比多个数据源的质量
3. **自动告警**: 当质量得分低于阈值时发送通知
4. **质量报告导出**: 导出PDF/Excel格式的质量报告
5. **实时质量监控**: WebSocket实时推送质量变化

### 可扩展点

```typescript
// 自定义质量规则
interface QualityRule {
  name: string;
  check: (data: any[]) => boolean;
  threshold: number;
  message: string;
}

// 添加自定义规则
const customRules: QualityRule[] = [
  {
    name: 'magnitude_range',
    check: (data) => data.every(d => d.magnitude >= 0 && d.magnitude <= 10),
    threshold: 1.0,
    message: 'All magnitudes should be between 0 and 10'
  }
];
```

## 相关文件

- `src/api/pythonAnalytics.ts` - API客户端
- `src/components/DataQualityMonitor.tsx` - 质量监控组件
- `src/components/AnalyticsPage.tsx` - 主分析页面
- `python-analytics-service/analytics/quality_monitor.py` - 后端质量监控
- `python-analytics-service/analytics/unified_model.py` - 统一数据模型

## 总结

✅ **已完成**:
- 前端API客户端集成
- 数据质量监控组件开发
- 分析页面标签页集成
- 五维质量可视化展示
- 问题和建议展示

🎯 **使用场景**:
- 实时监控数据质量
- 识别数据问题
- 获取改进建议
- 对比数据源质量

📊 **核心价值**:
- 提高数据可信度
- 及早发现数据问题
- 指导数据清洗
- 支持数据治理决策
