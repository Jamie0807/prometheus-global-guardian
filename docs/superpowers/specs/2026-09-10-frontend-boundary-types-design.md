# 前端边界类型治理设计方案

日期：2026-09-10
状态：已实施，复核中。
需求级别：正式规格，按业务链分阶段交付。

## 1. 目标与现状

让外部 JSON 经过运行时校验后，才进入具有明确类型的 Service 返回值、React 状态及展示组件。对合法空结果和模型失败保留业务语义；对协议异常提供稳定错误，避免页面崩溃或把异常数据展示为正常结果。

本方案依据当前源码制定。优化清单中“大量 any”的描述已不完全符合现状：现有模块已有不少 interface 和 unknown，主要缺口是声明与实际响应之间缺少可执行校验。

| 位置                                               | 已确认的问题                                                                 | 影响                                                             |
| -------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `src/services/analytics/analyticsTypes.ts`         | 通用响应的 success、data 全部可选，且有任意字段索引                          | 无法可靠区分成功、缺失数据和业务失败                             |
| `src/services/analytics/analyticsService.ts`       | 多个方法直接返回 response.json()；统计和风险的局部声明不符合 Python 实际结构 | TypeScript 返回类型不能证明响应有效                              |
| `src/features/analytics/hooks/useAnalyticsData.ts` | 使用 as AnalyticsRecord、as PivotTrendRecord 等接收响应                      | 断言掩盖边界不一致，损坏数据进入状态                             |
| `src/features/analytics/types.ts`                  | 统计、预测、风险合为全部可选字段的 AnalyticsData                             | 不同接口可以被错误混用，必填字段没有约束                         |
| `ChartsPanel.tsx`                                  | 读取 data.basicStats.mean/std，并假设为标量                                  | 实际为 data.descriptiveStatistics.basicStats.mean/std 的列名映射 |
| `InsightsPanel.tsx`                                | 读取 overallRisk/riskScore，分数再乘以 100                                   | 实际为 overallRiskScore.level/score，score 已是 0–100            |
| `DataQualityMonitor.tsx`                           | 阈值通过断言接收；质量报告由宽松展示适配器兜底                               | 无效响应可能被当作零分报告                                       |
| Python pivot 服务                                  | 无数据与有数据使用不同字段名                                                 | 不能以缺少 statistics 为由拒绝合法空结果                         |

Python `AnalysisResponse.data` 仍为动态字典，多个接口也未声明完整 response_model。因此当前直接生成 OpenAPI 客户端不能代替业务响应校验。

## 2. 方案比较与决策

| 方案                                              | 优点                                                      | 代价或不足                                           |
| ------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------- |
| A：按业务链增加明确响应类型和运行时解析器（推荐） | 范围可控，可以通过真实响应样例验证，错误止于 Service 边界 | 手写解析器需要与 Python 输出同步维护                 |
| B：只补 interface、收紧 ESLint                    | 改动小、短期编译约束增强                                  | 无法识别运行时 JSON 错误，不满足本次目标             |
| C：先完善 Python 全量响应模型，再生成客户端       | 长期有利于跨语言契约同步                                  | 涉及全部后端响应模型、工具链与兼容迁移，扩大本次范围 |

第一阶段采用 A，复用当前 TypeScript 和测试设施，不引入新的校验依赖。后续接口规模明显扩大时，再评估 schema 库或生成式契约。实现采用少量基础类型守卫和按领域划分的解析器，不建立通用 schema 框架。

## 3. 第一阶段范围

覆盖当前 React 消费的 Analytics 请求链，共 8 个接口：

| Service 方法          | API 路径                     | 解析后的数据类型    |
| --------------------- | ---------------------------- | ------------------- |
| getStatistics         | /api/v1/statistics           | StatisticsData      |
| getPredictions        | /api/v1/predictions          | PredictionsData     |
| getRiskAssessment     | /api/v1/risk-assessment      | RiskAssessmentData  |
| assessDataQuality     | /api/v1/quality/assess       | QualityReportData   |
| getQualityThresholds  | /api/v1/quality/thresholds   | QualityThresholds   |
| create4DPivotTable    | /api/v1/pivot/create         | PivotCreateData     |
| analyze4DTrends       | /api/v1/pivot/trend-analysis | PivotTrendsData     |
| calculate4DRiskScores | /api/v1/pivot/risk-score     | PivotRiskScoresData |

同步迁移 useAnalyticsData、Analytics 页面及 Tab/控制组件、ChartsPanel、InsightsPanel 和 DataQualityMonitor 的返回值消费。ChartDrilldownModal 及图表点击回调只处理外部事件到内部钻取参数的类型边界，保持当前筛选规则。

Service 根信息、ETL、综合分析、统一模型转换/合并、质量历史、pivot query/summary 暂列第二阶段。健康检查仅返回 boolean，继续以 HTTP 可用性为准。Hazard/AI/通用 HTTP Service 的全面迁移、报告下载实现、Python 算法与公开 API 改造、Hook 请求生命周期重构均不包含在第一阶段。

## 4. 架构与模块边界

数据流固定为：HTTP 响应 → unknown → 端点解析器 → 确定的业务类型 → Hook/展示适配器 → React 组件。

建议文件职责：

- `analyticsTypes.ts`：保留请求类型及兼容导出；新增第一阶段明确的响应外壳，按需转导出领域类型。
- `contracts/statistics.ts`、`predictions.ts`、`risk.ts`、`quality.ts`、`pivot.ts`：各自定义领域数据类型与解析函数；依赖基础守卫，不依赖 React 或页面类型。
- `contracts/common.ts`：对象（排除 null 和数组）、有限数、可空数、字符串、数组及字典校验，以及响应外壳和稳定契约错误。
- `analyticsService.ts`：保留现有 URL、请求参数与网络调度；显式将 JSON 赋值为 unknown，调用指定解析函数。
- `analyticsPresentation.ts`：继续负责语言、数值展示与既有兼容映射，页面生产调用传入已校验的领域类型。
- `features/analytics/types.ts`：只保留页面状态、Tab、Props 和视图模型；移除第一阶段使用的混合 AnalyticsData/AnalyticsRecord，必要时仅作领域类型转导出。

解析器为纯函数；通过校验后显式构造结果，不用最终的 `as T` 或双重断言把输入宣称为已验证。动态列、区域和灾害类型字典仍可使用 Record，但 value 必须具有明确类型；静态字段不能用 Record<string, unknown> 遮蔽。

## 5. 响应及状态契约

第一阶段 Service 成功返回 `AnalyticsSuccess<T>`：success 固定为 true，data 必填；processingTime、timestamp 等元数据按当前端点契约校验，并允许端点原本不提供它们。业务层没有通用的默认 T = unknown，也没有顶层任意字段索引。

错误通过现有 Promise rejection 路径传播，区分三类：

1. HTTP/网络错误：保留现有请求层策略。
2. success 为 false 的业务失败：抛出稳定业务错误，不当作成功数据写入状态。
3. JSON 损坏、success 缺失或类型错误、成功响应缺少 data、字段形状不符：抛出 `AnalyticsContractError`，code 为 `ANALYTICS_RESPONSE_INVALID`，用户文案为“分析服务返回的数据格式异常，请稍后重试。”。

契约错误不得被 Service catch 改写成无法辨识的普通 Error，也不参加网络重试或 useAnalyticsData 的自动重试。Hook 仅针对该类错误跳过重试，其他调度语义沿用现状。核心统计/预测/风险任一失败时，本轮核心结果不写入；4D 增强失败保留本轮核心结果，清除相应旧增强结果并提示增强数据不可用。

日志只记录固定端点标识、错误码和预定义字段路径；字典中的外部键用通用占位路径表示。不得记录原始 JSON、服务端错误正文或用户灾害内容。

## 6. 校验和兼容规则

### 6.1 基本规则

- 校验对象结构、被公开给调用方的字段和嵌套集合成员。未知新增字段忽略，不因服务端添加字段破坏兼容；忽略字段也不作为未校验数据返回。
- 必填字段缺失属于协议异常。合法可选字段缺失保留为缺失；已出现但类型错误的字段属于协议异常，不静默丢弃。
- 不把字符串数字、布尔值、空字符串隐式转成数值；保留合法零值。
- 数值必须有限；Python 将 NaN/Infinity 清洗为 null 的统计字段明确允许 null，展示为“暂无数据”，不转成零。
- 计数校验为非负整数。区间依据字段定义：风险总分为 0–100、confidence 为 0–1；趋势斜率可为负值，不能给所有数字套同一规则。
- 质量 API 的 overallScore 固定为 0–100，维度分数和阈值固定为 0–1；超出对应范围或非数值输入属于协议异常。使用明确接受 QualityReportData 的展示入口，不能根据值是否超过 1 猜测总分单位：API 的 0.5 分必须显示为 0.5 分。已有 unknown 展示工具的比例兼容与钳制规则可为旧调用保留，第一阶段生产 API 链路不使用该猜测路径。

### 6.2 统计、预测和风险

- StatisticsData 以实际 Python 六个输出区块为依据。basicStats 的 mean/std/min/max 使用列名到 number | null 的映射；允许数据不足导致的合法空统计子对象。
- ChartsPanel 显示 magnitude 对应均值/标准差，并明确指标标签。字段缺失或 null 显示“暂无数据”，避免向对象调用 toFixed。OverviewTab 以及所有直接进行数值格式化、真值判断或算术计算的统计字段同时迁移到可空数值展示函数，不能只修复 ChartsPanel。
- PredictionsData 按五种灾害预测及总体评估分别定义。五类预测模型的 status 使用 ready、insufficient_data、failed 判别分支；reason、样本数量和 confidence 与对应 Python 输出一致。总体评估使用独立判别类型，不复用五类预测模型的 dataPoints 字段；模型失败时 score、averageAccuracy、confidence 为 null，riskLevel 为 UNKNOWN。HTTP 成功中的模型 failed 是合法业务结果，展示“模型不可用”，不变成请求失败。
- 现有展示工具把 model_error 视为失败状态，而 Python 返回 failed。第一阶段以 API 的 failed 为内部判别值，在展示适配器中做唯一且有测试的 failed → model_error 映射；未识别的预测 status 视为契约异常。旧调用的数据兼容可保留为独立能力，不能作为第一阶段 API 接受任意状态的入口。
- RiskAssessmentData 保留 overallRiskScore、typeRisks、geographicRisks、temporalRisks 及建议等具名字段。InsightsPanel 直接读取 overallRiskScore.level/score，复用已有风险等级文案与颜色规则，取消重复乘以 100。
- 已有单条结构化建议的 metrics 可保留动态映射，但值限定为经过校验的 JSON 值；不将任意 unknown 交给 React 渲染。

### 6.3 4D 与质量

- 4D 无数据响应分别是 `{ trends: [], message, time_window }` 和 `{ risk_scores: [], message, time_window }`；有数据响应分别包含 all_trends/high_risk_trends/statistics、all_risk_scores/top_10_risks/statistics。
- 解析器分别识别这两类形状，转换为前端 `kind: "empty" | "ready"` 判别联合。empty 由真实空数组识别，不用空 statistics 或零风险分数伪装；畸形空对象不能冒充 empty。
- ready 的数组、统计字段与 time_window 全部校验；完整数组为空但响应形状有效时规范化为 empty。kind 为前端内部字段，不要求 Python 增加字段。
- QualityReportData 覆盖当前 ETL 输出中的 overallScore、status、detailChecks、totalRecords、issues、recommendations；规范化与中英文展示复用已有工具。固定质量维度使用显式键类型。
- ETL 内部异常目前可能返回 `{error: string}`，外层仍包装 success: true。该形状必须作为不符合质量报告契约的响应拒绝，不能展示为零分，不能透出 error 原文；本阶段不改变 Python 行为。
- 服务端阈值中未被页面消费的附加项可忽略，页面需要的维度阈值必须合法；无效阈值加载沿用现有安全降级，不显示原始错误正文。

## 7. React 和第三方事件边界

Hook 中统计、预测和风险分别使用各自类型，Props 延续该区分。组件不能通过断言把一个接口结果改造成另一个接口结果，也不能直接接收外部 JSON。

Recharts 点击事件优先使用当前安装版本公开类型；不足以保证 payload 形状时，由局部适配器接受 unknown 并验证需要的 name/date 等字段。无效事件直接忽略，钻取数据由现有本地 Hazard 集合产生。该适配器不改变统计来源、日期分组或筛选规则。

不做新的导出格式或下载功能；未来报告导出必须复用已验证领域数据，另开交付规格。

## 8. 验证设计

先补会失败的响应契约用例，再实现解析器和消费迁移：

- 从 Python 当前路由/服务/算法及已有结果语义测试整理最小真实结构样例；固定时间与数据输入，禁止调用真实外部模型。样例记录源码出处，不能根据前端旧 interface 反推后端输出。
- 8 个接口逐一覆盖真实成功响应、合法空结果（仅适用端点）、缺少 success/data、错误嵌套类型、数组坏成员、未知新增字段和 malformed JSON。
- 数值覆盖 0、null、负计数、字符串数字及非法范围；质量总分专门覆盖 0、0.5、1、95、100，维度分数验证 0–1；预测覆盖 ready/insufficient_data/failed，总体评估模型失败也需要单独样例。
- Service 测试使用实际 Response 经 fetch mock 进入解析器；验证协议错误不自动重试、不返回原始正文。现有 `{success:true,data:{}}` 通用测试桩换成对应接口的最小合法响应。
- Hook/组件验证错误数据不进入状态、4D 空结果提示、增强失败不会展示旧结果、质量协议异常不会生成零分报告、OverviewTab 与 ChartsPanel 的均值/标准差均能安全显示 null、总体预测失败与风险分数显示正确。
- 图表事件测试覆盖合法 payload、null 和字段错型，确认无效事件不会打开钻取面板。
- 类型层增加被编译器实际检查的正反例：合法样例使用 satisfies；用 @ts-expect-error 验证跨接口误用和判别联合未收窄访问会被拒绝。测试文件纳入明确的 tsc 入口，不能仅依赖 Vitest 转译。

质量门禁：`pnpm run lint`、`pnpm run format:check`、`pnpm test`、`pnpm run test:component`、`pnpm run typecheck:client`、`pnpm run typecheck:server`、`pnpm run build`、`git diff --check`；如新增类型测试配置，增加对应 typecheck 脚本并纳入验证入口。更新 E2E mock 后执行受影响的 Analytics E2E。

对本阶段 Service/contracts 和迁移的消费文件启用 ESLint `no-explicit-any: error`；其余目录沿用现有级别。不直接启用全仓 no-unsafe 系列规则。对 response.json 与业务断言增加代码复核，避免“零 any”被错误当成完成证据。

## 9. 执行拆分与完成条件

| 批次 | 交付范围                                                               | 验收重点                                 |
| ---- | ---------------------------------------------------------------------- | ---------------------------------------- |
| 1    | 真实响应样例、基本守卫、响应外壳及错误契约                             | 接口实际数据与声明对应，错误分类稳定     |
| 2    | 统计/预测/风险解析器及 Service、Hook、Tabs、ChartsPanel、InsightsPanel | 消除核心链路断言并修正字段错配           |
| 3    | 质量/4D 解析器及 Service、质量面板、增强展示、图表事件适配器           | 空结果与异常结果可区分，既有业务语义保留 |
| 4    | 受控 lint、类型反例、回归、整体复核及文档更新                          | 门禁通过且第二阶段范围单列               |

批次 2、3 在公共契约稳定后可由独立实现者处理各自模块；共享的 analyticsService 和 Hook 修改需串行集成。每个批次执行任务级复核，最后逐条核对本规格。

第一阶段完成必须同时满足：8 个接口解析覆盖、消费链路类型收紧、合法空/失败语义通过测试、无未经验证的业务断言、验证命令通过。只增加 interface、让 TypeScript 编译通过或减少 any 数量均不足以验收。

第二阶段继续跟踪剩余 Analytics 方法、Hazard/通用 HTTP 边界和跨语言契约生成；第一阶段结束时清单应标记“阶段完成”，不能标记为全仓边界治理完成。

## 10. 当前交付状态

本次交付为设计方案。已核对前端消费路径、Python 响应结构及现有测试入口；实施时补齐字段级样例与解析规则的对应验证。未修改运行时代码，未执行开发验收测试，未提交文档。工作区既有的优化清单变更保留。
