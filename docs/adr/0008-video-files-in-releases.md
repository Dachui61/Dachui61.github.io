# 8. 视频文件放 Release，不进 git 仓库

- 状态：已接受
- 日期：2026-11-24
- 相关决定：3

## 上下文

「每日热点 · 科普短视频」每天 03:00 出一期，成片两分钟上下。母带是
300–400 MB 一个（码率 23.5 Mbps，对代码绘制的画面纯属浪费）。

第一版把重编码后的视频（5–6 MB）直接放进本站仓库的 `public/media/films/`。
四期就是 22 MB。日更的话是 5.5 MB/天，一年 ~2 GB。

三个硬事实：

1. **单文件超过 100 MB 会被 GitHub 直接拒绝推送。** 实测：
   ```
   remote: error: File big.bin is 101.00 MB; this exceeds GitHub's file size limit of 100.00 MB
   remote: error: GH001: Large files detected.
   remote: pre-receive hook declined
   ```
   母带（359–416 MB）**物理上进不了 git**。这也是为什么每期都要重编码。
2. **仓库体积**：GitHub 自己的说法是"最好小于 1 GB，强烈建议小于 5 GB"。
3. **Pages 的软带宽 100 GB/月**。视频比文字重得多，体积直接换算成带宽。

GitHub 的 Pages 限制文档里有一句直接的提示：*"consider making use of other
GitHub features such as releases"*。

## 决策

**视频文件放在 GitHub Release 里，不进本站仓库。**

- 每期一个 release，tag 就是那一期的 slug，资源名就是 `<slug>.mp4`。
- 发布仓库：`Dachui61/daily-hot-video`（一个只有 README 的分发仓库）。
- 站内引用的是一个**由 slug 推导出来的**固定 URL：
  `https://github.com/Dachui61/daily-hot-video/releases/download/<slug>/<slug>.mp4`
  —— 所以发布新的一期**不需要改内容文件**。
- **poster 留在本站仓库**（转成 WebP，17–88 KB）。索引页要缩略图，
  而且它小到不构成问题。
- 母带永远不发布，也不进任何仓库。

## 后果

- **仓库不再随日更增长。** 视频 0 字节进 git，只有 poster（~50 KB/期）
  和内容文件。第一版已经提交进去的那 22 MB 留在历史里——不值得为此重写
  已发布的提交历史。
- **多了一个发布步骤**。`scripts/publish-episode.sh` 把顺序固定住：
  重编码 → poster → 建/更新 release → 生成条目 → 提交推送。
  顺序很重要——release 必须先于站点构建存在，否则视频 404。
- **视频从 `github.com` 而不是站点自己的域名加载。** 同一套 GitHub 基建，
  但严格说是另一个 origin。Release 资源支持 Range 请求（实测 `302` →
  `206 accept-ranges: bytes`），所以进度条可以拖。
- **上传是慢的那一步。** 5–6 MB 的文件经代理上传要一会儿，偶尔会因并发
  失败，重试即可。
- 如果某一期的 release 建漏了，那一页的视频会 404，但页面本身和 poster
  仍然在。

## 备选方案（被否掉的）

| 方案 | 否掉原因 |
|---|---|
| 视频直接进本站仓库 | 单文件超 100 MB 进不去；日更一年 ~2 GB；每期一次大二进制提交 |
| Git LFS | 解决得了单文件限制，解决不了仓库体积和带宽；而且要给匿名访客开 LFS 下载 |
| Cloudflare R2 / Pages | 能解决体积，但引入第三方托管，与本站"零第三方请求"的规矩不合 |
| 只放母带、不重编码 | 母带进不了 git，也没人愿意等 359 MB 的首帧 |
