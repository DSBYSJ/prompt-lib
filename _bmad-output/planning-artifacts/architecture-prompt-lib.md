# 技术架构 · 提示词库

> 产出工作流：`/bmad-architecture`（Architect）
> 上游：`brief-prompt-lib.md`、`prd-prompt-lib.md`
> 日期：2026-11-04 ｜ 状态：已定稿，交 `/bmad-spec`

---

## 一、总体形状

**一个纯静态的 Vite 应用，零后端、零运行时请求。** 数据在构建期就编译进产物，用户的自建内容只进本机 localStorage。

```
浏览器
  └── index.html（Nginx 直接下发）
        └── React 单页
              ├── src/data/prompts.ts  ← 内置 24 条，构建期打包
              ├── src/lib/search.ts    ← 纯函数：过滤/排序（可单测）
              ├── src/lib/storage.ts   ← 纯函数：收藏/自建/导入导出（可单测）
              └── localStorage         ← 只有这两类数据
```

**没有任何 `fetch` 到自家服务** —— 这一条是硬约束（NFR-3），也是"个人备案不做 UGC"的落地方式：服务器根本收不到用户数据。

## 二、关键决策（ADR）

### ADR-1 纯静态，不做后端

| 选项 | 评价 |
|---|---|
| **A. 纯静态（选用）** | 秒开、零运维、合规风险最低（没有接口就没有上传入口）；代价是内容更新要重新构建 |
| B. 加 Node 后端存数据 | 需要账号体系才能区分"谁的数据"，而账号+UGC 正是个人备案的红线；且多一套部署与备份 |
| C. 用第三方 BaaS | 引入外部依赖与密钥，数据出境/合规都要另外解释 |

**后果**：`npm run build` 产出的 `dist/` 就是完整应用，部署=传文件。

### ADR-2 手写 CSS，不引 UI 框架

上一代项目（cycling-dashboard）用过 Tailwind，遇到过一个真实麻烦：浅色主题靠"类名白名单"反向覆盖，写一个没被映射的类就静默失效。这个项目体量小，直接用 CSS 变量 + 语义类名，体积也更小。

**后果**：`src/styles.css` 是唯一的样式真相，主题色集中在 `:root` 变量里。

### ADR-3 数据编译期静态化

`src/data/prompts.ts` 导出 `PROMPTS: Prompt[]`。不做 `public/prompts.json` + fetch。

**理由**：fetch 会引入加载态、失败态、404 排查三个额外问题，而收益只有"改内容不用重新构建"。单人维护，重新构建是 `npm run build` 一句话。

**代价（写清楚）**：新增提示词必须走一次提交 + 构建 + 部署。

### ADR-4 不做路由

单页，分类用状态切换。理由：站点挂在 `/prompts/` 子路径，任何前端路由都要处理 `base` 与刷新 404（Nginx 还得配 try_files）。用状态切换，刷新回到"全部"是可接受的 —— **这是取舍，不是偷懒**。

### ADR-5 逻辑抽成纯函数，只测这些

`search.ts` / `storage.ts` 不 import React，输入输出都是普通对象。测试用 vitest，**不引入 jsdom**。

**理由**：单人项目里，UI 快照测试维护成本高于收益；真正会出错、且出错后难发现的是"筛选条件组合"和"导入校验"。

### ADR-6 部署走独立 Nginx extension conf

主站 `dsbysj.cn` 已有 `/news/` 的先例：`location /news/ { alias /www/wwwroot/ai-news/dist/; }`，写在
`/www/server/panel/vhost/nginx/extension/cycling-dashboard/*.conf` 里，**不改主站 conf**。

本项目照做：新增 `prompt-lib.conf`，`alias /www/wwwroot/prompt-lib/dist/`。改完必须 `nginx -t` 通过才 reload，且保留备份文件用于回滚。

**构建侧配套**：`vite.config.ts` 必须设 `base: '/prompts/'`，否则静态资源 404 —— 这是子路径部署最常见的坑。

## 三、数据模型

```ts
interface Prompt {
  id: string            // 稳定 slug，如 'weekly-report'
  title: string
  category: Category    // 'writing' | 'coding' | 'study' | 'career' | 'image'
  tags: string[]
  aliases?: string[]    // 搜索别名（如英文/缩写）
  when: string          // 什么时候用（一句话）
  body: string          // 正文，含 {{变量}}
  note?: string         // 使用注意
  builtin: boolean      // 内置 or 用户自建
}
```

变量不单独存字段，**从 `body` 里用正则抽取** `/\{\{([^}]+)\}\}/g` —— 避免"定义一套、正文写另一套"的不同步。

## 四、状态与数据流

```
useState: query, category, tags[], favorites:Set<string>, custom:Prompt[], drawerId
useMemo:  visible = filterPrompts([...builtin, ...custom], {query, category, tags, favorites})
```

优先级：`我的收藏` / `我的提示词` 是**分类的一种**（虚拟分类），不是额外筛选器 —— 避免"选了收藏又选编程"到底取交集的歧义。

## 五、目录结构

```
prompt-lib/
├── _bmad/bmm/config.yaml
├── _bmad-output/            # 工作流产物
├── src/
│   ├── main.tsx
│   ├── App.tsx              # 壳：布局 + 状态
│   ├── components/          # Sidebar / Card / Drawer / Composer / Toast
│   ├── data/prompts.ts      # 内置数据
│   ├── lib/search.ts        # 纯函数：过滤、计数
│   ├── lib/storage.ts       # 纯函数：读写、导入导出、变量抽取
│   ├── lib/__tests__/       # vitest
│   └── styles.css
├── index.html
├── vite.config.ts
└── package.json
```

## 六、失败模式与对策

| 失败 | 表现 | 对策 |
|---|---|---|
| `base` 配错 | 线上白屏、控制台 404 `/assets/...` | 构建后 `grep '/prompts/assets' dist/index.html` 自检 |
| 剪贴板权限被拒 | 点了没反应 | 降级 `execCommand`；再失败提示手选 |
| localStorage 满/禁用 | 收藏丢失 | 读写包 try/catch；禁用时降级为会话内状态并提示 |
| 导入脏数据 | 列表崩 | 校验每条必填字段，逐条丢弃并汇总"忽略 N 条" |
| Nginx 改动影响主站 | 主站 502/404 | 只新增独立 conf 文件；`nginx -t` 通过才 reload；保留 `.bak` 一键回滚 |
