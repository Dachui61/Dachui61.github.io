# 短片分支

「每日热点 · 科普短视频」。每期两分钟上下，**视频文件不在站点仓库里**。

## 一条命令

```bash
cd ~/Documents/deepseek-harness/default-workspace/site
scripts/publish-episode.sh <slug>
```

它按固定顺序做完：重编码 → poster → 建/更新 release → 生成条目 → 提交推送。**顺序有意义**，见下面。

## 视频为什么不进 git

母带 300–400 MB 一个，单文件超 100 MB 会被 GitHub **直接拒绝推送**（实测原文见 `SKILL.md`）。就算重编码到 5 MB，日更一年也是 ~2 GB，仓库会撑到 GitHub 不建议的大小。

所以：**每期一个 release**，tag 就是 slug，资源名就是 `<slug>.mp4`，放在 `Dachui61/daily-hot-video`。

站内引用的是**由 slug 推导出来的固定 URL**：

```
https://github.com/Dachui61/daily-hot-video/releases/download/<slug>/<slug>.mp4
```

**发布新的一期不需要改内容文件**——生成器自己算。URL 变了是所有链接一起变，不是内容问题。

Release 资源**支持 Range 请求**（`302` 跳转到对象存储后返回 `206 accept-ranges: bytes`），所以进度条能拖。

## 发布顺序

**release 先于构建存在。** 页面里的 URL 指向 release，如果构建时 release 还没建好，那个页面的视频会 404。`publish-episode.sh` 已经把顺序固定住。

上传 5–6 MB 偶尔会因并发失败，重试即可。

## 内容从哪来

`site/scripts/sync-films.mjs` 从每期的三个地方抽取：

| 来源 | 取什么 |
|---|---|
| `brief.md` | 主题、一句话、规格、受众、风格、品牌、内容依据 |
| `audio/narration.segments.json` | 口播稿 + **真实音频实测的时间戳** |
| `research/sources.md` | 来源清单、检索失败记录、素材授权 |

条目写到 `site/content/films/<slug>.md`。

**口播稿的时间轴不是按字数估算的**，是 `ffprobe` 对真实配音逐段实测的——这一点在页面上也写明了，别改成估算。

## 页面上有什么

播放器（`<video controls>`，保留原声与进度条）、这一期在讲什么、完整口播稿（**点时间戳跳到视频对应位置**）、来源清单、检索失败记录、素材授权、制作说明。

## 时间戳跳转的实现

口播稿里的时间戳是 `href=".../#t=34.96"` 的链接，点击后由页面里的一小段脚本接管，改 `video.currentTime`。

**媒体片段规范（`#t=`）只作用于媒体 URL，不作用于文档 URL**——实测在 Chromium 里点文档 URL 上的 `#t=` 不会跳转。所以这段脚本是必要的，不是多余的。

## poster

留在站点仓库（`site/public/media/films/<slug>-poster.webp`），因为索引页要缩略图。**转成 WebP**，每期 17–88 KB。

转格式的原因和视频一样：PNG 每期 58–260 KB，日更一年 ~70 MB。WebP 之后是 ~18 MB/年。

## 母带与发布仓库

**母带永远不发布，也不进任何仓库。** 发布仓库 `Dachui61/daily-hot-video` 里只有一个 README，说明它是分发点。

## 录一段界面演示

Vitals 的悬浮窗演示（`scripts/record-demo.sh`）录的是**本机跑着的应用**。

**macOS 在锁屏状态下不显示 GUI 窗口**——录出来是全黑，辅助功能也拿不到窗口。所以录制前确认屏幕是解锁的。

`screencapture -R` 的坐标是**逻辑点**，输出是 2 倍像素。

录完的素材放 `site/public/media/`，页面上用 `demo:` 字段引用。`Demo` 组件在构建时检查素材在不在——不在就不渲染 `<video>`，只留静帧。
