# 技术架构 · 填完变量再复制

> 产出工作流：`/bmad-architecture`（Architect）
> 上游：`brief-fill-variables.md`、`prd-fill-variables.md`
> 日期：2026-11-09 ｜ 状态：已定稿，交 `/bmad-spec`

---

## 一、这次改动的形状

Epic 1 已经能"找到并复制模板"。这次只在**详情抽屉内部**加一层"填值 → 预览 → 复制成品"，不新增页面、不新增路由、不碰数据层。

```
Drawer
├── 变量表单（新）      ← 每个变量一个 input，同名合并
├── 预览区（改）        ← 由 splitTemplate(body) + values 渲染
└── 底部按钮（改）      ← 主：复制成品 ｜ 次：复制模板 ｜ 收藏 ｜ 删除
```

## 二、关键决策

### ADR-1 变量正则必须收敛到一处

**现状问题（Epic 1 遗留）**：同一套 `{{变量}}` 语法，正则出现了**三份**——
`lib/search.ts` 的 `VAR_RE`、`components/Drawer.tsx` 里的 `renderBody` 内联正则、
以及 `lib/storage.ts` 里判空时用的隐含假设。

三份正则意味着：改一处、忘两处，就会出现"表单识别出 5 个变量，预览只高亮 3 个"这种鬼现象。

**决策**：新建 `lib/template.ts`，成为模板语法的唯一实现：

```ts
export const TEMPLATE_RE = /\{\{\s*([^{}]+?)\s*\}\}/g
export function extractVars(body: string): string[]
export function splitTemplate(body: string): Array<{ type: 'text' | 'var'; value: string }>
export function renderTemplate(body: string, values: Record<string, string>): string
export function findMissing(body: string, values: Record<string, string>): string[]
```

`search.ts` 改为**再导出** `extractVars`（对外 API 不变，既有 32 条单测不受影响），
`Drawer.tsx` 的 `renderBody` 改用 `splitTemplate`。

**后果**：正则只剩一处；以后要支持 `{单花括号}` 之类的新语法，只改一个文件。

### ADR-2 替换必须用函数式 `replace`

```ts
body.replace(TEMPLATE_RE, (_, name) => values[name.trim()] ?? `{{${name.trim()}}}`)
```

不能用 `body.replace(re, values[name])` —— 用户填值里只要出现 `$&`、`$1`、`$$`，
就会被当成替换模式解释，输出错乱。这是**真实会踩**的坑（写代码的人经常填含 `$` 的内容）。

### ADR-3 填值只放组件状态，切条即清

用 `useState<Record<string,string>>` 放 Drawer 内，配合 `key={prompt.id}` 让换条目时组件重建 ——
**重建即天然清空**，不需要手写 `useEffect` 去 reset（少一处容易忘的清理逻辑）。

不做 localStorage：变量名跨条目高度重复（"主题""对象"），沿用旧值会**悄悄填错**，
比"每次重填"更危险。

### ADR-4 预览与表单共用同一份 split 结果

`splitTemplate` 返回有序片段，预览直接 map 渲染：`text` 原样输出，`var` 查 values 决定显示填充值还是原样占位。
**不做二次正则解析**，避免"表单里 5 个、预览里 6 个"的不一致。

### ADR-5 表单滚动与预览各自独立

变量超过 8 个时，表单区 `max-height: 40vh; overflow-y: auto`，预览区保持可读高度。
不把两者放进同一个滚动容器 —— 否则填到第 6 个时看不到预览，等于白做。

## 三、接口与数据流

```
prompt.body ──splitTemplate──> parts[]
                                 │
values: {name -> 填值} ──────────┘
                                 ↓
                    预览：var 有值 → 显示值（高亮）；无值 → 显示 {{name}}
                                 ↓
              renderTemplate(body, values) ──> 成品文本 ──> 剪贴板
```

`findMissing(body, values)` 返回"trim 后为空"的变量名数组，用于提示与计数。

## 四、失败模式与对策

| 失败 | 表现 | 对策 |
|---|---|---|
| 填值含 `$&` | 输出被替换成乱码 | 函数式 replace（ADR-2），并写单测锁死 |
| 同名变量只替换了第一处 | 预览里还有 `{{主题}}` 残留 | `replace` 带 `g` 标志 + 单测断言"3 处全替换" |
| 换条目后旧值残留 | B 条的"主题"里躺着 A 条的内容 | `key={prompt.id}` 强制重建 |
| 变量名大小写不一致 | 填了"主题"，正文写"{{ 主题 }}"没匹配 | 统一 `trim()`；不统一大小写（中文无此问题，英文变量名由数据作者保证一致） |
| 表单挤掉预览 | 变量多时看不到成品 | 表单独立滚动（ADR-5） |

## 五、不做的事（与 PRD 一致）

AI 自动填、跨会话记住、多套预设、变量类型化 —— 均不涉及，理由见 PRD 第七节。
