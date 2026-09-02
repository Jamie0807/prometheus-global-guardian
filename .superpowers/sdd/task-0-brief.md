### Task 0：补齐 Service 测试基础和服务端鉴权边界

**文件：**

- 修改：`package.json`、`package-lock.json`
- 新增：`vitest.config.ts`
- 修改：`server.ts`、`server/env.ts`
- 修改：`.env.example`、`src/config/index.ts`

- [ ] **步骤 1：先补充测试命令和最小 BFF 鉴权测试约束**，保留现有 `npm test` 的 BFF 覆盖范围。
- [ ] **步骤 2：增加 `test:bff`、`test:services`、组合后的 `test` 和 `typecheck:client` 命令**；Service 测试使用 Vitest 的 Node 环境，不提前引入 React 组件测试依赖。
- [ ] **步骤 3：将 DisasterAware 用户名和密码改为仅由服务端环境变量读取**，不再从 `import.meta.env.VITE_*` 或浏览器构建产物读取。
- [ ] \*_步骤 4：在 BFF 中保留 `/api/authorize` 和 `/api/hazards/_` 前端路径，由服务端完成登录、token 缓存、401/403 刷新和上游 Authorization 注入。
- [ ] \*\*步骤 5：运行 `npm test`、`npm run typecheck:client` 和 `npm run build`，确认已有开发命令和前端构建兼容。
