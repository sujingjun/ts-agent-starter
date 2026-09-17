# 部署与运行

本版本建议先本地单实例验收，再容器化。生产身份、多副本租约、限流、审计留存和秘密管理需要单独落实。

## 本地开发

运行 `npm run setup && npm run dev`。一个根npm依赖域负责后端、框架与集成；Nuxt是npm workspace。不要在apps/api、integrations内再次独立安装不一致的依赖版本。

## Docker

按 QUICKSTART 配置 .env。`docker compose --env-file .env -f infra/docker-compose.yml --profile full up --build` 顺序为：PostgreSQL健康 → 两套迁移 → API → 网页。报告、笔记、运行记录在app_data卷；PG在agent_data卷。数据库与API端口只暴露loopback。

删除卷会删除学习数据；不要为了修复启动错误直接执行带 `-v` 的down。数据库密码改变后已有PG卷不会自动更新用户密码。

## Worker

仅原生 /api/runs 支持独立 Worker。设 STORE_MODE=postgres、EXECUTION_MODE=worker；启动API和 `npm run worker`。框架Studio不跟随该开关转交Worker，这是显式架构边界，不是遗漏的后台进程。

## 模型与可观测性

模型密钥只放服务端环境。LangSmith可通过其标准环境变量选择启用；trace可能包含用户文本与工具数据，未获得数据授权时保持 LANGSMITH_TRACING=false。内建事件日志已足够本地诊断，不要求注册外部平台。

## 上线前的硬条件

用真实部署环境完成全栈和失败路径测试；为用户鉴权、租户授权、CSRF/CORS、接口限流、长任务并发与文件配额制定策略。Studio当前进程锁不支持多副本；要增加副本先实现持久任务所有权。外部写操作不能仅依靠框架恢复去推定exactly-once。
