---
slug: "2026-11-23-ntp-global-time-tree"
title: "NTP 全球授时网络 —— 层级（stratum）、四个时间戳的偏移算法、pool.ntp.org 众包时间池"
date: "2026-11-23"
episode: 4
oneLiner: "全世界的时间不是一条线，是一棵由志愿者维护的树。"
seconds: 127.70
resolution: "1920x1080"
fps: 30
audience: "面向中文大众的科技科普短视频（B 站 / 视频号 横屏），依据 Runbook 固定的 16:9 与中文字幕设定。"
basis: "当天热点第 4 条（Jeff Geerling《I joined the NTP Pool, but not with my Stratum 1 Pi》，2026-11-17，Hacker News 榜）+ RFC 5905 + pool.ntp.org 官网。资料与可上屏事实见 `research/sources.md`、`research/facts.md`。"
brand: "主色 晒黄 `#EDBB72`（时间基准 / 当前被解释对象）· 底色 蓝晒深蓝 `#0E2B47` · 网络色 天青 `#79D0E6`；字体 Noto Sans SC / JetBrains Mono（`fonts/`）。"
style: "无人值守，本项由代理自选（Runbook §0 授权）。选定「工程蓝图 blueprint」+ concept-morph 的对象对应原则，理由见 `direction.style`；风格帧存 `qa/style-frames.png`。"
video: "https://github.com/Dachui61/daily-hot-video/releases/download/2026-11-23-ntp-global-time-tree/2026-11-23-ntp-global-time-tree.mp4"
poster: "/media/films/2026-11-23-ntp-global-time-tree-poster.webp"
---
## 这一期在讲什么

全世界的时间不是一条线，是一棵由志愿者维护的树。

## 口播稿

> 时间轴由 `ffprobe` 对真实配音逐段实测，不是按字数估算。点时间戳跳到视频对应位置。

- [`00:00`](/films/2026-11-23-ntp-global-time-tree/#t=0) — 你手机里的时间，可能来自一台你没听说过的树莓派。2026年11月，一位工程师把它接进了全球最大的开源时间池。
- [`00:10`](/films/2026-11-23-ntp-global-time-tree/#t=10.275) — 它怎么就成了全球时间的一部分？先看懂一个词：Stratum，层级。互联网的时间，是一棵分层的树。
- [`00:19`](/films/2026-11-23-ntp-global-time-tree/#t=19.896) — 最顶上第0层是原子钟、GPS这类标准时间源，第1层直接连着它们。每往下多一层就多一次网络和时钟误差。层级越高，误差越大。
- [`00:34`](/films/2026-11-23-ntp-global-time-tree/#t=34.96) — 对表只用了四个时间戳：发出记t1，服务端收到记t2、发出记t3，客户端收到记t4。偏移量，就是两段差值的平均。
- [`00:48`](/films/2026-11-23-ntp-global-time-tree/#t=48.25) — 这些树苗长成了一片森林：pool.ntp.org，全部服务器6310台，欧洲就占了3921台。填进设置，时间就被拉回正轨。
- [`01:03`](/films/2026-11-23-ntp-global-time-tree/#t=63.686) — 但想当时间源，门槛写在官网：固定IP、长期在线，上游要自己静态挑选，不能拿池子当上游。
- [`01:13`](/films/2026-11-23-ntp-global-time-tree/#t=73.624) — 那位工程师做了两层：树莓派接授时级GPS芯片做第1层，再经隧道连到云上的VPS做第2层。硬件时钟能校到几十纳秒，系统时钟只能到微秒级。
- [`01:28`](/films/2026-11-23-ntp-global-time-tree/#t=88.348) — 坑也真实存在：UDP 123的NTP曾被用于放大攻击，不少云厂商索性关掉；Debian的chrony默认会读DHCP的公共时间源，覆盖掉GNSS的精准时间。掉线后评分要6到12小时才爬回来。
- [`01:46`](/films/2026-11-23-ntp-global-time-tree/#t=106.847) — 边界要说清：层级低不等于精度高，误差还取决于网络路径。关键系统别只靠互联网取时；池子也还不支持NTS加密。
- [`01:57`](/films/2026-11-23-ntp-global-time-tree/#t=117.495) — 所以，全世界的时间不是一条拉到天上的线，而是一棵由志愿者维护的树。你手机里的那一秒，就挂在这棵树上。

### 来源清单
| # | 标题 | 发布方 | 日期 | URL | 用途 | 快照 |
|---|---|---|---|---|---|---|
| S1 | RFC 5905 — *Network Time Protocol Version 4* | IETF（Steve Mills 等） | 2010-06 | https://www.rfc-editor.org/rfc/rfc5905.txt | 层级（stratum）定义、四个时间戳与偏移/延迟公式、精度量级、参考时钟标识 | `snapshots/rfc5905.txt` |
| S2 | pool.ntp.org — the internet cluster of ntp servers | NTP Pool Project | 页面标注 As of 2026-11-22 | https://www.ntppool.org/en/ | 各区服务器数量、项目性质、维护方、GeoIP 选路 | `snapshots/ntppool-home.html` |
| S3 | How do I join pool.ntp.org? | NTP Pool Project | 同上站点 | https://www.ntppool.org/en/join.html | 加入条件：静态 IP、上游静态挑选、带宽、长期承诺、监控评分 | `snapshots/ntppool-join.html` |
| S4 | How do I use pool.ntp.org? | NTP Pool Project | 同上站点 | https://www.ntppool.org/en/use.html | 客户端配置、0–3 号池域名每小时轮换、就近解析、官方风险提示 | `snapshots/ntppool-use.html` |
| S5 | I joined the NTP Pool, but not with my Stratum 1 Pi | Jeff Geerling | 2026-11-17 | https://www.jeffgeerling.com/blog/2026/i-joined-the-ntp-pool/ | 当日热点原条目；两层架构、授时级 GNSS 芯片、WireGuard、评分与恢复时间、chrony/DHCP 坑 | `snapshots/geerling-ntp-pool.html` |
## 检索失败 / 未采用的来源（如实记录）
## 素材授权
## 检索失败 / 未采用的来源（如实记录）

- `en.wikipedia.org`（Network Time Protocol / Leap second 条目）：本机 curl 与网页抓取均超时（连接超时 / fetch failed），**未取到正文，因此本片不使用维基百科的任何数字**。
- `timeanddate.com/time/leap-seconds.html`：返回 HTTP 403（Cloudflare 人机校验），未取到正文。
- `www.pool.ntp.org`（旧域名）：跨域重定向至 `www.ntppool.org`，改用新域名抓取。
## 素材授权

- 本片**不使用任何外部图片、音频、字体素材**：所有图形由代码绘制；BGM 与音效由项目内合成器生成（AI）；字体为 Google Noto Sans SC / JetBrains Mono / Space Grotesk 子集，**SIL Open Font License 1.1**，自托管于 `fonts/`。
- 画面中出现的 `pool.ntp.org`、`RFC 5905`、`ZED-F9T`、`chrony`、`Debian`、`NTS`、`UDP 123`、`GeoIP`、`MaxMind`、`NetActuate` 等均为**文字指称**（技术名称），不是任何机构的 logo 或商标图形。

## 制作说明

- 规格：127.70 秒（口播实测 126.643 s，尾部 1.06 s 落版）· 横屏 16:9 · 1920×1080 · 30 fps。
- 受众 / 平台：面向中文大众的科技科普短视频（B 站 / 视频号 横屏），依据 Runbook 固定的 16:9 与中文字幕设定。
- 风格：无人值守，本项由代理自选（Runbook §0 授权）。选定「工程蓝图 blueprint」+ concept-morph 的对象对应原则，理由见 `direction.style`；风格帧存 `qa/style-frames.png`。
- 品牌：主色 晒黄 `#EDBB72`（时间基准 / 当前被解释对象）· 底色 蓝晒深蓝 `#0E2B47` · 网络色 天青 `#79D0E6`；字体 Noto Sans SC / JetBrains Mono（`fonts/`）。
- 内容依据：当天热点第 4 条（Jeff Geerling《I joined the NTP Pool, but not with my Stratum 1 Pi》，2026-11-17，Hacker News 榜）+ RFC 5905 + pool.ntp.org 官网。资料与可上屏事实见 `research/sources.md`、`research/facts.md`。

