---
slug: radar
kind: project
locale: zh
title: Radar
titleEn: Radar
summary: 一个自用的 macOS 桌面工具，把「今天值得读的」和「附近好玩好吃的」两条信息流汇进同一套管道。目标是打破信息茧房——所以它刻意铺开来源与主题，而不是只给你最想看的那一条。
summaryEn: A personal macOS desktop tool that puts a daily brief and a map of nearby places through one shared pipeline. Its point is to break an information cocoon, so it deliberately spreads across sources and topics instead of showing only the most engaging thing.
group: ship
order: 2
date: 2026-11-16
updated: 2026-11-22
status: 调研与架构定稿
statusEn: Research and architecture settled
tech:
  - Electron
  - Python
  - RSS
  - SQLite
featured: true
resumeLine: 把「今天值得读的」和「附近好玩好吃的」汇进同一条管道，用配额作硬约束打破信息茧房。
resumeLineEn: One pipeline for a daily brief and a map of nearby places, with quotas as a hard ceiling on concentration.
---

## 它是什么

两条信息流，一套管道：

- **每日精选**——大约二十条，每条一行摘要、来源、以及**为什么被选中**
- **周边点**——地图 API 的兴趣点，能拿到就配上看它的攻略内容

两条流共享归一化、去重、聚类、配额、摘要这一整条链路。

## 核心命题：多样性不是加分，是硬约束

一个信息茧房不是靠"推荐得更准"打破的。Radar 的做法是给**来源**和**主题**都设**配额**——单个来源、单个主题在一天里最多能占多少条。这是集中度的天花板，不是打分加成。

配套地，**推广档位**只有三档动作 + 一个不确定档：确认推广 → 隐藏；疑似推广 → 折叠并标注；未见推广 → 正常显示；不确定 → 折叠标注「信息不足」，但**绝不隐藏**。

> 不确定不等于没有推广。缺证据不是"没有"的证据。

## 划在开工之前的红线

**只用公开接口和 RSS 渠道。绝不逆向签名，绝不模拟登录。拿不到就降级并写明「该源不可用」。**

这条红线决定了很多结论。最典型的是小红书：它是最大的缺口，而且是**被红线主动放弃**的缺口——所有现成开源件要么要 cookie 签名，要么自述"逆向"。所以周边地图模块的攻略内容被明确声明为不可用，走 POI 地图 API + 公开 RSS/榜单兜底。

我还专门查了许可证边界：**MediaCrawler 的 LICENSE 首行是 `NON-COMMERCIAL LEARNING LICENSE 1.1`**，不是 OSI 开源许可，改造后分发不合规。而 RSSHub、Folo、FreshRSS 都是 AGPL-3.0——Radar 的既定边界是"单用户本机自用、不公开发布"，所以正确姿势是**把 AGPL 项目当独立进程调用（HTTP 接口），不 copy 代码**。

这些判断都写在 [调研笔记](/work/?kind=note)里，每条都回到一手来源：仓库主页、仓库内 README / LICENSE / 源码、官方文档页。只到"搜索结果页"级别的判断会明确标注，取不到的字段写「未取到」，不猜。

## 四种失败不是一回事

界面上这四个词永远分开写：

| 词 | 意思 |
|---|---|
| **不可用** | 该读的东西现在读不到，原因已知 |
| **未配置** | 你没提供凭据或设置。什么都没坏，是没配 |
| **未授权** | 你拒绝了某个权限。是选择，不是故障 |
| **拿不到** | 这个来源根本不提供这份数据。再怎么试也没有 |

来源失败时，**降级行为必须在界面上说出来，不许静默丢弃**。

## 架构

Electron 桌面壳 + Python sidecar，进程间用 IPC 契约通信。这条是读源码读出来的，不是猜的——具体踩了哪些坑见 [调研笔记](/work/?kind=note)。

## 交付状态

**还在调研和架构阶段。** 12 张票，5 篇调研报告、1 篇架构契约、1 份术语表已完成；可运行的代码还没有。

所以这个条目暂时**没有源码链接**——等它能跑起来那天再补。
