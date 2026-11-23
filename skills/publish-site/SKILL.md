---
name: publish-site
description: 发布内容到个人站 dachui61.github.io 并上线验证——简历、目录条目、调研笔记、每日短片。触发场景：用户要改简历、加或改一条作品、同步调研笔记、发新一期短片、或把站点内容推上线。涵盖双语内容规则、视频走 GitHub Release 分发、以及 build→deploy→verify 闭环。
---

# 发布站点内容

一个静态站，三类内容，一条上线闭环。这个 skill 覆盖闭环本身和每类内容各自的规矩。

**原理**：内容是仓库里的文件，上线是推一次提交。视频是例外——它不进仓库，走 GitHub Release。所有取舍的理由都写在 `site/docs/adr/`，改之前先读相关那篇。

## 地图

| | |
|---|---|
| 站点仓库 | `~/Documents/deepseek-harness/default-workspace/site` → `github.com/Dachui61/Dachui61.github.io` |
| 内容 | `site/content/` —— `work/`（作品条目）、`films/`（短片）、`profile/resume.yaml`（简历） |
| 素材 | `site/public/media/`（图片、poster）；**视频不在这里** |
| 视频分发 | `github.com/Dachui61/daily-hot-video` 的 release，每期一个，tag 即 slug |
| 工作仓库 | `~/Documents/deepseek-harness/default-workspace` —— 调研笔记与 ADR 的来源 |

## 先选分支

| 用户要做的 | 读 |
|---|---|
| 改简历：经历、教育、技能、获奖、认证、联系方式 | `references/resume.md` |
| 发新一期短片、换视频、改某期的元数据 | `references/films.md` |
| 加或改一条作品条目、同步调研笔记或 ADR、调精选 | `references/entries.md` |

只读要做的那一份。三份共享下面的闭环。

## 闭环

1. **改内容。** 在 `site/content/` 下改对应文件（分支细节见上）。中文和英文是两份，改中文就要同步改英文——见分支里的双语规则。
   完成：改动落在文件里，中英两处都改了。
2. **构建。** `cd site && pnpm build`。
   完成：构建成功，`dist/` 里有 `index.html` 和 `pagefind/`。
3. **提交并推送。** `git commit -am "<说明>" && git push origin main`。
   完成：推送成功，远端 `main` 是本次提交。
4. **等部署。** `gh run list --repo Dachui61/Dachui61.github.io --limit 1`，约 45 秒。
   完成：这一行显示 `completed success`。
5. **线上验证。** 用 `curl` 确认关键 URL 返回 200；改动涉及播放器或交互时，用 headless 浏览器实测一次。
   完成：线上版本确实是本次改动。
6. **报告。** 说清楚改了什么、线上地址、以及任何没做的部分。

## 每条分支都要知道的硬限制

**`gh` 的 token 必须是 classic PAT。** 形如 `ghp_`，scope 要 `repo` 和 `workflow`。GitHub 现在把 gh CLI 的设备码流程换成了 GitHub App，发出来的是 `ghu_` token——那种 token 在你的账号上没有 installation，能读公开仓库，但**建不了仓库也推不了代码**。检查：`gh auth status` 看 token 前缀和 `Token scopes`。

**git 走本地代理。** `git config --global http.https://github.com.proxy http://127.0.0.1:7890`（Clash 的 mixed 端口）。直连 GitHub 比走代理慢二十倍，push 会卡到像死机。

**单文件超过 100 MB 会被 GitHub 直接拒绝推送**：

```
remote: error: File big.bin is 101.00 MB; this exceeds GitHub's file size limit of 100.00 MB
remote: error: GH001: Large files detected.
```

视频母带是 300–400 MB，物理上进不了 git。这是视频走 release 的直接原因。

**Pages 的限制**：发布站点 ≤ 1 GB；**软**带宽 100 GB/月；部署 10 分钟超时。每小时 10 次构建的限制对自定义 Actions workflow 不适用。

**构建失败是安全的**：Actions 不会部署失败的构建，旧版本继续在线。所以构建失败时线上不会坏——修好再推就行，不用急。

**导出物在构建时被校验**：简历的 JSON Resume 导出用官方 `@jsonresume/schema` 校验，不合规就是构建失败，不会发出一个"自称合规"的东西。

## 一次发布可能要碰多个地方

短片发新的一期，会同时动到：release（视频）、`content/films/`（条目）、`public/media/films/`（poster）。**顺序是 release 先于构建**——构建时页面里的 URL 必须已经能取到视频，否则那个页面会 404。`site/scripts/publish-episode.sh` 已经把顺序固定住了。

## 做完的标准

不是"文件改了"，是**线上能看到，而且验证过**。报告时给出线上地址和验证结果。
