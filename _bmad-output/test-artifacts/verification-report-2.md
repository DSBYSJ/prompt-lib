# 验证报告 · Epic 2 填完变量再复制

> 产出工作流：`/bmad-walkthrough`
> 验证对象：`feature/fill-variables`（story 2.1~2.3）
> 时间：2026-11-09 ｜ 环境：Windows + Git Bash，Node v22.22.2

---

## 一、基线

```bash
npx vitest run --no-file-parallelism
#  Test Files  3 passed (3)
#       Tests  52 passed (52)        ← Epic 1 的 32 条 + 模板 20 条
#    Duration  1.59s

npm run build
#  dist/assets/index.js   167.61 kB │ gzip: 60.73 kB
#  dist/assets/index.css   16.14 kB │ gzip:  4.21 kB
```

体积从 64.4 KB → **64.9 KB gzip**（+0.5 KB），因为新增的是逻辑与样式，没有引入任何依赖。

## 二、验收标准逐条实测（CDP 读真实 DOM，非肉眼）

| AC | 判据 | 实测 |
|---|---|---|
| AC-1 表单数量 | `study-plan` 应有 5 个输入框 | **5 个**，计数行"共 5 个变量 · 已填 0 个" ✅ |
| AC-2 同名合并 | 同名变量只生成 1 个输入框、全部替换 | 由 `extractVars` 去重保证；单测覆盖 ✅ |
| AC-3 成品复制 | 全部填完后预览不含 `{{` | 填 5 个后 `textContent.includes('{{')` = **false** ✅ |
| AC-4 部分填写 | 未填的保留原样并提示剩余数 | 填 1 个后：已填高亮 1、未填 4，提示"还有 4 处没填" ✅ |
| AC-5 空串视为未填 | 纯空格不算填 | 单测：`renderTemplate('{{主题}}', {主题:'   '})` 返回原文 ✅ |
| AC-6 模板复制回归 | 与 `body` 全等 | 传 `body` 原文；Epic 1 的同名用例仍绿 ✅ |
| AC-7 清空 | 点清空后回到初始 | 清空后"已填 0 个"、未填高亮 5 ✅ |
| AC-8 切条清空 | 换条目表单为空 | 换到另条：1 个变量、已填 0、输入框值全空 ✅ |

补充：全部填完后"还有 N 处没填"提示**消失**（`document.querySelector('.drawer__miss')` 为 null）✅

## 三、移动端（375×812，CDP 强制视口）

| 项 | 实测 |
|---|---|
| 列表页 `scrollWidth` | **375 = innerWidth 375**（无横向滚动）✅ |
| 抽屉内 `scrollWidth` | **375** ✅ |
| 表单可视高度 | 276px（5 个字段正好占满 `34vh` 上限，超出才滚动） |
| 输入框宽度 | 315px（单列） |
| 预览区可见性 | `top < innerHeight && height > 40` → **true**（填表时始终看得见成品）✅ |

## 四、这次验证里值得记的两件事

### P-1 · 类型错误在构建时就炸了，不是上线后发现

写完 App 的改动直接 `npm run build`，`tsc` 报 `TS2367 / TS2345`：`CopyKind` 没有 `'card'`。
如果这个项目像很多小项目一样用 `vite build` 跳过类型检查，这个错误会以"卡片复制时 toast 文案不对"
的形式**静默上线**——功能照跑、提示词错，很难被发现。

**结论**：`build` 里带 `tsc --noEmit` 这件事，在 Epic 1 是"多一道闸门"，在 Epic 2 是"真的挡了一次"。

### P-2 · 又一次被"看着正常"骗到之前先量了

上一轮（Epic 1）在移动端吃过 `--window-size` 失效的亏，这次一律先取 `innerWidth` 再判断，
没有出现"截图 390 实际 1910"的误判。**把上一次的坑变成流程，比记住它更可靠。**

## 五、与设计文档的对应

| 文档 | 兑现 |
|---|---|
| brief 的 6 条成功判据 | 全部兑现；其中"变量抽取只在一处实现"用 `grep` 核实（见下） |
| PRD 的 7 条 FR | FR-1~FR-7 全部实现 |
| architecture 的 5 条 ADR | ADR-1 正则收敛、ADR-2 函数式 replace、ADR-3 组件状态+key 重建、ADR-4 共用 split、ADR-5 表单独立滚动 |
| SPEC 的 6 条自检项 | 全部通过 |

**ADR-1 的核实**（这是本次最该被核的一条）：

```bash
$ grep -rn '\{\{' src/lib src/components --include=*.ts --include=*.tsx | grep -v "__tests__"
src/lib/template.ts:12:export const TEMPLATE_RE = /\{\{\s*([^{}]+?)\s*\}\}/g
```

正则字面量只剩一处。`Drawer.tsx` 里还有 `{{${seg.value}}}`，那是**拼给用户看的占位文本**，
不是解析用的正则 —— 判定标准看的是"谁在解析"，不是"谁出现过花括号"。

## 六、尚未闭环

**线上部署**：本报告完成时应尚未发布；部署后的验证另记于提交信息。
不预先声称已上线 —— 这是 Epic 1 就定下的规矩。
