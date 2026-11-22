# 1. 用 Astro，不用 Next.js

- 状态：已接受
- 日期：2026-11-22
- 相关决定：4、3

## 上下文

参考站 AIHero.Dev 本身是 Next.js（App Router + Turbopack + Tailwind v4 +
shadcn/Radix + tRPC）。但它是另一个形态的东西：它背后有数据库、服务端搜索
API、Stripe、ConvertKit、Mux，以及一个真正的后端。

本站要的是另一个形态：一个内容型静态站，全部内容在构建期变成 HTML，
托管在 GitHub Pages 上，没有服务端。

「用和参考站一样的框架」看起来最省事，但参考站的架构是由它的产品形态
决定的，不是由它的视觉风格决定的。把那套架构搬过来只会带来用不上的
复杂度。

## 决策

用 **Astro 7**（`output: 'static'`）+ Tailwind v4。

1. **Astro 内置 i18n 路由**。本站需要中英双语（决定 4），Astro 的 `i18n`
   配置直接给出每种语言各自的 URL 路径，不需要自己拼。
2. **`astro:content` 内容集合**。条目有 frontmatter、有正文、有分组和排序
   需求，内容集合就是为此设计的（决定 2）。
3. **默认零 JS**。这个站是内容型的，交互只有主题切换和语言切换。零 JS
   的默认意味着没有 hydration 成本、没有框架运行时，首屏是纯 HTML。
4. **官方支持 Pages**。Astro 官方维护 GitHub Pages 的部署路径。

## 后果

- **放弃**了 Next.js 生态里现成的东西：`next/image` 的图片优化（要设
  `images.unoptimized`）、Route Handlers（Pages 上本来也跑不了）、Server
  Components 的组件模型。对本站而言这些都不需要。
- **`actions/configure-pages` 不会给 Astro 注入 base path**——它只认
  `next` / `gatsby` / `nuxt` / `sveltekit` 四家。所以 CI 里显式传
  `--site` / `--base`（见 `.github/workflows/deploy.yml`）。
- 内容渲染走 Markdown + `astro:content`，不是 JSX。想做交互式组件时要
  单独引入框架集成，这是一条额外成本，但目前没有交互式组件的需求。

## 备选方案（被否掉的）

| 方案 | 否掉原因 |
|---|---|
| Next.js `output: 'export'` | 要自己处理 i18n 路由和 `images.unoptimized`；产物体积更大；为不存在的服务端能力付出成本 |
| Vite + React 手工搭 | i18n、路由、内容集合、Markdown 渲染全部要自己写。为了一个内容站重造一遍 Astro |
| Hugo / Jekyll | Hugo 要写 Go 模板；Jekyll 是 Pages 的默认值但生态更旧，且 GitHub 上的 Jekyll 至今仍是 3.10.0，没有 Jekyll 4 |
