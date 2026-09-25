# 测试目录物理归档治理设计

状态：已确认，待实施。

## 目标

让测试文件跟随被测运行单元归档，保留根目录只承载跨运行单元集成测试，并保持现有命令和测试语义。

## 目录规则

- `apps/web/tests/`：组件测试、浏览器 E2E 和前端 Service/转换测试。
- `apps/bff/tests/`：BFF 路由、AI、认证、灾害代理、数据库持久化和 BFF Service 测试。
- `packages/contracts/tests/`：语言无关契约的 TypeScript 类型测试。
- `tests/integration/`：跨运行单元契约测试、架构边界测试和需要多个运行单元的测试。
- `services/analytics/tests/`：继续只放 Python 分析服务测试。

## 配置与兼容

- 更新 Vitest、组件测试、Playwright、TypeScript 类型测试和格式检查的路径。
- 保留 `pnpm test`、`pnpm run test:services`、`pnpm run test:component`、`pnpm run test:e2e` 和 CI 命令名。
- 迁移后的测试保持原有断言、测试数据和运行环境；仅调整相对导入和配置入口。
- 共享测试 setup 跟随 Web 测试移动；集成测试使用根目录配置。

## 约束

- 不把 Python unittest 与 TypeScript/Vitest 混放在同一测试目录层级。
- 不通过修改测试断言来掩盖路径迁移问题。
- 不在本阶段重写测试内容或新增业务行为。

## 验收

- 根 `tests/` 只保留 `tests/integration/` 及必要的根级测试辅助文件。
- 三类 Node 测试命令和 Python 测试命令均能发现完整测试集合。
- 测试数量与迁移前一致，所有测试通过。
- CI 配置、格式检查和架构门禁不引用旧测试路径。
