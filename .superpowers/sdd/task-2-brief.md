### Task 2：迁移鉴权和灾害数据服务

**文件：**

- 新增：`src/services/auth/authService.ts`
- 新增：`src/services/hazards/hazardAdapters.ts`
- 新增：`src/services/hazards/hazardService.ts`
- 修改：`src/api/auth.ts`
- 修改：`src/api/hazards.ts`
- 修改：`src/api/disasteraware.ts`
- 修改：`src/App.tsx`
- 修改：`src/components/MapView.tsx`
- 修改：`src/components/StatusPanel.tsx`
- 测试：`tests/service-adapters.test.ts`

**接口：**

```typescript
export const hazardAdapters = {
  mapNASACategoryToType,
  detectHazardTypeFromTitle,
} as const;

export async function fetchUSGSEarthquakes(): Promise<Hazard[]>;
export async function fetchNASAEONET(): Promise<Hazard[]>;
export async function fetchGDACS(): Promise<Hazard[]>;
export async function fetchHazardTypes(): Promise<HazardType[]>;
export async function fetchHazardsActive(type?: string): Promise<ActiveHazard[]>;
export async function fetchActiveHazardsByCategory(categoryId: string): Promise<ActiveHazard[]>;

export function adaptUSGSResponse(input: unknown): Hazard[];
export function adaptNASAResponse(input: unknown): Hazard[];
export function adaptGDACSResponse(input: unknown): Hazard[];
```

- [ ] **步骤 1：编写失败的 adapter 测试**，覆盖 NASA 分类映射、标题识别、缺失几何信息、默认严重程度，以及稳定的来源和 ID 字段；纯映射函数必须可独立测试。
- [ ] **步骤 2：运行 `npm test`**，确认服务模块或目标行为尚未实现时新增测试失败。
- [ ] **步骤 3：将 provider 特定的映射移动到 `hazardAdapters.ts`**，并通过 `requestJson` 发起网络请求。
- [ ] **步骤 4：将前端鉴权调用移动到 `authService.ts`**，改为调用 BFF，不在浏览器持有用户名、密码或上游 token；保留 401/403 刷新机制和现有抛错行为。
- [ ] **步骤 5：将 `src/api/*` 文件改为 re-export**，并更新地图、状态组件，直接从 service 层导入。
- [ ] **步骤 6：运行 `npm test`、`npm run lint` 和 `npm run build`**，确认公共数据源失败时仍返回空数组，不会清空地图。
