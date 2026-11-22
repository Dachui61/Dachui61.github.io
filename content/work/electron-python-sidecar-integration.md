---
slug: "electron-python-sidecar-integration"
kind: "note"
locale: "zh"
title: "Electron 桌面壳 + Python sidecar：2026 年真实做法与坑"
titleEn: "An Electron Shell with a Python Sidecar: How It Is Actually Done in 2026"
summary: "进程边界、IPC 契约、打包，以及只有在装到机器上之后才会暴露的坑。全部读真实实现，不读博客。"
summaryEn: "Process boundaries, IPC contracts, packaging and the failure modes that only show up after the app is installed — read from real implementations rather than blog posts."
group: "verify"
order: 0
date: "2026-11-17"
hasBody: true
---

> 票 08 · research · 目标：Radar（macOS 单用户本地工具）定架构
> 机器：macOS 27 / Apple M6 / 16GB · 计划 brew 装 python@3.12 + uv
> 原则（已定）：Electron 主进程只做窗口/托盘/IPC/定时；业务全在 Python；**SQLite 只归 Python 所有**
> 取证日期：2026-11-17（Asia/Shanghai）
> 一手来源：Electron 官方文档、electron-builder 官方文档、PyInstaller 官方文档、Nuitka 官方站点、uv 官方文档、Apple Developer Documentation / TN2206、Node.js 官方文档、Python 官方文档、Tauri 官方文档（仅作参考）
> 凡本文出现的 URL 均为对应结论的一手来源；未取到的内容集中列在最后一节「存疑点」。

---

## 1. 结论要点（≤10 条，含明确推荐）

1. **Python sidecar 必须用 `child_process.spawn`，不能用 `utilityProcess` / `child_process.fork`。**
   `utilityProcess.fork(modulePath, …)` 的 `modulePath` 是**打包应用内的 JS 入口脚本**（Electron 22 起），文档与发行说明都把它定位为「替代 `child_process.fork` 的 Node 子进程」，因此它**跑不了 Python 可执行文件**；且它的 `stdio` 只允许配置 stdout/stderr，`stdin` **必须**是 `ignore`，也就没有 stdio 双向协议可用。
   `child_process.fork` 同样是「spawn 一个 **Node.js** 进程并建立 IPC 通道」。
   → **推荐：Electron 主进程 `child_process.spawn(pythonExe, args, {stdio:['pipe','pipe','pipe']})`，Python 侧用 stdio 做 IPC。**
   来源：https://www.electronjs.org/docs/latest/api/utility-process ｜ https://www.electronjs.org/blog/electron-22-0 ｜ https://nodejs.org/docs/latest/api/child_process.html

2. **IPC 选型：stdio + NDJSON（行分隔 JSON）**，stdout 独占协议、stderr 走日志。
   理由：单子进程、单机、无鉴权需求、免去 socket 文件清理与端口分配；`spawn` 管道天然双向；Node 侧按行切分即可。
   来源：https://nodejs.org/docs/latest/api/child_process.html ｜ https://docs.python.org/3/library/socket.html

3. **大数据量不要走「一个巨大 JSON」**。一天几百条 + 聚类结果，用 NDJSON 逐条/逐簇推流，Node 侧**必须持续消费 stdout**（管道缓冲区有限且平台相关，管道写满会让子进程阻塞），最后再补一条 `{"event":"summary"}`。
   来源：https://nodejs.org/docs/latest/api/child_process.html（"By default, pipes for stdin, stdout, and stderr are established … These pipes have limited (and platform-specific) capacity. If the subprocess writes to stdout in excess of that limit without the output being captured, the subprocess blocks"）

4. **打包产物用 PyInstaller `onedir`（不是 onefile），目录整体放进 .app 的 `Contents/Resources/` 之外的、由 electron-builder 签名的位置**；`uv` 只做**构建期**依赖解析/锁定，**不把 uv 打进 .app**（运行时联网装包不可接受）。
   onefile 每次启动都要解压到 `_MEI_xxxxxx_` 临时目录，且 macOS 下是「父 bootloader + 子进程」两个进程。
   来源：https://pyinstaller.org/en/stable/operating-mode.html ｜ https://pyinstaller.org/en/stable/advanced-topics.html ｜ https://docs.astral.sh/uv/getting-started/installation/

5. **`uv` 的正确职责边界**：`uv pip compile` / `uv export` / `uv sync` 生成锁定依赖集（`uv.lock`、`requirements.txt`、`pylock.toml`），**构建期**用它把依赖装进 PyInstaller 的分析环境；交付态不需要 uv。
   来源：https://docs.astral.sh/uv/pip/compile/ ｜ https://docs.astral.sh/uv/concepts/projects/sync/ ｜ https://docs.astral.sh/uv/concepts/projects/export/

6. **sidecar 二进制必须放在 asar 之外**。Electron 官方 ASAR 文档：archive 只读、不能把 cwd 设进 archive、**只有 `execFile` 支持执行 asar 内的二进制**（`exec`/`spawn` 不行），且 `child_process.execFile`/`execFileSync` 会被「额外解包」到临时文件。
   → 用 electron-builder 的 `extraResources`（macOS 落在 `Contents/Resources/`），运行时用 `process.resourcesPath` 定位。
   来源：https://www.electronjs.org/docs/latest/tutorial/asar-archives ｜ https://www.electron.build/docs/contents/

7. **签名顺序：sidecar 必须在 .app 被签名前就签好**。electron-builder 的构建流水线是 pack → `afterPack` → fuses → **签 .app（含嵌套代码）** → 公证 → 装订 → `afterSign`。签完再改 bundle 会破坏外层签名（Apple TN2206 明确：签名后修改 bundle 不被允许，Gatekeeper 会拒）。所以：**优先让 electron-builder 签（`mac.sign.binaries`），否则在 `afterPack` 里签；实在要用 `afterSign` 则必须随后重签外层 .app**。
   来源：https://www.electron.build/docs/features/build-lifecycle/ ｜ https://developer.apple.com/library/archive/technotes/tn2206/_index.html ｜ https://www.electron.build/docs/features/code-signing/notarization/

8. **公证的硬前提（Apple 原文）**：Developer ID Application 证书 + Hardened Runtime + 安全时间戳 + 不得带 `com.apple.security.get-task-allow` + entitlements 必须是 ASCII 无 BOM 的 XML plist + SDK ≥ 10.9 + **bundle 内所有二进制都要签**。现代 Electron 只需默认的 `com.apple.security.cs.allow-jit`，**不需要** `disable-library-validation`（sidecar 是被 spawn 的独立进程，不是被 load 进来的库；library validation 由加载方进程决定）。
   来源：https://developer.apple.com/documentation/security/resolving-common-notarization-issues ｜ https://www.electron.build/docs/mac/

9. **首屏策略**：窗口先显示、sidecar 后起。`BrowserWindow({show:false})` → `loadFile` → 监听 `ready-to-show` → `show()`；renderer 先渲染骨架，再由主进程推送数据。真正的「零延迟首屏」靠 **Python 上次退出时写一份 JSON 快照到 `app.getPath('userData')`**，Electron 启动即读它，再由 sidecar 推新数据覆盖 —— 这不违反「SQLite 只归 Python 所有」，因为快照是 Python 自己写的。
   来源：https://www.electronjs.org/docs/latest/tutorial/performance ｜ https://www.electronjs.org/docs/latest/tutorial/ipc ｜ https://www.electronjs.org/docs/latest/api/app（`app.getPath`）

10. **electron-builder 版本要钉住**：官网当前文档是 **next (v27，尚未发布）**，**稳定版是 v26**。v27 把 `files`/`extraResources`/`extraFiles` 挪进 `fileOptions`，把 `mac.*` 签名选项挪进 `mac.sign`；有 `electron-builder migrate-schema` 自动改写。→ **本项目起步用 v26（根级 `extraResources`），或明确决定上 v27 并接受 schema 迁移。**
    来源：https://www.electron.build/docs/ ｜ https://www.electron.build/docs/configuration/ ｜ https://www.electron.build/docs/mac/

---

## 2. 通信方案对比表

### 2.1 Electron 侧进程启动方式

| 方式 | 能否跑 Python 可执行文件 | 通信通道 | 标准流 | 生命周期/崩溃事件 | 结论 |
|---|---|---|---|---|---|
| `utilityProcess.fork` | **不能**（`modulePath` 必须是打包应用内的 JS 入口脚本；Electron 22 发行说明：只允许加载受信脚本） | `child.postMessage()` / `process.parentPort.postMessage()`，可用 `MessageChannelMain` 传到 renderer | **只支持 stdout/stderr**（`pipe`/`inherit`/`ignore`）；**stdin 必须是 `ignore`**，配别的直接报错 | `spawn`（成功）、`exit`（code）、`error`（实验性，V8 致命错误）、`kill()` → POSIX 发 SIGTERM；`child.pid` 在 spawn 前为 `undefined`、exit 后变回 `undefined` | 适合「不可信服务 / CPU 密集 / 易崩组件」的 **Node** 工作进程。**Radar 用不上** |
| `child_process.fork` | 不能（只能 fork **Node.js** 模块） | Node IPC 通道（`process.send` / `process.on('message')`） | 同上 | `spawn`/`error`/`exit`/`close`/`disconnect` | 同上 |
| `child_process.spawn` | **能** | 自己定：stdio 管道 / unix socket / TCP | `stdio:['pipe','pipe','pipe']` 全可用，`spawn` 时 `child.stdin/stdout/stderr` 可写可读 | `spawn`（成功）、`error`（启动失败）、`exit(code, signal)`、`close(code, signal)`；`child.killed`、`child.exitCode`、`child.signalCode` | **Radar 选这个** |
| `child_process.execFile` | 能 | 收集 stdout/stderr 后回调 | 同上 | 同上 | 只适合一次性命令；`maxBuffer` 默认 1MB 会截断/杀进程，不适合流式大数据 |

来源：https://www.electronjs.org/docs/latest/api/utility-process ｜ https://www.electronjs.org/blog/electron-22-0 ｜ https://nodejs.org/docs/latest/api/child_process.html

**⚠️ 关键坑**：`app.on('child-process-gone')` 只覆盖 Electron 自己的子进程类型（`Utility`/`Zygote`/`Sandbox helper`/`GPU`/`Pepper Plugin`…），**不含 `child_process.spawn` 出来的普通子进程**。Python sidecar 的异常退出必须自己在 `child.on('exit'|'error'|'close')` 上处理。
来源：https://www.electronjs.org/docs/latest/api/app#event-child-process-gone

### 2.2 Python 侧 IPC server 方案

| 方案 | macOS 坑 | 打包后 socket 放哪 | 大数据量 | 评价 |
|---|---|---|---|---|
| **stdio NDJSON**（每行一个 JSON） | 管道缓冲区有限且平台相关：写侧不消费就会阻塞；stdout 必须独占协议，**所有日志走 stderr**；Python 侧 `print()` 要 `flush=True` 或改写 `sys.stdout` | 不需要路径 | 逐条推送，天然流式 | ✅ **推荐**。零外部状态、无需清理、无端口冲突 |
| **stdio 长度前缀 JSON-RPC** | 要自己实现分帧/粘包；调试难 | 不需要路径 | 可以，但代码量↑ | ⚠️ 只在需要严格 RPC 语义/多路复用时用 |
| **unix domain socket（`socket.AF_UNIX`）** | ① 路径长度上限很短（**确切字节数未从一手文档取到**，见存疑点）；② 崩溃会留下**僵尸 socket 文件**，下次 bind 报 `EADDRINUSE`，必须先 unlink；③ macOS 沙盒/权限下 socket 文件位置受限 | 放 `app.getPath('temp')` 下的短路径，或 `~/Library/Application Support/<app>/` 下的短文件名（不要用 `TMPDIR` 下的长随机名） | 流式，可做多连接 | ⚠️ 若未来要「Python 常驻 + 多客户端」再升级到它 |
| **本地 TCP（127.0.0.1 + 端口 0）** | ① 端口分配与端口回收；② **同机任意进程可连**（单用户机风险可接受，但仍是攻击面）；③ macOS 的 ATS 对 `localhost` 放行（electron-builder 默认写 `NSAllowsLocalNetworking`） | 不需要路径 | 流式 | ⚠️ 次选。比 socket 简单，但比 stdio 多一个攻击面 |

Python 侧 `AF_UNIX` 语义来源：https://docs.python.org/3/library/socket.html#socket.AF_UNIX
Electron 侧 `app.getPath('temp')` / `userData` / `logs` 来源：https://www.electronjs.org/docs/latest/api/app

### 2.3 大数据传输（Radar：一天几百条 + 聚类结果）

- **推荐：NDJSON 流式**，每条记录一行 JSON，Python 逐行 `write` + `flush`，Node 侧 `child.stdout.on('data')` 里做增量行缓冲并**立刻**转发给 renderer（`webContents.send`），不要在主进程攒完再一次性发。
- **不建议**：Electron 直接读 SQLite —— 与「SQLite 只归 Python 所有」冲突，且会引入 SQLite 并发写/锁/文件格式版本耦合。
- **建议的分层**：Electron 只拿「已经算好的视图数据」（已去重、已过滤软广、已排序、已聚类），不碰原始采集与规则。
- **背压**：如果 renderer 消费慢，主进程要做限流（丢弃中间态、只保最新快照），否则管道写满会反向卡住 Python。
- Electron 官方提醒：主进程是「控制塔」，**绝不要用长任务阻塞它**；重活放子进程或 worker。
  来源：https://www.electronjs.org/docs/latest/tutorial/performance

---

## 3. 打包方案对比表（PyInstaller / Nuitka / uv vendor）

| 维度 | **PyInstaller `onedir`** | **PyInstaller `onefile`** | **Nuitka `standalone`** | **Nuitka `onefile`** | **uv vendor + `PYTHONPATH`** |
|---|---|---|---|---|---|
| 产物 | 一个目录：可执行文件 + `_internal/`（含解释器、`.so`、数据） | 单个可执行文件 | 一个目录（同上语义） | 单个可执行文件 | 目录：site-packages + **外部解释器** |
| 启动开销 | 无解压 | **每次启动解压到 `_MEI_xxxxxx_`** 临时目录 | 无解压（编译产物） | 每次启动解压到临时目录 | 无解压，但解释器冷启 |
| macOS 进程数 | **1 个** | **2 个**（父 bootloader + 子进程） | 1 个 | 2 个 | 1 个 |
| `sys.frozen` / `sys._MEIPASS` | `sys.frozen=True`；`sys._MEIPASS` = `_internal` 目录 | `sys._MEIPASS` = 临时目录 | **Nuitka 不设 `sys.frozen`**（用 `__compiled__` 判断） | 同左 | 都不是（普通解释器） |
| 崩溃残留 | 无 | 临时目录**不会**被清理（`kill -9` / 强杀时），磁盘持续增长 | 无 | 同 onefile | 无 |
| 符号链接 | PyInstaller ≥6.0 大量使用符号链接；**生成/复制必须保留符号链接**（macOS 上 `cp -fR` 保留，`cp -fr` **不保留**） | 解包临时目录**必须**在支持符号链接的文件系统上 | 不适用 | 同左 | 不适用 |
| macOS 签名 | PyInstaller 默认 **ad-hoc 重签**所有收集到的二进制；给 `--codesign-identity` 才用真证书，且会连带打开 `--options=runtime`（Hardened Runtime），**要求 Apple 签发的证书**；用自签证书会导致动态库加载失败（Library Validation 报错） | 同左；但 **onefile 的内嵌二进制无法在后处理阶段单独签名** → 必须构建期用真 identity | **未取到** Nuitka 官方对 macOS 产物的签名流程说明（见存疑点） | 同左 | 需要给解释器 + 所有 `.so` 单独签名，最麻烦 |
| 体积 | 目录大（几十 MB 起） | 单文件，但含压缩副本 | 目录大 | 单文件 | 目录 + 解释器 |
| 适合 Radar？ | ✅ **推荐**：目录整体进 .app，签名交给 electron-builder 或 `afterPack` | ❌ 每次启动解包、两个进程、崩溃留垃圾 | ⚠️ 可选，启动/运行时更快，但签名链路不明 | ❌ | ❌ 需要额外塞解释器进 .app，签名与体积都更糟 |

来源：
- PyInstaller 工作模式（onedir/onefile 差异、`_MEI_xxxxxx_`）：https://pyinstaller.org/en/stable/operating-mode.html
- PyInstaller 运行时信息（`sys.frozen` / `sys._MEIPASS` / `__file__`）：https://pyinstaller.org/en/stable/runtime-information.html
- PyInstaller 引导过程（两进程模型、onefile 父进程）：https://pyinstaller.org/en/stable/advanced-topics.html
- PyInstaller macOS 签名与 multi-arch：https://pyinstaller.org/en/stable/feature-notes.html
- PyInstaller 符号链接 / 外部程序启动 / macOS Finder 下 PATH 缩减：https://pyinstaller.org/en/stable/common-issues-and-pitfalls.html
- Nuitka standalone / onefile / app bundle / 建议流程：https://nuitka.net/user-documentation/use-cases.html
- Nuitka 不设 `sys.frozen`：https://nuitka.net/user-documentation/tips.html
- Nuitka 官方性能表（**只有 Python 2.7 的 pystone 数据**：未编译 ×1.000/×1.048、LTO ×3.353/×3.486、PGO ×3.663/×3.718；**没有 Python 3.12 / macOS 的启动耗时数据**）：https://nuitka.net/user-documentation/performance.html

### 3.1 uv 的定位与可分发性

- **锁定依赖集**：`uv pip compile pyproject.toml -o requirements.txt`；`uv export --format requirements.txt|pylock.toml|cyclonedx1.5`；`uv sync` 做「精确同步」（默认删掉 lockfile 外的包，`--inexact` 可保留）。
  来源：https://docs.astral.sh/uv/pip/compile/ ｜ https://docs.astral.sh/uv/concepts/projects/export/ ｜ https://docs.astral.sh/uv/concepts/projects/sync/
- **uv 本身可分发**：官方提供 standalone installer、PyPI wheel、Homebrew、GitHub Releases 二进制。也就是说技术上可以把 `uv` 二进制塞进 .app；但那意味着**运行时还要联网解析/下载依赖**，对「本地离线个人工具」不可接受。
  来源：https://docs.astral.sh/uv/getting-started/installation/
- **结论**：**uv 只在构建期出现**。`uv sync` → 在干净 venv 里装好锁定依赖 → `pyinstaller` 用同一个解释器做分析/打包 → 交付物里只有 PyInstaller 产物。

### 3.2 electron-builder 放置额外二进制的标准做法

- `extraResources`：macOS 落到 `MyApp.app/Contents/Resources/`，Windows/Linux 落到 `resources/`；`from` 相对**项目根**，`to` 相对资源目录。
- `extraFiles`：落到 app 的 content 目录（macOS 是 `Contents/`）。
- 官方明确写：**「Use `extraResources` for native binaries, CLI tools, or data files that need to be accessible at runtime. Access them in your app via `process.resourcesPath`.」**
  来源：https://www.electron.build/docs/contents/
- **版本差异（重要）**：上述文档属于 **v27(next)**；v27 把这些键挪到 `fileOptions` 下（`fileOptions.files` / `fileOptions.extraResources` / `fileOptions.extraFiles`），并保留「写在根级会带警告」的兼容行为；**稳定版 v26 用根级 `extraResources`**。v27 提供 `electron-builder migrate-schema` 自动改写。
  来源：https://www.electron.build/docs/configuration/#fileoptions ｜ https://www.electron.build/docs/ ｜ https://www.electron.build/docs/migration/whats-new-v27

---

## 4. 签名与公证要点

### 4.1 构建流水线（谁先谁后）

```
electron-builder build
├─ 2a beforeBuild        （原生模块重建）
├─ 2b beforePack         （staging 目录为空）
├─ 2c afterExtract       （只有 Electron 本体）
├─ 2d 复制 App 文件 → **复制 extraResources** → 复制 extraFiles
├─ 2e afterPack          （bundle 完整、**未签名**）← 适合在这里签 sidecar
├─ 2f 嵌入 ASAR 完整性摘要（macOS, Electron 41+）/ 应用 fuses
├─ 2g **codesign .app（含嵌套代码）** → 公证 → 装订
│   └─ afterSign         （**只在真的签了名时触发**；签名跳过则不触发）
├─ 2h 各 target（DMG / ZIP / PKG）
└─ 4 publish
```
来源：https://www.electron.build/docs/features/build-lifecycle/

### 4.2 嵌套二进制与 entitlements

- electron-builder 用 `@electron/osx-sign` 签嵌套代码。**嵌套二进制不继承 app 的 entitlements**，而是按 Chromium 的模型给 per-file 默认值：renderer/GPU helper 只有 `allow-jit`；只有 plugin helper 拿到 `allow-unsigned-executable-memory` + `disable-library-validation`；其余（框架、`.node`、`app.asar.unpacked` 里的可执行文件）拿 `default.darwin.plist`（`allow-jit` + 若干 device/personal-information）。
- **「Executable 是被 spawn 的，不是被 load 的 → 不受 library validation 约束、不会被 post-sign 检查标记。」** → 我们的 Python sidecar 正是这种情况，**不需要** `disable-library-validation`。
- 官方还说明 electron-builder **不会重签 `Contents/PlugIns`** → **不要把 sidecar 放 PlugIns**。
- 要显式指定额外二进制：`mac.sign.binaries: ['Contents/MacOS/my-native-helper', ...]`（示例路径是 `Contents/MacOS/` 与 `Contents/Frameworks/`；`Contents/Resources/` 是否自动纳入**未明确**，见存疑点）。
- `mac.sign.entitlementsInherit` 是给**嵌套进程**用的（例如 sidecar 在 `app.asar.unpacked` 里且要 load 第三方库）；默认不要给。
- 来源：https://www.electron.build/docs/mac/ ｜ https://www.electron.build/docs/features/code-signing/notarization/

### 4.3 Apple 侧的硬要求与常见拒签原因（Apple 原文）

| 拒签信息（原文） | 原因 | 修法 |
|---|---|---|
| `The signature of the binary is invalid.` | 没签，或**签完又改了 bundle** | 改 bundle 必须在签名前；用 `codesign -vvv --deep --strict` 自查 |
| `The binary is not signed with a valid Developer ID certificate.` | 用了 Mac App Distribution 证书或自签证书 | 直分发必须 **Developer ID Application**；installer 包用 **Developer ID Installer** |
| `The signature does not include a secure timestamp.` | 自定义签名流程没加时间戳 | `codesign` 加 `--timestamp`（macOS 只接受 `timestamp.apple.com`） |
| `The executable requests the com.apple.security.get-task-allow entitlement.` | 带着调试 entitlement | 发布前去掉（Xcode 导出流程会自动剥） |
| `The binary uses an SDK older than the 10.9 SDK.` | SDK 太老 | 用 ≥10.9 SDK 链接 |
| `The executable does not have the hardened runtime enabled.` | 没开 Hardened Runtime | `mac.sign.hardenedRuntime: true`（或 `--options=runtime`） |
| `Embedded entitlements are invalid: syntax error near line 1` | entitlements 是二进制 plist / 带 BOM / 非 ASCII | `plutil -convert xml1 <file>` + `plutil -lint <file>` |
| `Invalid Info.plist (plist or signature have wrong format)` | **bundle 内有没签名的二进制** | 所有嵌套代码都要签（electron-builder 文档明确让用 `afterSign` 补签额外二进制） |

来源：https://developer.apple.com/documentation/security/resolving-common-notarization-issues ｜ https://developer.apple.com/library/archive/technotes/tn2206/_index.html ｜ https://www.electron.build/docs/features/code-signing/notarization/

**TN2206 补充要点（Apple 原文）**：
- 「嵌套代码」：Mavericks 起的 v2 签名会记录 nested code（framework/dylib/helper tool/app/plug-in）的签名并递归校验 → **内嵌 Python 解释器与 `.so` 扩展模块会被一起校验**。
- 「代码位置放数据文件」是错的：*If a file is in a code location, it must be code, and it must be signed. Do not put data files into code locations. Move these elsewhere, such as `Contents/Resources`.*
- 「签完再改 bundle」不被允许；签名会修改可执行文件本身（插入 `LC_CODE_SIGNATURE` load command）。
- `codesign --deep` **不推荐用于签名**（Apple 明确建议「由内向外分阶段签，Xcode 会自动这么做」），`--deep` 只用于**校验**。
- Gatekeeper 会拒绝「签名没覆盖整个代码」的 app（macOS 10.11+），也会拒绝指向包外的符号链接。

### 4.4 electron-builder 的公证流程要点

- 前置：Apple Developer Program 会员 + **Developer ID Application** 证书 + Hardened Runtime + 正确 entitlements + 凭据。
- 凭据三种：`APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` + `APPLE_TEAM_ID`；**`APPLE_API_KEY`(.p8) + `APPLE_API_KEY_ID` + `APPLE_ISSUER_ID`（推荐给 CI，不过期、免 2FA）**；或 keychain profile。
- `mac.notarize: true` ⇒ 凭据缺失时**在构建开始就失败**；不设则缺凭据只警告并跳过公证。
- `forceCodeSigning: true` ⇒ 签名、公证、`stapler validate`、更新清单签名任一失败就**让构建失败**（发布流水线建议开）。
- 装订（stapling）由 electron-builder 自动完成；验证：
  `spctl --assess --verbose --type exec dist/mac/MyApp.app`、`xcrun stapler validate dist/mac/MyApp.app`、`codesign --verify --deep --strict --verbose=2 dist/mac/MyApp.app`。
- 来源：https://www.electron.build/docs/features/code-signing/notarization ｜ https://www.electron.build/docs/features/code-signing/

---

## 5. 路径解析写法建议（一个函数覆盖开发态与交付态）

**原则**：
1. **绝不用 PATH 找解释器/工具**。Node 的命令查找用 `options.env.PATH`，没有就用 `process.env.PATH`；若显式传 `env` 且其中**没有 PATH**，Unix 下退回到 `/usr/bin:/bin`。而 PyInstaller 文档明确说：**从 Finder 启动的 macOS .app，`PATH` 只有 `/usr/bin:/bin:/usr/sbin:/sbin`** —— `/opt/homebrew/bin` 里的东西全都看不见。
   来源：https://nodejs.org/docs/latest/api/child_process.html ｜ https://pyinstaller.org/en/stable/common-issues-and-pitfalls.html
2. **打包态用 `process.resourcesPath`**，开发态用源码相对路径；用 `app.isPackaged` 切换。
3. **sidecar 绝不能放在 asar 内**（见 §1.6）。

```ts
// sidecar-path.ts —— Electron 主进程专用
import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

export interface SidecarLaunch {
  cmd: string
  args: string[]
  cwd: string
}

/** 开发态：仓库里 python/sidecar/main.py；交付态：Contents/Resources/sidecar/ */
export function resolveSidecar(): SidecarLaunch {
  // ① 显式覆盖（开发调试 / CI / 特殊场景）——优先级最高
  const override = process.env.RADAR_SIDECAR
  if (override && fs.existsSync(override)) {
    return { cmd: override, args: [], cwd: path.dirname(override) }
  }

  if (app.isPackaged) {
    // ② 交付态：extraResources 落在 Contents/Resources/，asar 之外
    const base = path.join(process.resourcesPath, 'sidecar')
    const exe = path.join(base, 'radar-sidecar')        // PyInstaller onedir 的可执行文件
    if (!fs.existsSync(exe)) {
      throw new Error(`sidecar not found: ${exe}`)
    }
    return { cmd: exe, args: [], cwd: base }
  }

  // ③ 开发态：uv run
  //    app.getAppPath() 在开发态指向 Electron 应用源码目录，取其父目录当仓库根
  const repoRoot = path.resolve(app.getAppPath(), '..')
  const pyEntry = path.join(repoRoot, 'python', 'sidecar', 'main.py')
  //    用绝对路径，不要靠 PATH（Homebrew 的 uv 在 /opt/homebrew/bin）
  const uv = process.env.RADAR_UV ?? '/opt/homebrew/bin/uv'
  return {
    cmd: uv,
    args: ['run', '--project', repoRoot, pyEntry],
    cwd: repoRoot,
  }
}
```

配套要点：

- **启动**：`spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'], cwd })`。`cmd` 必须是绝对路径（`spawn` 不走 shell，**不会**有 `PATH` 展开问题，但 `cmd` 本身若是裸名字仍要靠 PATH 查找）。
- **路径 API 速查**（Electron 官方）：
  | 用途 | API |
  |---|---|
  | 打包资源目录 | `process.resourcesPath`（macOS = `MyApp.app/Contents/Resources`） |
  | 是否已打包 | `app.isPackaged` |
  | 应用目录 | `app.getAppPath()` |
  | 临时目录（socket / 运行时文件） | `app.getPath('temp')` |
  | 用户数据目录（SQLite、JSON 快照） | `app.getPath('userData')`（macOS = `~/Library/Application Support/<name>`） |
  | 日志目录 | `app.getPath('logs')` |
  | 用户下载目录等 | `app.getPath('home'|'documents'|'downloads'|'desktop')` |
  来源：https://www.electronjs.org/docs/latest/api/process ｜ https://www.electronjs.org/docs/latest/api/app
- **开发态 `uv run` 与 `pnpm dev` 并行**：建议 `pnpm dev` 只负责拉起 Electron，**sidecar 由 Electron 自己 spawn `uv run`**（不要起两个独立进程再让它们握手 —— 多一次进程间协调、少一份状态一致性）。`uv run` 会自动 lock+sync 项目再执行命令（可用 `--frozen` / `--locked` / `--no-sync` 改变）。
  来源：https://docs.astral.sh/uv/concepts/projects/sync/
- **开发态热重载**：Python 侧改代码要重启 sidecar；Electron 主进程提供「重启 sidecar」命令（`child.kill()` → 重新 `spawn`），别指望 Python 自己热重载。

---

## 6. 已知坑清单

### 进程 / 通信

1. **不能用 `utilityProcess` 跑 Python**：`modulePath` 必须是打包应用内的 JS 入口脚本（Electron 22 发行说明：只允许加载受信脚本）。而且它的 `stdin` 必须 `ignore`，没有 stdio 协议。
   来源：https://www.electronjs.org/blog/electron-22-0 ｜ https://www.electronjs.org/docs/latest/api/utility-process
2. **`utilityProcess.fork` 只能在 `app` 的 `ready` 事件之后调用**。
3. **`app.on('child-process-gone')` 不覆盖 `child_process.spawn` 出来的 Python 进程**，必须自己处理 `exit`/`error`/`close`。
4. **管道写满会阻塞子进程**：Node 文档明说 stdout/stderr 管道容量有限且平台相关；不持续消费 → Python 卡死。Electron 主进程一旦忙起来就可能发生。
5. **stdout 被协议占用**：Python 侧任何 `print()` 都会污染协议流。必须重定向日志到 stderr（或用 `logging.StreamHandler(sys.stderr)`）。
6. **Node 的 `exec`/`execFile` 有 `maxBuffer` 默认 1 MiB**，超了会杀掉子进程并截断输出；别用 `exec` 传大数据。
7. **命令查找靠 PATH**：`spawn` 用 `options.env.PATH`（没有则 `process.env.PATH`）；若显式传 `env` 且其中没有 `PATH`，Unix 退化为 `/usr/bin:/bin`。
8. **从 Finder 启动的 .app，PATH 只有 `/usr/bin:/bin:/usr/sbin:/sbin`** —— Homebrew 的 `uv`/`python` 不可见（PyInstaller 文档原话）。**这同时是 electron-builder 自带 sidecar 的经典翻车点。**
9. **ASAR 限制**：archive 只读；不能把 cwd 设成 archive 内的目录；**只有 `execFile` 能执行 asar 内二进制**（`exec`/`spawn` 不行，因为走 shell 无法可靠替换路径）；`child_process.execFile`/`execFileSync`/`process.dlopen` 会触发「额外解包」到临时文件（有额外开销，还可能触发杀软）。
   来源：https://www.electronjs.org/docs/latest/tutorial/asar-archives

### 打包 / Python 侧

10. **PyInstaller onefile 每次启动解压到 `_MEI_xxxxxx_`**，启动更慢；**崩溃或 `kill -9` 不会清理临时目录**，磁盘持续泄漏（可用 `--runtime-tmpdir` 固定位置 / `PYINSTALLER_STRICT_UNPACK_MODE` 让残留变成致命错误以便 CI 发现）。
11. **macOS 下 onefile 是两个进程**（父 bootloader 负责解压与清理，子进程跑 Python）——进程数翻倍，Electron 侧的进程指标会多出一条。
12. **`sys._MEIPASS` 在 onedir 是 `_internal` 目录，在 onefile 是临时目录**；`__file__` 在 4.3 起是 bundle 内的绝对路径，优先用 `__file__` 而不是 `sys._MEIPASS`。
13. **PyInstaller ≥ 6.0 大量使用符号链接**：onefile 的解包目录**必须**在支持符号链接的文件系统上；onedir 只能生成在支持符号链接的 FS 上，且复制时必须保留符号链接 —— macOS 上 `cp -fR` 保留，`cp -fr` **不保留**（PyInstaller 文档点名了这个坑）。zip 默认也不保留（要 `--symlinks`/`-y`）。
14. **PyInstaller 处理二进制会破坏其签名**（改库搜索路径），所以它默认 **ad-hoc 重签**；给 `--codesign-identity` 才会用真证书，并自动打开 `--options=runtime`（Hardened Runtime）→ **必须是 Apple 签发的证书**；自签证书会让动态库加载失败（Library Validation 报错）。
15. **PyInstaller onefile 的内嵌二进制无法在后处理阶段单独签名** → 若要真签名，必须在构建期指定 identity。
16. **PyInstaller 的 `BUNDLE()` 是给 GUI app 用的 .app 壳**；sidecar 用普通 onedir 目录即可，别在 Electron 的 .app 里再套一个 .app（签名层级更复杂）。
17. **PyInstaller 冻结应用的库搜索路径会传染给子进程**：macOS 上它会重写收集到的二进制的库路径；某些 runtime hook 会改 `DYLD_LIBRARY_PATH`。若 sidecar 要 launch 外部程序，需按文档做环境消毒。
18. **Nuitka 不设 `sys.frozen`**（用 `__compiled__` 判断），所以 PyInstaller 风格的 `if getattr(sys,'frozen',False)` 判断在 Nuitka 下失效。
19. **Nuitka 官方自己建议**：先 `--mode=standalone` 跑通再切 `--mode=onefile`，「数据文件缺失之类的问题在 standalone 下好查得多」。

### 分发 / 签名 / 公证

20. **electron-builder 版本**：官网默认文档是 **next (v27，未发布)**，稳定版 **v26**；v27 改 schema（`fileOptions.*`、`mac.sign.*`）。`extraResources` 在 v26 是根级键，在 v27 在 `fileOptions` 下。
21. **`afterSign` 只在真的执行了签名时才触发**（没证书就不触发），别把关键逻辑放那儿。
22. **签名后再改 bundle 会破坏外层签名**（Apple TN2206 明确不允许）。所以补签 sidecar 应该放在 **`afterPack`**（未签名阶段）或让 electron-builder 签，而不是 `afterSign`。
23. **嵌套二进制不继承 app entitlements**；`disable-library-validation` 只在「load 别的 Team ID 签的库」时才需要。sidecar 是 spawn 出来的，**不需要**。
24. **`Contents/PlugIns` 里的东西 electron-builder 不会重签**。
25. **公证必须有安全时间戳**；自签证书公证必被拒（`not signed with a valid Developer ID certificate`）。
26. **PyInstaller 自签证书会让 `.so` 加载失败**：`code signature in (...) not valid for use in process using Library Validation: mapped file has no Team ID and is not a platform binary`。
27. **Apple 建议不要用 `codesign --deep` 签名**（只用于校验）；要「由内向外」分阶段签。
28. **Gatekeeper 会拒绝指向包外的符号链接**（macOS 10.11+）→ PyInstaller onedir 目录进 .app 后如果被解压/重打包破坏符号链接会出事。
29. **`.app` 里放了可执行文件，但 Electron 只把它当「资源」**：Apple 说「代码位置放数据文件」是错的；反过来把 Mach-O 放 `Contents/Resources` 是否会被当作 nested code 校验，需实测（见存疑点）。

### 性能 / 首屏

30. **Electron 官方文档没有给冷启动耗时/内存基线数字**（见存疑点）。可用的官方「手段」只有性能清单（延迟加载模块、别阻塞主进程、打包成单文件、`Menu.setApplicationMenu(null)`）和测量 API。
31. **`app.getAppMetrics()` 看不到 `child_process.spawn` 的 Python 进程**（`ProcessMetric.type` 只枚举 Electron 自己的进程类型：`Browser`/`Tab`/`Utility`/`Zygote`/`Sandbox helper`/`GPU`/…）。测 Python 常驻内存要另想办法（Python 进程自报 RSS，或像 Vitals 那样走 `proc_pidinfo`）。
32. **macOS 上 Chromium 不提供 `residentSet`**，`process.getProcessMemoryInfo()` 文档明确说 **private memory 更能代表实际占用**。
33. **Electron 主进程是「控制塔」，长任务一律不能放主线程**（官方原文：Under no circumstances should you block this process and the UI thread）。

---

## 7. 存疑点（取不到的直说）

| # | 存疑点 | 现状 | 建议动作 |
|---|---|---|---|
| 1 | **Electron 冷启动典型耗时与内存基线** | **未取到**。Electron 官方文档（Performance / Process Model）只给方法论不给数字；`electron/benchmark` 仓库地址在本次取证时 404（`github.com/electron/benchmark` 与 raw README 均 404） | 本机实测：`process.hrtime` 打点（`app.whenReady` → `ready-to-show` → `show()`），配合 `app.getAppMetrics()` 取 `memory.private`；**本文不引用任何未经一手来源确认的毫秒数/兆字节数** |
| 2 | **Python sidecar 常驻内存基线** | **未取到**。CPython/PyInstaller/Nuitka 官方文档均未给常驻 RSS 基线 | 本机实测：sidecar 启动后自报 `resource.getrusage(RUSAGE_SELF).ru_maxrss` / `psutil` 视需求，或沿用本仓库 Vitals 项目的 `proc_pidinfo` 探针 |
| 3 | **macOS `AF_UNIX` socket 路径长度上限的确切字节数** | **未取到一手来源**。Python `socket` 文档只说明 AF_UNIX 地址是字符串，未给长度限制；Apple 的 `sockaddr_un` 长度未在本次抓取的文档中出现 | 若真要用 socket：把路径放在 `app.getPath('temp')` 下并**用短名**（如 `s`），实测 `bind()` 是否 `EINVAL`；或直接沿用 stdio 方案规避 |
| 4 | **`utilityProcess` 能否运行任意可执行文件（而非 JS 脚本）** | **未取到明确说明**。文档只描述 `modulePath` 为脚本 | 按「不能」设计（这也是官方把它定位为 `child_process.fork` 替代品的逻辑）。若要验证，可看 Electron 源码 `docs/api/utility-process.md` 与 PR #36089 |
| 5 | **Nuitka 在 macOS 上 standalone 产物的代码签名流程**（是否自动签名、是否需逐个 `codesign`、与 Hardened Runtime 的关系） | **未取到**。Nuitka 的 user-manual 页面本次抓取失败（HTML 无法转换），其 use-cases / tips / performance 三页均无签名章节 | 若考虑 Nuitka，**先单独做一次签名验证原型**再决策；否则按 §3 推荐 PyInstaller onedir |
| 6 | **`uv pip install --target`（vendor 模式）是否存在** | **本次未从 uv 官方页确认**。已确认的是 `uv pip compile` / `uv export` / `uv sync`；pip 兼容层页面未逐页核对 | §3 已给出「uv 只做构建期」的方案，**不依赖** `--target`；若将来要 vendor 模式，先核对 https://docs.astral.sh/uv/pip/compatibility/ |
| 7 | **`extraResources` 里的可执行文件（`Contents/Resources/sidecar/...`）是否被 electron-builder 自动纳入嵌套代码签名** | **未取到明确说明**。`mac.sign.binaries` 的官方示例只列了 `Contents/MacOS/...` 与 `Contents/Frameworks/...`；`/docs/mac` 提到 post-sign 检查会扫 `app.asar.unpacked` 与 `Contents/PlugIns`，但**没提 `Contents/Resources`** | 实测：在 `afterPack` 里对 sidecar 跑一次 `codesign -s "$IDENTITY" --options=runtime --timestamp <path>`；打包后用 `codesign --verify --deep --strict` + `spctl --assess --type exec` 验证；必要时用 `mac.sign.binaries` 显式列出 |
| 8 | **在 `afterSign` 里补签 sidecar 后，是否必须重签外层 .app** | **文档口径不一致**：Apple TN2206 说「签完再改 bundle 不被允许 / 会破坏签名」；electron-builder 的公证页却说「需要签额外二进制时用自定义 `afterSign` 钩子」。**未取到把两者调和的权威说明** | 保守做法：把补签放在 **`afterPack`**（未签名阶段）而不是 `afterSign`；若必须用 `afterSign`，补签后**再签一次外层 .app**（`codesign --force --deep --options=runtime --sign "$IDENTITY" MyApp.app`）再公证 |
| 9 | **electron-builder `mac.sign.binaries` 的路径基准**（相对 bundle 根 `Contents/…`？相对 `Contents/`？） | 官方示例写作 `Contents/MacOS/my-native-helper`，看起来是**相对 bundle 根**，但文档未用一句话明说 | 以实际构建日志 + `codesign -dv` 复核为准 |
| 10 | **Electron 当前稳定版本号** | 官方 IPC 文档的示例引用 `electron v45.3.3`（docs/fiddles/ipc/pattern-1），博客列表里 2026 年最新为 Electron 45；**本文不宣称某个「最新版」**，只引用文档里出现的具体版本 | 落地时用 `pnpm info electron versions` 自行确认，并阅读 https://www.electronjs.org/docs/latest/breaking-changes |
| 11 | **Tauri（WKWebView）的可比数字** | 只取到定性结论：**「用系统 webview 所以二进制非常小」「不携带运行时，因为最终二进制由 Rust 编译」**；App Size 页只给 Cargo profile 调优项，**没有任何 MB 数字** | 对比只作参考：Tauri 的核心优势是「不自带 Chromium」，而 Radar 的业务在 Python，**这不改变选型** |

---

## 附：本次引用的全部一手来源

**Electron 官方文档**
- utilityProcess：https://www.electronjs.org/docs/latest/api/utility-process
- app（含 `app.isPackaged`、`app.getPath`、`child-process-gone`）：https://www.electronjs.org/docs/latest/api/app
- process（含 `process.resourcesPath`、`process.parentPort`、`getProcessMemoryInfo`）：https://www.electronjs.org/docs/latest/api/process
- Process Model：https://www.electronjs.org/docs/latest/tutorial/process-model
- Performance：https://www.electronjs.org/docs/latest/tutorial/performance
- IPC：https://www.electronjs.org/docs/latest/tutorial/ipc
- MessagePorts：https://www.electronjs.org/docs/latest/tutorial/message-ports
- ASAR Archives：https://www.electronjs.org/docs/latest/tutorial/asar-archives
- ProcessMetric：https://www.electronjs.org/docs/latest/api/structures/process-metric
- Electron 22.0.0（UtilityProcess 引入）：https://www.electronjs.org/blog/electron-22-0

**Node.js 官方文档**
- child_process：https://nodejs.org/docs/latest/api/child_process.html

**electron-builder 官方文档（v27 = next；稳定版 v26）**
- Overview（版本状态）：https://www.electron.build/docs/
- Configuration（`fileOptions`、`forceCodeSigning`）：https://www.electron.build/docs/configuration/
- App Contents（`extraResources` / `extraFiles` / ASAR）：https://www.electron.build/docs/contents/
- File Patterns：https://www.electron.build/docs/file-patterns/
- Build Lifecycle（钩子顺序）：https://www.electron.build/docs/features/build-lifecycle/
- macOS：https://www.electron.build/docs/mac/
- Targets：https://www.electron.build/docs/targets/
- Code Signing：https://www.electron.build/docs/features/code-signing/
- macOS Notarization：https://www.electron.build/docs/features/code-signing/notarization/
- What's New in v27：https://www.electron.build/docs/migration/whats-new-v27

**PyInstaller 官方文档（6.22.3）**
- What PyInstaller Does：https://pyinstaller.org/en/stable/operating-mode.html
- Run-time Information：https://pyinstaller.org/en/stable/runtime-information.html
- Spec Files：https://pyinstaller.org/en/stable/spec-files.html
- Feature Notes（macOS 签名 / multi-arch）：https://pyinstaller.org/en/stable/feature-notes.html
- Advanced Topics（引导流程 / onefile 安全校验）：https://pyinstaller.org/en/stable/advanced-topics.html
- Common Issues and Pitfalls（符号链接 / Finder 下 PATH）：https://pyinstaller.org/en/stable/common-issues-and-pitfalls.html

**Nuitka 官方站点**
- 主页：https://nuitka.net/
- Use Cases（standalone / onefile / app bundle）：https://nuitka.net/user-documentation/use-cases.html
- Tips（不设 `sys.frozen`）：https://nuitka.net/user-documentation/tips.html
- Performance（仅 Python 2.7 pystone 表）：https://nuitka.net/user-documentation/performance.html

**uv 官方文档**
- Installation：https://docs.astral.sh/uv/getting-started/installation/
- Locking requirements（`uv pip compile`）：https://docs.astral.sh/uv/pip/compile/
- Locking and syncing（`uv sync`）：https://docs.astral.sh/uv/concepts/projects/sync/
- Exporting a lockfile（`uv export`）：https://docs.astral.sh/uv/concepts/projects/export/
- Using environments：https://docs.astral.sh/uv/pip/environments/
- Using uv in Docker（`--compile-bytecode` / 可复现构建）：https://docs.astral.sh/uv/guides/integration/docker/

**Apple Developer Documentation**
- Notarizing macOS software before distribution：https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution
- Resolving common notarization issues：https://developer.apple.com/documentation/security/resolving-common-notarization-issues
- TN2206 macOS Code Signing In Depth：https://developer.apple.com/library/archive/technotes/tn2206/_index.html

**Python 官方文档**
- socket（含 `AF_UNIX`）：https://docs.python.org/3/library/socket.html

**Tauri 官方文档（仅参考）**
- Architecture：https://v2.tauri.app/concept/architecture/
- App Size：https://v2.tauri.app/concept/size/
