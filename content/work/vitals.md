---
slug: vitals
kind: project
locale: zh
title: Vitals
titleEn: Vitals
summary: 一个常驻本机的 macOS 监控工具：菜单栏读数 + 可缩放的悬浮面板，显示 CPU 占用、核心温度、内存与电源状态。温度用无特权方式读取；读不到就降级成热压力四档，并在界面上写明原因。
summaryEn: A macOS monitor that lives on one machine — a menu-bar readout and a resizable floating panel showing CPU load, core temperature, memory and power state. Temperature is read without any privileged component; when it cannot be read, it degrades to the four thermal-pressure levels and says why.
group: ship
order: 1
date: 2026-11-14
updated: 2026-11-22
status: 已交付
statusEn: Shipped
tech:
  - Swift
  - SwiftUI
  - Swift Package Manager
  - IOKit
  - libSMC
repo: https://github.com/Dachui61/Vitals
featured: true
demo: vitals-demo
demoCaption: 真实运行中的悬浮窗（L3 档位，1 秒刷新一次）
resumeLine: 常驻本机的 macOS 监控：CPU 温度用无特权方式读取，读不到就降级并写明原因。
resumeLineEn: A macOS monitor that lives on one machine — CPU temperature read without privileges, degraded and explained when it cannot be read.
---

## 它是什么

一个菜单栏图标 + 一个可拖拽的置顶悬浮窗。菜单栏给一行迷你读数（`CPU% · 温度 · 内存%`），点开是完整面板。窗口可以缩放，内容按尺寸分级增减——L0 只有一行，L5 显示全部。

![Vitals 悬浮窗的响应式分级：从 L0 的一行菜单栏读数，到 L5 的三种核型分色曲线](/images/vitals/vitals-responsive-levels.png)

## 为什么值得单独讲

**温度是这个项目里最难的部分，而且难点不在代码。**

macOS 27 上没有给第三方应用任何公开的 CPU 温度 API。经典 SMC 读键路径已经死了；`powermetrics` 在 macOS 27 里**根本没有 smc sampler**——这不是权限问题，是那段代码不存在；IOReportHub 里没有 CPU die 温度通道，原始缓冲区还被 `KERN_NO_SPACE` 挡住。

最后能用的是 `/usr/lib/libSMC.dylib`——macOS 27 为经典 SMC 路径准备的继任者，能在**无特权**下读到数值温度。

但它读出来的键语义是推断出来的：Apple 没有公开 die 温度和 SMC 键的对照表。所以界面必须标 **近似值**，并显示实际读到的传感器名，比如 `SMC Tp0j · 近似值`。

这条不是权宜之计，是长期事实。写死在 [ADR 0001](/work/temperature-backend-and-degradation/) 里。

## 三条不肯让步的线

**读不到就是读不到。** 降级链是 `libSMC` → `ProcessInfo.thermalState` 四档 → **不可用（原因）**。任何一级都不许编造数字：不显示 0，不用热压力等级反推温度，不用第三方二进制。

**不引入特权组件。** 安装不需要管理员密码。这条决定了整个架构——因为 `powermetrics` 路线被否掉了，所以所有指标都得找到无特权的路。[ADR 0002](/work/why-no-privileged-component/)

**降级状态写在界面上。** 面板底部常驻一行：`测温后端 正常 / 温度告警 / 温度不可用 / 传感器识别中`。用户永远知道现在读到的数是什么来源的。

## 界面里的词都是咬死的

`核心温度`、`热压力等级`、`SoC 热点`、`已用内存`、`核型`、`采样间隔`、`滚动窗口`、`降级链`、`惰性探测`、`窗口分档`——每个词都有定义，每个词都有"不要写成什么"的清单。见 [GLOSSARY](/work/vitals/#glossary)。

## 交付状态

26 张票全部结清。产出 `Vitals.app`（`LSUIElement=true`，只进菜单栏不进 Dock）和可双击安装的 `Vitals.pkg`。

构建环境只有 Xcode Command Line Tools（没有完整 Xcode），`.app` 是手工组装的：编译 → 拷贝可执行文件 → 写 `Info.plist` → ad-hoc 签名。工具链里没有 XCTest 也没有 swift-testing，所以测试是一个零依赖的可执行目标，退出码即成败。

## 工程结构

```
Sources/
  VitalsCore/    采样与数据模型（不依赖任何 UI 框架）
  VitalsUI/      SwiftUI 视图层（只依赖 VitalsCore）
  VitalsApp/     App 壳：菜单栏图标 + 无边框悬浮窗
Tests/           零依赖断言运行器
```

`VitalsCore` 不 import 任何 UI 框架——这是为了能直接用 `swiftc` 单独编译它做测试。
