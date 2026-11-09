# SPEC · spec-2-fill-variables

> 产出工作流：`/bmad-spec`
> 上游：`prd-fill-variables.md`、`architecture-fill-variables.md`
> 日期：2026-11-09 ｜ 状态：ready-for-dev

---

## 一、交付物

| # | 路径 | 动作 | story |
|---|---|---|---|
| 1 | `src/lib/template.ts` | 新增（模板语法唯一实现） | 2.1 |
| 2 | `src/lib/__tests__/template.test.ts` | 新增 | 2.1 |
| 3 | `src/lib/search.ts` | 改：删除自带正则，改为再导出 `extractVars` | 2.1 |
| 4 | `src/components/Drawer.tsx` | 改：表单 + 预览 + 双按钮；`renderBody` 改用 `splitTemplate` | 2.2 |
| 5 | `src/components/Drawer.tsx`（props） | 改：`onCopy(text, kind)` 支持成品/模板 | 2.2 |
| 6 | `src/App.tsx` | 改：复制入口区分成品/模板，`key={prompt.id}` | 2.2 |
| 7 | `src/styles.css` | 加：表单区、预览高亮、按钮层级 | 2.2 / 2.3 |
| 8 | `README.md` | 改：功能列表补"填变量" | 2.3 |

## 二、接口契约

### S-1 `src/lib/template.ts`

```ts
export const TEMPLATE_RE: RegExp                       // /\{\{\s*([^{}]+?)\s*\}\}/g
export interface Segment { type: 'text' | 'var'; value: string }
export function extractVars(body: string): string[]    // 去重保序
export function splitTemplate(body: string): Segment[]
export function renderTemplate(body: string, values: Record<string, string>): string
export function findMissing(body: string, values: Record<string, string>): string[]
```

**约束**
- `TEMPLATE_RE` 带 `g` 标志，但**不得**被外部直接用于 `replace` 之外的场景（`lastIndex` 有状态）；
  对外只暴露函数。
- `renderTemplate` 必须用**函数式 replace**；值取 `values[name.trim()]`，`trim()` 后为空的按"未填"处理，保留原文。
- `renderTemplate` 不修改 `values`，不抛错。
- `findMissing` 返回去重后的变量名（保序），空值判定用 `trim()`。

### S-2 `Drawer` 的 props 变化

```ts
// 之前
onCopy: () => void
// 之后：把"复制什么"交给调用方，Drawer 只负责产出文本
onCopy: (text: string, kind: 'filled' | 'template') => void
```

理由：剪贴板与 toast 是 App 的职责，Drawer 只管"这份提示词现在的成品是什么"。

### S-3 预览渲染

```tsx
{splitTemplate(prompt.body).map((seg, i) =>
  seg.type === 'text'
    ? <span key={i}>{seg.value}</span>
    : values[seg.value]
      ? <span key={i} className="var var--filled">{values[seg.value]}</span>
      : <span key={i} className="var var--empty">{`{{${seg.value}}}`}</span>
)}
```

## 三、UI 规格

| 元素 | 规格 |
|---|---|
| 表单区 | 变量数 >8 时 `max-height: 40vh; overflow-y:auto`；两列栅格（宽屏）→ 单列（窄屏） |
| 输入框 | 高 34px，字号 13px，与既有 `.field input` 同款；`label` 用变量名 |
| 计数行 | "共 N 个变量 · 已填 M 个"，未填时字数用 `--ink-3`，全填后变 `--accent-1` |
| 已填高亮 | `.var--filled` 渐变底 + 深色字（与 Epic 1 的 `.var` 一致） |
| 未填高亮 | `.var--empty` 透明底 + 青色文字 + 虚线描边，避免与"已填"混淆 |
| 未填提示 | 按钮上方一行 12px 文字："还有 N 处没填，复制后保留 `{{变量}}`"，颜色 `#fcd34d` |
| 按钮 | 主「复制成品」占满宽度，次「复制模板」ghost 小按钮排在下方 |

## 四、实现顺序

1. `template.ts` + 单测（先让逻辑对）
2. `search.ts` 改为再导出，跑既有 32 条单测确认没破
3. Drawer 表单 + 预览
4. 复制成品/模板两条路径打通
5. 样式与移动端
6. README

## 五、自检清单

- [ ] `grep -rn "{{" src/lib src/components` 里正则只出现在 `template.ts`
- [ ] 既有 32 条单测仍全绿（`search.ts` 再导出没破坏 API）
- [ ] 新增单测覆盖：同名合并、`$&` 安全、空串视为未填、findMissing 去重
- [ ] 填完复制的内容不含 `{{`
- [ ] 复制模板与 `body` 全等（回归）
- [ ] 375px 下表单不溢出、预览可见

## 六、验收映射

| AC | 兑现 |
|---|---|
| AC-1 表单数量 | `extractVars(body).length` 决定渲染数量 |
| AC-2 同名合并 | `extractVars` 去重 |
| AC-3 成品复制 | `renderTemplate` 输出 |
| AC-4 部分填写 | `findMissing` 计数 + 提示 |
| AC-5 空串视为未填 | `renderTemplate` / `findMissing` 内 `trim()` 判定 |
| AC-6 模板复制回归 | 传 `body` 原文 |
| AC-7 清空 | `setValues({})` |
| AC-8 切条清空 | `key={prompt.id}` |
