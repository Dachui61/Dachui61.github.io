# 6. 简历编辑器推迟，只做展示

- 状态：已接受
- 日期：2026-11-23
- 相关决定：3、2

## 上下文

想在简历页上加一个站内编辑器：所见即所得地改简历，改完保存，全网可见。

**技术上做得到，而且比想象中容易。** 核实过：

- `api.github.com` 的 CORS 允许浏览器带 `Authorization` 头直接
  `PUT /repos/{owner}/{repo}/contents/{path}`——实测
  `access-control-allow-origin: *`、`allow-methods: PUT`、
  `allow-headers: Authorization, Content-Type`。
- 改完直接 commit 到 `main`，现有的 Pages workflow 会重新部署。

也就是说，**不需要后端，也不需要 OAuth**。唯一的代价是：有一枚 token
要存在浏览器的 localStorage 里。

## 决策

**暂不做站内编辑器。** 简历页只做展示。

内容的修改路径是：直接在 GitHub 上编辑
`content/profile/resume.yaml` → 提交 → Actions 重新部署。简历页底部有
一个「在 GitHub 上编辑」链接指向那个文件的编辑页。

## 为什么

1. **GitHub 官方文档明确反对把凭据放进前端代码**：
   *"Never hardcode authentication credentials like tokens, keys, or
   app-related secrets into your code."* 一枚存在 localStorage 的 PAT
   对同源的任意 JS 都是可读的——而这就是「发布一个凭据」。
2. **两个最成熟的 Git-based CMS 已经放弃了纯前端的 GitHub 认证。**
   - Sveltia CMS：PKCE 在它自己的文档里标注 **Unimplemented**——
     *"It was planned for Q4 2025, but GitHub has put the project on
     hold."* 剩下的零后端方案只有「粘贴 PAT，存 localStorage」。
   - Decap CMS：`auth_method: pkce` / `implicit` 对 GitHub 后端**已被移除**
     （仓库里 grep `auth_method` 零命中），现在无条件走 Netlify 认证。
   也就是说，**我们打算做的那套方案就是这个领域当前唯一的零后端路径**——
   那两个项目把它做成了第三方应用，我们要把它做成站内编辑器；差别只剩
   凭据的存放位置。
3. **官方支持的唯一「单文件级」权限需要服务端**。GitHub App 的
   `single_file_name` / `single_file_paths` 能把权限收窄到最多 10 个文件，
   但 App token 必须在服务端签发 → 违反 ADR 0003（不引入后端）。
4. **宁可不做一个半成品**。做一个只能存本地草稿、不能发布的编辑器，
   比没有编辑器和更糟：它会让人以为改了就是改了。

## 后果

- 想改简历要开一次 GitHub 的网页编辑器。改一个字段，三次点击。
- 简历的内容格式（一个 YAML 文件，结构化、带注释、构建时校验）与编辑器
  无关。将来真要做编辑器，**内容模型不用改**。
- 保留的回头路：等有地方能托管一个 OAuth client server（Cloudflare
  Worker 之类），或者 GitHub 把客户端 PKCE 做出来，再回来做。
- 简历里的「精选项目」和「精选写作」由目录条目的 `featured: true`
  自动带出，所以简历和目录**不会各说各话**。

## 备选方案（被否掉的）

| 方案 | 否掉原因 |
|---|---|
| Sveltia CMS | 要注册 OAuth App 或 OAuth client server，或多一个 Netlify 站点；编辑器在第三方域名，数据要经过它 |
| Decap CMS | GitHub 后端的 pkce / implicit 已被移除，只剩 Netlify 认证 |
| Pages CMS | 同样要 OAuth App；自托管要 Postgres + Node + GitHub App |
| 浏览器里存 PAT，站内直接写 GitHub | 与 GitHub 官方「不要把凭据放进前端代码」的指引冲突；fine-grained PAT 只能限到仓库级，**不能限到文件级** |
| Reactive Resume | 编辑器在 `rxresu.me`，不在站内；数据在第三方，构建时抓外部 API（与 ADR 0002 冲突） |
| JSON Resume 的各种 theme | 会带着自己的模板和样式，和本站的设计系统正面冲突。只借它的**数据格式**可以，借它的**渲染器**不行 |
| 只做 localStorage 草稿 + 手动导出 | 仍然不是「所见即所得地保存并发布」 |
