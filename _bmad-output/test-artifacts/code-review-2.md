# 代码审查记录 · Epic 2

> 产出工作流：`/bmad-code-review`（Dev / QA）
> 审查对象：`feature/fill-variables` 相对 `main` 的改动
> 时间：2026-11-09 ｜ 审查人：站长自审

---

## 一、改动范围

```
src/lib/template.ts                      新增（模板语法唯一实现）
src/lib/__tests__/template.test.ts       新增（20 条）
src/lib/search.ts                        改：删掉自带正则，改为再导出
src/components/Drawer.tsx                改：表单 + 预览 + 双复制入口（+127 −54）
src/App.tsx                              改：复制语义区分、key 重置
src/styles.css                           改：表单与两种高亮（+120）
README.md / sprint-status.yaml           改：功能与取舍同步
```

## 二、发现的问题

### R2-01 · Medium · `CopyKind` 少了 `'card'`，编译直接失败 —— **已修**

**现象**

```
src/App.tsx(101,18): error TS2367: This comparison appears to be unintentional
  because the types '"template"' and '"card"' have no overlap.
src/App.tsx(297,51): error TS2345: Argument of type '"card"' is not assignable to
  parameter of type 'CopyKind'.
```

**原因**：`CopyKind` 定义在 Drawer（只有 `filled | template`），但 App 里卡片快捷复制也需要区分文案。
一开始想给 Drawer 的类型加 `'card'`，但那会让 Drawer 的 props 承担一个它永远不会产生的值。

**修法**：Drawer 保持窄类型，App 侧写 `CopyKind | 'card'`。**谁产生这个值，谁负责扩类型。**

**这条值得记的原因**：它是 `npm run build`（含 `tsc --noEmit`）在构建时拦下来的，
而不是上线后靠人点出来。这正好印证 Epic 1 里"把类型检查挂进构建"的决定。

### R2-02 · Medium · 抽屉里两处显示同一份变量信息 —— **已修**

Epic 1 的详情底部有"需要替换的变量（N）"清单；这次加了表单，清单与表单的 label 完全重复，
且清单不可交互、占了纵向空间。**删掉清单**，信息只由表单承担。

无变量的条目（自建纯文本）不显示表单区 —— 已实测（换到 1 变量条目时表单正常，纯文本条目无表单）。

### R2-03 · Info · 判定用 `trim()`，输出用原值 —— **有意保留**

填 `" 30 "`（前后带空格）时：
- 判定为"已填"（`trim()` 后非空）；
- 预览与复制**保留原样的空格**。

理由：用户可能故意留空格做排版（如 `"30 天"` 前后留白）。统一 trim 反而会吃掉用户的意图。
代价是填一串空格时显示为已填但内容为空 —— 已用 `trim()` 判空挡住"纯空格算已填"这一种情况。

### R2-04 · Low · 5 个变量时表单末行单列留白 —— **接受**

`grid-template-columns: repeat(auto-fill, minmax(190px, 1fr))` 在 570px 宽的面板里是两列，
第 5 个字段独占一行左侧、右侧留白。视觉上可接受；为消掉它去写"最后一行居中"的规则属于过度设计。

### R2-05 · Info · `TEMPLATE_RE` 带 `g` 且对外导出，有 `lastIndex` 陷阱 —— **保留但锁死用法**

`g` 标志的正则对象是有状态的：`re.test()` / `re.exec()` 会推进 `lastIndex`，复用会得到奇怪结果。
`String.prototype.matchAll` 内部会克隆正则，不受影响 —— 这也是全部调用点都走 `matchAll` 的原因。

保留导出的理由：测试里要断言"复用不受 lastIndex 影响"，需要拿到同一个对象。
已加单测 `TEMPLATE_RE 允许复用而不受 lastIndex 影响` 把这条钉住；文件头注释也写明了"只用于 matchAll"。

## 三、刻意没做的事

| 没做 | 为什么 |
|---|---|
| 把填值存进 localStorage | 变量名跨条目重复（"主题""对象"），沿用旧值会悄悄填错；见 architecture ADR-3 |
| 给变量加类型（数字/日期控件） | 63 个变量里绝大多数是自由文本，类型化收益低、维护成本高 |
| 在卡片上加"填变量"入口 | 卡片空间有限，填 5 个空不现实；卡片保持"复制模板"并在 toast 里指路 |
| 把 `search.test.ts` 里的 `extractVars` 用例搬到 template 测试 | 那些用例现在测的是"再导出的 API 仍然可用"，属于契约测试，留着有价值 |

## 四、安全与合规复查

| 项 | 结果 |
|---|---|
| 是否新增网络请求 | 无。填值只在内存与剪贴板之间走 |
| 是否把用户输入写进存储 | 无（不持久化） |
| 渲染是否用 `dangerouslySetInnerHTML` | 无。预览走 React 文本节点，填值里的 HTML 会被转义而非执行 |
| 正则注入风险 | 用户输入不参与正则构造，只作为替换值（且用函数式 replace） |

> 最后一条多说一句：如果当初偷懒写成 `body.replace(TEMPLATE_RE, 用户输入)`，
> 除了 `$&` 会错乱之外，填值里的正则元字符也可能被解释。现在值只以字符串形式返回，**永远不参与模式解析**。

## 五、结论

| 级别 | 数量 | 处置 |
|---|---|---|
| Medium | 2 | 已修（R2-01、R2-02） |
| Low | 1 | 接受（R2-04） |
| Info | 2 | 1 有意保留（R2-03）、1 保留并加测试锁死（R2-05） |

**可以合并**。合并前：`npx vitest run --no-file-parallelism` **52/52 通过**，`npm run build` 通过。
