---
slug: "data-source-feasibility-and-compliance"
kind: "note"
locale: "zh"
title: "数据源可得性与合规可行性调研（热点资讯 + 周边好店）"
titleEn: "Data Source Feasibility and Compliance"
summary: "哪些平台能用公开接口或 RSS 免凭据读到、哪些必须主动放弃，以及「读公开订阅源」和「爬带签名的接口」之间的线到底画在哪。"
summaryEn: "What can be read from public endpoints and RSS without a credential, which platform has to be written off, and where the line between reading a public feed and scraping a signed API actually sits."
group: "verify"
order: 0
date: "2026-11-16"
hasBody: true
---

> 调研日期：2026-11-16（所有实测与抓取均在该日完成）
> 调研目标：为一个 **PC 上运行的个人工具** 评估两类数据的真实可得性 ——
> (a) 每天看热点/新闻/热门视频，打破信息茧房；(b) 「周边有哪些好玩好吃的地方」地图，来源为小红书/B站等平台，需过滤软广告。
> 方法：全部结论追到**一手来源**（平台官方开放平台文档、官方用户协议/服务条款、官方 robots.txt、官方 API 实际响应、RSSHub 源码）。二次博客/教程不作为事实依据。
> 说明：凡本次未能取到一手依据的，一律写「未取到」，不做推测，不编造字段名、配额数字或条款原文。

---

## 一、结论要点（10 条）

1. **「官方 API 拿热榜」这条路基本只有微博一家还留着文档**。微博 `trends/hourly` / `trends/weekly` 文档与端点仍在（端点实测只因缺 appkey 报错，未证明普通应用真能拿到热搜词）[来源: https://open.weibo.com/wiki/2/trends/hourly 、 https://api.weibo.com/2/trends/hourly.json]；同一族的 `trends/statuses` 页面已明写「接口已下线」[来源: https://open.weibo.com/wiki/2/trends/statuses]。抖音开放平台 OpenAPI 全量列表中「热榜/热点榜」出现次数为 **0**（grep 计数）[来源: https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/list]；知乎无公开热榜 API；小红书开放平台内容未取到。
2. **B 站是当前唯一"无凭证、匿名、带互动数"可用的热门视频数据源**。实测 `https://api.bilibili.com/x/web-interface/popular` 与 `/x/web-interface/ranking/v2` 均返回 `code:0`，含 `title / desc / pic / tname(分区) / pub_location(发布地) / stat(view,like,coin,favorite,share,reply,danmaku)` [来源: https://api.bilibili.com/x/web-interface/popular 、 https://api.bilibili.com/x/web-interface/ranking/v2]。但这两个是**站内前端接口，未在开放平台文档中登记**，属于「未公开但可访问」，条款上仍受《哔哩哔哩弹幕网用户使用协议》约束。
3. **抖音 web 接口对无签名请求直接拒绝**。实测搜索接口返回 `{"status_code":0,"status_msg":"blocked"}`，热搜接口 HTTP 200 但 `content-length: 0`，响应头返回 `x-vc-bdturing-parameters`（内含 `verify_event`、`verify_fp` 等反爬校验参数）[来源: https://www.douyin.com/aweme/v1/web/general/search/single/ 、 https://www.douyin.com/aweme/v1/web/hot/search/list/]。抖音的合规数据只有「用户授权后」的数据开放服务（点赞/评论/粉丝画像），且面向内容创作者与商家，不是全站热榜。
4. **小红书在条款与 robots 两个层面都是"红色"**：官方 `robots.txt` 对 `User-agent: *` 是 `Disallow: /`（全站禁止通用爬虫）[来源: https://www.xiaohongshu.com/robots.txt]；RSSHub 官方源码里小红书只有 **board（专辑）+ user（用户）两条路由**，且 user 路由需要 **Playwright 无头浏览器**并内置 `CaptchaError`（说明会撞验证码）[来源: https://raw.githubusercontent.com/DIYgod/RSSHub/master/lib/routes/xiaohongshu/util.ts 、 .../xiaohongshu/board.ts]。**小红书的「周边好店」数据在合规与工程上都是最难的一环。**
5. **知乎热榜必须带登录态**。实测 `https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total` 返回 `{"error":{"code":101,"name":"AuthenticationError"}}` [来源: 同上]；RSSHub 对应路由 `/zhihu/hot` 明确 `requireConfig: ZHIHU_COOKIES`，底层调 `https://api.zhihu.com/topstory/hot-lists/total?limit=10&reverse_order=0` [来源: https://raw.githubusercontent.com/DIYgod/RSSHub/master/lib/routes/zhihu/hot.ts]。
6. **RSSHub 的粒度是「标题 + 摘要 + 链接 + 作者」，没有互动数，也没有"软广告"标记**。例如 B 站热门路由输出 `title / description / pubDate / link / author`，不含播放、点赞、投币 [来源: https://raw.githubusercontent.com/DIYgod/RSSHub/master/lib/routes/bilibili/popular.ts]；知乎热榜路由输出 title + 指向 `question/{id}` 的链接 [来源: .../zhihu/hot.ts]。**所以"过滤软广告"这个需求无法靠 RSSHub 完成，必须自己拿到原始字段再判别。**
7. **官方条款对"抓来数据做热词统计"是明确禁止的**。抖音用户协议禁止行为第 (6) 项：「利用未经授权获取的抖音中的信息或内容用于统计热词、命中率、分类、搜索量、点击率、阅读量等」[来源: https://www.douyin.com/agreements/?id=6773906068725565448]；知乎协议禁止「以任何方式（包括但不限于盗链、冗余盗取、爬取、抓取、模拟下载…）直接或间接盗取知乎平台的数据和内容」并禁止「使用任何自动化程序、软件或类似工具接入知乎，收集或处理其中信息、内容」[来源: https://www.zhihu.com/term/zhihu-terms]；微博协议定义「非法抓取」为「采用程序或者非正常浏览等技术手段获取内容数据的行为」，并把「远高于正常用户频率地…抓取数据」列为「自动化行为」[来源: https://www.weibo.com/signup/v5/protocol]。**"个人自用"在条款文本里没有豁免。**
8. **地图/POI 应走官方 LBS API，且"只查不存"是硬约束**。高德开放平台服务协议 3.5：「不得直接存储、缓存或技术手段抓取、使用本服务内部数据、图片等相关内容」；4.12.3：禁止用「网络爬虫、抓取工具」访问/抓取/预读取/存储/缓存，并禁止伪造 UA 绕过安全机制；3.4：不得将服务内容用于模型或算法训练及相关数据集构建 [来源: https://lbs.amap.com/home/terms/]。
9. **腾讯位置服务是唯一一家把"个人开发者"配额写死在公开文档里的**：个人开发者「地点搜索 /ws/place/v1/search」每日 **200** PV、并发 **5**；「周边推荐 explore/here」各 **200/日**；「逆地址解析」「关键词输入提示」**6,000/日**；企业(技术公益)2,000/日、并发 100；商业授权 50,000/日、并发 200。文档还写明「企业或其他非公益机构持续使用服务不享受免费权益，必须办理商业授权」，以及「额度上限是一个账号下全部 key 共同分配的」[来源: https://lbs.qq.com/dev/console/quotaImprove ，最近更新 2025.11.13]。**200 次/天的地点搜索对个人桌面工具完全够用。**
10. **推荐的组合是：热点用 B 站（无凭证）+ 微博官方 API（有凭证）+ RSSHub 兜底；周边好店用腾讯/高德官方 LBS API + 「人工/规则筛选」而非平台帖子；小红书与抖音降级为「不抓」。** 若所有平台抓取都被限，退化路径是：**只用公开 RSS（自建 RSS 源 + RSSHub）+ 官方 LBS API + 用户的本地手动收藏**，详见第五节。

---

## 二、逐平台对照表

### 2.1 微博（Weibo）

| 维度 | 结论 | 一手来源 |
| --- | --- | --- |
| 官方开放平台地址 | `https://open.weibo.com/wiki/`，wiki 形态的 API 文档 | https://open.weibo.com/wiki/ |
| 认证方式 | OAuth2.0，需 AppKey/AppSecret + 用户授权 `access_token`；文档「访问级别：普通接口」「频次限制：是」 | https://open.weibo.com/wiki/2/trends/hourly |
| 能否取到"热榜/热搜" | **文档层面有**：`2/trends/hourly`（最近一小时热门话题）、`2/trends/weekly`（最近一周热门话题），返回形如 `{"trends":{"2011-05-31":[{"name":…,"query":…}]},"as_of":…}`。**同族 `2/trends/statuses` 页面标题后明写「接口已下线」** | https://open.weibo.com/wiki/2/trends/hourly ；https://open.weibo.com/wiki/2/trends/weekly ；https://open.weibo.com/wiki/2/trends/statuses |
| 端点实测（2026-11-16） | `GET https://api.weibo.com/2/trends/hourly.json` → `{"request":"/2/trends/hourly.json","error_code":"10006","error":"source paramter(appkey) is missing"}`；weekly 同。说明**路由仍存活**，但普通应用能否真取到热搜词**未取到**（缺 appkey，无法验证权限） | 实测 |
| 笔记/视频标题+标签+互动数+地理位置 | 官方 `statuses/*` 系列有 `reposts_count / comments_count / attitudes_count / geo / pic_ids` 等字段（见 `trends/statuses` 的返回字段表，该接口已下线，但字段结构说明官方仍公开）。**普通接口 `2/statuses/public_timeline` 是否仍开放给个人应用：未取到** | https://open.weibo.com/wiki/2/trends/statuses |
| 是否允许个人自用 | 开发者协议把"开发者"定义为经申请同意的"个人、法人或其他组织"（**允许个人主体**），但第 2.7.8 条：「业务范围为数据采集、分析并服务于其他第三方的开发者，仅可通过微博商业数据API进行相关工作」→ **自用可以，但不得把数据再分发**；2.7.7：「通过开放API获得的数据仅可服务于接入应用或网站，不得用于其它任何用途」 | https://open.weibo.com/wiki/开发者协议 |
| 限流配额 | 「一个应用内单授权用户每天累计只能请求微博开放接口 **100 次**」；「一个IP地址每小时只能请求微博开放接口 **15000 次**」；「发微博接口单授权用户每小时只能请求 30 次」；建议 3–5 分钟/次；**「微博开放平台禁止第三方服务器端存储用户数据…只能缓存在客户端」**；未通过审核应用最多授权 15 个测试账号 | https://open.weibo.com/wiki/Rate-limiting （文档更新时间 2025-05-15） |
| robots.txt | 对 `User-agent: *`：`Disallow: /`，仅 `Allow: /ads.txt`。对 AI 爬虫 UA（Perplexity-User / DeepSeek / ChatGPT-User / Kimi / Doubao 等）：`Disallow: /`，仅 `Allow: /sitemap.xml /sitemap/ /2/detail/ /ttarticle/p/show`。`Crawl-delay: 1` | https://www.weibo.com/robots.txt |
| 条款风险（抓取） | 用户协议 1.3.2：「未经微博运营方事先书面许可，用户不得自行或授权、协助任何第三方非法抓取微博内容，"非法抓取"是指采用程序或者非正常浏览等技术手段获取内容数据的行为」；4.5.1：自动化行为 = 「未经微博运营方同意…采用自动化手段或明显异于常人的、远高于正常用户频率地发布微博、评论、私信…或作出关注、点赞、**抓取数据**等的行为」 | https://www.weibo.com/signup/v5/protocol |
| 条款风险（官方接口） | 开发者协议 2.8.6(5)：「避开、尝试避开或声称能够避开任何内容保护机制」；2.8.6(12)：「未经授权获取对微博平台的访问权」；2.5.6：不得以任何方式将用户数据给第三人；2.5.9/2.5.13：不得私自以任何形式将平台数据提供给第三人 | https://open.weibo.com/wiki/开发者协议 |
| **判定** | **推荐（唯一有官方热榜文档的平台）**：走 OAuth 官方接口，客户端本地缓存（协议明令禁止服务端存储）。注意 100 次/天/授权用户的额度，按每 5 分钟一次拉取刚好够用。热榜词条只是关键词，**不能直接当"热点内容"**，还需二次取内容（那一步的开放性未取到）。 | — |

### 2.2 知乎（Zhihu）

| 维度 | 结论 | 一手来源 |
| --- | --- | --- |
| 官方开放平台 | `https://open.zhihu.com/` 本次访问返回 `HTTP 422` + `{"error":{"code":4000,"name":"UnprocessableError"}}`（多次、带 UA 重试均相同）→ **可用性未取到** | 实测 https://open.zhihu.com/ |
| 热榜接口 | 无公开文档。实测 `https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=3` → `{"error":{"code":101,"name":"AuthenticationError","message":"身份未经过验证"}}` → **必须带登录 Cookie** | 实测 |
| RSSHub 路由 | `/zhihu/hot`（`path: '/hot/:category?'`），`requireConfig: ZHIHU_COOKIES`，底层 `https://api.zhihu.com/topstory/hot-lists/total?limit=10&reverse_order=0`，输出 title + `question/{id}` 链接 + 「热榜」栏目名 | https://raw.githubusercontent.com/DIYgod/RSSHub/master/lib/routes/zhihu/hot.ts |
| 聚合粒度 | 标题级 + 链接（指向具体问题），无互动数 | 同上 |
| robots.txt | `User-Agent: *` → `Allow: /tardis/jm` + `Disallow: /`；`AdsBot-Google` → `Disallow: /` | https://www.zhihu.com/robots.txt |
| 条款风险 | 用户协议明确禁止：「使用未经知乎授权或许可的任何插件、外挂、系统或第三方工具对知乎服务的正常运行进行干扰、破坏、修改或施加其他影响，包括但不限于**使用任何自动化程序、软件或类似工具接入知乎，收集或处理其中信息、内容**」；禁止条款含「以任何方式（包括但不限于盗链、冗余盗取、**爬取、抓取**、模拟下载、深度链接、假冒、模拟注册等）直接或间接盗取知乎平台的数据和内容；恶意注册知乎账号，包括但不限于频繁、批量注册账号等」 | https://www.zhihu.com/term/zhihu-terms |
| **判定** | **备选**：热榜本身可拿（带 Cookie），但**"用自动化程序接入并收集内容"被协议明文禁止**，且"个人自用"不构成豁免。建议只取**榜单条目（问题标题）**用于"知道大家在想什么"，不抓正文、不批量抓取。 | — |

### 2.3 哔哩哔哩（bilibili）

| 维度 | 结论 | 一手来源 |
| --- | --- | --- |
| 官方开放平台 | `https://openhome.bilibili.com/` 存在（"致力于为开发者提供基础能力、内容、…"），文档页为前端渲染，**具体 API 列表未取到** | https://openhome.bilibili.com/ |
| 可用的热门接口（非官方登记） | ① `GET https://api.bilibili.com/x/web-interface/popular?ps=&pn=` → `code:0`，字段：`title / desc / pic / duration / tname(分区) / pubdate / pub_location / owner / stat{view,danmaku,reply,favorite,coin,share,like} / bvid` ② `GET https://api.bilibili.com/x/web-interface/ranking/v2` → `code:0`，同结构，`note` 字段为「根据稿件内容质量、近期的数据综合展示，动态更新」 | 实测（2026-11-16，无 Cookie、无 Referer 以外的凭证，带普通浏览器 UA + `Referer: https://www.bilibili.com/`） |
| 是否需要登录 | **本次实测不需要登录态**。但 RSSHub 的 `/bilibili/hot-search` 路由底层用的是 `https://api.bilibili.com/x/web-interface/wbi/search/square`，**带 wbi 签名**（需要 img_key/sub_key 与签名算法），说明 B 站部分接口已上 wbi 风控 | https://raw.githubusercontent.com/DIYgod/RSSHub/master/lib/routes/bilibili/hot-search.ts |
| RSSHub 路由（真实存在） | `lib/routes/bilibili/` 下存在：`hot-search.ts`(`/hot-search`，`requireConfig:false`，走 wbi 签名接口)、`ranking.ts`(`/ranking/:rid?/:embed?/:redirect1?/:redirect2?`，例 `/bilibili/ranking/all`)、`popular.ts`(`/popular/all/:embed?`，`requireConfig:false`，`requirePuppeteer:false`，`antiCrawler:false`)、以及 `user / dynamic / danmaku / coin / fav / live-* / manga-* / app / article / audio / bangumi / follower* / message-* / mall-* / partition / story / search / space` 等目录 | https://github.com/DIYgod/RSSHub/tree/master/lib/routes/bilibili ；https://raw.githubusercontent.com/DIYgod/RSSHub/master/lib/routes/bilibili/popular.ts ；https://raw.githubusercontent.com/DIYgod/RSSHub/master/lib/routes/bilibili/ranking.ts |
| 聚合粒度 | RSS 输出 `title / description(由 pic+desc 渲染) / pubDate / link / author` —— **无播放/点赞/投币数**。要互动数必须自己打 `/x/web-interface/popular` | https://raw.githubusercontent.com/DIYgod/RSSHub/master/lib/routes/bilibili/popular.ts |
| robots.txt | `User-agent: *` 仅禁 `/medialist/detail/`、`/index.html`、多语言路径（`/zh-Hant/ /en/ /ja/ …`）。**热门/排行/视频路径未禁** | https://www.bilibili.com/robots.txt |
| 条款风险 | 《哔哩哔哩弹幕网用户使用协议》页面存在（`https://www.bilibili.com/protocal/licence.html`），**正文为前端渲染，本次未取到具体抓取条款**（该 SPA 的数据源未定位到） | https://www.bilibili.com/protocal/licence.html |
| **判定** | **推荐**（热点视频首选）。理由：① 无凭证即可取；② robots 未禁；③ 字段自带 `stat` 互动数 + `pub_location` 发布地 + `tname` 分区，正好支撑"打破信息茧房"（跨分区抽样）与"附近内容"。风险：接口非官方登记，随时可能加签/变更；robots 允许 ≠ 条款允许，条款正文未取到是**存疑点**。 | — |

### 2.4 抖音（Douyin）

| 维度 | 结论 | 一手来源 |
| --- | --- | --- |
| 官方开放平台 | `https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/list`（`open.douyin.com` 已重定向至此）。目录结构：个人资料 / 关系能力 / 内容能力 / **搜索能力** / 私信群聊 / 数据开放服务 / **生活服务开放能力** / 工具能力 / 服务市场开放能力 | https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/list |
| 认证方式 | 用户授权换取 `access_token` / `refresh_token` / `client_token`（列表页「个人资料」段） | 同上 |
| 能否取到"热榜/热搜" | **不能**。全页正文 grep「热榜」「热点榜」命中数均为 **0**。搜索能力只有「关键词视频评论列表」「获取关键词视频评论的回复列表」 | 同上（grep 计数） |
| 能否取到标题/标签/互动数/位置 | 「数据开放服务」有：获取视频点赞数据、获取视频评论数据、分页获取用户所有视频的数据（"返回的数据是实时的"）、获取用户粉丝数据/来源/喜好、获取用户分享数、获取用户主页访问数 —— **但都限定在"授权用户"自己的数据范围内**。「生活服务开放能力」有 **POI热度榜**、`发起店铺匹配POI同步任务`、`店铺匹配状态查询`、`通过高德POI ID获取抖音POI ID`、`查询认领的门店列表`（原文："通过接口查询认领的门店列表，用于商家/服务商映射与抖音 POI 的门店关系"）、`多门店SPU信息查询`、核销券码、订单查询、验券历史查询 —— **这些是面向商家/服务商的经营接口，不是通用地点检索** | 同上 |
| 是否允许个人自用 | 开放平台需创建应用并通过审核（开发者协议体系）；POI 类接口明显面向已认证商家/服务商。**个人自用能拿到什么：未取到** | — |
| 限流配额 | **未取到**（开放平台配额需在开发者后台查看，公开文档未列出数值） | — |
| 抓取门槛（实测） | ① 无签名调用搜索接口 → `{"log_pb":{"impr_id":…},"status_code":0,"status_msg":"blocked"}` ② 无签名调用热搜接口 → `HTTP/2 200` 但 `content-length: 0`，响应头含 `x-vc-bdturing-parameters`（base64 内含 `verify_event:6125`、`verify_fp`、`msToken` 等 bdturing 反爬校验参数）、`x-janus-info`、以及 `x-vc-bdturing-parameters` 中的 `server_sdk_env` 指纹字段 | 实测 https://www.douyin.com/aweme/v1/web/general/search/single/ ；https://www.douyin.com/aweme/v1/web/hot/search/list/ |
| robots.txt | `User-agent: *` 未列出 → 默认允许？但 `Baiduspider` 被禁 `/video/ /note/ /shipin/ /zhuanti/ /topic/ /search/`；Googlebot 系禁 `*seo_topic_aggr* *general_search* *enter_from=* *vid=*` 与 `/follow` | https://www.douyin.com/robots.txt |
| 条款风险 | 用户协议 2.4：「除非得到我们事先明示的书面授权，您不得以任何未经授权的形式使用抖音，包括但不限于改编、复制、传播、**爬虫、垂直搜索、镜像**或交易等」；5.1：「您不得使用任何插件、外挂、系统或第三方工具对抖音的正常运行进行干扰、破坏、修改或施加其他影响，包括但不限于**使用任何自动化程序、软件或类似工具接入抖音，收集或处理其中信息、内容**」；禁止行为 (4)：「以盗链、冗余盗取、**爬虫抓取**、模拟下载…任何不正当方式盗取、监视、复制、传播、展示、镜像…使用抖音中的信息或内容」；**禁止行为 (6)：「利用未经授权获取的抖音中的信息或内容用于统计热词、命中率、分类、搜索量、点击率、阅读量等」**（这一条直接命中本项目的"热点统计"用途） | https://www.douyin.com/agreements/?id=6773906068725565448 |
| **判定** | **不建议**（本项目场景）。理由：① 开放平台无热榜接口；② web 接口有 bdturing + a_bogus/msToken 签名，实测直接 `blocked`；③ 协议把"自动化程序接入收集内容"与"用抓来的数据统计热词"单独列为禁止项。**如果将来要接抖音，只走官方授权能力，且不产出热词统计。** | — |

### 2.5 小红书（Xiaohongshu）

| 维度 | 结论 | 一手来源 |
| --- | --- | --- |
| 官方开放平台 | `https://open.xiaohongshu.com/document/developer/intro` 存在（前端渲染，静态资源托管于 `fe-static.xhscdn.com/formula-static/open-api/`），**能力边界、是否有地点/POI 接口：未取到** | https://open.xiaohongshu.com/document/developer/intro |
| 认证方式 | 未取到 | — |
| 能否取到笔记标题/标签/互动数/位置 | 官方 API 未取到。第三方观察：RSSHub 只能拿到 `notes` 列表与 `userPageData`（见下），**互动数与地理标签是否可得：未取到** | — |
| 是否允许个人自用 / 配额 | 未取到 | — |
| robots.txt | `User-agent: *` → `Disallow: /`；Googlebot → `Disallow: /`（仅 `Allow: /worldcup26`）；Baiduspider/bingbot/360Spider/Sogou/Yisou → `Disallow: /`（仅放行 `/$ /explore /download /sitemap.xml /sitemap-notes- /sitemap-worldcup.xml` 等少量路径） | https://www.xiaohongshu.com/robots.txt |
| 用户协议 | `https://www.xiaohongshu.com/protocols/terms` 与 `.../protocols/agreement` 存在但为前端渲染，**正文条款未取到**（本次两份页面抓到的都是 JS bundle） | https://www.xiaohongshu.com/protocols/terms |
| RSSHub 路由（真实存在，覆盖极窄） | `lib/routes/xiaohongshu/` 目录**只有 4 个文件**：`board.ts`、`user.ts`、`check-cookie.ts`、`util.ts`。`board.ts`：`path: '/board/:board_id'`，`requireConfig: false`，直接抓 `https://www.xiaohongshu.com/board/{id}` 的 HTML；**没有任何"关键词搜索""热榜""地点/周边"路由** | https://github.com/DIYgod/RSSHub/tree/master/lib/routes/xiaohongshu ；https://raw.githubusercontent.com/DIYgod/RSSHub/master/lib/routes/xiaohongshu/board.ts |
| 抓取门槛 | `util.ts` 显示：请求头伪装成 Windows Chrome 122（`Sec-Ch-Ua-Platform: "Windows"` 等）；**无代理配置时走 Playwright 无头浏览器**抓 `__INITIAL_SSR_STATE__`；有代理模式则走代理；代码里显式 `import CaptchaError from '@/errors/types/captcha'` → 存在验证码分支 | https://raw.githubusercontent.com/DIYgod/RSSHub/master/lib/routes/xiaohongshu/util.ts |
| **判定** | **不建议（作为主数据源）**。它是"周边好店"最想用的平台，但：① robots 对通用爬虫全站禁止；② 官方开放平台能力未取到；③ 现成聚合只覆盖专辑/用户两个窄面；④ 需要无头浏览器 + 登录 Cookie + 验证码处理，工程与账号风险都高。**替代方案：把小红书降级为"用户自己收藏/手动粘贴"，工具只负责把高德/腾讯 POI 与用户贴进来的链接做聚合和去广告。** | — |

### 2.6 RSSHub / 第三方聚合站总览

| 平台 | RSSHub 真实路由（源码目录核对） | 粒度 | 凭证 |
| --- | --- | --- | --- |
| B 站 | `hot-search`、`ranking`、`popular`、`user`、`dynamic`、`danmaku`、`coin`、`fav`、`live-*`、`search`、`space`、`partition` 等 | title + desc + pubDate + link + author（**无互动数**） | `popular`/`ranking` 无需配置；`hot-search` 需 wbi 签名（无 cookie） |
| 微博 | `fresh`(`/fresh/:id`，读 `https://weibo.com/a/hot/{id}.html`，`WEIBO_COOKIES` 可选)、`keyword`(`/keyword/:keyword`，走 `https://m.weibo.cn/api/container/getIndex?containerid=100103type%3D61%26q%3D…`，需 `WEIBO_COOKIES`)、`search`、`timeline`、`user`、`friends`、`group`、`super-index`、`user-bookmarks` | title + 摘要 + 链接（**无互动数**） | 关键词/搜索类需 Cookie |
| 知乎 | `hot`(`/hot/:category?`)、`daily`、`question`、`answers`、`collection`、`topic`、`browser`、`weekly`、`zhuanlan`、`bookstore` 等 | title + 链接 | `ZHIHU_COOKIES` 必填 |
| 抖音 | `user`、`hashtag`、`likes`、`live`、`collection`、`saved-posts` —— **无热榜、无关键词搜索路由** | title + 链接 | 需签名/Cookie |
| 小红书 | 仅 `board`、`user` —— **无搜索、无地点路由** | title + 链接 | 需 Playwright/Cookie |

> 聚合站共同的硬伤：**RSS 条目里没有互动数、没有地理标签、没有"是否广告"字段**。因此「用聚合站数据训练/过滤软广告」不成立 —— 过滤算法必须建立在**自己取到的原始字段**上（见 `research/diversity-ranking-and-ad-filtering-algorithms.md`）。

---

## 三、地图底图与 POI 数据方案对照表

| 方案 | 官方文档 | Key 申请与配额 | 能否商用 | 授权/许可要点 | 判定 |
| --- | --- | --- | --- | --- | --- |
| **腾讯位置服务（WebService API）** | 概览 https://lbs.qq.com/service/webService/webServiceGuide/webServiceOverview ；配额（同时列出各服务路径）https://lbs.qq.com/dev/console/quotaImprove | 注册即得「个人开发者」额度：**地点搜索 200 PV/日、并发 5**；POI 详情 200/日；周边推荐 explore/here 各 200/日；逆地址解析/输入提示/行政区划 6,000/日。企业(技术公益) 2,000/日·并发 100；商业授权 50,000/日·并发 200。文档原文：「企业或其他非公益机构持续使用服务不享受免费权益，必须办理腾讯位置服务商业授权」「如您未在规定时间内办理商业授权，我们将停止您的服务调用」「额度上限是一个账号下全部 key 共同分配的」 | **个人开发者身份（个人学习、非企业或组织使用）免费**；企业/非公益组织须商业授权 | 腾讯位置服务自有条款；需逐条核对（本次未取到抓取相关条款原文 → 未取到） | **推荐（周边检索首选）**：唯一把个人开发者配额写清楚的；200 次/日对个人桌面工具绰绰有余；且「周边推荐 explore/here」正好对应"附近有什么" |
| **高德开放平台（Web 服务 API）** | 搜索 POI https://lbs.amap.com/api/webservice/guide/api-advanced/search （最后更新 2026-07-15）；搜索 POI 2.0 https://lbs.amap.com/api/webservice/guide/api-advanced/newpoisearch ；流量限制 https://lbs.amap.com/api/webservice/guide/tools/flowlevel ；服务协议 https://lbs.amap.com/home/terms/ | 注册成为开发者并申请「Web 服务 API」类型 KEY。流量限制页原文：「web平台基础服务调用配额参考，请跳转定价-基础服务配额说明」「**QPS 配额信息，请在 控制台-流量分析-配额管理 页面查看**」→ **具体数字未取到**。搜索接口另有硬限制：「目前搜索是不支持返回全量数据的，同请求参数翻页查询最多支持获取 200 条数据」 | 协议 3.x：商业目的使用需「技术服务许可」（商务流程），个人自用是否需许可：未取到 | **协议最严**：3.4 不得用于模型/算法训练及数据集构建；3.5 **不得直接存储、缓存或技术手段抓取**内部数据；4.12.2/4.12.3 禁爬虫/抓取/预读取/存储/缓存并禁伪造 UA 绕过风控；4.12.7 衍生品"包括生成或用于数据库"；4.12.9 禁开发复刻本服务的 API/SDK/网站；**6.1 不得在服务数据中关联或展示广告**（→ POI 数据里不能塞任何广告位/软广）；4.5 一个 Key 只能用于一个应用；5.1 高德会审核应用"是否自用" | **推荐（可与腾讯并列，或作补充分店/评分补充）**：中文 POI 覆盖与"周边/关键字/多边形/ID"四种检索最全；但**必须"只查不落盘"**，且不能把 POI 灌进本地库再算分 |
| **百度地图开放平台** | 文档已迁至 https://lbs.baidu.com/faq/api?title=webapi （入口），placeapi 页 https://lbs.baidu.com/faq/api?title=webapi/guide/webservice-placeapi ，配额页 https://lbs.baidu.com/faq/api?title=webapi/guide/webservice-quota —— **本次只拿到 SPA 外壳，正文与配额数值未取到**。端点实测存在：`https://api.map.baidu.com/place/v2/search?query=…&ak=INVALID` → `{"status":200,"message":"APP不存在，AK有误请检查再重试"}` | 未取到 | 未取到 | 未取到 | **备选**：作为第三源兜底（多源交叉验证、避免单家封禁即失效），但本次能拿到的官方信息最少 |
| **OpenStreetMap + Overpass API** | Tile 政策 https://operations.osmfoundation.org/policies/tiles/ ；API 政策 https://operations.osmfoundation.org/policies/api/ ；Overpass 公共实例状态 https://overpass-api.de/api/status ；Overpass 官方 wiki https://wiki.openstreetmap.org/wiki/Overpass_API（**本网络不可达 → QPS/并发具体数字未取到**） | **无需 Key、无需登录**。但政策与实例状态明确反对自动化高频：API 政策「Technical Usage Requirements: Valid User-Agent identifying application and version. Faking another app's User-Agent WILL get you blocked. … **Maximum of 2 download threads**」「Large or frequent data users must use the download service planet.osm or other alternatives」；实例状态页原文（本次实测）：「**This public endpoint is intended for browser-based and human-operated tools. For automated or high-volume use, run a local Overpass API instance**」 | **可以**：「OpenStreetMap (OSM) data is **free for everyone to use**」 | **ODbL 归属要求**：必须显著展示「© OpenStreetMap contributors」并遵循 Attribution Guidelines（https://wiki.openstreetmap.org/wiki/Licence/Attribution_Guidelines）；若把 OSM 数据做成**数据库/衍生数据集对外分发**，ODbL 的 share-alike 条款会被触发（**具体条款文本未取到**，wiki 不可达 → 标为存疑）；tile 服务另有硬规则：禁止 bulk download / offline use / 预取，缓存至少 7 天，必须用可识别 UA，禁止用库默认 UA | **备选（仅作补充/兜底）**：零 Key 是优点，但① 中文 POI 覆盖远弱于高德/腾讯（大量门店缺失）；② 公共 Overpass 实例实测正在 502 满载，明确说只给人用；③ 许可/署名要求比国产 API 更复杂 |
| **社区整理的开源 POI 数据集** | 未取到（本次未调研具体数据集仓库的现状与许可） | — | — | — | **未取到**，列为存疑点 |

### 3.1 关于"哪个组合最适合个人桌面工具 + 附近好店 + 中文 POI 覆盖"

**推荐组合：腾讯位置服务 WebService API（地点搜索 + 周边推荐 explore/here + 逆地址解析）为主，高德 Web 服务 API（关键字/周边/多边形/ID 四种检索）为辅，百度为第三兜底；底图用高德/腾讯官方 JS API 或商业切片服务。**

理由：
1. **配额与个人自用身份明确**：腾讯明确给出个人开发者「地点搜索 200 PV/日、并发 5、周边推荐 200/日」，一个桌面工具每天做 1 次「周边好店」检索 + 几十次输入提示/详情，完全在额度内，且**个人开发者身份免费**。
2. **高德的检索能力最全**（关键字/周边/多边形/ID 四种 + `city&citylimit`/`adcode` 精确到区县），适合"按分类扫一圈附近"的需求（餐饮/咖啡/书店/展览…）。
3. **中文 POI 覆盖**：三家里腾讯/高德明显优于 OSM；OSM 只作为「高德/腾讯查不到时的第三条腿」或离线兜底。
4. **合规代价可控**：三家都禁止"批量抓取/预读取/存储"，但允许"调用官方 API 并把结果展示给最终用户"。所以设计原则是：**每次请求即时查询、结果只做会话内/短期本地缓存、缓存带 TTL、绝不做全量落库、绝不在 POI 数据里塞广告位**（高德协议 6.1 明文禁止）。
5. **软广告过滤的正确位置**：不要指望 LBS API 里有"广告"字段（腾讯/高德返回的 POI 基本是商家的结构化信息）。**过滤应该发生在"社区笔记"这一层**——而这一层在小红书/抖音上合规风险最高（见 2.4/2.5）。因此工程上更稳的做法是：**POI 层用官方 LBS；社区内容层用 B 站（有互动数、可判断）+ 用户自选来源（RSSHub 指向的小红书链接由用户自己打开）**，不要自建小红书爬虫。

---

## 四、凭证与限流实操清单

### 4.1 需要的凭证一览

| 凭证 | 用在哪 | 怎么拿 | 是否必须 |
| --- | --- | --- | --- |
| 微博 AppKey / AppSecret + 用户 OAuth `access_token` | 微博官方热榜接口 | https://open.weibo.com/ 注册建应用 | 走官方接口则必须 |
| 知乎登录 Cookie（`ZHIHU_COOKIES`） | 知乎热榜 | 浏览器登录后复制 | 走知乎热榜则必须 |
| 小红书登录 Cookie + 无头浏览器（Playwright） | 小红书 board/user | RSSHub 配置 `XIAOHONGSHU_COOKIES` | **建议放弃** |
| 抖音 `access_token` + `client_token` | 抖音授权数据 | https://developer.open-douyin.com/ | 仅当接入抖音开放能力 |
| 高德 Web 服务 API Key | POI 检索 | https://console.amap.com/dev/key/app | 使用高德则必须 |
| 腾讯位置服务 Key | POI 检索 | https://lbs.qq.com/dev/console | 使用腾讯则必须 |
| 百度地图 AK | POI 检索 | https://lbs.baidu.com/apiconsole/key | 使用百度则必须 |
| OSM 自定义 User-Agent（含应用名+联系邮箱） | Overpass / tile | 自行声明 | 使用 OSM 则必须 |
| B 站 `wbi` 签名密钥（`img_key`/`sub_key`） | 热搜接口 | 需从首页 JS 提取 | 只有热搜接口需要；热门/排行不需要 |

### 4.2 已实测的限流与风控表现（2026-11-16）

| 平台 | 实测现象 | 判定 |
| --- | --- | --- |
| B 站 | `popular` / `ranking/v2` 无凭证、无 Cookie 直接 `code:0` 返回完整数据 | 可用 |
| 微博 | `trends/hourly` 无 appkey → `error_code 10006`（端点存活） | 需凭证 |
| 知乎 | 热榜接口无 Cookie → `code 101 AuthenticationError` | 需登录态 |
| 抖音 | 搜索接口 → `status_msg:"blocked"`；热搜接口 → 200 但 body 为空 + `x-vc-bdturing-parameters` 反爬头 | 需签名+风控 |
| 小红书 | 未直接实测；RSSHub 源码显示需 Playwright + Cookie + 验证码分支 | 门槛最高 |
| 高德 | `restapi.amap.com/v3/place/around` 无效 key → `INVALID_USER_KEY` | 需 Key |
| 百度 | `api.map.baidu.com/place/v2/search` 无效 AK → `APP不存在，AK有误请检查再重试` | 需 AK |
| OSM Overpass | 公共实例两次实测均 `502 Gateway Timeout ... currently at capacity ... intended for browser-based and human-operated tools` | 不可用于自动化定时任务 |
| 腾讯位置服务 | 配额写在公开文档（个人开发者地点搜索 200/日） | 需 Key，额度够用 |

### 4.3 个人自用规模（每天几十~几百条）可行性

- **B 站热门/排行：完全可行。** 一次 `popular` 请求即返回一整页（实测 `ps=3` 时返回 3 条完整条目，含 `stat`），翻页即可拿几十~几百条；官方没有对该接口公布 QPS。
- **微博官方接口：边界紧。** 「一个应用内单授权用户每天累计只能请求微博开放接口 100 次」+ 官方建议 3–5 分钟/次 → 一天最多 ~100 次调用，热榜本身 2 个接口/次 ≈ 50 轮，够用但没有余量；且协议禁止服务端存储，只能本地缓存。
- **知乎热榜：够用。** 每次返回 limit 条（RSSHub 用 limit=10），一天拉几轮完全够。
- **地图 POI：够用。** 腾讯个人开发者 200 次/日 × 每次约 20 条 ≈ 4,000 POI/日，对"附近好店"绰绰有余。
- **抖音/小红书：不建议在自动定时任务里做。** 抖音 bdturing 会逐步升级到验证码/封 IP；小红书需要无头浏览器 + Cookie + 验证码，一次失败就可能触发账号风控。

### 4.4 风险点清单与降低风险的做法

| 风险 | 具体表现 | 降低风险做法 |
| --- | --- | --- |
| 账号风控 | 用个人主账号 Cookie 做高频请求 → 验证码、限流、封号 | ① 优先走官方 API/B 站匿名接口；② 必须用 Cookie 的（知乎）用**专用小号**；③ 请求间隔 ≥ 60s，抖动 ±30%；④ 观察期先跑 2 周低频 |
| 协议违约（自动化程序接入） | 知乎/抖音/小红书协议明文禁止"使用任何自动化程序、软件或类似工具接入…收集或处理其中信息、内容" | ① 只取榜单元数据（标题/问题 ID），不批量下正文；② 不做"镜像式"批量归档；③ 工具定位为"个人阅读辅助"，不转售、不对外提供 |
| 协议违约（数据再分发） | 微博开发者协议 2.5.6/2.5.9/2.5.13；知乎「直接或间接盗取数据」 | 缓存只落在本机（微博协议明令"只能缓存在客户端，不能上传到自己的服务器端"）；不做分享/同步功能 |
| LBS 数据存储违规 | 高德 3.5 禁存储/缓存、4.12.3 禁预读取与存储、4.12.7 衍生品"用于数据库"、6.1 禁在服务数据中展示广告 | ① POI 查询结果只做**会话级/短 TTL 本地缓存**（如 24h）并可一键清；② 不做本地全量 POI 库；③ 不在 POI 数据里插广告位/软广链接 |
| 频率被判定为机器人 | 微博明确："安全机制…能非常准确的识接口访问是用户行为调用、还是机器人程序调用" | 模拟"用户主动行为"：只在应用被打开/用户点击"刷新"时拉取，而不是常驻定时轮询 |
| 依赖失效 | B 站接口可能加签/改字段；Overpass 公共实例满载；RSSHub 路由可能重构 | 抽象成 adapter 层，每个源独立可关；每日健康检查 + 降级链；字段变化用 schema 校验而非硬编码 |
| 数据里混入软广 | 社区笔记里广告占比高 | 见 `research/diversity-ranking-and-ad-filtering-algorithms.md`；本调研的关键结论是：**判定所需的互动数/作者历史等信号只在"自己抓到原始字段"时才有**（B 站有，知乎无，抖音/小红书不可合规取得） |

---

## 五、退化路径（如果所有平台抓取都被限制）

**目标：保证「每天有热点可看」和「身边有地方可去」这两件事不依赖任何平台爬虫也能成立。**

### 第 1 级：零抓取（最稳，官方 API + 公开 RSS）
- **热点**：微博官方 `trends/hourly`（有 OAuth 即拿热搜词）→ 用词去**自己订阅的公开 RSS**（新闻站 RSS / RSSHub 路由 `/zhihu/daily`（日报，源站 `daily.zhihu.com`，源码 https://raw.githubusercontent.com/DIYgod/RSSHub/master/lib/routes/zhihu/daily.ts ）/ RSSHub 路由 `/bilibili/ranking/all`）取内容标题与摘要。
- **周边**：腾讯位置服务 WebService API（地点搜索 + 周边推荐）+ 高德 Web 服务 API 做 POI 检索与分类，**不落库、即时查询**。
- **地图底图**：高德/腾讯官方 JS API 或其静态地图服务（个人自用量级）。
- 结果：**热度排序退化为"榜单名次 + RSS 出现顺序"，互动数缺失**，多样性靠"跨源轮转 + 分类配额"实现，而不是靠互动数。

### 第 2 级：只保留 B 站一条链
- 微博/知乎官方接口失效时，B 站 `popular`/`ranking/v2` 是唯一同时具备 **无凭证 + 互动数 + 分区标签 + 发布地** 的源，用来承担"打破信息茧房"的排序与跨分区采样主力。
- 热点词从 B 站热榜词（`/x/web-interface/wbi/search/square`，需签名）取，或用微博官方接口兜底。

### 第 3 级：只有纯 RSS
- 自建 RSS 源：直接订阅公开 RSS（新闻/博客/播客/综合 RSSHub 路由），**完全不做 HTTP 抓取**。
- 排序退化为 RSS 的 `pubDate` + 栏目分类轮转。

### 第 4 级：完全离线/本地
- 用户手工维护的"关注清单"（自己粘贴链接/标题），工具只做去重、分类、打标签、每日随机推送。
- 周边部分退化为"我手动收藏的地点"清单 + 高德/腾讯 POI 的**临时**查询补全。

> **设计原则（建议写进 ADR）**：把"数据源"做成可插拔适配器，并且**永远有一条不需要凭证、不需要 Cookie、不需要签名的降级路径**（B 站匿名接口 + 官方 LBS API）。任何需要 Cookie、需要签名、需要无头浏览器的源，都只能作为"锦上添花"，不能作为唯一依赖。

---

## 六、存疑点（本次未取到或不确定）

1. **微博 `trends/hourly` 现在普通应用实际能不能拿到热搜词** —— 文档在、端点在（只因缺 appkey 报错），但**无 appkey 无法验证数据返回**，也可能像 `trends/statuses` 一样早已下线只是文档未标。需注册 AppKey 实测。
2. **微博是否还有面向"读公开时间线"的普通接口**（`statuses/public_timeline` 等）—— 未取到当前可用性文档。
3. **知乎开放平台 `open.zhihu.com` 到底提供什么** —— 持续返回 HTTP 422 / `UnprocessableError`，可能需要登录或已下线。
4. **小红书开放平台的能力边界、是否有地点/POI 接口、认证方式与配额** —— 文档页前端渲染，未取到。
5. **小红书用户协议正文的具体抓取条款** —— `/protocols/terms` 与 `/protocols/agreement` 两份页面都是 SPA，未取到原文。
6. **《哔哩哔哩弹幕网用户使用协议》正文** —— `https://www.bilibili.com/protocal/licence.html` 为 SPA，其数据接口未定位到，未取到抓取相关条款原文。
7. **B 站开放平台（openhome.bilibili.com）到底开放了哪些 API** —— 文档页前端渲染，未取到；因此**「B 站热门接口是否有官方登记版本」目前无法确认**，只能确认该接口可访问。
8. **高德 Web 服务 API 的免费额度具体数值（QPS / 日配额）** —— 官方文档明写"请在控制台-流量分析-配额管理页面查看"，需登录控制台，未取到。
9. **百度地图 Web 服务 API 的 placeapi 文档正文与配额数值** —— 新站 `lbs.baidu.com/faq/api?title=...` 为 SPA，只取到外壳。
10. **腾讯位置服务的抓取/自动化相关条款原文** —— 只取到配额说明页，未逐条核对服务协议。
11. **OSM Overpass 的官方速率限制数字（每 IP 并发数、单请求 weight 上限等）** —— `wiki.openstreetmap.org` 在本次网络环境不可达（HTTP 000），仅取到 `overpass-api.de/api/status` 的"面向浏览器/人工使用"提示与 OSMF API 政策的"最大 2 个下载线程"。
12. **OSM ODbL 对"把 POI 存成本地数据库/做成衍生数据集"的精确要求** —— `wiki.openstreetmap.org/wiki/Licence` 不可达，未取到原文；本报告只依据 Tile Usage Policy 的署名与缓存要求。
13. **社区整理的开源 POI 数据集现状**（amap/POI 类数据集的仓库、许可、更新频率、中文覆盖）—— 本次未调研。
14. **RSSHub 公共实例（rsshub.app）的可用性与限流** —— `docs.rsshub.app` 与 `rsshub.app` 在本网络不可达（HTTP 000）；本报告的 RSSHub 结论全部基于**官方仓库源码**，未验证公共实例行为。**自建 RSSHub 是更可控的选择。**
15. **本次网络环境限制**：`wiki.openstreetmap.org`、`docs.rsshub.app`、`rsshub.app`、`web.archive.org` 均不可达；`openhome.bilibili.com` / `open.xiaohongshu.com` / `lbs.baidu.com/faq` 的正文为前端渲染。这些页面的内容需在能访问的网络环境中二次确认。
16. **未运行 git 命令**，本文件为唯一被修改/创建的文件（遵守父会话统一提交的约定）。

---

### 附：本报告未做的事
- 未运行 git 命令（父会话统一提交）。
- 未修改除本文件外的任何文件。
- 未使用二手教程/博客作为事实依据；所有 grep 计数与接口实测均在 2026-11-16 于本文所列官方域名完成。
