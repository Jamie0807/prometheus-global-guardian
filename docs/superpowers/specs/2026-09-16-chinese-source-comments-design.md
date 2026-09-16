# 源码中文注释统一设计

## 目标

将 Git 已跟踪的 TypeScript、TSX、JavaScript、CJS 和 Python 源码、测试及可执行配置中的英文注释改为中文，并为每个此类文件提供准确的顶部职责说明。

## 范围

- 包含：189 个已跟踪的 `.ts`、`.tsx`、`.js`、`.cjs` 和 `.py` 文件。
- 排除：JSON、锁文件、生成物、依赖目录和 Markdown 文档；这些文件不是代码注释载体或不支持注释。
- 不修改：程序逻辑、导出 API、测试断言、UI 文案、日志文本、字符串字面量和接口字段。

## 规则

1. 每个包含实现或测试代码的文件首个代码语句前增加中文职责注释。TypeScript、TSX、JavaScript 与 CJS 使用 `/** ... */`；Python 使用模块 docstring。
2. 英文注释逐句翻译为中文，保留 API、库、协议和 ESLint 指令等技术标识符。
3. 文件职责说明以代码实际导出、调用关系和运行位置为依据；无法从代码证实的陈述不写入注释。
4. 保留 ESLint、TypeScript、工具链所需的指令注释，仅将其解释性文本翻译为中文。

## 验收

- 已跟踪目标文件均存在正确的中文文件职责说明。
- 目标文件中不遗留自然语言英文注释。
- `pnpm run format:check`、`pnpm run lint`、客户端及服务端类型检查、`pnpm test`、`pnpm run build` 与 `git diff --check` 均通过，或明确记录既有环境问题。
