# Python 服务结构整理设计

状态：待确认。需求类型：既有服务的结构重构。

## 现状与目标

当前 main.py 共 805 行，混合 19 个路由、请求与响应模型、分析调度、全局引擎、缓存、指标和启动逻辑。现有 unittest 同时包含模型测试、直接函数调用和 HTTP 契约测试，多处替换 main 模块中的全局对象。

目标是让入口负责应用装配，路由负责 HTTP 边界，服务负责业务调度，schemas 负责校验与数据契约，analytics 继续负责计算。保持路径、方法、请求约束、成功响应、管理权限、CORS、缓存有效期和现有线程调度行为兼容。

## 方案比较

1. 推荐：按职责拆分 app 包，保留根目录 main.py 启动兼容入口。依赖统一由应用状态提供，测试可替换服务或算法依赖。
2. 仅移动路由和模型：迁移少，但全局状态和业务调度仍集中在入口，不能满足路由委托 service 的验收要求。
3. 同时迁移完整包管理、异步任务队列和缓存基础设施：范围大，混入运行行为变化，本轮不采用。

## 目录及职责

```text
python-analytics-service/
  main.py                         # 兼容 python main.py、uvicorn main:app
  app/
    __init__.py
    main.py                       # create_app、应用装配
    dependencies.py               # 从 request.app.state 取得服务
    routes/
      analytics.py                # 综合分析、统计、预测、ETL、风险
      quality.py                  # 质量评估、阈值、历史、统一模型
      pivot.py                    # 五个透视接口
      health.py                   # 首页、健康、指标与缓存管理
    schemas/
      requests.py                 # HazardData 等现有请求模型
      responses.py                # 现有 AnalysisResponse
    services/
      analytics_service.py        # 分析调度、缓存与指标更新
      quality_service.py          # ETL 质量和统一模型调度
      pivot_service.py            # 透视调度与结果转换
    core/
      config.py                   # 现有配置常量
      state.py                    # 应用实例拥有的缓存、指标、引擎
      errors.py                   # HTTP 错误转换
      middleware.py               # request ID
  analytics/                      # 保持既有计算实现
  security.py                     # 复用现有鉴权与 CORS 配置
  log_config.py                   # 复用现有日志配置
```

依赖方向为 routes → services → analytics；schemas 和 core 不反向依赖 routes。服务不依赖 FastAPI Request、HTTPException 或 Response。HTTP 错误转换留在路由边界。

## 状态与兼容策略

- 应用工厂创建一组引擎、服务和缓存状态，挂到 app.state；同一应用内复用，多次创建应用时相互隔离。
- 缓存继续进程内保存，TTL 300 秒、最多 100 条；保留现有 cache key、清理行为、指标字段和统计口径。
- 五个基础分析接口保留 asyncio.to_thread 调度；综合分析保留三任务并行。其余接口保持当前执行方式，避免同时引入调度语义变化。
- 根目录 main.py 仅保留应用与启动入口，不为测试保留全部历史全局符号。迁移测试导入和 mock 位置，保留原断言和行为覆盖；HTTP 与部署入口兼容。
- 请求模型原有默认值、约束及响应字段原样迁移，不借重构增加响应过滤或修改算法。

## 已发现的遗留问题

质量、统一模型和部分透视接口目前仍通过 detail=str(e) 返回原始异常。上一轮日志分级提交并未覆盖这些响应路径，不能宣称已全面脱敏。本轮结构重构将集中其错误处理位置并记录待办，保持现有响应契约；统一安全错误契约应另行补充失败路径测试后处理。

## 验证与执行

1. 找到项目可用的 Python 3.13 环境并运行现有全量 unittest，记录基线；缺依赖时先解决测试环境。
2. 增加并验证应用工厂隔离、路由清单及启动兼容性测试，再迁移模型、状态和服务。
3. 按 analytics、quality、pivot 的边界分配独立实现任务，避免同时编辑入口；各任务完成后复核，最后整体复核。
4. 跑全部 Python unittest，重点检查 422、管理接口 404、缓存命中、线程调度、透视参数转发和空结果；补齐现有质量路由的契约覆盖。
5. 运行项目规定的 lint、format:check、pnpm test、双端 typecheck、build 和 git diff --check，确认前后端契约未回归。
6. 更新 Python README 和项目待优化清单，保留该清单已有未提交修改；未经新指令不提交代码。
