# 7. 简历导出 JSON Resume，但渲染自己写

- 状态：已接受
- 日期：2026-11-23
- 相关决定：1、6

## 上下文

JSON Resume（jsonresume.org）是简历-as-code 领域的事实标准：一份 MIT 许可的
JSON Schema（v1.9.0），生态里有 228 个主题、`resume-cli`、`resumed`，以及
上百个第三方工具。

生态里现成的东西分两类：

- **渲染器**（`jsonresume-theme-*`）。它们会带着自己的模板和样式。
- **数据格式**（schema 本身）。它只是一份字段约定。

站点的风格是自己定的（见 ADR 0005）。把一个主题渲染器套上来，得到的是一个
"看起来像 jsonresume-theme-elegant 的页面"，而不是本站的一部分。

## 决策

1. **渲染自己写。** `/resume/` 继续用本站的设计系统，用自己的组件渲染。
2. **数据格式借 JSON Resume 的字段名。** `basics` / `work` / `education` /
   `skills` / `awards` / `certificates` / `projects` / `meta`，字段名与
   v1.9.0 一致。
3. **导出一份真的 JSON Resume。** `/resume.json` 和 `/en/resume.json`
   输出符合 v1.9.0 的文档，构建时用官方 `@jsonresume/schema` 校验；
   **校验不过构建失败**，不发出一个"自称是 JSON Resume"的东西。
4. **标准放不下的东西走 `custom`。** JSON Resume 明确允许每个层级有
   `custom`，并建议用工具名做命名空间。本站多出来的两样东西放在那里：
   技能的说明与证据链接 → `custom.dachui61.note` / `custom.dachui61.proof`。
5. **内容源仍然是本站自己的 YAML**（`content/profile/resume.yaml`）。
   JSON Resume 是导出的形状，不是内容的来源——它表达不了双语同文件、
   证据链接、精选条目这些本站需要的东西。

## 后果

- **简历变得可移植。** 任何读 JSON Resume 的工具都能直接用：
  `npx resume-cli export resume.json --theme even` 一条命令就能拿到一份
  带主题的 HTML；ATS 侧的转换器也吃这个格式。
- **日期格式被收紧了。** ISO 8601，且每个段都可省：`2024` / `2024-03` /
  `2024-03-01`。`endDate` 留空 = 至今（schema 就是这么定义的）。
  写错格式 → 构建失败并指出是哪个字段。
- **获奖与认证被拆成两段。** 它们本来就不是一回事：奖有颁发方，认证有
  颁发方和（通常有）有效期与证书编号。JSON Resume 也是这么分的。
- **有了一个可能过时的依赖。** `@jsonresume/schema` 是 MIT 的、活跃的
  （1.9.0，2026-11-22 发布），但它是第三方包。真出问题时的退路是把
  `assertValidJsonResume` 换成直接用 schema 文件校验——映射逻辑本身不受
  影响。
- **校验是构建期的事。** 访客拿到的是静态 JSON，校验器不进产物。

## 备选方案（被否掉的）

| 方案 | 否掉原因 |
|---|---|
| 集成 `jsonresume-theme-*` 渲染 | 与本站设计系统正面冲突；而且多数社区主题停留在 2020–2021 的 schema 上，遇到 v1.9.0 会直接崩（研究里实测 `jsonresume-theme-elegant` 崩在 `basics.location` 从字符串变成对象） |
| 用 Reactive Resume 的公开 API 在构建时抓 | 它的编辑器在 rxresu.me，不在站内；数据在第三方，构建依赖一个别人托管的服务；而且它的内容**不是**多语言的，没有 translations |
| 内容源直接改成 `resume.json` | JSON Resume 的 `meta.translations` 是"一份文档一种语言"，装不下"一个文件两半"；也表达不了证据链接 |
| 不导出，只做页面 | 少一个真正可用的东西：一份能被整个生态读走的简历 |
