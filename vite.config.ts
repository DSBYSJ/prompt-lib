/// <reference types="vitest" />
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string
}

// 部署在 https://dsbysj.cn/prompts/ 子路径下，base 必须与之一致，
// 否则产物里的 /assets/... 会解析到主站根目录 → 白屏 + 控制台 404。
export default defineConfig({
  base: '/prompts/',
  plugins: [react()],
  define: {
    // 版本号单一来源：package.json。页脚显示的 v1.0.0 由此注入，代码里不手写常量。
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  test: {
    // 只测纯逻辑，不引 jsdom —— 见 architecture ADR-5
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
