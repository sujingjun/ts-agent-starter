# 代码工具与沙箱

## 职责与入口

源码：`src/infra/sandbox.ts`。

原生文件工具限制工作目录；可选 sandboxTestTool 将受控测试命令放进 Docker，不挂载默认生产凭证。

## 体验与验收

设置 WORKSPACE_ROOT，核对授权目录；ENABLE_SANDBOX=true 且 Docker 可用时由原生 live Agent 调用。浏览器公开网页读取见 integrations/browser。

## 限制与扩展约束

主框架工具目录不默认包含任意 shell。容器本身不代表完整安全，需要宿主资源、网络与凭证隔离。

涉及外部依赖的测试结果见 [验证记录](../../VALIDATION.md)。模块清单见 [模块索引](../MODULES.md)。
