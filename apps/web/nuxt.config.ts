export default defineNuxtConfig({
    compatibilityDate: '2026-09-17',
    modules: ['@nuxt/ui'],
    css: ['~/assets/main.css'],
    runtimeConfig: { public: { apiBase: 'http://127.0.0.1:3001' } },
    devtools: { enabled: false },
    app: { head: { title: 'TS Agent · 运行控制台', htmlAttrs: { lang: 'zh-CN' } } },
});
