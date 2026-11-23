# 简历分支

简历的内容全部在**一个文件**里：`site/content/profile/resume.yaml`。

## 结构

顶层是一个**数组**，里面一个元素，`id` 是 `resume`，底下 `zh:` 和 `en:` 两半，字段结构完全一致：

```yaml
- id: resume
  zh:
    basics:
      name: 刘宇
      label: Go 后端开发工程师 · macOS 系统层 · AI 原生工作流
      summary: |
        第一段。

        第二段。
      email: 2406394073@qq.com
      phone: '17823583569'
      location: { city: 长沙, countryCode: CN }
      profiles:
        - { network: GitHub, username: Dachui61, url: https://github.com/Dachui61 }
    work: []          # 每条: name / position / type / startDate / endDate / highlights[] / keywords[]
    education: []     # 每条: institution / area / startDate / endDate
    projects: []      # 每条: name / summary / entity / startDate / endDate / url / highlights[] / keywords[]
    skills: []        # 每条: name / note / proof
    awards: []        # 每条: title / awarder / date
    certificates: []  # 每条: name / issuer / date / credentialId / url
  en:
    basics: { ... }
    ...
```

**为什么顶层必须是数组**：Astro 的 `file()` loader 把顶层**对象**当成「多个条目的映射」，`{zh: ..., en: ...}` 会变成两个条目而不是一个。包成数组并给 `id` 才是"一个条目"。

## 两个 YAML 坑

**值里有 `: `（冒号加空格）要加引号。** `note: The IDaaS platform at Sangfor: single sign-on` 会被 YAML 读成嵌套映射，报错是 `Nested mappings are not allowed in compact mappings`。加单引号即可。

**纯数字要加引号。** `phone: 17823583569` 会被读成 number，schema 报 `Expected type "string", received "number"`。写 `phone: '17823583569'`。

这两个错会让构建直接失败，并指出行号——**构建失败是安全的**，线上还是旧版本。

## 日期

ISO 8601，每段都可省：`2024` / `2024-03` / `2024-03-01`。**`endDate` 留空 = 至今**。日期格式错了会被 JSON Resume 的 schema 校验拦下（构建失败）。

## 双语规则

`zh:` 和 `en:` 是同一份简历的两种语言，字段一一对应。

**改中文就要同步改英文。** 只改一半，英文页会显示空字段或退回中文。

正文那种大段散文（`summary`），英文版留空时页面会回退显示中文，并在页面上标「（暂无英文版）」——**明确标注，不假装有英文版**。

## 页面上有哪几段

`概览` → `经历` → `教育背景` → `项目` → `技术能力` → `精选写作` → `获奖` → `认证`。

**空数组整段不渲染**——经历没填，页面上就没有"经历"这一段。这是刻意的：不编。

## 「精选项目」和「精选写作」不在这个文件里

它们由**目录条目**的 `featured: true` 自动带出来，简历页和目录页读的是同一份数据，不会各说各话。见 `entries.md`。

`skills[].proof` 填目录里某个条目的 slug，页面上会变成一条「证据 → 某条目 ↗」的链接。**证据比形容词有力。**

## JSON Resume 导出

`/resume.json` 和 `/en/resume.json` 输出符合 **JSON Resume v1.9.0** 的文档，构建时用官方 `@jsonresume/schema` 校验。

标准放不下的东西走 `custom`（JSON Resume 明确允许的扩展点）：技能的说明与证据链接放在 `custom.dachui61` 下。

导出映射在 `site/src/lib/jsonresume.ts`，改简历结构时**同步改那个文件**，否则导出和页面会不一致。

## 事实从哪来

简历里的每一条事实都来自用户提供的材料（docx、对话）。**用户没给的部分留空数组**，由页面的"空段落不渲染"处理掉。

写进简历的每句话都要能被材料支持。页面上写着"无特权读取 CPU 温度"，那简历里就不该出现"高性能监控"这种没有依据的形容词。

## 改完

走 `SKILL.md` 的闭环。改完 `pnpm build` 时会顺带验证 JSON Resume 导出是否仍合规——**这是白拿的一道检查**。
