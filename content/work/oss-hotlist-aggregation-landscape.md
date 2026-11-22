---
slug: "oss-hotlist-aggregation-landscape"
kind: "note"
locale: "zh"
title: "现成开源方案盘点：哪些能直接复用，哪些只能借鉴"
titleEn: "Surveying Open Source Hot-List Aggregators: What You Can Reuse, What You Can Only Borrow"
summary: "把所有值得知道的中文热榜聚合开源件逐个读到源码级：各自暴露什么、哪些需要 cookie 或签名、许可证的边界在哪。结论是——没有一个能直接当来源层。"
summaryEn: "A source-level audit of every Chinese hot-list aggregator worth knowing — what each one actually exposes, which need cookies or signatures, and where the licence rules cut. Conclusion: none of them can be a source layer as-is."
group: "verify"
order: 0
date: "2026-11-17"
hasBody: true
---

> 票 01 产出。调研日期 2026-11-17（Asia/Shanghai）。star / 最近提交时间均为调研当天读数，会漂移。
> 一手来源原则：所有结论都回到 GitHub 仓库主页、仓库内 README / LICENSE / 源码、官方文档页。凡是只到「搜索结果页」级别的判断，已标注。
> 术语沿用 `radar/GLOSSARY.md`：**来源** / **条目** / **事件簇** / **主题** / **每日精选** / **推广档位** / **配额** / **多样性** / **兴趣权重** / **周边点** / **攻略内容**。

## 0. 调研方法与「红线」前提

- 本 effort 已定下的硬约束（见 `.scratch/radar/map.md`）：**只用公开接口 / RSS 渠道，绝不逆向签名、绝不模拟登录；拿不到就降级并显式写明「该源不可用」**。本报告的所有「不适用」判定都以这条为第一判据，其次才是技术质量。
- 元数据取数路径：GitHub 仓库主页（star / license SPDX / 默认分支 / archived）+ `commits/<branch>.atom`（最近提交时间）+ `raw.githubusercontent.com` / `cdn.jsdelivr.net/gh`（README / LICENSE / 源码）——全部是一手来源。未使用任何二手榜单文章。
- 少数字段（仓库内文件清单、语言占比）受 GitHub 页面懒加载影响，取不到时写「未取到」，不猜测。
- **引用体例**：结论要点用 `[来源: URL]` 逐条标注；清单表格里每一行的「仓库 / 文档」列本身就是一手来源链接（GitHub 仓库主页、仓库内文件、官方文档页），表格里的「来源」列进一步指到具体文件路径（如 `server/sources/zhihu.ts`）；凡未给链接的判断，均已在 §5「未取到 / 存疑」里登记。
- 未运行任何 git 命令，未修改本文件以外的任何文件。

---

## 1. 结论要点（10 条以内）

> 完整可复用性判定表见 **§3**（票 04 源清单的主要输入）；四平台免凭证端点见 **§2.1b**（票 02 的交叉输入）。

1. **中文热榜聚合有成熟成品，但没有一个能直接当 Radar 的「来源层」**：最成熟的三件是 `newsnext/newsnow`（MIT，★22.4k，66 个来源，HTTP API）、`imsyy/DailyHotApi`（MIT，★4.1k，~45 个来源，JSON+RSS 双模式）、`sansan0/TrendRadar`（GPL-3.0，★63.7k，抓取+关键词过滤+AI 分析+推送的完整闭环）。三者的共同点是**只给「榜目标题 + 热度 + 链接」**，不含正文、不含标签/地点/互动数明细。[来源: https://github.com/newsnext/newsnow](https://github.com/newsnext/newsnow)、[https://github.com/imsyy/DailyHotApi](https://github.com/imsyy/DailyHotApi)、[https://github.com/sansan0/TrendRadar](https://github.com/sansan0/TrendRadar)

2. **小红书是最大的缺口，而且是被红线主动放弃的缺口**：newsnow 的 66 个来源、DailyHotApi 的 ~45 个来源里**都没有小红书**（已逐条核对来源清单文件）；RSSHub 有 `xiaohongshu` 路由但带 `/check-cookie` 校验、明确走 cookie 鉴权；唯一免 cookie 拿到小红书元数据的开源件 `cv-cat/Spider_XHS` 自述「小红书逆向」。→ **周边地图模块的「攻略内容」只能声明为不可用，走 POI 地图 API + 公开 RSS/榜单兜底**。[来源: https://raw.githubusercontent.com/newsnext/newsnow/main/shared/sources.json](https://raw.githubusercontent.com/newsnext/newsnow/main/shared/sources.json)、[https://github.com/DIYgod/RSSHub/tree/master/lib/routes/xiaohongshu](https://github.com/DIYgod/RSSHub/tree/master/lib/routes/xiaohongshu)

3. **B 站 / 知乎 / 微博 / 抖音的热榜能否免凭证拿到，已在源码级逐个核实**（读的是 newsnow 的 `server/sources/*.ts` 实现，不是二手描述）：
   - **B 站：完全免 cookie，且互动数完整**——热搜词 `https://s.search.bilibili.com/main/hotword?limit=30`；热门视频 `https://api.bilibili.com/x/web-interface/popular`；分区排行 `https://api.bilibili.com/x/web-interface/ranking/v2`。热门视频接口返回 `stat.view / stat.like / stat.danmaku / stat.reply / stat.favorite / stat.coin / stat.share` 全套互动数。
   - **知乎：完全免 cookie，且能拿到热度值 + 摘要 + 趋势 + 回答数**——`https://www.zhihu.com/api/v3/feed/topstory/hot-list-web?limit=20&desktop=true` 返回 `metrics_area.text`（热度）、`excerpt_area.text`（摘要句）、`label_area.trend`（趋势）、`feed_specific.answer_count`（回答数）。
   - **抖音：免登录账号，但要一次游客 Cookie 握手**——先 GET `https://login.douyin.com/` 取 set-cookie，再打 `https://www.douyin.com/aweme/v1/web/hot/search/list/?device_platform=webapp&aid=6383&channel=channel_pc_web&detail_list=1`，返回 `sentence_id / word / event_time / hot_value`（热度值可用，newsnow 把它丢掉了）。
   - **微博：需要 `SUB` Cookie（游客级即可，不必登录账号）**——`https://s.weibo.com/top/summary?cate=realtimehot` 是 HTML 抓取，newsnow 在源码里**硬编码了一个 SUB Cookie**；RSSHub 则**没有微博热搜路由**（`lib/routes/weibo/` 只有 keyword / timeline / user / super-index / search / group / friends）。原 `ssut/weibo-trends-hot-search` 已 404，现役上游是 `ameizi/weibo-trending-hot-search`（★30，2026-11-16 仍有提交，README 内嵌当日热搜榜含**热度值与 band_rank**，每小时抓取按天归档）。
   [来源: https://github.com/newsnext/newsnow/blob/main/server/sources/bilibili.ts](https://github.com/newsnext/newsnow/blob/main/server/sources/bilibili.ts)、[https://github.com/newsnext/newsnow/blob/main/server/sources/zhihu.ts](https://github.com/newsnext/newsnow/blob/main/server/sources/zhihu.ts)、[https://github.com/newsnext/newsnow/blob/main/server/sources/douyin.ts](https://github.com/newsnext/newsnow/blob/main/server/sources/douyin.ts)、[https://github.com/newsnext/newsnow/blob/main/server/sources/weibo.ts](https://github.com/newsnext/newsnow/blob/main/server/sources/weibo.ts)、[https://github.com/ameizi/weibo-trending-hot-search](https://github.com/ameizi/weibo-trending-hot-search)、[https://github.com/DIYgod/RSSHub/tree/master/lib/routes/weibo](https://github.com/DIYgod/RSSHub/tree/master/lib/routes/weibo)

4. **「带标签/地点/互动数」的笔记与视频元数据，现成开源件几乎全部踩红线**：`ReaJason/xhs`（Web 端封装，需 cookie + x-s 签名）、`cv-cat/Spider_XHS`（逆向）、`Johnserf-Seed/f2`（内置 XBogus/ABogus 签名生成与游客 Cookie 生成器）、`NanmiCoder/MediaCrawler`（需登录态抓取）。→ **这一类整体判定「不适用」**，只作为「如果将来放宽红线」的备选清单留档。[来源: https://github.com/ReaJason/xhs](https://github.com/ReaJason/xhs)、[https://github.com/cv-cat/Spider_XHS](https://github.com/cv-cat/Spider_XHS)、[https://github.com/Johnserf-Seed/f2](https://github.com/Johnserf-Seed/f2)、[https://github.com/NanmiCoder/MediaCrawler](https://github.com/NanmiCoder/MediaCrawler)

5. **MediaCrawler 的许可证是「非商业学习许可」，不是 OSI 开源许可**：`LICENSE` 首行即 `NON-COMMERCIAL LEARNING LICENSE 1.1`，条款写明「限学习研究用途」「未经书面同意不得用于任何商业用途」，GitHub API 也判定为 `NOASSERTION`。→ 即使技术上能用，**改造后分发也不合规**。[来源: https://raw.githubusercontent.com/NanmiCoder/MediaCrawler/main/LICENSE](https://raw.githubusercontent.com/NanmiCoder/MediaCrawler/main/LICENSE)

6. **RSS 层的成熟度远高于热榜层，但「去重 + 多样性」这件事没人做好**：Miniflux / FreshRSS / Folo / NewsBlur 解决的是**订阅、过滤、正文提取、阅读体验**，没有一个提供跨源语义去重或来源/主题配额。Folo 有 AI 摘要 / AI 翻译 / 每日 Timeline Summary / 定时 AI 简报（AI Tasks），但那是**在已订阅内容上做生成**，不是**在候选池上做多样化挑选**。[来源: https://github.com/RSSNext/Folo](https://github.com/RSSNext/Folo)、[https://github.com/miniflux/v2](https://github.com/miniflux/v2)、[https://github.com/FreshRSS/FreshRSS](https://github.com/FreshRSS/FreshRSS)

7. **跨源事件簇（去重聚类）与多样性配额，没有可直接复用的成品，只能自己写**：可用的零件是成熟的——`feedparser`（解析）、`trafilatura`（正文提取）、`datasketch`（MinHash/LSH 近重）、`scikit-learn` + `sentence-transformers`（向量化与聚类）、`RecBole`（推荐评测与多样性度量参考）。但「相似度阈值 + 事件簇成簇规则 + 来源/主题配额」这套组合逻辑是 Radar 自己的，也是本 effort 的核心资产。[来源: https://github.com/ekzhu/datasketch](https://github.com/ekzhu/datasketch)、[https://github.com/adbar/trafilatura](https://github.com/adbar/trafilatura)、[https://github.com/RUCAIBox/RecBole](https://github.com/RUCAIBox/RecBole)

8. **国际上没有成熟的「anti-filter-bubble / personal daily digest」开源项目**：按 `filter bubble news recommender`、`news diversity ranking recommender` 检索，命中的全是 0 star 的学生/课程项目（`acs-capstone/Burst` ★0、2018；`josh-oo/adapter-based-news-recommender` ★0；`PrafulKumar-1/echo-chamber-breaker-*` ★0）。→ **「打破信息茧房」在 GitHub 上没有现成答案，Radar 是原创题目**；可参考的只有成熟 RSS 阅读器 + RecBole 的多样性度量。[来源: https://github.com/acs-capstone/Burst](https://github.com/acs-capstone/Burst)、[https://github.com/RUCAIBox/RecBole](https://github.com/RUCAIBox/RecBole)

9. **许可证对「自用、不分发」几乎不构成约束，但对「顺手把代码并进 Electron 包」构成硬约束**：MIT/Apache-2.0 可闭源分发（保留声明即可）；GPL-3.0 只在**分发衍生作品**时触发（同进程链接也算）；**AGPL-3.0 额外覆盖「通过网络提供服务」**——RSSHub、Folo、FreshRSS、Karakeep 都是 AGPL，若把它们的代码直接并进 Radar 或把自建 RSSHub 实例对外暴露，就触发开源义务。Radar 的既定边界是「单用户本机自用、不公开发布」，所以正确姿势是**把 AGPL 项目当独立进程/独立服务调用（HTTP 接口），不 copy 代码**。[来源: https://github.com/DIYgod/RSSHub](https://github.com/DIYgod/RSSHub)（README 末尾 `AGPL-3.0`）、[https://github.com/RSSNext/Folo](https://github.com/RSSNext/Folo)、[https://github.com/FreshRSS/FreshRSS](https://github.com/FreshRSS/FreshRSS)、[https://github.com/karakeep-app/karakeep](https://github.com/karakeep-app/karakeep)

10. **最省事的组合是「newsnow 当热榜来源层 + 自建 RSS 订阅层 + 自己写归一化/聚类/配额/摘要」**，而不是拼装某个大而全的项目：TrendRadar 值得抄的是它的**关键词/兴趣档位过滤 + 时间线调度 + 推送渠道适配 + MCP 聚合工具**这四块；DailyHotApi 值得抄的是**「一个来源一个路由 + JSON/RSS 双输出 + 默认缓存」**这个朴素契约。[来源: https://github.com/sansan0/TrendRadar](https://github.com/sansan0/TrendRadar)、[https://github.com/imsyy/DailyHotApi](https://github.com/imsyy/DailyHotApi)

---

## 2. 分领域清单

### 2.1 中文热榜聚合类

| 项目 | 仓库 | license | 语言 | 覆盖平台 | HTTP API | cookie/密钥 | 最近提交 | star | 架构形态 |
|---|---|---|---|---|---|---|---|---|---|
| TrendRadar | https://github.com/sansan0/TrendRadar | GPL-3.0 | Python | 默认 11 个：今日头条/百度/华尔街见闻/澎湃/B站热搜/财联社/凤凰/贴吧/微博/抖音/知乎；宣称 35 平台（底层走 newsnow） | MCP Server `http://127.0.0.1:3333/mcp`；Web 报告 `:8080` | 无（走 newsnow 公共 API）；AI 分析需自备 LLM key | 2026-11-15 | ~63.7k | 抓取(经 newsnow) → 关键词/AI 兴趣打分过滤 → AI 分析 → 9+ 渠道推送（飞书/钉钉/企微/Telegram/ntfy/Bark/Slack/邮件/通用 Webhook）→ HTML 报告存档 |
| NewsNow | https://github.com/newsnext/newsnow | MIT | TypeScript | 66 条来源：微博/知乎/抖音/B站/快手/百度/头条/贴吧/36kr/IT之家/澎湃/少数派/掘金/V2EX/虎扑/雪球/华尔街见闻/财联社/格隆汇/酷安/豆瓣/HN/ProductHunt/GitHub/AIHOT/卫星通讯社/金十/Steam…（**无小红书**） | `GET /api/s?id=<sourceId>` → `{status,id,updatedTime,items[],info}`；另有官方 MCP server `newsnow-mcp-server` | 无（公开页面抓取）；可选 GitHub OAuth 用于同步 | 2026-11-09 | ~22.5k | 抓取 → 归一化到统一 items 结构 → TTL + 每源 interval 缓存 → JSON 输出（前端 Next.js/Nuxt） |
| DailyHotApi | https://github.com/imsyy/DailyHotApi | MIT | TypeScript | ~45 源：bilibili/acfun/weibo/zhihu/zhihu-daily/baidu/douyin/kuaishou/douban-movie/douban-group/tieba/sspai/ithome/ithome-xijiayi/jianshu/guokr/thepaper/toutiao/36kr/51cto/csdn/nodeseek/juejin/qq-news/sina/sina-news/netease-news/52pojie/hostloc/huxiu/coolapk/hupu/ifanr/lol/miyoushe/genshin/honkai/starrail/weread/ngabbs/v2ex/hellogithub/weatheralarm/earthquake/history（**无小红书**） | 有，且**同时支持 RSS 模式与 JSON 模式**；npm 包 `dailyhot-api` 提供 `serveHotApi(port)` | 无（页面爬虫）；部分接口需 Puppeteer 环境 | 2026-03-11 | ~4.1k | 抓取 → 归一化 → 默认 60 分钟缓存 → JSON / RSS 双输出 |
| DailyHot（前端） | https://github.com/imsyy/DailyHot | MIT | Vue | 同上（前端壳） | 依赖 DailyHotApi | 无 | 2024-11-05（**已停更**） | ~912 | 前端页面 |
| TopList | https://github.com/tophubs/TopList | Apache-2.0 | Go | 各大站热榜聚合（Tophub 类） | 无标准 API（站点本身） | 未取到 | 2023-02-23（**已停更 3 年**） | ~4.7k | 并发抓取 → 聚合 → 网页展示 |
| website-hot-hub | https://github.com/cxyfreedom/website-hot-hub | MIT | Python | 36Kr / bilibili / GitHub / 抖音 / 掘金 / 微信读书 | 未取到（数据按天归档成文件） | 未取到 | 2026-11-16（**活跃**） | ~426 | 每小时抓取 → 按天归档（非日更摘要产品，是**历史数据集**） |
| trending-in-one | https://github.com/huqi-pr/trending-in-one | MIT | TypeScript | 今日头条热搜 / 知乎热搜 / 微博热搜 / 知乎热门视频 / 知乎热门话题 | 未取到 | 未取到 | 2025-04-24（**已 archived**） | ~465 | 每小时抓取 → 按天归档 |
| RSSHub | https://github.com/DIYgod/RSSHub | AGPL-3.0 | TypeScript | **1561 个路由命名空间**（含 `bilibili` 55 文件、`zhihu` 21、`weibo` 11、`douyin` 7、`xiaohongshu` 5、`wechat` 13、`tophub`、`cls`、`36kr`、`coolapk`、`wallstreetcn`、`xueqiu`、`hupu`、`smzdm`、`sspai`…） | 有（自建实例 + 官方公共实例）；`/lib/api` 目录存在 | 部分路由需自备 cookie 或走 RSSHub 自有鉴权（如 `xiaohongshu/check-cookie`） | 2026-11-16 | ~47.1k | 路由 → 抓取 → 归一化 → RSS 输出（含 XPath/JSON 路由） |
| TopHub 路由 | https://github.com/DIYgod/RSSHub/tree/master/lib/routes/tophub | （随 RSSHub） | TypeScript | tophub.today 榜单 | 同上 | 未取到 | 2026-11-16 | — | RSSHub 的一种「Tophub 替代」实现方式 |
| RSSHub 微博目录（**无热搜路由**） | https://github.com/DIYgod/RSSHub/tree/master/lib/routes/weibo | （随 RSSHub） | TypeScript | keyword / timeline / user / super-index / search / group / friends / user-bookmarks | — | — | 2026-11-16 | — | 核实结论：**微博热榜需另找来源** |
| RSSHub 抖音目录（**无热榜路由**） | https://github.com/DIYgod/RSSHub/tree/master/lib/routes/douyin | （随 RSSHub） | TypeScript | hashtag / live / user | — | — | 2026-11-16 | — | 核实结论：**抖音热榜需另找来源** |
| RSSHub 知乎热榜 | https://github.com/DIYgod/RSSHub/blob/master/lib/routes/zhihu/hot.ts | （随 RSSHub） | TypeScript | 知乎热榜 | 同上 | 未取到 | 2026-11-16 | — | — |
| RSSHub B站 | https://github.com/DIYgod/RSSHub/blob/master/lib/routes/bilibili/hot-search.ts | （随 RSSHub） | TypeScript | `/hot-search`、`/popular/all`、`/partion/ranking/:tid` | 同上 | 未取到（这三个路由走公开 web API） | 2026-11-16 | — | — |
| BiliTools 类 | https://github.com/Nemo2011/bilibili-api | 未取到 | Python | B 站 API 封装 | 库形态 | 未取到 | 2026-07-06 | ~4.2k | 未取到 |
| B 站 API 文档集 | https://github.com/SocialSisterYi/bilibili-API-collect | 未取到（无 license 标记） | 文档 | B 站全量 API 逆向文档 | — | — | 2026-01-30（**已 archived**） | ~20.1k | 文档仓库，非运行时 |
| 抖音/TikTok/B站 API | https://github.com/Evil0ctal/Douyin_TikTok_Download_API | Apache-2.0 | Python | 抖音 / TikTok / B站 数据采集与下载，含 MCP 侧信道 | 有（自托管 HTTP API） | 未取到（按项目定位推断需 cookie，**具体热榜接口鉴权未取到**） | 2026-11-14 | ~21.4k | 自托管 API → MCP |
| 微博热搜专项 | https://github.com/ameizi/weibo-trending-hot-search | 未取到 | Python/脚本 | 微博热搜榜 | 未取到（数据以归档文件形式提供） | 需 `SUB` Cookie（游客级） | 2026-11-16（**活跃**） | ~30 | 每小时抓取 → README 内嵌当日榜（含热度值 + band_rank）→ 按天归档 |
| 微博热搜（原 ssut 仓库） | https://github.com/ssut/weibo-trends-hot-search | — | — | — | — | — | **仓库 404，已不存在**（现役上游见上一行） | — | 结论：旧路径失效，勿再引用 |
| 小红书热榜 | — | — | — | **未找到任何免凭证的公开实现** | — | — | — | — | newsnow / DailyHotApi / RSSHub 之外的免 cookie 小红书热榜：**未取到** |

### 2.1b 四个中文平台热榜的「免凭证」源码级核实（票 02 的交叉输入）

以下端点全部来自 newsnow 仓库 `server/sources/*.ts` 的实际实现（读源码，非读 README 宣传）。

| 平台 | 端点 | 是否要登录账号 | 是否要 Cookie | 返回的关键字段 | 一手来源 |
|---|---|---|---|---|---|
| B站（热搜词） | `https://s.search.bilibili.com/main/hotword?limit=30` | 否 | 否 | `keyword` / `show_name` / `icon` | [bilibili.ts](https://github.com/newsnext/newsnow/blob/main/server/sources/bilibili.ts) |
| B站（热门视频） | `https://api.bilibili.com/x/web-interface/popular` | 否 | 否 | `bvid` / `title` / `pubdate` / `owner.name` / **`stat.view`、`stat.like`、`stat.danmaku`、`stat.reply`、`stat.favorite`、`stat.coin`、`stat.share`** | 同上 |
| B站（分区排行） | `https://api.bilibili.com/x/web-interface/ranking/v2` | 否 | 否 | 同上 | 同上 |
| 知乎（热榜） | `https://www.zhihu.com/api/v3/feed/topstory/hot-list-web?limit=20&desktop=true` | 否 | 否 | `title_area.text` / **`excerpt_area.text`（摘要句）** / **`metrics_area.text`（热度值）** / **`label_area.trend`（趋势）** / **`feed_specific.answer_count`（回答数）** | [zhihu.ts](https://github.com/newsnext/newsnow/blob/main/server/sources/zhihu.ts) |
| 抖音（热点榜） | 先 `GET https://login.douyin.com/` 取 set-cookie，再 `https://www.douyin.com/aweme/v1/web/hot/search/list/?device_platform=webapp&aid=6383&channel=channel_pc_web&detail_list=1` | 否 | **需要游客 Cookie 握手**（非登录态账号） | `sentence_id` / `word` / `event_time` / **`hot_value`（热度）** | [douyin.ts](https://github.com/newsnext/newsnow/blob/main/server/sources/douyin.ts) |
| 微博（热搜榜） | `https://s.weibo.com/top/summary?cate=realtimehot`（HTML + cheerio 解析 `#pl_top_realtimehot table tbody tr`） | 否 | **需要 `SUB` Cookie**（newsnow 源码里硬编码了一个；不需登录账号） | `td.td-02 a` 的标题与链接 / `td.td-03` 的「新/热/爆」标记（**热度值未在该实现中取，需自行解析**） | [weibo.ts](https://github.com/newsnext/newsnow/blob/main/server/sources/weibo.ts) |

> 对 Radar 的直接含义：
> - **B站 / 知乎 → 归入「可直接复用的公开来源」**，且知乎自带**一句话摘要**（`excerpt_area.text`）与热度值，B站自带**全套互动数**，这两项正是 Radar「条目热度归一」与「一句话摘要」的免费原料。
> - **抖音 → 需要一次游客 Cookie 握手**（不是模拟登录），但抓取实现简单、可自建，风险等级介于「纯公开」与「踩红线」之间，建议在票 02 里实测 Cookie 是否稳定，并准备降级路径。
> - **微博 → 需要 `SUB` Cookie**，而 RSSHub 无对应路由；候选是 `ameizi/weibo-trending-hot-search` 的每小时归档数据（含热度值与 band_rank），可作为**离线数据源**而非实时源。

### 2.2 RSS / 订阅聚合与 AI 阅读类

| 项目 | 仓库 | license | 语言 | 多源合并 | 去重 | AI 摘要 / 过滤 | 最近提交 | star |
|---|---|---|---|---|---|---|---|---|
| Folo | https://github.com/RSSNext/Folo | AGPL-3.0 | TypeScript | 统一时间线（RSS/Atom/JSON + RSSHub 路由 + newsletter inbox + 播客/视频/社交源） | 未见跨源语义去重说明 | **有**：Folo AI（自选模型 / 自带 API key / 连 MCP）、Timeline Summary（当日摘要）、AI 翻译（中英日法）+ AI 摘要（按需或自动）、**AI Tasks**（定时写每日/每周简报，投递到 chat 或 email）、Actions（按规则 filter/star/rewrite/notify/summarize） | 2026-11-15 | ~39.3k |
| Miniflux | https://github.com/miniflux/v2 | Apache-2.0 | Go | 订阅 + **REST API** + Fever/Google Reader API 兼容 | 仅按 URL/feed 去重，**无语义去重** | **无内置 AI**；有 CSS scraper rules、rewrite rules、**正则 include/exclude filter**、Postgres 全文搜索 | 2026-11-12 | ~9.9k |
| FreshRSS | https://github.com/FreshRSS/FreshRSS | AGPL-3.0 | PHP | 自建阅读器 + 扩展（XPath 抓取）+ 分类 | 无跨源语义去重 | **无内置 AI**；有共享过滤器（shared filters）、第三方扩展生态 | 2026-11-15 | ~16.6k |
| NewsBlur | https://github.com/samuelclay/NewsBlur | MIT | HTML/Python | 订阅 + 智能文件夹 | 有「Intelligence Trainer」式的用户训练/相似推荐，但非通用语义去重 | 无生成式摘要（自建服务） | 2026-11-15 | ~7.7k |
| Kill the Newsletter | https://github.com/leafac/kill-the-newsletter | MIT | TypeScript | 邮件 newsletter → Atom feed（把「邮件源」并进 RSS 层） | 不涉及 | 不涉及 | 2026-10-28 | ~3.1k |
| Glance | https://github.com/glanceapp/glance | 未取到 | TypeScript | 自托管「一屏看所有 feed」面板 | 未取到 | 未取到 | 2026-11-07 | ~38.2k |
| Karakeep | https://github.com/karakeep-app/karakeep | AGPL-3.0 | TypeScript | 收藏 + AI 打标 | 未取到 | 有 AI 自动打标/分类能力 | 2026-11-15 | ~30.6k |
| Linkding | https://github.com/sissbruecker/linkding | MIT | Python | 书签管理 + 标签 | 无 | 无（但**标签机制值得借鉴为「主题订阅」原型**） | 2026-11-13 | ~11.4k |
| Wallabag | https://github.com/wallabag/wallabag | 未取到 | PHP | 稍后读 | 无 | 无 | 2026-11-16 | ~13.1k |
| ArchiveBox | https://github.com/ArchiveBox/ArchiveBox | 未取到 | Python/Django | 归档 | **按 URL/内容哈希去重是其强项**（可借鉴「同一 URL 不重复入簇」） | 无 | 2026-11-16 | ~29.0k |
| Readeck | https://github.com/readeck/readeck | 未取到 | 未取到 | 稍后读 | 未取到 | 未取到 | 2023-12-18 | ~292（原 `BoboTiG/Readeck` 已 404，**现状存疑**） |
| newspaper3k | https://github.com/codelucas/newspaper | MIT | Python | — | — | 无（**正文抽取**：`newspaper` 可从 URL 抽 title/text/keywords/author/image） | 2026-10-26 | ~15.2k |
| trafilatura | https://github.com/adbar/trafilatura | Apache-2.0 | Python | — | — | 无（**正文抽取的事实标准**：去广告/导航/样板文字，输出正文 + 元数据） | 2026-11-16 | ~7.1k |
| news-please | https://github.com/fhamborg/news-please | Apache-2.0 | Python | — | — | 有内置摘要（transformers）但**已 archived** | 2026-04-14 | ~2.5k |
| feedparser | https://github.com/kurtmckee/feedparser | 未取到（GitHub 判为 NOASSERTION） | Python | — | — | 无（**RSS/Atom 解析的事实标准**，Python 生态首选） | 2026-11-02 | ~2.5k |
| RecBole | https://github.com/RUCAIBox/RecBole | MIT | Python | — | — | 无（**但含多样性/新颖性/覆盖率等评测指标与多种召回-重排模型，可作为「配额与多样性」设计的对照参考**） | 2025-02-24 | ~4.6k |

### 2.3 中文平台抓取类（拿标签/地点/互动数的那些）

| 项目 | 仓库 | license | 语言 | 能否拿到标签/地点/互动数 | cookie / 签名 | 与红线关系 | 最近提交 | star |
|---|---|---|---|---|---|---|---|---|
| MediaCrawler | https://github.com/NanmiCoder/MediaCrawler | **NON-COMMERCIAL LEARNING LICENSE 1.1**（GitHub 判 NOASSERTION） | Python | 能：小红书笔记+评论、抖音/快手/B站视频+评论、微博帖子、贴吧、知乎问答 | 需登录态；平台侧风控 | **与红线冲突**（模拟登录/抓取），且许可证禁止商业用途与大规模抓取 | 2026-11-15 | ~71.2k |
| TikTokDownloader | https://github.com/JoeanAmier/TikTokDownloader | GPL-3.0 | JavaScript | 能：作品元数据（标题/互动/话题/作者） | 需 cookie（作品/用户接口） | **与红线冲突**（cookie 采集 + 作品下载） | 2026-11-04 | ~17.5k |
| XHS-Downloader | https://github.com/JoeanAmier/XHS-Downloader | GPL-3.0 | JavaScript | 能：小红书作品/笔记采集 | 需 cookie | **与红线冲突** | 2026-11-16 | ~13.3k |
| f2 | https://github.com/Johnserf-Seed/f2 | Apache-2.0 | Python | 能：多平台作品数据（微博/抖音/TikTok/X）+ 原始接口数据落库 | 需 cookie；内置 **XBogus / ABogus 签名生成**、**VisitorManager 生成游客 Cookie**、Cookie/Proxy/UA 池 | **与红线冲突**（逆向签名） | 2026-10-19 | ~2.7k |
| xhs（ReaJason） | https://github.com/ReaJason/xhs | MIT | Python | 能：小红书笔记/用户数据 | 需 cookie + `x-s` 签名；README 自述「web crawling may be considered illegal」 | **与红线冲突** | 2025-07-01 | ~2.2k |
| Spider_XHS | https://github.com/cv-cat/Spider_XHS | 无 license（未取到） | Python | 能：小红书全域（笔记/私信/直播） | 自述「小红书逆向」 | **与红线冲突**，且无 license = 默认保留全部权利 | 2026-10-22 | ~8.5k |
| res-downloader | https://github.com/putyy/res-downloader | Apache-2.0 | Go | 视频号/小程序/抖音/快手/小红书/直播流下载 | 未取到 | 与红线冲突（下载方向） | 2026-11-11 | ~21.3k |

> f2 README 中「抖音热点 `fetch_hot_search`」被标为 🟤＝**暂时不实现**（图例：🟢已实现 / 🟡正在实现 / 🟤暂时不实现 / 🔵未来实现 / 🔴弃用），所以 f2 目前**并不能**提供抖音热榜。

### 2.4 国际同类（personal daily digest / anti-filter-bubble）

检索结论：**没有成熟项目**。以下为检索命中的全部「反茧房」类项目，均为 0 star 级别，不能作为工程参考，只能作为「问题被研究过」的证据。

| 项目 | 仓库 | star | 最近提交 | 判定 |
|---|---|---|---|---|
| Burst | https://github.com/acs-capstone/Burst | 0 | 2018-09-04 | 课程作业级「推荐茧房外文章」阅读器，不可用 |
| adapter-based-news-recommender | https://github.com/josh-oo/adapter-based-news-recommender | 0 | 2024-02-29 | Notebook 实验，不可用 |
| echo-chamber-breaker（兴趣驱动） | https://github.com/PrafulKumar-1/echo-chamber-breaker-interest-driven-news-discovery | 0 | 2025-09-14 | 学生项目，不可用 |
| echo-chamber-breaker（偏见检测） | https://github.com/PrafulKumar-1/echo-chamber-breaker-personalized-news-with-bias-detection | 0 | 2025-11-26 | 学生项目，不可用 |

真正可参考的「国际成熟件」只有成熟 RSS 阅读器族（Folo / Miniflux / FreshRSS / NewsBlur）与 `RecBole`（多样性度量方法论）。

### 2.5 组件级零件（去重 / 聚类 / 摘要 / 打包）

| 零件 | 仓库 | license | 语言 | 最近提交 | star | 用途 |
|---|---|---|---|---|---|---|
| RSS 解析 | https://github.com/kurtmckee/feedparser | 未取到 | Python | 2026-11-02 | ~2.5k | 解析 RSS/Atom/JSON Feed |
| 正文抽取 | https://github.com/adbar/trafilatura | Apache-2.0 | Python | 2026-11-16 | ~7.1k | 去样板文字，抽正文 + 元数据（摘要原料） |
| 正文抽取（备选） | https://github.com/codelucas/newspaper | MIT | Python | 2026-10-26 | ~15.2k | 关键词/作者/图片等结构化字段更多 |
| 近重检测 | https://github.com/ekzhu/datasketch | 未取到 | Python | 2026-10-26 | ~3.0k | MinHash / LSH / Jaccard，用于「跨源同一事件」粗筛 |
| 向量语义 | https://github.com/UKPLab/sentence-transformers | 未取到（Apache-2.0） | Python | 2026-11-13 | ~19.3k | 中文可用多语言模型，做事件簇聚类 |
| 聚类/向量化 | https://github.com/scikit-learn/scikit-learn | 未取到（BSD-3） | Python | 2026-11-16 | ~68.2k | 层次聚类 / 相似度矩阵 / 特征工程 |
| 打包 sidecar | https://github.com/pyinstaller/pyinstaller | 未取到（GPL-2.0+ 例外条款） | Python | 2026-11-15 | ~13.2k | 把 Python 后端打成可执行文件给 Electron 调用 |
| 打包 Electron | https://github.com/electron-userland/electron-builder | 未取到（MIT） | TypeScript | 2026-11-13 | ~14.7k | `extraResources` 放 sidecar 二进制 |

---

## 3. 可复用性判断表

判定三档：**直接复用** / **可借鉴思路但要重写** / **不适用**。
许可证列说明「改造后自用分发」的约束（Radar 定位：单用户本机自用、不公开发布；若将来要分发，结论会变）。

| 候选 | 判定 | 理由 | 许可证对改造分发的约束 |
|---|---|---|---|
| newsnext/newsnow | **可直接复用（作为独立服务调用）／端点实现可借鉴** | 来源覆盖最广、MIT、缓存与每源刷新间隔设计成熟；**B站/知乎的端点已源码级核实为免 cookie 且字段丰富**（知乎自带摘要与热度，B站自带全套互动数）。建议自建实例当来源之一（HTTP 调用其 `/api/s?id=`），**不要**把其代码并进 Radar | MIT：可闭源分发，只需保留版权与许可声明。**但**：其上游来源页面的抓取合规性由使用者自担；README 声明会随时变更/停用 API |
| ameizi/weibo-trending-hot-search | **可借鉴思路但要重写** | 微博热搜的现役实现：每小时抓取、按天归档、README 内嵌当日榜（**含热度值 + band_rank**）；但它要 `SUB` Cookie，且产出是**归档数据**而非实时 API | 未取到，需确认 |
| imsyy/DailyHotApi | **可借鉴思路但要重写** | 「一源一路由 + JSON/RSS 双模式 + 默认 60 分钟缓存」是最值得抄的契约；自带 RSS 模式正好当 Radar 的来源层。问题是 TypeScript 技术栈与 Radar 的 Python 后端不合，且小部分接口需 Puppeteer | MIT：可闭源分发。Puppeteer 依赖会带来较重运行时，建议只抄接口契约 |
| sansan0/TrendRadar | **可借鉴思路但要重写** | 已实现「关键词/兴趣档位过滤 + 时间线调度 + 多渠道推送 + MCP `aggregate_news` 跨平台去重聚合」——正是 Radar 的排序/配额/推送段原型。但它是**推送型舆情工具**（配置驱动、无内容模型），不是每日精选型阅读器；且依赖 newsnow API | GPL-3.0：**自用不分发不触发任何义务**；若把代码并入分发版 Radar，需整体 GPL-3.0 开源。→ 建议抄思路不抄代码 |
| DIYgod/RSSHub | **可借鉴思路但要重写**（可作为独立进程调用） | 1561 个路由命名空间，**B站/知乎/36kr/财联社/酷安/华尔街见闻/雪球等热榜免 cookie 可用**，是 RSS 骨干的最佳来源池。但**缺微博热搜与抖音热榜**，小红书路由需 cookie | AGPL-3.0：**严禁**把其代码并入 Radar 再分发；**严禁**把自建实例当网络服务对外提供而不开源。最安全用法：自建实例仅本机自用 + 通过 HTTP 路由拉取（不改动、不分发其代码） |
| RSSNext/Folo | **可借鉴思路但要重写** | AI 摘要/翻译/Timeline Summary/**AI Tasks 定时简报**/Actions 规则链，对应 Radar 的「可插拔摘要 + 早间简报」形态参考 | AGPL-3.0，同上：借鉴思路，不 copy 代码 |
| miniflux/v2 | **可借鉴思路但要重写** | CSS scraper rules、rewrite rules、正则 include/exclude filter、REST API 设计都值得抄；但**无 AI、无语义去重**，且是 Postgres 服务型 | Apache-2.0：可闭源分发，保留声明与 NOTICE |
| FreshRSS/FreshRSS | **可借鉴思路但要重写** | shared filters 与 XPath 扩展机制值得抄（对应「主题订阅 + 抓取规则」）；无 AI | AGPL-3.0，同 RSSHub 的处置方式 |
| samuelclay/NewsBlur | **可借鉴思路但要重写** | 「Intelligence Trainer」式用户训练/相似推荐是最接近「兴趣权重」的成熟实现思路 | MIT：可闭源分发 |
| leafac/kill-the-newsletter | **可借鉴思路但要重写** | 把邮件 newsletter 变成 Atom，是「RSS 骨干」的补充分支；Radar 自用不必自建 | MIT |
| karakeep-app/karakeep | **可借鉴思路但要重写** | AI 自动打标/分类对应 Radar 的「主题打标 + 可插拔摘要」 | AGPL-3.0 |
| sissbruecker/linkding | **可借鉴思路但要重写** | 标签即主题的最小实现，对应「显式主题订阅」 | MIT |
| ArchiveBox/ArchiveBox | **可借鉴思路但要重写** | 按内容哈希/URL 去重，对应「跨源重复事件 ≤10%」的工程手法 | 未取到，**需在使用前确认** |
| readeck/readeck | **不适用** | 仓库现状存疑（原 `BoboTiG/Readeck` 已 404，替代仓库 ★292 且 2023 年停更），无工程价值 | 未取到 |
| kurtmckee/feedparser | **可直接复用** | RSS/Atom 解析的标准件，直接进 requirements | 未取到（GitHub 判 NOASSERTION）；**使用前需确认仓库内 LICENSE 文件**，BSD 系通常宽松 |
| adbar/trafilatura | **可直接复用** | 正文抽取的事实标准，摘要原料 | Apache-2.0：可闭源分发 |
| codelucas/newspaper | **可直接复用**（备选） | 结构化元数据（keywords/author/image）更全，可与 trafilatura 二选一或串联 | MIT |
| ekzhu/datasketch | **可直接复用** | MinHash/LSH 做跨源粗筛，事件簇第一步 | 未取到，需确认 |
| UKPLab/sentence-transformers | **可直接复用** | 多语言向量模型，中文事件簇语义合并 | 未取到（通常 Apache-2.0），需确认 |
| scikit-learn/scikit-learn | **可直接复用** | 层次聚类 / 相似度 / 配额求解 | 未取到（通常 BSD-3），需确认 |
| RUCAIBox/RecBole | **可借鉴思路但要重写** | 提供召回-重排与多样性/新颖性评测指标，作为「配额 + 多样性」方案对照 | MIT |
| pyinstaller/pyinstaller + electron-builder | **可直接复用** | Electron + Python sidecar 的标准打包路径（`extraResources`） | 未取到，需确认（PyInstaller 为 GPL-2.0+ 例外条款，允许与专有程序分发） |
| NanmiCoder/MediaCrawler | **不适用** | 需登录态抓取（与红线冲突）；**许可证为非商业学习许可**，改造后分发不合规 | NON-COMMERCIAL LEARNING LICENSE 1.1：禁止商业用途、禁止大规模抓取、需保留声明；默认不授予再分发权 |
| JoeanAmier/TikTokDownloader、JoeanAmier/XHS-Downloader | **不适用** | 需 cookie 采集（与红线冲突）；且目标是下载而非发现 | GPL-3.0：若分发需开源 |
| Johnserf-Seed/f2 | **不适用** | 内置 XBogus/ABogus 签名生成与游客 Cookie 生成器＝逆向签名（与红线冲突）；抖音热榜尚未实现 | Apache-2.0（若能用），但技术前提踩红线 |
| ReaJason/xhs | **不适用** | Web 端封装需 cookie + `x-s` 签名（与红线冲突）；README 自述可能违法 | MIT（若能用），但技术前提踩红线 |
| cv-cat/Spider_XHS | **不适用** | 自述「小红书逆向」；且无 license（默认保留全部权利，不可复用） | 无 license |
| Evil0ctal/Douyin_TikTok_Download_API | **不适用**（可作备查） | 抖音/B站采集 + MCP 形态好，但取数依赖平台风控与 cookie，踩红线 | Apache-2.0（若能用） |
| putyy/res-downloader | **不适用** | 方向是下载，Radar 只做「发现与跳转」 | Apache-2.0 |
| tophubs/TopList、imsyy/DailyHot、huqi-pr/trending-in-one | **不适用** | 分别已停更 3 年 / 停更 / 已归档，无维护保障 | Apache-2.0 / MIT / MIT |
| cxyfreedom/website-hot-hub | **可借鉴思路但要重写** | 价值不在运行时而在**数据集**（每小时抓取、按天归档），可作为「历史热度基线」或离线校验数据源 | MIT |
| 0 star 的 filter-bubble 学生项目 | **不适用** | 工程上不可用 | 未取到 |

---

## 4. 推荐参考组合 Top 5（含理由与风险）

> 组合指「抄哪几件的东西、怎么拼」，不是「装哪几个软件」。

**Top 1 — 热榜来源层：newsnow（自建实例，HTTP 调用）+ DailyHotApi 契约作为补充**
- 理由：newsnow MIT、★22.5k、66 来源、缓存与刷新间隔策略成熟；**已源码级核实 B站/知乎端点免 cookie 且字段够用**（B站热门视频带全套互动数，知乎热榜带热度值 + 一句话摘要 + 趋势 + 回答数）——这两项正是 Radar「热度归一」与「一句话摘要」的免费原料。DailyHotApi 的「一源一路由 + JSON/RSS 双输出」是最干净的接口契约，且自带 RSS 模式可让 Radar 的 RSS 骨干顺带收下热榜。
- 风险：newsnow **没有小红书**；上游热榜页面随时可能改版或被风控；newsnow README 声明「保留随时更改/停用 API 的权利」→ Radar 必须把每个来源做成**可插拔、可降级、可显式标记「该源不可用」**的条目，符合既定「不静默」原则。微博需 `SUB` Cookie、抖音需游客 Cookie 握手，这两条要单独准备降级路径。
- 动作：只调用不内嵌；把 newsnow 源码作为**独立服务**跑在本机。

**Top 2 — RSS 骨干：RSSHub（自建实例，走 HTTP 路由）+ feedparser/trafilatura（进程内）**
- 理由：RSSHub 1561 个命名空间是任何「RSS 骨干」方案绕不开的最大来源池；B站热门/知乎热榜/36kr/财联社/酷安/华尔街见闻/雪球等都能免 cookie 拿到。进程内用 feedparser 解析、trafilatura 抽正文，正好对上「归一化 → 摘要」段。
- 风险：AGPL-3.0 → **不改代码、不内嵌、不对外暴露自建实例**；**缺微博热搜与抖音热榜**（需另找或标记不可用）；小红书路由需 cookie → 不用。
- 动作：立 ADR 记录「RSSHub 仅以本机 HTTP 客户端方式调用」。

**Top 3 — 排序/配额/推送：抄 TrendRadar 的四块（兴趣档位过滤、时间线调度、推送渠道适配、MCP 聚合工具）**
- 理由：TrendRadar 是全清单里唯一把「抓取→过滤→AI→推送→存档报告」跑通的开源件，★63.7k 且昨日仍有提交；它的 `config.yaml` 分组（app/report/notification/storage/platforms/rss/advanced）与 `timeline.yaml` 时间线调度几乎可以直接映射 Radar 的「来源清单 + 每日精选 + 早间简报」。它的 `aggregate_news` MCP 工具名正对应 Radar 的**事件簇**。
- 风险：GPL-3.0 → 只抄设计不抄代码；它是**推送型舆情工具**，没有内容模型、没有事件簇、没有配额，直接套用会得到「一堆关键词分组推送」而不是「每日 20 条精选」。
- 动作：把它的 `config.yaml` 分组结构当作 Radar 的来源清单模板来读。

**Top 4 — AI 摘要/简报形态：抄 Folo 的三件（AI Tasks 定时简报、AI 翻译+摘要可自动、Actions 规则链）**
- 理由：Folo 是唯一在 README 里明确承诺「schedule AI tasks that write daily or weekly briefings and deliver them to chat or email」的成熟项目，正对应 Radar 的「可插拔摘要（无 key 也能用）」「早间简报」形态。
- 风险：AGPL-3.0 → 借鉴思路；且 Folo 的摘要是**在已订阅内容上做生成**，不是**在候选池上做多样化挑选**——Radar 的差异化在「挑选」不在「生成」。另需注意 Radar 已定「不做向量画像、不做 LLM 兴趣推断」，Folo 的「问 AI 你的订阅」方向与该决策相反，只能取其工程形态不取其产品哲学。

**Top 5 — 组件层：feedparser + trafilatura/newspaper + datasketch + sentence-transformers + sklearn（直接复用）+ pyinstaller/electron-builder（直接复用）**
- 理由：这五件是「解析 → 抽取 → 粗筛 → 语义聚类 → 打包」的成熟标准件，全部可闭源分发或宽松许可，没有一个踩红线；跨源事件簇与配额逻辑自己写，这是本 effort 的核心资产而非可白嫖的现成件。
- 风险：向量模型首次运行要下载权重（离线可用性问题，需预置本地模型）；sentence-transformers / sklearn / datasketch / feedparser 的 LICENSE 在本次调研中**未逐个取到**，接入前必须逐个确认（尤其 feedparser 的 GitHub 判定为 NOASSERTION）。

**明确不推荐主力**：任何需要 cookie / 签名逆向 / 模拟登录的方案（MediaCrawler、f2、xhs、Spider_XHS、TikTokDownloader、XHS-Downloader、Douyin_TikTok_Download_API）——与红线冲突；任何 0 star 的 filter-bubble 项目——不可用。

---

## 5. 未取到 / 存疑的点

| # | 事项 | 状态 | 建议下一步 |
|---|---|---|---|
| 1 | `BoboTiG/Readeck` 与 `readeck/readeck` 的关系 | `BoboTiG/Readeck` 与 `newsblur/newsblur` 在 GitHub 与 ungh 上均返回 404；`readeck/readeck` 可访问但仅 ★292、2023-12-18 后无提交 | 若要参考「稍后读 + 规则过滤」，改看 Karakeep / Linkding |
| 2 | `feedparser` / `datasketch` / `sentence-transformers` / `scikit-learn` / `pyinstaller` / `electron-builder` / `trafilatura` 的**确切 SPDX** | 未逐个取到（GitHub API 对部分仓库返回 NOASSERTION 或未访问） | 接入前逐个打开仓库根目录 LICENSE 文件确认 |
| 3 | 微博热搜 / 抖音热榜的**免 cookie 实现** | 部分取到：B站与知乎**已源码级核实免 cookie**（见 §2.1b）；抖音需**游客 Cookie 握手**（非登录账号）；微博需 **`SUB` Cookie**（newsnow 硬编码），候选现役上游 `ameizi/weibo-trending-hot-search`（★30，2026-11-16 活跃） | 票 02 实测：① 抖音游客 Cookie 是否稳定、过期行为；② 微博 `SUB` 能否自动握手获取（而非硬编码）；③ 两者失效时的降级表述 |
| 4 | 小红书热榜的**免凭证公开实现** | 未取到；newsnow / DailyHotApi 的来源清单里都没有，RSSHub 的 `xiaohongshu` 路由带 `/check-cookie` | 结论按「不可用」写进 SPEC；周边点与攻略内容解耦（map 已记「攻略内容缺失是正常的」） |
| 5 | newsnow / DailyHotApi 各来源的**单源鉴权细节** | 未逐源核实（只有总体的「无 cookie」说明） | 票 02 实测时逐源记录 |
| 6 | RSSHub 各路由的**鉴权细节** | 只确认了 `xiaohongshu/check-cookie` 存在 cookie 校验；其余路由未逐一核实 | 票 02 实测时逐路由记录（`RSSHUB_ACCESS_KEY` 机制未取到细节） |
| 7 | `Evil0ctal/Douyin_TikTok_Download_API` 的热榜接口是否免 cookie | 未取到 | 已被判「不适用」，仅留档 |
| 8 | `samuelclay/NewsBlur` 的「Intelligence Trainer」机制细节 | 未取到（README 未展开） | 若要参考「兴趣权重」实现再查源码 |
| 9 | `RUCAIBox/RecBole` 的多样性指标清单 | 未取到（只读到仓库描述） | 票 03（排序与软广算法）若要引用多样性度量，需读其 docs |
| 10 | 本报告的 star 数与最近提交时间 | 均为 2026-11-17 读数；GitHub API 未认证配额 60 次/小时、搜索接口 10 次/分钟，本次部分数据经 `ungh.cc`（GitHub API 镜像代理）交叉核对 | 需要精确值时以仓库主页为准 |
| 11 | `github.com` 网页直连在本机网络不稳定 | 多次出现 curl 超时（api.github.com 与 raw.githubusercontent.com 相对稳定） | 后续调研建议优先用 `api.github.com` + `raw.githubusercontent.com` + `cdn.jsdelivr.net/gh` 三条通道 |
