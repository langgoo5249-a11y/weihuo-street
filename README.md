# 尾货街 · 静态演示站

> 部署目标：`weihuo.zangxixitech.cn`（Cloudflare Pages）
> 状态：**演示版**——只有前端页面，无后端、无账号、无数据库。

## 这是什么

尾货货源信息平台的**可访问前端原型**，用于上线看实际效果。
页面内容全部为**示例数据**（页面上有明确标注），不是真实商家发布的信息。

## 文件结构

```
weihuo-site/
├── index.html          首页（搜索 / 城市 / 品类 / 推荐位 / 金牌商家 / 货源瀑布流）
├── huoyuan.html        货源列表（筛选栏 + 列表卡）
├── detail.html         货源详情（图区 / 规格 / 商家 / 联系方式认证墙 / 安全提醒）
├── caigou.html         采购频道（求购需求列表）
├── vip.html            会员页（三档定价 + 权益对比 + 推荐位规则）
├── me.html             我的（认证状态 / 四宫格 / 会员入口 / 菜单）
├── 404.html            自定义 404
├── robots.txt          验证期：Disallow: /
├── _headers            Cloudflare Pages 自定义响应头（含 X-Robots-Tag: noindex）
└── assets/
    ├── style.css       共享样式（设计变量取自 design-prototype-v2.html）
    └── app.js          前端交互（未开放功能提示 / 城市选择 / 搜索占位）
```

技术形态：**零依赖纯静态 HTML/CSS/JS，无构建步骤，无 npm 依赖**。
（原因：本机构建环境 `registry.npmjs.org` 不通，无法安装 Next.js/Astro 依赖；
静态站无需构建，可直接部署，也便于后续平滑迁移到 Next.js。）

## 部署方式

Cloudflare Pages，构建配置：

| 项 | 值 |
|---|---|
| Framework preset | None |
| Build command | （留空） |
| Build output directory | `/` |

> 纯静态站不需要构建步骤。`_headers`、`robots.txt`、`404.html` 都放在仓库根目录，
> Cloudflare Pages 会自动识别（`_headers` 注入响应头，`404.html` 作为自定义 404 页）。

然后在该 Pages 项目的 Custom domains 里添加 `weihuo.zangxixitech.cn`。
由于 `zangxixitech.cn` 的 DNS 已托管在 Cloudflare，**添加自定义域时 CF 会自动创建 CNAME 记录**，无需手动配 DNS。

## 🔴 收录策略（重要）

当前**全站 noindex**，双重保险：

1. `robots.txt` → `Disallow: /`
2. `_headers` → `X-Robots-Tag: noindex, nofollow`

**这是刻意的**：demo 阶段不该让搜索引擎抓到一个半成品页（全是示例数据），
否则将来要么被判定低质内容，要么 301 迁移时把权重带走一半。

**将来要放开收录时**，改两个地方：

```
robots.txt   → Disallow: /  改成  Allow: /
_headers     → 删掉 X-Robots-Tag 那一行
```

⚠️ 放开收录**必须换到正式域名**（weihuojie.com 之类），不要长期用二级域名跑正式 SEO——
二级域名的权重是独立的，将来迁移要做 301，且主题与 zangxixitech.cn（号码通查）完全无关，会互相拖累。

## 下一步（正式版要做的事）

按《尾货站产品功能规格-v2-2026-09-23.md》v2.5 实施：

1. 换成 Next.js（或保留静态 + 边缘函数），接 Cloudflare D1
2. 注册 / 绑手机（T1）→ 实名（T2）→ 会员（T3）三级门槛
3. 发布货源 / 采购表单（免费不限条数 + 防刷三闸门）
4. 留言式咨询 + 短信通知
5. 微信群广场 + 配额
6. 运营后台（审核 / 举报 / 配置）
7. 协议合规 5 页（用户协议 / 隐私政策 / 免责声明 / 举报指引 / 关于我们）
