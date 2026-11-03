# SPEC · spec-1-browse-copy

> 产出工作流：`/bmad-spec`
> 上游：`prd-prompt-lib.md`、`architecture-prompt-lib.md`
> 日期：2026-11-04 ｜ 状态：ready-for-dev

---

## 一、交付物清单

| # | 路径 | 动作 | story |
|---|---|---|---|
| 1 | `package.json` / `vite.config.ts` / `tsconfig*.json` / `index.html` | 新增 | 1.1 |
| 2 | `src/data/prompts.ts` | 新增（≥24 条） | 1.1 |
| 3 | `src/lib/search.ts` + `__tests__/search.test.ts` | 新增 | 1.1 |
| 4 | `src/lib/storage.ts` + `__tests__/storage.test.ts` | 新增 | 1.3 |
| 5 | `src/App.tsx`、`src/components/*`、`src/styles.css` | 新增 | 1.1~1.4 |
| 6 | `README.md` | 新增 | 1.4 |

## 二、接口契约（先定，实现照此写）

### S-1 `src/lib/search.ts`

```ts
export type Category = 'writing' | 'coding' | 'study' | 'career' | 'image'
export interface Filter { query: string; category: Category | 'all' | 'favorites' | 'mine'; tags: string[] }
export function extractVars(body: string): string[]        // {{x}} → ['x']，去重保序
export function matchPrompt(p: Prompt, q: string): boolean // 匹配 title/when/body/tags/aliases，大小写不敏感
export function filterPrompts(list: Prompt[], f: Filter, favIds: Set<string>): Prompt[]
export function countByCategory(list: Prompt[], favIds: Set<string>): Record<string, number>
```

**约束**
- 纯函数、无副作用、不 import React；`filterPrompts` 不修改入参。
- `query` 为空字符串时不做匹配过滤；`tags` 为空时不按标签过滤（AND 语义）。
- 匹配顺序无要求，但结果**必须**保持输入顺序（不做相关度排序，避免"同样搜一个词顺序乱跳"）。

### S-2 `src/lib/storage.ts`

```ts
export const KEYS = { favorites: 'promptlib.v1.favorites', custom: 'promptlib.v1.custom' } as const
export function loadFavorites(): string[]
export function saveFavorites(ids: string[]): void
export function loadCustom(): Prompt[]
export function saveCustom(items: Prompt[]): void
export function exportPayload(favIds: string[], custom: Prompt[]): string  // JSON 字符串
export function parseImport(raw: unknown): { items: Prompt[]; ignored: number } // 逐条校验，脏数据丢弃并计数
```

**约束**
- 所有 `localStorage` 访问包 `try/catch`，失败返回空值而不是抛错（隐私模式不能白屏）。
- `parseImport` 不信任任何字段：`id/title/body` 必填且为字符串，`category` 必须在白名单内，`tags` 非数组则置空。

### S-3 `vite.config.ts`

```ts
base: '/prompts/'      // 子路径部署，必须
build: { outDir: 'dist', target: 'es2020' }
```

## 三、视觉规格（"画面要精美"的落地定义）

| 项 | 规格 |
|---|---|
| 底色 | `#0a0b10` → `#0f1119` 径向渐变，避免纯黑死板 |
| 卡片 | `rgba(255,255,255,.035)` + `1px` 白色 8% 描边 + `backdrop-filter: blur(14px)`，圆角 16px |
| 主色 | 青紫渐变 `#5eead4 → #818cf8`，只用于强调（选中态、按钮、进度） |
| 字体 | 正文系统栈；提示词正文 `ui-monospace`，行高 1.75 |
| 动效 | 卡片入场 `opacity/translateY` 120ms 阶梯延迟；hover 抬升 2px + 描边变亮；抽屉 220ms 缓动 |
| 留白 | 卡片内边距 18px，栅格间距 16px，最大内容宽 1200px 居中 |

## 四、实现顺序

1. 脚手架 + `base` + 空 App 能起（先证明链路通）
2. 数据 + `search.ts` + 单测（先让逻辑是对的）
3. 列表与卡片（能看）
4. 详情抽屉 + 复制 + 变量高亮
5. 收藏 / 自建 / 导入导出 + `storage.ts` 单测
6. 视觉打磨 + 响应式 + 空状态
7. README

## 五、build 阶段自检清单

- [ ] `npm run build` 产物里 `index.html` 引用的是 `/prompts/assets/...`
- [ ] `npm test` 全绿（search + storage 两组）
- [ ] 页面上没有任何 `fetch(` 调用
- [ ] 375px 宽下 `document.body.scrollWidth === window.innerWidth`
- [ ] 复制后剪贴板内容与 `body` 字符串全等（含换行）
- [ ] 无 `console.log` 残留

## 六、验收映射

| AC | 兑现方式 |
|---|---|
| AC-1 搜索 | `matchPrompt` + `filterPrompts`，search 单测覆盖 |
| AC-2 分类+标签叠加 | `filterPrompts` 的 AND 分支，单测覆盖 |
| AC-3 复制一致 | 点击处理里直接 `navigator.clipboard.writeText(p.body)`，不 trim |
| AC-4 收藏持久 | `loadFavorites` 在挂载时读、变更时写 |
| AC-5 导入校验 | `parseImport` 逐条校验 + `ignored` 计数 |
| AC-6 窄屏 | CSS：侧栏在 `<1024px` 变横向滚动条 |
| AC-7 变量高亮 | `extractVars` + 详情里正则分段渲染 |
