# 跨语言灾害请求契约与 Python 门禁实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 TypeScript Analytics 灾害请求与 Python `HazardData` 对同一组共享规范样本执行一致的接受和拒绝判断。

**Architecture:** 仓库内 JSON fixture 是跨语言唯一工件。TypeScript 以纯解析器验证发往 Analytics 的 `HazardData`，`formatHazards` 在发送前调用它；Python unittest 直接读取同一 JSON 并构造 Pydantic `HazardData` 和 `AnalysisRequest`。GitHub Actions 现有前端/BFF 与 Python job 自动执行各自测试，无需增加第三个工作流。

**Tech Stack:** TypeScript 5.9 strict、Vitest、Python 3.13、Pydantic v2、unittest、GitHub Actions。

## Global Constraints

- 只覆盖 Analytics 请求侧的 `HazardData` 公共字段：`id`、`type`、`title`、`coordinates`、`timestamp`、`magnitude`、`severity`、`source`、`populationExposed`。
- 坐标固定为 `[longitude, latitude]`；已提供的文本非空，`id` 最大 128 字符，`type`、`timestamp`、`severity`、`source` 最大 64 字符，`title` 最大 256 字符；坐标范围为经度 `[-180, 180]`、纬度 `[-90, 90]`；缺失 `type`、`title`、`coordinates`、`source` 分别默认成 `"unknown"`、`"Unknown Event"`、`[0, 0]`、`"DisasterAWARE"`；`magnitude` 为 `null` 或 `[-20, 20]` 有限数；`populationExposed` 为 `null` 或 `[0, 1_000_000_000]` 整数；未知字段两端都拒绝。
- 允许合法 `0`、`magnitude: null`、`populationExposed: null`。不修改 FastAPI 路径、请求外壳、HTTP 错误、Python 算法、BFF、外部 Hazard 源或 React 组件。
- TypeScript 契约错误使用既有安全 `AnalyticsContractError`，不得拼接样本值、完整 JSON 或堆栈；Python 保持现有 Pydantic/422 语义。
- 不引入代码生成、JSON Schema、新 runtime 依赖或跨语言代码导入；不自动暂存、提交、推送或修改 Git 历史。
- 每项先写失败测试并确认 RED，再最小实现确认 GREEN。

---

### Task 1: 共享样本与 TypeScript 请求解析

**Files:**

- Create: `contracts/analytics-hazard-data.json`
- Create: `src/services/analytics/contracts/hazardInput.ts`
- Modify: `src/services/analytics/analyticsService.ts`
- Create: `tests/service-cross-language-hazard-contract.test.ts`
- Modify: `tests/type-tests/analytics-contracts.test-d.ts`

**Interfaces:**

```ts
export function parseAnalyticsHazardData(value: unknown, path?: string): HazardData;
export function parseAnalyticsHazardDataArray(value: unknown): HazardData[];

type AnalyticsHazardFixture = {
  valid: { complete: HazardData; nullableOptionalValues: HazardData };
  invalid: Array<{ rule: string; value: unknown }>;
};
```

- [x] **Step 1: 写共享 fixture 与失败测试**

创建 `contracts/analytics-hazard-data.json`。`valid.complete` 使用 `id: "hazard-contract-1"`、`coordinates: [116.4, 39.9]`、完整可选字段；`valid.nullableOptionalValues` 使用 `coordinates: [0, 0]`、`magnitude: null`、`populationExposed: null`；`valid.omittedDefaults` 省略 `type`、`title`、`coordinates`、`source` 并锁定其 Python 默认值。`invalid` 使用稳定规则名 `blank_id`、`id_too_long`、`blank_type`、`type_too_long`、`blank_title`、`title_too_long`、`blank_timestamp`、`timestamp_too_long`、`blank_severity`、`severity_too_long`、`blank_source`、`source_too_long`、`coordinate_length`、`coordinate_numeric_string`、`coordinate_range`、`magnitude_not_number`、`magnitude_numeric_string`、`magnitude_range`、`negative_population`、`fractional_population`、`population_boolean`、`unknown_field`，每项仅破坏一个规则。JSON 无法表示 `NaN` 或无穷大，因此两端测试另行以运行时值覆盖非有限数。

在 `tests/service-cross-language-hazard-contract.test.ts` 以 `readFileSync(new URL("../contracts/analytics-hazard-data.json", import.meta.url))` 读取 fixture，断言所有有效样本被 `parseAnalyticsHazardData` 接受，且省略字段使用锁定默认值；逐项断言非法样本抛 `{ code: "ANALYTICS_RESPONSE_INVALID" }` 且异常字符串不包含 fixture 的 `rule` 值。另以 `Number.NaN` 覆盖非有限数。补充 `formatHazards` 测试：`geometry.coordinates: [181, 0]` 在生成请求数据前抛出 `AnalyticsContractError`。

```ts
for (const entry of fixture.invalid) {
  expect(() => parseAnalyticsHazardData(entry.value)).toThrowError(
    expect.objectContaining({ code: "ANALYTICS_RESPONSE_INVALID" }),
  );
}
expect(() =>
  formatHazards([{ id: "bad", geometry: { type: "Point", coordinates: [181, 0] } }]),
).toThrow(AnalyticsContractError);
```

- [x] **Step 2: 运行定向测试确认 RED**

运行：`pnpm exec vitest run tests/service-cross-language-hazard-contract.test.ts`

预期：因 `hazardInput.ts` 尚不存在而失败；fixture 存在但不会被未实现的解析器接受。

- [x] **Step 3: 实现纯解析器与发送前接入**

在 `hazardInput.ts` 使用既有 `AnalyticsContractError`，局部 `isRecord` 和精确键集合拒绝数组、null、未知键。校验 `id`、`timestamp` 及已提供的文本为非空；缺失 `type`、`title`、`coordinates`、`source` 使用 Python 的默认值；已提供的 coordinates 正好两个有限数并分别在范围内；可选 magnitude 与 populationExposed 满足范围；`populationExposed` 额外要求整数。输出新对象，不保留未知键。

```ts
const allowedKeys = new Set([
  "id",
  "type",
  "title",
  "coordinates",
  "timestamp",
  "magnitude",
  "severity",
  "source",
  "populationExposed",
]);

export function parseAnalyticsHazardData(value: unknown, path = "hazard"): HazardData {
  const record = parseRecord(value, path);
  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) throw new AnalyticsContractError(`${path}.[key]`);
  }
  // Construct a new HazardData only from validated fields.
}
```

把 `formatHazards` 保留既有兼容字段回退和默认值逻辑，但每个生成对象立即传给 `parseAnalyticsHazardData(candidate, `hazards.${idx}`)`。这样既有正常映射不变，而经纬度或数值范围不符合 Python 请求契约时在浏览器安全失败，不会发送无效请求。

- [x] **Step 4: 补类型反例并运行 GREEN**

在 `tests/type-tests/analytics-contracts.test-d.ts` 使用 `satisfies HazardData` 写合法零值样本，并加入 `@ts-expect-error` 证明 `coordinates` 不能是字符串、`populationExposed` 不能是字符串。运行：

```bash
pnpm exec vitest run tests/service-cross-language-hazard-contract.test.ts tests/service-analytics.test.ts
pnpm run typecheck:contracts
pnpm run typecheck:client
```

预期：共享样本、现有 Analytics service 回归与两项 TypeScript 检查通过。

### Task 2: Python 使用同一规范样本

**Files:**

- Create: `python-analytics-service/tests/test_cross_language_hazard_contract.py`
- Modify: `python-analytics-service/tests/test_api_contract.py`

**Interfaces:**

```python
def load_fixture() -> dict[str, object]: ...

HazardData.model_validate(value: object) -> HazardData
AnalysisRequest(hazards: list[HazardData | dict[str, object]]) -> AnalysisRequest
```

- [x] **Step 1: 写 Python 共享样本测试与确认 RED**

新增测试从 `Path(__file__).resolve().parents[2] / "contracts" / "analytics-hazard-data.json"` 读取 JSON。对 `valid.complete` 和 `valid.nullableOptionalValues` 调用 `HazardData.model_validate`，断言 `[0, 0]`、两个 `None` 都保留，并用完整样本构造 `AnalysisRequest`。对每个 `invalid` 项使用 `self.subTest(rule=entry["rule"])` 断言 `HazardData.model_validate(entry["value"])` 抛 `ValidationError`；另以 `float("nan")` 覆盖非有限数。

```python
for entry in fixture["invalid"]:
    with self.subTest(rule=entry["rule"]), self.assertRaises(ValidationError):
        HazardData.model_validate(entry["value"])
```

运行：`cd python-analytics-service && python -m unittest tests.test_cross_language_hazard_contract`

预期：fixture 或测试模块尚不存在时失败，失败原因是缺少共享样本/测试文件。

- [x] **Step 2: 对齐 Python 当前约束并确认 GREEN**

实现 fixture 加载测试后，若有效样本被 Pydantic 拒绝，调整 fixture 使其符合已声明的 `HazardData` 约束；不得为迁就 fixture 放宽 Python 模型。若某个非法样本意外通过，在 `requests.py` 以最小 Pydantic 约束或 field validator 补齐与 TypeScript 相同的规则，并在 `test_api_contract.py` 添加对应独立回归断言。

必须保留 `extra="forbid"`，并验证 `populationExposed` 为整数。示例：

```python
with self.assertRaises(ValidationError):
    HazardData.model_validate({**fixture["valid"]["complete"], "unexpected": True})
with self.assertRaises(ValidationError):
    HazardData.model_validate({**fixture["valid"]["complete"], "populationExposed": 1.5})
```

- [x] **Step 3: 运行 Python GREEN 与全量 unittest**

运行：

```bash
cd python-analytics-service && python -m unittest tests.test_cross_language_hazard_contract
cd python-analytics-service && python -m unittest discover -s tests -p 'test_*.py'
```

预期：新测试与 Python 全量 unittest 通过；Pydantic 错误文本不参与断言。

### Task 3: 门禁说明、状态收口与整体验证

**Files:**

- Modify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`
- Modify: `docs/superpowers/specs/2026-09-11-cross-language-hazard-contract-design.md`
- Modify: `docs/superpowers/plans/2026-09-11-cross-language-hazard-contract.md`

**Interfaces:**

- 不新增运行时接口；`.github/workflows/quality.yml` 维持现有两个 job，前端服务测试和 Python unittest 自动覆盖共享 fixture。

- [x] **Step 1: 记录门禁接入与范围状态**

将优化清单中“跨语言灾害契约同步与 Python 契约测试统一门禁”更新为已完成的共享样本范围；保留 Analytics 响应、4D 输出、代码生成和新增跨语言模型的后续项。设计稿状态改为“已实施并通过验证”，计划复选框和执行记录只在实际任务完成后更新。

- [x] **Step 2: 执行全量质量门禁**

运行：

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

另运行 `pnpm test`。若 BFF 测试继续因为当前沙箱禁止监听 `0.0.0.0` 而出现 `EPERM`，记录真实结果和已通过子集，不得称其全量通过。

- [x] **Step 3: 最终整体复核**

检查 fixture 中无真实数据、凭据或完整上游响应；确认 TypeScript 与 Python 都读取同一文件，所有非法规则都被双方拒绝，`formatHazards` 的输出必经请求契约解析。检查 `.github/workflows/quality.yml` 的前端 job 运行 `test:baseline`、Python job 运行 `test:python`，无需改动工作流。复核失败时先定位规则漂移来源，做最小修复，再重新执行受影响命令和 `git diff --check`。
