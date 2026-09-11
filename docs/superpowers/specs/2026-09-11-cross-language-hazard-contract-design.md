# 跨语言灾害请求契约与 Python 门禁设计方案

日期：2026-09-11
状态：已实施并通过验证。
需求级别：正式规格，承接已完成的前端 Hazard/HTTP 边界治理。

## 1. 目标

为前端 Analytics 请求中的灾害输入建立一份可执行的共享规范样本，使 TypeScript 的 `Hazard` 到 `HazardData` 映射与 Python Pydantic `HazardData` 使用同一组正反例。将 Python 契约 unittest 和前端契约测试纳入当前质量门禁，减少两端模型变更依赖人工同步造成的漂移。

## 2. 范围

### 2.1 共享模型

本批只覆盖跨语言的 Analytics 输入灾害模型：`id`、`type`、`title`、`coordinates`、`timestamp`、`magnitude`、`severity`、`source` 和 `populationExposed`。坐标固定为 `[longitude, latitude]`；所有有限数值、字符串非空、坐标范围、可选字段及未知字段的规则以 Python `HazardData` 当前公开约束为准，并由共享样本锁定。`id` 最大 128 字符，`type`、`timestamp`、`severity`、`source` 最大 64 字符，`title` 最大 256 字符。缺失 `type`、`title`、`coordinates`、`source` 分别默认成 `"unknown"`、`"Unknown Event"`、`[0, 0]`、`"DisasterAWARE"`；已提供的值仍须通过其字段校验。

### 2.2 共享样本

新增一个仓库内 JSON 文件，分为：

- `valid`：至少一条包含所有字段的完整灾害输入，并覆盖合法 `0` 与可选字段为空的语义。
- `invalid`：每项附稳定 `rule` 名称，分别覆盖所有文本字段的空白值与长度上限、坐标长度/范围/数值字符串、数值字段的字符串/布尔值/小数或超出范围，以及未知字段。JSON 无法表达 `NaN`、`Infinity`，两端分别以运行时构造的非有限数补充该规则的测试。

样本不保存真实灾害、凭据、上游响应或用户数据。两端只断言“接受或拒绝”和稳定规则名，不断言 Pydantic 的错误文本或浏览器错误堆栈。

## 3. 架构与数据流

```text
shared contract fixture JSON
  ├─ TypeScript contract test
  │    -> Hazard -> Analytics HazardData 映射 / 前端验证
  └─ Python unittest
       -> HazardData / AnalysisRequest Pydantic 验证
```

前端保留现有 `formatHazards` 的兼容职责，但把可复用的输入归一化和验证提取为不依赖网络或 React 的纯函数。Python 继续以 Pydantic 作为最终服务端输入边界。两端不直接生成类型或相互导入代码；共享 JSON 是唯一跨语言工件。

## 4. 错误与兼容性

- 前端非法输入在请求前转换为现有安全契约错误；不得把完整样本、外部字段或异常堆栈写入 UI 和日志。
- Python 继续使用现有 Pydantic 验证错误和 FastAPI 422 行为，不修改 API 路径、请求外壳或错误响应。
- 合法 `0`、可选 `magnitude: null`、可选 `populationExposed: null` 保持有效；坐标 0 仍是合法经纬度。
- 未知字段必须在两端拒绝；不通过默认值悄悄保留或丢弃未知输入。

## 5. 测试与 CI

- TypeScript 测试读取共享 JSON，验证完整样本、可选值、前端模型映射、坐标顺序和全部反例规则。
- Python unittest 读取相同 JSON，以 `HazardData` 与 `AnalysisRequest` 验证完整样本、可选值和全部反例规则。
- 当前 GitHub Actions 保持前端/BFF 与 Python 两个 job；前端 job 运行共享样本测试，Python job 继续运行 `pnpm run test:python`。任何一端与共享样本不一致均应失败。

完成前执行：

```bash
pnpm run lint
pnpm run format:check
pnpm run typecheck:client
pnpm run typecheck:contracts
pnpm run typecheck:server
pnpm run test:services
pnpm run test:component
pnpm run test:python
pnpm run build
git diff --check
```

`pnpm test` 如仍受当前沙箱禁止监听 `0.0.0.0` 的限制，必须记录实际失败；不得将子集验证表述为全量测试通过。

## 6. 非目标与后续

- 不引入 Pydantic 到 TypeScript 的代码生成、JSON Schema 生成器或新运行时依赖。
- 不治理 Hazard 外部源响应、BFF 聚合输出、Analytics 响应、4D 输出或 Python 算法。
- 不修改 FastAPI URL、公开请求字段、限流、认证、缓存或前端组件。
- 后续可在样本稳定后评估从 Pydantic 导出 JSON Schema 或类型生成；该决定需要单独设计。
