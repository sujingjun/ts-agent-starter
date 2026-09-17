<script setup lang="ts">
const s=useStudio();
const {token,error,capabilities,prompt,engine,skill,run,runs,events,busy,history,continueThread,streamedText}=s;
const statusNames:Record<string,string>={queued:'排队',running:'执行中',waiting_approval:'等待审批',completed:'已完成',failed:'失败',cancelled:'已取消'};
</script>
<template>
  <main class="shell">
    <header class="masthead"><div><p class="eyebrow">TS AGENT STARTER / 0.2</p><h1>从问题到执行，完整看见每一步。</h1><p class="subtitle">LangChain 工具循环 · LangGraph 研究流程 · NestJS 服务 · 可审阅的证据和审批。</p></div><NuxtLink to="/native">原生核心对照台 →</NuxtLink></header>
    <section class="connection"><label for="access-token">本地访问令牌</label><UInput id="access-token" v-model="token" type="password" autocomplete="off" class="token" placeholder="复制 npm run dev 输出的本地令牌"/><UButton color="neutral" @click="s.connect">连接服务</UButton></section>
    <div v-if="error" role="alert" class="error">{{error}}</div>
    <section v-if="capabilities" class="notice-row"><UBadge :color="capabilities.modelMode==='demo'?'warning':'success'">{{capabilities.modelMode==='demo'?'规则演示模型，不是真实 LLM':'已配置真实模型'}}</UBadge><span>检查点：{{capabilities.checkpointMode}}</span><span>{{capabilities.processRestart?'已配置数据库持久化':'内存检查点：进程重启后需新建线程'}}</span></section>
    <div class="studio-layout">
      <aside><UCard><template #header><h2>能力体验</h2></template><button v-for="item in capabilities?.experiences??[]" :key="item.id" class="scenario" @click="s.choose(item)"><strong>{{item.title}}</strong><span>{{item.expect}}</span></button><p v-if="!capabilities" class="muted">连接后读取服务端能力清单。</p></UCard>
        <UCard class="mt-4"><template #header><h2>运行记录</h2></template><button v-for="item in runs" :key="item.id" class="scenario" @click="s.open(item.id)"><strong>{{item.prompt.slice(0,35)}}</strong><span>{{statusNames[item.status]??item.status}} · {{item.engine}}</span></button><p v-if="!runs.length" class="muted">尚无任务。记录仅属于当前配置的本地身份。</p></UCard>
      </aside>
      <section class="studio-main"><UCard><template #header><h2>提交任务</h2></template><form @submit.prevent="s.start"><div class="form-row"><label>执行方式<select v-model="engine"><option value="agent">LangChain 标准 Agent</option><option value="research">LangGraph 研究工作流</option></select></label><label>按需加载技能<select v-model="skill"><option value="">不加载</option><option v-for="item in capabilities?.skills??[]" :key="item.name" :value="item.name">{{item.name}}</option></select></label></div><UTextarea v-model="prompt" :rows="4" class="w-full" aria-label="任务问题"/>
        <label v-if="engine==='agent'&&run?.engine==='agent'&&run.status==='completed'" class="check"><input v-model="continueThread" type="checkbox"/>延续当前线程，而不是新建会话</label><div class="actions"><UButton type="submit" :loading="busy" :disabled="!capabilities||busy">开始执行</UButton><UButton v-if="busy" color="neutral" variant="outline" @click="s.action('cancel')">取消</UButton><UButton v-if="run&&!busy&&['failed','running','queued'].includes(run.status)" color="neutral" variant="outline" @click="s.action('resume')">从检查点恢复</UButton></div></form></UCard>
        <section v-if="run" class="notice-row"><UBadge data-testid="run-status">{{statusNames[run.status]??run.status}}</UBadge><span>模型调用 {{run.modelCalls}}</span><span>工具调用 {{run.toolCalls}}</span><code>{{run.id}}</code></section>
        <UCard v-if="run?.status==='waiting_approval'" class="mt-4"><template #header><h2>执行已暂停，等待你的决定</h2></template><p>下方是本次拟执行的全部操作及参数；批准只授权此批操作，不改变后续权限。</p><pre>{{s.json(run.interrupts)}}</pre><div class="actions"><UButton :disabled="busy" @click="s.action('approve',{allow:true})">批准所列操作</UButton><UButton color="neutral" variant="outline" :disabled="busy" @click="s.action('approve',{allow:false})">拒绝所列操作</UButton></div></UCard>
        <UCard v-if="streamedText" class="mt-4"><template #header><h2>模型输出流</h2></template><pre class="answer">{{streamedText}}</pre></UCard>
        <UCard class="mt-4"><template #header><div class="section-title"><h2>真实运行事件</h2><span>{{events.length}} 条</span></div></template><ol v-if="events.length" class="timeline"><li v-for="event in events.filter(e=>e.type!=='model.delta')" :key="event.seq"><span class="step">{{event.seq}}</span><div><strong>{{event.type}}</strong><time>{{new Date(event.at).toLocaleTimeString()}}</time><pre>{{s.json(event.data)}}</pre></div></li></ol><p v-else class="empty">从左侧选择一个能力后提交任务。这里不展示模拟进度。</p></UCard>
        <UCard v-if="run?.output||run?.error" class="mt-4"><template #header><h2>结果、证据与产物</h2></template><pre class="answer" data-testid="run-output">{{s.json(run.error??run.output)}}</pre><div class="actions"><UButton color="neutral" variant="outline" @click="s.loadHistory">查看检查点历史</UButton><UButton v-if="run.engine==='research'&&run.status==='completed'" color="neutral" variant="outline" @click="s.download">下载已批准报告</UButton></div><pre v-if="history">{{s.json(history)}}</pre></UCard>
      </section>
    </div><details v-if="capabilities" class="mt-4"><summary>外部能力配置与体验命令</summary><pre>{{s.json(capabilities.external)}}</pre><p>已配置不代表外部服务通过验收；MCP、浏览器、数据库和容器的验证入口见 docs/EXPERIENCE-GUIDE.md。</p></details>
    <footer>开发者单租户模板。Token 只保存在本页内存；模型密钥只留在服务端。真实模型与联网工具可能产生费用。</footer>
  </main>
</template>
