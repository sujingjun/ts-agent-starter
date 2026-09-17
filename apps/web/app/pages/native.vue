<script setup lang="ts">
const {token,prompt,run,busy,error,events,skill,skills,model,connect,start,approve,cancel}=useAgent();
const pending=computed(()=>run.value?.pending.filter(p=>p.phase==='pending'&&p.approved===undefined)??[]);
</script>
<template>
  <main class="shell">
    <header class="masthead"><div><p class="eyebrow">TYPE SCRIPT · AGENT ENGINEERING</p><h1>把一次回答，变成可追溯的执行。</h1><p class="subtitle">任务、工具、证据与审批，在同一条运行记录中查看。</p></div><UBadge color="neutral" variant="subtle">开发者控制台 / 0.1</UBadge></header>
    <section class="connection"><label for="token">访问令牌</label><UInput id="token" v-model="token" type="password" autocomplete="off" placeholder="填写 .env 中的 API_AUTH_TOKEN，不是模型密钥" class="token"/><UButton color="neutral" variant="outline" @click="connect">连接服务</UButton><span class="muted">{{model}}</span></section>
    <div class="layout">
      <section class="left"><UCard><template #header><h2>新建任务</h2></template><form @submit.prevent="start"><label for="question">你需要完成什么？</label><UTextarea id="question" v-model="prompt" :rows="7" class="w-full"/><label for="skill">本次技能</label><select id="skill" v-model="skill"><option value="">不加载技能</option v-for="item in skills" :key="item.name" :value="item.name">{{item.name}} — {{item.description}}</option></select><div class="actions"><UButton type="submit" :loading="busy" :disabled="!token.trim()">开始执行</UButton><UButton v-if="busy" color="neutral" variant="outline" @click="cancel">停止</UButton></div></form></UCard>
      <div class="note"><strong>离线模式不是大模型。</strong><p>默认规则模型只验证计算与本地检索链路。真实模型、数据库和浏览器的验证状态请查阅项目内 VALIDATION.md。</p></div>
      <UCard v-if="run"><h2>运行状态</h2><dl><div><dt>状态</dt><dd>{{run.status}}</dd></div><div><dt>模型轮次</dt><dd>{{run.step}}</dd></div><div><dt>工具调用</dt><dd>{{run.toolCalls}}</dd></div><div><dt>模型报告 Token</dt><dd>{{run.usage.inputTokens+run.usage.outputTokens}}</dd></div></dl><code class="run-id">{{run.id}}</code></UCard></section>
      <section class="right"><div v-if="error" role="alert" class="error">{{error}}</div>
      <UCard v-if="run?.status==='waiting_approval'"><template #header><h2>需要你的审批</h2></template><article v-for="item in pending" :key="item.call.id"><h3>{{item.call.name}}</h3><pre>{{JSON.stringify(item.call.arguments,null,2)}}</pre><div class="actions"><UButton :disabled="busy" @click="approve(item.call.id,true)">批准这次调用</UButton><UButton color="neutral" variant="outline" :disabled="busy" @click="approve(item.call.id,false)">拒绝</UButton></div></article></UCard>
      <UCard v-if="run?.status==='reconciliation_required'"><h2>操作结果尚未确认</h2><p>请求失败不等于操作未发生。请检查目标系统后，按照 API 文档提交核对结果；不要直接重发。</p></UCard>
      <UCard><template #header><div class="section-title"><h2>执行轨迹</h2><span class="muted">{{events.length}} 条已落盘事件</span></div></template><ol v-if="events.length" class="timeline"><li v-for="event in events" :key="event.seq"><span class="step">{{event.seq}}</span><div><strong>{{event.type}}</strong><time>{{new Date(event.at).toLocaleTimeString()}}</time><pre v-if="Object.keys(event.data).length">{{JSON.stringify(event.data,null,2)}}</pre></div></li></ol><div v-else class="empty"><h3>尚未开始执行</h3><p>连接本地 NestJS 服务后，提交一个问题。这里显示真实事件，不展示模拟进度。</p></div></UCard>
      <UCard v-if="run?.result||run?.error"><template #header><h2>结果与证据</h2></template><pre class="answer">{{run.result??run.error?.message}}</pre></UCard></section>
    </div><footer>单租户开发模板 · 不包含企业登录、生产授权或跨进程副作用的恰好一次保证。</footer>
  </main>
</template>
