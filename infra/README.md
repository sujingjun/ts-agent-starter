# 部署配置

## 模块职责

docker-compose.yml的postgres可独立运行；full profile按迁移、API、网页顺序启动。持久卷分别保存PG与应用文件，不把数据打进镜像。

## 运行与验收

从项目根目录执行：`docker compose --env-file .env -f infra/docker-compose.yml --profile full up --build`。需要的外部配置见根目录 QUICKSTART.md。

## 维护约束

变更输入输出或持久状态时同步测试与模块说明。失败须能定位到配置、模型、工具或状态，不把未运行集成写成通过。完整目录与专题说明见根目录 docs/MODULES.md。
