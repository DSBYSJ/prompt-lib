# 提示词库 · Prompt Library

> 把自己验证过有效的提示词收进一个能搜、能筛、能一键复制的页面。
> 纯静态、无账号、无后端；你新增的内容只存在**你自己的浏览器**里。

线上：<https://dsbysj.cn/prompts/>

---

## 这是什么

平时好用的提示词是在某次对话里调出来的，隔两周就翻不到了。这个库解决三件事：

1. **3 秒找到** —— 搜标题/场景/正文/标签，或按分类、标签筛；
2. **一键复制** —— 点一下进剪贴板；
3. **看得懂** —— 每条都写清「什么时候用」，变量 `{{这样}}` 高亮标出。

## 功能

- 24 条内置提示词，覆盖写作 / 编程 / 学习 / 求职 / 图像
- 搜索（标题、场景、正文、标签、别名，大小写不敏感）+ 分类 + 多标签筛选
- 详情抽屉：正文等宽展示、变量高亮
- **填变量再复制**：为每个 `{{变量}}` 生成输入框，边填边看成品；一键复制成品（未填的保留原样并提示）
- 同时保留「复制模板」——有人就是要把模板存到别处自己改
- 收藏、自建提示词（存本机 localStorage）、导入 / 导出 JSON
- 深色主题、响应式（≥1024 双栏 / 手机单栏 + 悬浮新建键）

## 本地运行

```bash
npm install
npm run dev        # http://localhost:5173/prompts/
```

> 注意地址带 `/prompts/` —— `vite.config.ts` 里 `base: '/prompts/'` 是为子路径部署准备的，开发时也走同一路径，避免"本地好用、上线 404"。

```bash
npm test           # 纯逻辑单测（搜索 / 过滤 / 存储 / 导入校验）
npm run build      # 类型检查 + 产物到 dist/
npm run preview    # 预览产物（PWA/路径问题请在这里验，不要在 dev 下验）
```

沙箱环境里跑测试请加串行参数，否则并发会触发 `EPERM` 并**静默丢测试文件**：

```bash
npx vitest run --no-file-parallelism
```

## 部署（子路径）

本站挂在主域名的 `/prompts/` 下，不改主站配置：

```nginx
# /www/server/panel/vhost/nginx/extension/<站点>/prompt-lib.conf
location /prompts/ {
    alias /www/wwwroot/prompt-lib/dist/;
    index index.html;
    add_header Cache-Control "no-cache" always;
}
location = /prompts {
    return 302 /prompts/;
}
```

上传：`scp -r dist/* root@<host>:/www/wwwroot/prompt-lib/dist/`

改完 Nginx 必须 `nginx -t` 通过再 `nginx -s reload`，并先备份原配置用于回滚。

**备案号**：通过环境变量注入，不写进仓库。

```bash
VITE_ICP_LICENSE="粤ICP备xxxxxxxx号-1" npm run build
```

## 目录

```
src/
├── App.tsx              壳与状态（筛选、收藏、导入导出、抽屉开关）
├── components/          Sidebar / PromptCard / Drawer / Composer / Toast
├── data/prompts.ts      内置数据（构建期打包，无运行时请求）
├── lib/search.ts        过滤与检索（纯函数，有单测）
├── lib/storage.ts       localStorage 读写与导入校验（纯函数，有单测）
└── styles.css           唯一样式真相，主题色在 :root
```

## 几个刻意的取舍

| 决定 | 原因 |
|---|---|
| 不做后端 | 没有账号就没有"谁的数据"问题；也避开个人备案不得有 UGC 的红线 |
| 不做前端路由 | 挂在子路径下，路由要处理 base 与刷新 404；用状态切换换掉这三个坑 |
| 只测纯逻辑 | UI 快照测试维护成本高于收益；真正会错且难发现的是筛选组合与导入校验 |
| 数据编译进产物 | 换 JSON + fetch 只省"改内容要重新构建"，却引入加载态/失败态/404 三处排查 |
| 填的变量值不持久化 | 变量名跨条目高度重复（"主题""对象"），沿用旧值会**悄悄填错**，比每次重填更危险 |
| 变量语法只实现一次 | 正则曾散在两处，会出现"表单 5 个、预览 3 个"；现在全在 `lib/template.ts` |

## 版本

页脚版本号由 `vite.config.ts` 从 `package.json` 注入，代码里没有手写常量。
发版前 `npm version patch --no-git-tag-version`。

## 已知限制

- 自建提示词与收藏只在本机浏览器，换设备需导出/导入
- 无拼音搜索（中文输入法下通常直接打汉字，暂不引入词库）
- 填过的变量值在关闭抽屉后丢弃（有意为之，见"取舍"）
- 24 条内置内容为人工维护，新增需改 `src/data/prompts.ts` 并重新构建
