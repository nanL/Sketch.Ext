# Localization Helper 维护说明

本文件适用于本插件目录，统一记录安装使用、实现约束、验证和发布信息。

## 安装与使用

1. 双击 `Localization-Helper.sketchplugin` 安装。
2. 在 Sketch 插件菜单中打开「Localization Helper → 设置」，填写百度通用文本翻译 API 的 AppID 和 Secret。
3. 选择一个或多个文本图层或编组，执行「to 简体」「to 繁体」或「to 英文」。也可打开「工具栏」，通过浮动面板转换当前选择。

源语种自动识别；非空文本的收集和回填规则见下文。选中文本通过 HTTPS 发送至百度，调用额度及费用以对应百度账号为准。凭证仅保存在本机 Sketch 插件设置中，Secret 输入框使用遮罩；设置存储本身不是加密保险库。

## 文件与入口

- `Contents/Sketch/manifest.json`：插件标识、版本、菜单、命令 handler 和在线更新地址；标识为 `im.nan.Sketch.LocalizationHelper`。
- `Contents/Sketch/commands.js`：选择收集、翻译请求、回填、凭证设置和浮动工具栏。
- `Contents/Sketch/md5.js`：本地 UTF-8 MD5 实现，用于百度签名，无第三方依赖。
- `tests/commands.test.js`：通过 Node VM 模拟 Sketch/Cocoa 环境的回归测试。
- `appcast.xml`：Sketch 在线更新元数据。
- 仓库根目录 `update_plugin_release.py`：版本递增和 ZIP 打包脚本，作用于所有顶层 `.sketchplugin` 目录。

菜单 handler 为 `toSimplified`、`toTraditional`、`toEnglish`、`toolbar`、`settings`，均由 `commands.js` 提供。修改菜单时同步检查 manifest、测试和本文的使用说明。

## 翻译行为约束

- 三个目标语种分别为 `zh`、`cht`、`en`，源语种固定为 `auto`。
- 处理直接选中的非空 `Text`，并递归遍历选中的 `Group`；按图层 ID 去重，保留遍历顺序。当前只对 `Group` 递归，不应描述为支持任意容器。
- 所有原文以固定分隔符 `␞`（U+241E）拼接，只发起一次请求；不按长度分批，不逐层重试，不特殊拆分单行或多行。
- 将百度 `trans_result[].dst` 以换行连接，再按同一分隔符拆分。只有分段数量与任务数一致，且所有目标图层仍存在、文本仍等于请求前快照时，才开始回填。
- 请求失败、返回格式无效、分段数量不符、原文变更或图层删除时，不进行翻译回填。分段不符的弹窗包含本次完整原文和译文，排查时注意文本隐私。
- 使用公共接口 `layer.text` 写入，每层写入一次；不要改用原生文本 API 或主动统一混合样式。样式保留与换行效果需在 Sketch 中实测。
- 原文本身含分隔符、百度改写分隔符或调整换行，均可能影响结果；数量检查不能证明每段语义对应正确。不要擅自替换此批处理协议。
- 回填前校验不等于事务：当前代码不提供写入途中异常的回滚。

## 请求与生命周期

- 百度通用翻译端点：`https://fanyi-api.baidu.com/api/trans/vip/translate`；签名为 `md5(appid + q + salt + secret)`。
- 使用 `NSTask` 启动 `/usr/bin/curl`，POST 表单通过标准输入传入；不要将正文或凭证放入命令行参数、日志或源码。
- curl 超时为 30 秒；通过 Sketch 的 `setTimeout` 每 100 毫秒轮询子进程，避免以 JavaScript 回调直接桥接原生 Objective-C block。
- 每次请求创建独立 UUID 临时目录保存响应；完成、异常或取消时清理定时器、子进程、文件句柄与临时目录。修改异步流程时保留幂等清理和单次回调约束。
- `sketch/async` fiber 维持请求生命周期，并在清理时取消未完成请求。
- 凭证通过 `sketch/settings` 的 `baiduCredentials` 键保存，字段为 `appid`、`secret`；Secret 输入使用 `NSSecureTextField`，但设置存储不是加密保险库。不要提交或输出真实凭证。

## 浮动工具栏

- 使用原生 `NSPanel`，提供三个翻译按钮；每次点击读取当前文档与当前选择。
- 通过主线程 `threadDictionary` 的 `im.nan.Sketch.LocalizationHelper.toolbar` 键保持单例；重复打开应显示已有面板。
- 工具栏拥有独立 fiber；关闭时移除字典引用并关闭面板，之后应能重新打开。修改时检查按钮回调、单例及关闭后的资源释放。

## 验证

在仓库根目录运行：

```sh
node --check Localization-Helper.sketchplugin/Contents/Sketch/commands.js
node Localization-Helper.sketchplugin/tests/commands.test.js
```

现有测试覆盖 MD5、manifest 入口、三种目标语种、单次批量请求、编组与重叠选择去重、网络/API/JSON 错误、分隔符异常、请求期间文本修改、临时目录清理，以及工具栏按钮、单例和重新打开。

`tests` 保留在源码目录，不包含在发布 ZIP 中。

这些测试使用模拟对象，不验证真实百度请求、Sketch 原生桥接、实际面板布局、真实图层删除、混合样式或撤销行为。涉及上述行为时，在 Sketch 中验证并明确记录实际执行范围；不要把模拟测试通过写成端到端验证通过。

## 发布

- 当前核对基线：manifest 和 appcast 均为 `1.0.12`；后续以实际文件为准，不需要随每次发版维护这里的基线。
- manifest 的 appcast 和 appcast 的 ZIP 地址均指向 GitHub `nanL/Sketch.Ext` 的 `main` 分支；发布时版本、appcast 与根目录 ZIP 必须一致。
- Sketch 通过 manifest 的 `appcast` 地址检查更新，并下载根目录的 `Localization-Helper.sketchplugin.zip`。首次启用在线更新需安装包含此配置的版本；发布新版本时，将更新后的 manifest、appcast 和重新生成的 ZIP 一并推送到 `main`。
- 发布脚本遇到已有同名 ZIP 会跳过；缺少 ZIP 时会自动递增 patch 版本、更新 manifest/appcast 并打包。它会遍历所有插件，运行前先核对其他插件 ZIP 状态。
- 不要为文档修改运行发布脚本，也不要未经要求删除 ZIP、递增版本、同步本机安装目录或推送发布。
- ZIP 保留 `.sketchplugin` 顶层目录；脚本排除任意层级的 `tests`、`__MACOSX` 目录，以及 `README.md`、`AGENTS.md`、`.DS_Store`、`Thumbs.db` 和 `._*` 文件。发布后检查实际 ZIP 内容。
- 工作区可能已有源码、manifest、发布脚本或 ZIP 的未提交变动；先检查 `git status`，保留用户已有工作。
