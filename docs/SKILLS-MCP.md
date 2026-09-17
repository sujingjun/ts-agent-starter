# 技能与 MCP：内容和协议不能混为一谈

`skills/` 包含研究报告和代码审查两个能力包。`SkillCatalog.metadata()` 只返回名称、说明与文件哈希；`load(name)` 才返回正文。API 的 skill 字段显式选择技能，正文进入该次运行上下文。

这里没有实现完整 Codex/Claude 插件市场、自动安装、自动路由或任意 YAML 元数据。未知权限字段会被拒绝，技能文本也不能扩大工具执行权限。脚本在资源目录里存在不等于已经被工具自动执行。

## 本地实验

```bash
node skills/research-report/scripts/check-report.mjs skills/research-report/assets/report.md
npm test
```

结构通过不表示内容质量提升。真实 Skill 评估应比较无技能/有技能的相同任务集，观察事实准确性、触发误差、延迟、上下文开销，而不是看是否输出更长。

## MCP

`integrations/mcp` 使用官方 v2 TypeScript SDK。工具函数本身仍可独立测试；SDK 负责发现、传输与协议交互，宿主负责授权。示例是本地 stdio；**没有实现远程 OAuth 与完整租户身份传递**。

新接 MCP 服务先做工具清单白名单、描述审查、参数契约、输出大小限制、超时和凭证作用域验证。不要把服务器返回的所有工具直接加入可执行列表。资源和提示也是不可信输入，不是系统权限。

## A2A / ACP / ANP

本包保留它们在课程对照中的位置，但没有提供标准兼容实现。内部 DAG 或对一个函数的调用不等于实现这些协议。需要跨进程智能体协作时，应读取固定版本官方规范，接官方 SDK 后做真实双方互操作测试。


## v0.2 集成补充

主体验入口与当前启动命令见 [QUICKSTART](../QUICKSTART.md)；框架职责见 [LangChain / LangGraph](LANGCHAIN-LANGGRAPH.md)，各模块实际可用范围见 [能力清单](CAPABILITIES.md)。原生教学接口仍保留，不能直接代替框架检查点或审批状态。
