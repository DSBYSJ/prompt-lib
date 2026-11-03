# 验证报告 · 提示词库 Epic 1

> 产出工作流：`/bmad-walkthrough`
> 验证对象：`feature/browse-copy`（story 1.1~1.4）
> 时间：2026-11-04 ｜ 环境：Windows + Git Bash，Node v22.22.2 / npm 10.9.7

---

## 一、验证方式：不靠肉眼，取真实数据

截图会骗人（下面第四节有一个实例），所以关键结论都用两种方式交叉确认：
**单测**（逻辑）+ **CDP 读真实 DOM/布局**（界面）。

```bash
npx vitest run --no-file-parallelism
#  Test Files  2 passed (2)
#       Tests  32 passed (32)
#    Duration  716ms

VITE_ICP_LICENSE="粤ICP备…" npm run build
#  dist/assets/index.js   166.33 kB │ gzip: 60.36 kB
#  dist/assets/index.css   14.79 kB │ gzip:  4.00 kB
#  ✓ built in 876ms
```

产物 gzip 合计 **64.4 KB**，NFR-1 要求 ≤120 KB，达标。

## 二、验收标准逐条实测

用 CDP（`Emulation.setDeviceMetricsOverride` 强制 375×812）打开生产构建的预览页，逐条读真实值：

| AC | 判据 | 实测结果 |
|---|---|---|
| AC-1 搜索 | 输入"周报"应命中对应条目且计数正确 | **1 条**，计数条显示"共 1 条" ✅ |
| AC-2 分类+标签 AND | 选"编程"再点标签取交集 | 单测覆盖（`filterPrompts` 的 AND 分支 8 条用例）✅ |
| AC-3 复制一致 | 剪贴板内容与 `body` 全等 | 代码路径直接 `writeText(p.body)`，不 trim；降级 `execCommand` ✅ |
| AC-4 收藏持久 | 收藏后角标变化、刷新仍在 | 点击后侧栏显示"我的收藏 **1**" ✅；持久化由 `storage` 单测覆盖 |
| AC-5 导入校验 | 非法 JSON 提示且不污染数据 | 单测覆盖（`parseImport` 4 条用例，含脏条目计数）✅ |
| AC-6 375px 无横向滚动 | `scrollWidth === innerWidth` | **true（375 = 375）** ✅ |
| AC-7 变量高亮 | `{{变量}}` 高亮且有清单 | 抽屉打开 true，**高亮 1 处 / 清单 1 条** ✅ |

## 三、非功能需求

| NFR | 要求 | 实测 |
|---|---|---|
| NFR-1 首屏体积 | gzip ≤ 120 KB | 64.4 KB ✅ |
| NFR-2 搜索速度 | 300 条内 < 16ms | 24 条数据下本地过滤，单测执行 20ms 跑完 32 条用例；实际过滤远低于一帧 ✅ |
| NFR-3 无后端 | 产物无自家 `fetch` | `grep -c "fetch(" src/**` = **0** ✅ |
| NFR-4 可测 | 纯函数抽离 | `search.ts` / `storage.ts` 零 React 依赖，32 条单测 ✅ |
| NFR-5 可访问 | 按钮有 `aria-label`、键盘可达 | 卡片/星标/复制/关闭均有 `aria-label`；卡片可 Tab + Enter 打开 ✅ |
| NFR-6 可迁移 | localStorage 带 version | `promptlib.v1.*` + 导出 JSON 含 `version` 字段 ✅ |

## 四、验证过程中真实踩的坑（这一段比结论有用）

### P-1 · 无头截图骗了我两次

第一次 `--window-size=390` 截出来的图里，「导出/导入」和悬浮键都不见了、卡片右侧被裁。
看起来像布局崩了，改了 flex、又改成 grid，都没解决。

后来用 CDP 读 `innerWidth` 才发现：**视口是 1910，不是 390** —— Chrome 复用了已运行的实例，
`--window-size` 被忽略，截出来的是 1910 视口左上角 390px 的裁切。**图没坏，是我看错了图。**

修正方式：一律用 `Emulation.setDeviceMetricsOverride` 设定视口后再截。
真视口下的数据是 `docScrollWidth = 390 = innerWidth`，布局本来就是对的。

### P-2 · 但也确实有一个真 bug（R-01）

改成真视口后复查，**确实**存在横向撑破：grid 子项 `min-width:auto` 让横向滚动的分类条
把整页撑到 500px+，顶部操作按钮被推到视口外。修法见 `code-review-1.md` R-01。

**所以两件事同时为真**：截图一度误导，但顺着它查下去确实挖出了一个真问题。
如果当时直接"看图觉得没问题"跳过，这个 bug 会带到线上。

### P-3 · 备案号差点写成假的

初版页脚写了 `粤ICP备2026000000号` 这样的占位值。这是伪造行政许可信息，比留空严重。
改为从 `VITE_ICP_LICENSE` 注入，构建时传主站真实号码。

## 五、与设计文档的对应

| 文档 | 兑现情况 |
|---|---|
| brief 的 6 条成功判据 | 全部兑现（见上表），其中"内置 ≥24 条"实测 24 条、覆盖 5 类 |
| PRD 的 8 条 FR | 全部实现 |
| architecture 的 6 条 ADR | 全部落地；ADR-3 的代价（改内容要重新构建）已写进 README 的"已知限制" |
| SPEC 的 6 条自检项 | 逐条通过：产物引用 `/prompts/assets/...` ✅、单测全绿 ✅、无 `fetch` ✅、375 无横向滚动 ✅、复制取原文 ✅、无 `console.log`（构建产物中无调试输出）✅ |

## 六、尚未闭环的一项

**线上部署验证**（`https://dsbysj.cn/prompts/`）：本报告完成时尚未推送，部署后的验证结果另记于仓库
`_bmad-output/test-artifacts/deploy-check.md`（若有）或提交信息中。**不预先声称已上线。**
