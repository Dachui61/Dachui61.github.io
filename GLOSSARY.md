# GLOSSARY

The vocabulary of this site. Terms are opinionated; the *avoid* lists exist
because the tempting synonym means something else.

The site presents the work of one person. Two vocabularies are borrowed from
the projects themselves and are used here with their original, precise
meanings — not loosened for general readers.

## Site language

**条目** (entry):
One item in the catalogue: a project, a research note, or a decision record.
An entry is identified by a stable slug that does not change when its title
is translated.
_Avoid_: 文章, 帖子, 内容, 博客

**调研笔记** (research note):
A long-form report written against primary sources, where the method and the
things that could not be fetched are part of the document.
_Avoid_: 博客, 文章, 调研报告, 白皮书

**决策记录** (decision record):
A record of one decision: what was chosen, what it costs, and which
alternatives were rejected and why. It is written in the past tense, because
the decision is already made.
_Avoid_: 笔记, 博客, 复盘

**做出来** (ship):
The group of entries that are running code.
_Avoid_: 项目, 产品, 作品集

**记下取舍** (record the trade-offs):
The group of entries that are decision records.
_Avoid_: 决策, 复盘, 经验

**查证** (verify):
The group of entries that are research notes.
_Avoid_: 调研, 研究, 参考

**原文为中文** (the original is Chinese):
The notice shown on an entry whose body exists in Chinese while the page is
being read in English. It states a fact about the content; it does not
apologise.
_Avoid_: 暂无英文版, 翻译中

**简历** (résumé):
A self-description and a selection of work, written for a hiring manager.
Its content lives in `content/profile/resume.yaml`. The featured projects
and writing on it come from the catalogue itself, so the résumé and the
catalogue cannot disagree.
_Avoid_: 个人主页, 履历, 简历页

**经历** (experience):
One job on the résumé: a period, a role, an organisation. It is **not** an
entry in the catalogue — a job happened outside the repository and has no
artefact behind it.
_Avoid_: 项目, 条目, 作品, 经历条目

**精选** (featured):
A catalogue entry marked `featured: true`. The résumé draws its selected
projects and selected writing from this flag and from nowhere else.
_Avoid_: 推荐, 热门, 精选推荐

**技术能力** (skill):
One capability on the résumé, with a sentence of explanation and an
optional **证据** — a link to the catalogue entry that proves it.
_Avoid_: 技能栈, 工具, 技术标签

**证据** (proof):
The link from a skill to the entry that demonstrates it. "I can prove this"
is stronger than "I know this".
_Avoid_: 例子, 演示, 样例, 链接

## Borrowed from Vitals

**核心温度** (core temperature):
The CPU die's temperature in °C, read from a single primary sensor chosen by
a fixed priority order. The name of the sensor actually read is always shown
alongside the value; if that sensor's identity is only inferred, the reading
is marked 近似值.
_Avoid_: 处理器温度, CPU 温度, 芯片温度

**热压力等级** (thermal pressure level):
The operating system's own four-state verdict — nominal / fair / serious /
critical — on whether the machine is thermally constrained. A level, never a
number.
_Avoid_: 温度, 过热警告

**近似值** (approximate reading):
A figure that is not a direct measurement of the quantity it names. Always
labelled as approximate.
_Avoid_: 估算值, 估值

**不可用** (unavailable):
Something that cannot be read right now, with the reason known. Distinct from
something that legitimately reads zero.
_Avoid_: 无数据, 空, 0, N/A

**降级链** (fallback chain):
The ordered sequence of backends tried when the preferred one is
unavailable, ending in the metric being shown as 不可用. A metric never
falls back to a fabricated number.
_Avoid_: 备用方案, 容错

## Borrowed from Radar

**来源** (source):
A channel Radar collects from — a subscribed RSS feed, a public hot-list
endpoint, an international site. A source is an agreement about what it
yields and how it fails, not just a URL.
_Avoid_: 数据源, 平台, 站点, 频道

**条目** (item) — *in Radar only*:
One piece of content as collected: a title, a link, and whatever metadata its
source exposes. Distinct from **条目 (entry)** on this site, which is a
catalogue record. The two are never interchanged.
_Avoid_: 文章, 资讯, 推送

**推广** (promotion):
Content whose primary intent is to lead the reader to a commercial offer.
Judged per item, never per source or per topic.
_Avoid_: 广告, 软广, 营销

**配额** (quota):
The maximum number of entries a single source or a single topic may
contribute to one brief. A hard ceiling on concentration, not a scoring
bonus.
_Avoid_: 限额, 权重, 比例

**多样性** (diversity):
How far a brief spreads across sources and topics. A property of the set,
never of a single item.
_Avoid_: 丰富度, 均衡度, 质量

**拿不到** (not obtainable):
The source simply does not expose the data. No amount of trying will produce
it. Distinct from 不可用, and never silently merged into it.
_Avoid_: 不可用, 未配置, 抓取失败
