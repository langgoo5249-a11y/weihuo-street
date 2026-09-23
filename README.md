# 尾货街

> 线上地址：`https://weihuo.zangxixitech.cn`（Cloudflare Pages）
> 形态：零依赖纯静态站（HTML / CSS / JS，无构建步骤、无 npm 依赖）

## ⚠️ 关于页面内容（必读）

站点的**功能层已是正式版**：SEO/结构化数据全开、搜索与筛选真实生效、认证墙与合规页齐备。
但**内容层是种子数据**——货源条目、档口名称是上线前为了跑通页面与 SEO 而预置的，
**不是真实商家发布的信息**。

两点是硬性的：

1. **联系方式一律锁定**，统一显示「完成实名认证后可见」——页面上**不存在任何可拨打的号码**；
2. **没有使用「已认证 / 已实名」标识**去背书任何档口（那会是未经核实的声称）。

正式运营前必须做的一件事：把这些条目**替换成真实商家发布的货源**，
或者接上后端，让 `/publish` 真正能收信息。

## 文件结构

```
weihuo-site/
├─ index.html            首页：搜索 / 城市 / 品类 / 推荐位 / 热门档口 / 货源流
├─ huoyuan.html          货源列表：筛选栏（综合·最新·价格·起批量·地区·品类）+ 12 条货源
├─ detail.html           货源详情：图集 / 规格 / 档口卡 / 联系方式认证墙 / 安全提醒 / 相似货源
├─ caigou.html           采购商频道：求购需求列表
├─ qiugou.html           求购线索库（会员专享，noindex，预览墙锁联系方式）
├─ shop.html             档口店铺页
├─ publish.html          发布货源 / 求购需求（表单）
├─ join.html             商家入驻
├─ verify.html           实名认证
├─ login.html            绑定手机号
├─ vip.html              会员：¥59 / ¥168 / ¥400 + 权益对比 + 推荐位规则
├─ groups.html           微信群广场：群规 / 配额 / 实名门槛
├─ msg.html              消息中心
├─ me.html               我的（noindex）
├─ about / terms / privacy / disclaimer / report-guide.html   合规 5 页
├─ 404.html              自定义 404
├─ robots.txt            Allow + 工具页 Disallow + Sitemap
├─ sitemap.xml           12 条可收录 URL
├─ _headers              CF Pages 响应头 + 缓存策略（已移除 X-Robots-Tag）
└─ assets/
   ├─ style.css          共享样式（设计变量取自 design-prototype-v2.html）
   ├─ app.js             交互：真实搜索 / 品类·城市过滤 / 排序 / URL 同步
   ├─ img/*.svg          12 张品类矢量图
   ├─ favicon.svg
   └─ apple-touch-icon.png
```

## 部署方式

Cloudflare Pages，已连 Git 仓库（推 `main` 即自动部署）：

| 项 | 值 |
|---|---|
| Framework preset | None |
| Build command | （留空） |
| Build output directory | `/` |

`_headers`、`robots.txt`、`404.html`、`sitemap.xml` 放仓库根目录，CF Pages 自动识别。

## URL 约定（重要）

CF Pages 会把 `xxx.html` **308 重定向**到 `/xxx`。所以：

- **站内链接一律写干净 URL**（`/huoyuan`、`/detail`，首页写 `/`），避免每次点击吃一跳；
- **canonical 一律指向干净 URL**；
- 本地预览请用 HTTP 服务器（如 `python -m http.server`），
  **不要用 `file://` 打开**——资源用绝对路径 `/assets/...`，file 协议下会全部 404。

## 收录策略

- 可收录：`/`、`/huoyuan`、`/detail`、`/caigou`、`/vip`、`/publish`、`/join`、`/shop`、
  `/about`、`/terms`、`/privacy`、`/disclaimer`、`/report-guide`
- `noindex`（工具页 / 用户页）：`/me`、`/msg`、`/groups`、`/qiugou`、`/verify`、`/login`、`/404`
- 带参筛选页（`?q=` `?sort=` `?cat=`）在 robots 中禁止抓取，避免重复内容

## 验收

`_live/verify2.js`：20 页 × 手机/桌面 = 40 页次，断言横向溢出、坏图、关键文案、
console 报错、资源失败；另含 11 条交互功能断言（搜索收窄、空状态、价格升序、
城市过滤、品类过滤、URL 同步、首页跳转带参）。当前 **40/40 页次 0 异常、11/11 通过**。

## 已知未接后端的功能

`/publish` 提交、`/join` 提交、`/verify` 提交、`/login` 验证码 — 前端表单已就位，
点击会提示「正在接入，暂时请加客服微信 SXLH-888 提交」。这是**真实可用的提交通道**，
不是空提示。

## 下一步（按规格 v2.5）

1. 接后端（Cloudflare Functions + D1 或外部 Postgres，数据访问走 ORM 保留可迁移性）
2. 三级门槛落地：绑手机（T1）→ 实名（T2）→ 会员（T3），校验统一走 `can(userId, action)`
3. 发布防刷三闸门（同号 30s 间隔 / 新号前 3 条先审 / 敏感词与重复检测）
4. 短信通知（同会话 5 分钟合并 1 条、每人每天 ≤3 条）
5. 运营后台（审核 / 举报 / 配置 / 留痕）
6. 正式域名 `weihuojie.com` 上线后 301 迁移
