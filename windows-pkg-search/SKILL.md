---
name: windows-pkg-search
description: >
  Windows 软件包搜索与下载助手。当用户说"我想装XX"、"搜索一下XX软件"、"有没有XX的下载链接"、"帮我找XX工具"、"查一下XX"等需要查找或安装 Windows 软件时使用。也适用于用户提到"winget"、"choco"、"chocolatey"需要搜索软件包。任何涉及 Windows 软件查找、安装、下载的场景都应触发此 skill。
---

# Windows 软件包搜索与下载

## 流程总览

```
用户提软件名 → 前置检查工具链 → winget list 查本地
  → 已安装：列出 → 结束
  → 未安装：winget search → winget show → 展示信息 → 询问下载
  → winget 搜不到：gh 兜底 → choco 兜底 → 告知未找到
```

## 第一步：前置检查

执行以下命令，确认工具链可用性：

```powershell
winget --version
```

如果 `winget --version` 失败（命令不存在），直接告诉用户"未安装 winget，Windows 包管理器可用 Microsoft Store 安装或通过 https://github.com/microsoft/winget-cli 获取"，不继续后续步骤。

也检查兜底工具，记录结果备用：

```powershell
curl --version
gh --version
choco --version
```

## 第二步：检查本地是否已安装

用用户提到的软件名，在本地已安装列表中匹配：

```powershell
winget list
```

从输出中匹配用户提到的软件名（不区分大小写，支持部分匹配）。将匹配到的已安装软件以横向表格列出：

| 软件名 | ID | 版本 |
|--------|-----|------|

如果本地已安装且版本信息明确，询问是否需要升级（`winget upgrade`）。

> **关键规则**：执行 `winget list` 后，必须先解析输出，将用户提到的软件分为「已安装」和「未安装」两组。「已安装」组直接展示表格并跳过后续搜索；「未安装」组才进入第三步。禁止在未解析 list 结果前并行发起 search。

## 第三步：winget 搜索

如果本地未安装，则用 winget 搜索：

> **并发控制**：当未安装软件超过 5 个时，分批搜索，每批 4-5 个并发。禁止一次对所有未安装软件同时发起 search。

**关键规则**：用户给的软件名中如果有空格，去掉空格连在一起后再搜索。

```powershell
winget search "<去空格后的软件名>" --count 3
```

从搜索结果中取前 3 个匹配项。判断规则：
- 如果第 1 个结果明显是目标软件（名称高度匹配），只取它
- 如果前 3 个都可能（名称相似、有歧义），保留全部 3 个

## 第四步：winget show 查看详情

对上一步筛选出的每个候选包分别执行：

```powershell
winget show "<软件ID>"
```

从输出中提取以下字段：
- **ID**：包的唯一标识
- **版本**：Version
- **描述**：Description / 描述
- **主页**：Publisher URL / Homepage
- **安装程序 URL**：Installer URL（如果有的话直接是下载链接）

用户可能同时搜多个软件，所有结果汇总到**同一张横向表格**中，一行一个软件：

| 软件名 | ID | 版本 | 描述 | 主页 | 安装程序 URL |
|--------|-----|------|------|------|-------------|

其中「软件名」列填用户原始提到的名称，方便识别。

注释：winget show 的输出中可能出现 `Installer Url:` 字段，这就是直接下载链接。如果某个包没有显示此字段，则安装程序 URL 列注明"无（仅可通过 winget install 安装）"。

## 第五步：确认并下载

展示完信息后，直接问用户：

> 是否需要下载？回复"是"或"下载"确认。

用户确认后，**不要在当前窗口下载**（会阻塞对话）。改用 `Start-Process` 打开新 PowerShell 窗口独立执行下载，当前对话立即返回结果。
```powershell
# 1. 先检查文件是否已存在
Test-Path "$env:USERPROFILE\Downloads\<文件名>"

# 2. 若已存在，告知用户，询问是否覆盖

# 3. 若不存在，新开窗口下载
Start-Process powershell -ArgumentList '-NoExit', '-Command', "`$out = '$env:USERPROFILE\Downloads\<文件名>'; `$url = '<URL>'; Write-Host 'Downloading...'; curl.exe -L -o `$out `$url; if (`$LASTEXITCODE -eq 0) { Write-Host 'Done:' `$out } else { Write-Host 'Failed' }; Read-Host 'Press Enter'"
```

**关键技巧**：外层双引号字符串中 `$env:USERPROFILE` 被当前 shell 展开成实际路径（如 `C:\Users\xxx`），内层的 `` `$out ``、`` `$url `` 用反引号转义，留给新窗口的 PowerShell 处理。路径全程单引号包裹，不存在嵌套引号问题。

执行后立即告知用户："已在新窗口中开始下载，请查看弹出的 PowerShell 窗口。"

## 第六步（兜底）：GitHub 搜索

当 winget search 返回空或完全搜不到时，检查是否有 `gh`（第一步已记录）：

如果 `gh` 可用：

```powershell
gh search repos "<去空格后的软件名>" --stars ">=500" --limit 10
```

取前 3 个仓库，对每个仓库执行：

```powershell
gh release view --repo <owner/repo>
```

从每个 release 的输出中识别安装包文件。识别标准：文件名以 `.exe`、`.msi`、`.zip`、`.7z`、`.msix` 结尾的 asset。

**重要**：如果某个仓库的最新 release 中有多个安装包，全部列出，不要遗漏。

如果仓库没有 release（输出中包含 "no release found"），跳过该仓库。

最终以与第四步相同的横向表格形式展示：

| 软件名 | 仓库 | 版本 | 描述 | 主页 | 安装程序 URL |
|--------|------|------|------|------|-------------|

其中：
- **描述**：仓库 description
- **主页**：`https://github.com/<owner/repo>`
- **安装程序 URL**：release assets 中识别出的所有安装包下载链接，多个用 `<br>` 或换行分隔

展示完后回到第五步（确认下载）。GitHub release 的 asset 下载 URL 可以直接用 curl/Invoke-WebRequest 下载。

## 第七步（兜底）：Chocolatey 搜索

当 gh 也不可用或 github release 也搜不到时，检查是否有 `choco`：

```powershell
choco search "<去空格后的软件名>" --limit 10
```

对匹配的前 3 个包：

```powershell
choco info "<包名>"
```

choco 的输出中：
- **Title** 为包名
- **Summary** 为描述
- **Software Site** 为官网
- choco 不提供直接下载链接（它是包管理器，安装通过 `choco install` 完成）

以横向表格展示（与第四步格式对齐）：

| 软件名 | 包名 | 版本 | 描述 | 官网 |
|--------|------|------|------|------|

告知用户 choco 不支持直接下载，只能通过 `choco install <包名>` 安装，询问是否需要执行安装。

## 第八步：完全未找到

走完以上所有步骤仍未找到时，告知用户：

> 未找到「<原始软件名>」的匹配结果。winget / GitHub / Chocolatey 均已搜索过。你可以提供更准确的全名或其他关键词试试。

## 核心原则

- **每一步结果都要用表格展示**，整洁易读
- **软件名去空格**：搜索用名 = 用户原始名称中所有空格去掉后的连续字符串
- **兜底链**：winget → gh → choco → 告知未找到，按顺序执行，不跳过
- **多候选时不遗漏**：GitHub release 中可能有多个安装包文件，全部列出
- **下载前检查**：文件已存在则提示而非覆盖
- **下载工具**：curl 优先，Invoke-WebRequest 兜底
