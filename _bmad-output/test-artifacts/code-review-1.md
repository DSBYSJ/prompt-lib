# 代码审查记录 · Epic 1

> 产出工作流：`/bmad-code-review`（Dev / QA）
> 审查对象：`feature/browse-copy` 相对 `main` 的全部改动
> 时间：2026-11-04 ｜ 审查人：站长自审（单人项目）

---

## 一、审查范围

```
package.json / vite.config.ts / tsconfig.json / index.html
src/{main.tsx,App.tsx,types.ts,vite-env.d.ts,styles.css}
src/components/{Sidebar,PromptCard,Drawer,Composer,Toast}.tsx
src/data/prompts.ts
src/lib/{search,storage}.ts + __tests__/
README.md
```

**关注点不是"代码好不好看"，而是四件事**：会不会崩、合规有没有踩线、窄屏能不能用、测试是不是真在守东西。

---

## 二、过程中发现并修掉的问题（均有痕迹，非虚构）

### R-01 · High · 横向滚动的分类条把整页撑宽 —— **已修**

**现象**：手机端（390px）截图里，顶部「导出/导入」与右下悬浮键都不见了，卡片右侧被裁掉。

**根因**：`.main` 是 grid，其子项默认 `min-width: auto`。分类条是 `overflow-x: auto` 的横向 flex，
它的**内容宽度**（8 个按钮约 500px）参与了 grid 列的 min-content 计算，把整页撑到 500px 以上——
`.app` 变宽后，顶部条的右端与 fixed 元素都被推到视口外。

**修法**：`.side { min-width: 0 }`，并给 `html, body` 加 `overflow-x: hidden` 兜底。

**验证**：CDP 读真实布局，修前 `docScrollWidth > 视口`，修后 `docScrollWidth = 390`，悬浮键落在 `(320, 774)`。

**这条为什么值得记**：`--window-size=390` 的无头截图**不可信** —— Chrome 复用已有实例时会忽略该参数，
截出来的是 1910 视口左上角的裁切。必须用 `Emulation.setDeviceMetricsOverride` 才是真手机视口。

### R-02 · Medium · 搜索框在窄屏被挤掉 —— **已修**

`flex: 1`（basis 为 `0%`）时，子元素上的 `width: 100%` 不参与换行判断，搜索框会留在第一行末尾被裁。
改成显式 grid 两行（`brand | actions` / `search` 跨列），不再依赖 flex 换行顺序。

### R-03 · Medium · 页脚备案号曾是编的 —— **已修（重要）**

初版把备案号写成了 `粤ICP备2026000000号` 这样的占位值。这不是"待填"，**是伪造行政许可信息**，
比留空严重得多。改为从环境变量 `VITE_ICP_LICENSE` 注入，未设置就不渲染；构建时传入主站真实号码。

> 顺带记一条：备案号属于法律要求的展示项，与"服务器信息不进仓库"的约定不冲突 ——
> 域名与备案号本来就是公开信息，**能公开 ≠ 该写死在代码里**，所以走环境变量。

### R-04 · Low · 移动端的"＋"是个假按钮 —— **已修**

窄屏原本在顶栏塞了一个 `::after { content: "＋" }`，看着像按钮但点不动。
换成右下角真正的悬浮按钮（`.fab`），仅 <1024px 显示，点了打开新建弹层。

### R-05 · Low · 标签墙把侧栏撑爆 —— **已修**

30+ 个标签全量渲染，把「新建提示词」挤到折叠线以下。改为只显示最高频 16 个，长尾交给搜索。

### R-06 · Info · 版本号常量不是硬编码 —— **保持**

`__APP_VERSION__` 由 `vite.config.ts` 从 `package.json` 注入。代价是 `tsconfig` 的 include 不能带
`vite.config.ts`（它用了 `node:fs`，而项目没装 `@types/node`）。这是**有意为之**：
配置文件的类型检查交给 Vite 自己的 esbuild，不为一个配置文件引入整套 Node 类型。

---

## 三、刻意没做的事

| 没做 | 为什么 |
|---|---|
| 引入 ESLint | 32 条单测 + `tsc --noEmit` 已覆盖这支单人项目的实际风险面；为 600 行代码配一套 lint 规则的收益低于维护成本 |
| 前端路由 | 见 architecture ADR-4：子路径 + 路由要处理 base 与刷新 404，换不来什么 |
| UI 快照测试 | 本项目 UI 变更频率高、断言脆；真正会错的是筛选组合与导入校验，那些已有单测 |
| 拼音搜索 | 需要几十 KB 词库；中文输入法下用户通常直接打汉字，先留 `aliases` 字段做后路 |

## 四、安全与合规复查

| 项 | 结果 |
|---|---|
| 产物里是否有 `fetch(` 到自家接口 | 0 处（纯静态） |
| 是否有用户内容上传路径 | 无。自建提示词只进 `localStorage`，页面明写"仅存本机" |
| 是否有评论/分享广场 | 无（个人非经营性备案不做 UGC） |
| 是否泄露服务器信息/密钥 | 仓库内无 IP、面板路径、密钥；备案号走环境变量 |
| localStorage 读取是否可能抛错白屏 | 全部包 try/catch，禁用时降级为会话内状态并提示一次 |

## 五、结论

| 级别 | 数量 | 处置 |
|---|---|---|
| High | 1 | 已修（R-01） |
| Medium | 2 | 已修（R-02、R-03） |
| Low | 2 | 已修（R-04、R-05） |
| Info | 1 | 保持（R-06） |

**可以合并**。合并前最后一次验证：`npx vitest run --no-file-parallelism` 32/32 通过，
`npm run build` 通过，产物 `index.js` 60.36 KB gzip / `index.css` 4.00 KB gzip。
