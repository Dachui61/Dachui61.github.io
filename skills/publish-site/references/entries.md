# 目录条目分支

作品条目在 `site/content/work/<slug>.md`，一个文件一条。

## frontmatter

```yaml
---
slug: vitals                    # 稳定标识，不随标题或语言变
kind: project                   # project | note | decision
locale: zh                      # 这份文件是哪种语言的
title: Vitals
titleEn: Vitals
summary: 一句话中文摘要
summaryEn: one-line English summary
resumeLine: 面向招聘方的一句话
resumeLineEn: one line for a hiring manager
group: ship                    # ship（做出来）| decide（记下取舍）| verify（查证）
order: 1
date: 2026-11-14
updated: 2026-11-22
status: 已交付
statusEn: Shipped
tech: [Swift, SwiftUI]
repo: https://github.com/Dachui61/Vitals
featured: true
demo: vitals-demo              # 可选：public/media 下的演示素材
demoCaption: 真实运行中的悬浮窗
---
```

正文是 Markdown，走站点的 `.prose` 样式。

## 三个字段各有各的用处

**`featured: true`** —— 这条会出现在首页的分组里、目录页里，**和简历的「精选项目」「精选写作」**。简历和目录读的是同一份数据，不会各说各话。

**`resumeLine` / `resumeLineEn`** —— 面向招聘方的一句话，和 `summary` 不是一回事。`summary` 是给同行看的（我怎么做的），`resumeLine` 是给招聘方看的（做成了什么）。Vitals 这条的 `resumeLine` 是"常驻本机的 macOS 监控：CPU 温度用无特权方式读取，读不到就降级并写明原因"。

**`proof`**（在简历的 `skills[]` 里）—— 填某个条目的 slug，简历页上会变成一条「证据 → 某条目 ↗」的链接。**"我懂这个"和"我能证明这个"差着一整个量级。**

## 调研笔记与 ADR

这两类来自**工作仓库**（`~/Documents/deepseek-harness/default-workspace`），不在站点仓库里手写：

```bash
cd site && node scripts/sync-content.mjs
```

脚本读工作仓库的 `research/*.md` 和 `docs/adr/*.md`，抽出标题、日期、摘要，写成规范化的 frontmatter，落到 `content/work/`。**正文原样保留，一个字不改。**

脚本是幂等的，只写它自己拥有的文件——手写的条目（`vitals.md`、`radar.md`）永远不会被它碰。

**英文标题和摘要手写在 `site/content/i18n/overrides.json`**，不自动翻译。机器翻译一篇调研报告会歪曲来源的说法，而这正是这个站不做的。

## 改完一条已有条目

同步脚本会**覆盖**它生成的文件。所以：

- 改**正文** → 在工作仓库改，然后重跑同步
- 改**元数据**（标题、摘要、精选标记）→ 直接改 `content/work/` 里的文件，或改 `overrides.json`
- 改**分类**（`group`）→ 直接改站点仓库里的文件

跑同步脚本之前先确认：这次改动该落在工作仓库还是站点仓库。

## 加一条新条目

手写 `site/content/work/<slug>.md`，填上上面的 frontmatter 和正文。`group` 决定它落在哪一组：

- `ship` —— 做出来的东西
- `decide` —— 决策记录
- `verify` —— 调研与查证

三组是**一条流程**，不是三个类别：`01 做出来` → `02 记下取舍` → `03 查证`。新条目归到哪一组，问"读者是在什么时候需要它"。

## 分组名与措辞

站内术语有定义的地方（核心温度、不可用、降级链、证据、精选……），以 `site/GLOSSARY.md` 为准。**新造词之前先查那里**——这个词是不是已经有了一个更准确的说法。

## 改完

走 `SKILL.md` 的闭环。
