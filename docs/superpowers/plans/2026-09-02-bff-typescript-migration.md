# BFF TypeScript 迁移实施计划

> **执行方式：** 按 Superpowers 流程执行；行为变化先补充回归测试，再实现并验证。

## 目标

将服务端入口、灾害数据聚合模块和 AI BFF 从 JavaScript 迁移为 TypeScript，并以编译后的 `dist-server` 产物运行，保持现有 `/api/ai/chat`、`/api/hazards` 和 Docker 启动行为不变。

## 实施任务

1. **建立服务端编译边界**
   - 新增 `tsconfig.server.json`，启用 NodeNext ESM、严格类型检查和 `dist-server` 输出目录。
   - 将服务端运行时代码和测试纳入独立的编译流程，不影响 Vite 前端配置。

2. **迁移运行时代码**
   - 将 `server.js`、`hazards-source.js`、`server/env.js` 和 `server/ai/*.js` 迁移为 `.ts`。
   - 为 AI provider 配置、Workflow/Responses SSE 转换、Express 请求处理补充明确类型。
   - 保持现有 provider 配置、工作流参数、错误码和流式协议兼容。

3. **迁移测试和启动链路**
   - 将 Node 测试迁移为 TypeScript 源码，由编译产物执行。
   - 调整 npm scripts：前端构建、服务端构建、类型检查、测试和生产启动分离。
   - 调整 Docker 镜像，只复制编译后的服务端和前端产物。

4. **文档与验证**
   - 同步更新 README 的目录结构、启动命令和技术栈说明。
   - 更新项目待优化清单，记录 BFF TypeScript 化的完成状态、验证结果和遗留风险。
   - 执行类型检查、单元测试、lint、前端构建、Docker 构建和 `git diff --check`。

## 验收标准

- `npm run typecheck:server` 通过。
- `npm test`、`npm run lint`、`npm run build` 通过。
- Docker 生产启动命令运行 `dist-server/server.js`。
- `/api/ai/chat` 的 Ark、Workflow JSON 和 Workflow SSE 适配测试继续通过。
