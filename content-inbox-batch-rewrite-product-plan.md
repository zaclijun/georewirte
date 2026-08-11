# 素材箱 + 批量改写 产品方案

> **文档版本**：v1.0（方案论证，不含代码）
> **生成日期**：2026-06-27
> **状态**：方案论证阶段，未启动开发
> **范围**：素材箱 Content Inbox + 批量改写 Batch Content Package
> **基线**：不推翻现有架构，不改后端 API / 数据库 / LLMService / RewriteService / 多平台任务生成逻辑

---

## 0. 方案摘要（结论先行）

**核心结论**：

1. 批量改写**不应**塞进 `NewRewritePage`。`NewRewritePage` 是「单母稿 → 多平台发稿包」的单篇工作台，其信息架构、状态模型、配置面板都为单篇优化；强行承载批量会破坏其心智模型与交互节奏。
2. 应**先做素材箱**，再做批量改写。素材箱是批量的「上游原料仓」，没有它，批量改写就没有可持久化、可复核、可复用的素材源，会退化为「一次性粘贴 N 段文本」的临时操作。
3. P0 **不新增后端 API、不新增数据库表**。素材以 localStorage 持久化，解析全部在前端完成；批量生成完全复用现有 `POST /api/projects/:projectId/tasks` 单任务接口，通过「素材 × 平台」双重循环在前端编排。
4. P0 输入来源只做**粘贴正文 + Markdown/TXT 粘贴/拖入**。Word / PDF / HTML / 网页链接 / 公众号链接全部后移到 P1/P2。
5. 最小可执行版本（MVP）：素材箱（粘贴入箱 + 列表管理）→ 批量生成抽屉（选 N 素材 × M 平台）→ 批量结果矩阵（复用 `MultiPlatformResultPage` 模式，扩展为矩阵视图）。

---

## 1. 为什么批量改写不应该直接塞进 NewRewritePage

### 1.1 NewRewritePage 的现有心智模型

`NewRewritePage` 的核心数据流是：

```
1 个标题 + 1 段原文 + 1 套配置（视角/来源策略/长度/Schema/事实）
  → N 个平台 → N 个独立 task → 多平台结果页
```

它的信息架构是为「**单母稿**」服务的：
- 左侧：一个标题输入框 + 一个原文 textarea（`min-h-[480px]`）
- 右侧：一个 `RewriteConfigPanel`（单一配置面板）
- 底部：一个提交按钮，文案随平台数动态变化（`生成 N 个平台发稿包`）

整个页面的状态模型是「**单配置驱动多平台**」：同一份原文、同一套视角与策略，只是平台不同。

### 1.2 批量改写的真实数据模型

批量改写是「**M 篇素材 × N 个平台 = M×N 个 task**」，且每篇素材可能需要：
- 不同的标题（来自素材本身）
- 不同的视角（行业稿 vs 品牌稿）
- 不同的输出长度（官网长文 vs 小红书短文）
- 不同的来源策略（有的素材已有数据，有的需要标记缺失）

如果塞进 `NewRewritePage`，会出现以下结构性冲突：

| 冲突点 | 单篇页现状 | 批量塞入后的混乱 |
|--------|------------|------------------|
| **标题输入** | 1 个 Input | 需要 M 个标题，每篇一个 |
| **原文输入** | 1 个 Textarea | 需要 M 段原文，无法用单个 textarea 承载 |
| **配置面板** | 1 套配置驱动所有平台 | 需要支持「每篇独立配置」或「全局配置 + 单篇覆盖」 |
| **提交逻辑** | 1 次提交 N 个平台 | 1 次提交 M×N 个 task，需要分批、限流、失败重试 |
| **结果跳转** | 跳 `/multi-platform-result?taskIds=...`（1 维） | 需要跳「素材 × 平台」2 维矩阵视图 |
| **错误处理** | 单篇失败显示一行 error | 需要「部分失败」矩阵化展示，支持单格重试 |
| **进度反馈** | `submitting` 单一布尔 | 需要 M×N 个 cell 各自的 pending/running/completed/failed |
| **字符统计** | 单篇 `content.length` | 需要每篇独立统计 + 汇总 |

### 1.3 结论

把批量塞进单篇页，等于把一个「2 维矩阵问题」硬压进「1 维线性流程」的容器里。结果要么是单篇页被改得面目全非、失去其最擅长的「专注打磨一篇母稿」体验；要么是批量功能因为容器约束而残缺不全，连基本的「每篇不同视角」都做不到。

**正确做法**：保留 `NewRewritePage` 作为「单篇精修工作台」不变，把批量改写放到「素材箱 → 批量生成抽屉 → 批量结果矩阵」这条独立链路上。两条链路在「生成发稿包」这个动作上汇合（都调用同一个 `rewriteTaskApi.create`），但入口、编排、结果展示各自独立。

---

## 2. 为什么应该先做 Content Inbox

### 2.1 批量改写的上游依赖

批量改写不是「凭空生成」，它的前提是有「一批待改写的素材」。如果没有素材箱，用户每次做批量改写都要：
- 临时找素材
- 临时粘贴
- 临时校对
- 一旦关掉浏览器，所有素材丢失

这意味着「素材管理」是批量的**前置能力**，不是可选附件。

### 2.2 素材箱解决的核心问题

| 问题 | 没有素材箱 | 有素材箱 |
|------|------------|----------|
| **持久化** | 素材只在本次会话存在，刷新即丢 | 素材持久存储，可跨会话使用 |
| **可复核** | 粘贴后直接生成，无法事后核对 | 入箱前可解析预览、入箱后可编辑复核 |
| **可复用** | 一篇素材只能用于一次批量 | 同一素材可多次生成不同平台、不同视角 |
| **可追溯** | 不知道某篇发稿包来自哪段原文 | 素材与生成的 task 可建立追溯关系 |
| **部分生成** | 必须一次全选全生成 | 可勾选部分素材先生成，其余后续处理 |
| **解析隔离** | 解析失败会阻塞整个批量流程 | 单篇解析失败只影响该素材，不阻塞其他 |
| **质量门槛** | 无前置质量过滤 | 可在入箱时标注「待补来源」「字数不足」等状态 |

### 2.3 与现有架构的契合

素材箱天然落在「工作区」这个层级：

```
工作区 Workspace
  → 知识库 Knowledge Base（事实层，长期稳定）
  → 素材箱 Content Inbox（素材层，中期可变）  ← 本次新增
  → 生成发稿包（单篇 / 批量）
  → 结果页质量检查
  → Markdown 导出 / 历史任务
```

- 知识库存「品牌事实」（稳定、结构化、可被任意 task 引用）
- 素材箱存「待改写原文」（流动、非结构化、按需进入生成流程）
- 两者职责清晰、互不污染：知识库是「改写时引用的事实源」，素材箱是「等待被改写的对象」

### 2.4 现状对齐

当前 `InboxPage.tsx` 已是 P0 占位页，路由 `/projects/:projectId/inbox` 已注册，Sidebar 已有「素材箱」导航项（Workspace Mode 下显示）。本方案是在此占位页上落地真实能力，**不新增路由、不改 Sidebar 结构**。

### 2.5 结论

先做素材箱，把「素材获取 → 解析 → 确认 → 持久化」这条上游链路跑通，批量改写才有可靠的输入源。否则批量改写就是无源之水，每次都要重新粘贴、重新校对，无法形成「积累素材 → 按需批量生成」的良性工作流。

---

## 3. 支持的输入来源

### 3.1 来源清单

| 编号 | 来源 | 说明 | 解析方式 |
|------|------|------|----------|
| S1 | 粘贴正文 | 直接在文本框粘贴 Markdown / 纯文本 | 无需解析，原文存储 |
| S2 | Markdown / TXT 文件 | 拖入或选择 `.md` / `.txt` 文件 | 前端 `FileReader.readAsText` |
| S3 | HTML 文件 | 拖入或选择 `.html` / `.htm` 文件 | 前端 DOM 解析 → 提取正文 → 转 Markdown |
| S4 | 普通网页链接 | 输入 `https://` URL | 需后端代理抓取（CORS）→ 解析 |
| S5 | 公众号链接 | 输入 `mp.weixin.qq.com` 链接 | 需后端代理抓取 → 反爬规避 → 解析 |
| S6 | Word 文件 | 拖入或选择 `.docx` 文件 | 需 `mammoth.js` 或后端 `python-docx` |
| S7 | PDF 文件 | 拖入或选择 `.pdf` 文件 | 需 `pdf.js` 或后端 `pdfplumber` |

### 3.2 P0 / P1 / P2 取舍

| 来源 | 优先级 | 理由 |
|------|--------|------|
| **S1 粘贴正文** | **P0** | 零解析成本，覆盖最常见场景「我从别处复制一段文字」。是批量的最小可用入口。 |
| **S2 Markdown / TXT** | **P0** | 纯文本，前端 `FileReader` 即可读取，无依赖、无鉴权、无版权风险。与现有原文 textarea 体验一致。 |
| **S3 HTML 文件** | **P1** | 需要正文提取算法（区别导航 / 侧栏 / 正文），前端可用 `Readability` 类库，但质量不稳定，需解析确认环节。 |
| **S4 普通网页链接** | **P1** | 浏览器 CORS 限制，必须走后端代理抓取。需新增后端 API（`POST /api/fetch?url=...`）。涉及 robots.txt、UA 伪装、超时控制。 |
| **S5 公众号链接** | **P2** | 见第 5 节专项分析。授权、版权、反爬三重风险，P0/P1 不做。 |
| **S6 Word 文件** | **P1** | `.docx` 是 ZIP 包，前端可用 `mammoth.js` 解析；但样式、表格、图片转 Markdown 质量参差，需解析确认。P0 不做以避免引入大依赖。 |
| **S7 PDF 文件** | **P2** | PDF 文本提取质量极不稳定（扫描件、分栏、公式、表格），即使后端 `pdfplumber` 也常出错。P2 评估，且必须配合解析确认 + 手动修正。 |

### 3.3 P0 取舍原则

P0 只做「**零依赖、零鉴权、零版权风险**」的两种来源：
- S1 粘贴正文：用户对自己粘贴的内容负责，无外部依赖。
- S2 Markdown / TXT：纯本地文件读取，无网络请求、无解析歧义。

这两种来源覆盖了「我有一篇稿子想批量分发到多平台」的核心场景，足以验证整条批量链路。

---

## 4. 每种来源的详细取舍

### 4.1 S1 粘贴正文（P0）

- **入箱方式**：素材箱页面顶部「+ 新增素材」按钮 → 弹窗含标题输入 + 大文本框 → 粘贴后保存。
- **字段**：`title`（可空，默认取正文首行）、`content`（原文）、`source_type: 'paste'`。
- **质量门槛**：前端校验字数（如 < 50 字提示「内容过短，可能影响改写质量」），但不阻断入箱。
- **不做**：不自动识别 Markdown 标题层级、不自动提取摘要（这些交给后续 LLM 评分环节）。

### 4.2 S2 Markdown / TXT 文件（P0）

- **入箱方式**：素材箱页面支持拖拽 `.md` / `.txt` 到列表区，或「+ 导入文件」按钮选择。
- **解析**：`FileReader.readAsText(file, 'UTF-8')`，直接拿到文本内容。
- **标题推断**：取文件名（去扩展名）作为 `title` 默认值；若文件首行是 `# 一级标题`，则取该行作为标题。
- **大小限制**：单文件 < 500KB（防止恶意大文件），超出提示。
- **多文件**：支持一次拖入多个文件，批量入箱。

### 4.3 S3 HTML 文件（P1）

- **入箱方式**：同 S2，扩展支持 `.html` / `.htm`。
- **解析**：前端用 `DOMParser` 解析为 Document，再用简化的正文提取算法（优先 `<article>` / `<main>` / `role=main`，回退到最大文本块）。
- **转换**：提取后的 HTML 片段转 Markdown（可用 `turndown` 类库）。
- **解析确认**：必须经过「解析确认」步骤，展示提取后的 Markdown 预览，用户可编辑修正后再入箱。
- **风险**：正文提取准确率约 70-85%，复杂页面（多栏、表格嵌套）易出错，依赖用户复核。

### 4.4 S4 普通网页链接（P1）

- **入箱方式**：素材箱「+ 导入链接」→ 输入 URL → 后端代理抓取 → 返回正文 → 解析确认。
- **后端新增**：`POST /api/inbox/fetch-url`，入参 `{url}`，出参 `{title, content_markdown, fetch_status}`。
- **后端职责**：
  - 校验 URL 合法性（协议、域名）
  - 检查 robots.txt（P1 可简化为只校验 UA）
  - 抓取（超时 10s，限制响应体 < 2MB）
  - 调用 `Readability` 类库或 `trafilatura` 提取正文
  - 转 Markdown 返回
- **不做**：不做全文缓存、不做增量更新、不做登录态代理。
- **失败兜底**：抓取失败时返回 `{fetch_status: 'failed', reason}`，前端提示「无法抓取该链接，请粘贴正文」。

### 4.5 S5 公众号链接（P2，详见第 5 节）

### 4.6 S6 Word 文件（P1）

- **入箱方式**：拖拽 `.docx` 文件。
- **解析**：前端 `mammoth.js`（约 200KB 依赖）将 `.docx` 转 HTML，再转 Markdown。
- **限制**：不支持 `.doc`（旧版二进制格式）；表格、图片、公式转换质量有限。
- **解析确认**：必须预览 + 编辑修正。

### 4.7 S7 PDF 文件（P2）

- **入箱方式**：拖拽 `.pdf` 文件。
- **解析**：前端 `pdf.js` 提取文本层，或后端 `pdfplumber`。
- **限制**：扫描件（图片型 PDF）无法提取文本；分栏、表格、公式极易错乱。
- **强制确认**：解析后必须人工校对，否则不入箱。
- **P2 评估结论**：ROI 低，建议 P2 仅做「文本型 PDF 提取」，扫描件直接提示「请改用粘贴正文」。

---

## 5. 公众号链接的授权、版权、解析失败兜底策略

### 5.1 为什么公众号链接单独列为高风险

公众号文章（`mp.weixin.qq.com/s/...`）存在三重叠加风险：

1. **授权风险**：公众号文章虽为公开页面，但微信对非微信客户端的访问有反爬机制（频控、验证码、UA 校验、动态渲染）。无授权的批量抓取可能触发风控。
2. **版权风险**：公众号文章版权归作者或公众号主体所有。用户抓取他人文章用于改写并发布，可能涉及侵权。工作台作为工具，不能替用户做版权判断，但必须提供明显的合规提示。
3. **解析风险**：公众号页面是动态渲染的 SPA，正文嵌在 JS 渲染后的 DOM 中；图片用 `data-src` 懒加载；常含「阅读原文」「精彩推荐」「小程序卡片」等非正文元素。直接 HTTP 抓取拿到的 HTML 与浏览器渲染结果差异大。

### 5.2 P0/P1 不做公众号链接抓取

**结论**：P0、P1 均不做公众号链接自动抓取。

理由：
- 自动抓取的稳定性 < 50%（基于反爬 + 动态渲染），失败率不可接受。
- 即使抓取成功，正文与噪声分离的准确率不稳定，需要重度解析确认，与 P0「轻量」目标冲突。
- 版权合规无法自动化判定，工具侧只能做提示，但提示不能解决「用户已抓取他人内容」的事实。

### 5.3 P2 公众号链接策略（评估方案）

若 P2 评估通过，采用以下策略：

#### 5.3.1 授权策略
- 不做「微信公众号后台 API 授权」（需企业资质 + AppID + AppSecret，超出工作台定位）。
- 走「公开页面抓取 + 合规提示」路线：
  - 后端代理抓取，伪装微信内置浏览器 UA（`Mozilla/5.0 ... MicroMessenger/...`）。
  - 单链接单次抓取，不缓存全文，不做批量爬取。
  - 限制频次：同一工作区每小时最多抓取 N 次（N 待定，建议 5）。

#### 5.3.2 版权策略
- 入箱前强制展示版权声明弹窗：
  > 「你正在导入公众号文章。请确认你拥有该文章的版权，或已获得作者授权。未经授权使用他人内容可能涉及侵权，责任由使用者承担。」
- 用户必须勾选「我已确认拥有版权或已获授权」才能继续。
- 工作台记录该确认行为（素材字段 `copyright_acknowledged: true`），但不做版权真实性校验。

#### 5.3.3 解析失败兜底策略

| 失败场景 | 兜底动作 |
|----------|----------|
| 链接无法访问（404 / 网络错误） | 提示「链接无法访问，请检查链接是否有效或改用粘贴正文」 |
| 触发反爬（返回验证码页 / 空内容） | 提示「微信限制访问该链接，请改用粘贴正文」 |
| 正文提取为空 | 提示「未提取到正文内容，请改用粘贴正文」 |
| 正文过短（< 100 字） | 警告「提取到的内容过短，可能不完整，建议核对或改用粘贴正文」 |
| 图片 / 小程序卡片 / 引用块 | 统一剥离，不保留图片链接（避免图片盗链） |
| 「阅读原文」「精彩推荐」等噪声 | 通过选择器白名单剥离 |

所有失败兜底的最终出口都是「**改用粘贴正文**」——这是 P0 已具备的能力，确保公众号链接失败不会阻塞用户工作流。

### 5.4 P0 的过渡方案

P0 不做公众号链接抓取，但在素材箱「+ 导入链接」入口（若做 P1 普通链接）中，对 `mp.weixin.qq.com` 域名做特殊处理：
- 直接禁用抓取，提示「公众号链接暂不支持自动导入，请复制文章正文后粘贴入箱」。
- 提供「去粘贴」快捷按钮，跳转到粘贴入箱弹窗。

这样既不引入风险，又给用户清晰的引导路径。

---

## 6. 前端页面设计

### 6.1 整体信息架构

```
工作区 /projects/:projectId
  ├── 工作区概览
  ├── 知识库 /facts
  ├── 素材箱 /inbox           ← 本次重点改造
  │     ├── 素材列表（卡片 / 表格切换）
  │     ├── 新增素材弹窗（粘贴 / 文件）
  │     ├── 解析确认抽屉（P1+ HTML/Word/URL 用）
  │     └── 批量生成抽屉（从素材箱唤起）
  ├── 生成发稿包 /rewrite/new   ← 单篇链路，保持不变
  └── ...

全局
  └── 批量结果矩阵 /batch-result?batchId=...   ← 新增路由（纯前端）
```

### 6.2 素材箱页面（InboxPage 改造）

**替换现有占位页**，实现真实能力。

#### 6.2.1 页面结构

```
┌─ TopBar：面包屑「工作区 / 素材箱」 + 标题「素材箱」 ─────────────┐
│                                                                  │
│  ┌─ 头部操作区 ─────────────────────────────────────────────┐  │
│  │  [+ 新增素材]  [+ 导入文件]  [+ 导入链接(P1)]             │  │
│  │  筛选：[全部 / 待生成 / 已生成]   搜索：[____]            │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ 素材列表 ───────────────────────────────────────────────┐  │
│  │  ☐ [标题1] 来源:粘贴 / 字数:1280 / 状态:待生成  [编辑][删除] │  │
│  │  ☐ [标题2] 来源:md文件 / 字数:860  / 状态:已生成2次 [编辑]..│  │
│  │  ☐ [标题3] 来源:粘贴 / 字数:50   / ⚠内容过短      [编辑]..│  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ 批量操作栏（选中 ≥1 时浮起）─────────────────────────────┐  │
│  │  已选 3 篇  |  [批量生成发稿包]  [批量删除]                │  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

#### 6.2.2 素材卡片字段

- 标题（缺失时取正文首行截断 40 字）
- 来源标签：`粘贴` / `Markdown` / `TXT` / `HTML` / `链接` / `Word` / `PDF`
- 字数统计（CJK 字符 + 英文单词，复用现有 `contentMetrics.ts`）
- 状态：`待生成` / `已生成 N 次` / `解析失败` / `待补来源`（P1+）
- 创建时间
- 操作：编辑、删除、单独生成（快捷入口）

#### 6.2.3 新增素材弹窗

```
┌─ 新增素材 ──────────────────────────────────────┐
│  标题：[____________________]（可选，默认取首行）│
│                                                  │
│  正文：                                          │
│  ┌──────────────────────────────────────────┐  │
│  │  在此粘贴 Markdown 或纯文本...           │  │
│  │                                          │  │
│  │                                          │  │
│  └──────────────────────────────────────────┘  │
│  字数：0                                        │
│                                                  │
│            [取消]  [保存到素材箱]                │
└─────────────────────────────────────────────────┘
```

P0 只支持粘贴入箱。文件拖拽在 6.3 节的导入文件流程中处理。

### 6.3 解析确认抽屉（P1+ 用，P0 不实现）

P0 的两种来源（粘贴 / Markdown-TXT）不需要解析确认，因为：
- 粘贴：用户直接输入，无需二次确认。
- Markdown / TXT：纯文本读取，无解析歧义。

P1 引入 HTML / Word / URL 时，必须经过解析确认：

```
┌─ 解析确认（右侧抽屉，宽度 480px）──────────────┐
│  来源：example.html                              │
│  ┌─ 预览（可编辑 Markdown）──────────────────┐  │
│  │  # 提取到的标题                            │  │
│  │                                            │  │
│  │  提取到的正文段落...                       │  │
│  │  （用户可在此修正）                        │  │
│  └────────────────────────────────────────────┘  │
│  字数：1280   解析置信度：中                    │
│  ⚠ 检测到可能缺失：图片 2 张已剥离             │
│                                                  │
│              [放弃]  [确认入箱]                  │
└─────────────────────────────────────────────────┘
```

### 6.4 批量生成抽屉（Batch Generate Drawer）

从素材箱「批量生成发稿包」按钮唤起，右侧抽屉。

```
┌─ 批量生成发稿包（右侧抽屉，宽度 520px）──────────┐
│  已选素材（3 篇）                                │
│  ┌──────────────────────────────────────────┐  │
│  │  • 标题1  (1280字)                        │  │
│  │  • 标题2  (860字)                         │  │
│  │  • 标题3  (50字) ⚠过短                    │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  发布平台（可多选，复用 PLATFORMS 常量）          │
│  [官网文章] [公众号] [知乎问答] [小红书]         │
│                                                  │
│  统一配置（复用 RewriteConfigPanel 子集）        │
│  视角：[品牌方 ▾]                                │
│  来源策略：[标记缺失来源 ▾]                      │
│  输出长度：[标准 ▾]                              │
│  生成 Schema：[开]                               │
│  关联品牌事实：[选择]                             │
│                                                  │
│  预览生成规模                                    │
│  ┌──────────────────────────────────────────┐  │
│  │  3 篇素材 × 4 个平台 = 12 个发稿包       │  │
│  │  预计消耗 12 次生成额度                   │  │
│  │  ⚠ 数量较多，建议分批生成（每次 ≤ 6 个） │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│              [取消]  [开始批量生成]              │
└─────────────────────────────────────────────────┘
```

**关键设计**：
- 配置是「统一配置」而非「每篇独立配置」。P0 不支持单篇覆盖，保持简单；P1 再评估是否需要单篇视角覆盖。
- 生成规模预警：当 M×N > 6 时提示「建议分批」，但不强制阻断。
- 关联品牌事实：复用现有 `FactSelector`，所有素材共享同一份事实选择。

### 6.5 批量结果矩阵（Batch Result Matrix）

新增路由 `/batch-result?taskIds=id1,id2,...`（纯前端，复用 `MultiPlatformResultPage` 的查询模式，但渲染为矩阵）。

#### 6.5.1 矩阵布局

```
┌─ 批量结果（12 个发稿包）────────────────────────────────────┐
│  进度：8/12 已完成  |  成功 7  失败 1  进行中 4              │
│  [全部] [进行中] [已完成] [失败]                            │
│                                                              │
│           │ 官网文章   │ 公众号    │ 知乎问答  │ 小红书    │
│  ─────────┼────────────┼────────────┼────────────┼──────────│
│  标题1    │ ✅ 92分    │ ✅ 88分    │ ⏳ 生成中 │ ✅ 85分  │
│  标题2    │ ✅ 90分    │ ❌ 失败    │ ✅ 89分    │ ⏳ 生成中│
│  标题3    │ ⚠ 过短    │ ⚠ 过短    │ ⚠ 过短    │ ⚠ 过短  │
│  ─────────┼────────────┼────────────┼────────────┼──────────│
│                                                              │
│  [导出全部 Markdown]  [导出汇总报告]                        │
└──────────────────────────────────────────────────────────────┘
```

#### 6.5.2 单元格状态

- `⏳ 生成中`：pending / running，点击跳转该 task 结果页
- `✅ N分`：completed，显示改后总分，点击查看结果
- `❌ 失败`：failed，悬停显示 error_message，单元格内「重试」按钮（复用 `useRetryTask`）
- `⚠ 过短`：素材字数 < 阈值，跳过生成（不创建 task），单元格置灰

#### 6.5.3 与 MultiPlatformResultPage 的关系

`MultiPlatformResultPage` 是「1 篇 × N 平台 = 1 行 N 列」的卡片网格。
批量结果矩阵是「M 篇 × N 平台 = M 行 N 列」的二维表格。

两者复用相同的底层 hooks（`useTaskDetail` / `useTaskStatus` / `useRewriteOutputs` / `useOutputScores`），但渲染层不同。P0 不合并这两个页面，保持各自专注。

---

## 7. P0 不做什么

> 明确红线，避免功能膨胀。

| 不做项 | 理由 |
|--------|------|
| **后端文件上传 API** | P0 只做粘贴 + Markdown/TXT，前端 `FileReader` 即可，无需后端接收文件 |
| **后端 URL 抓取 API** | P0 不做网页链接 / 公众号链接导入 |
| **新增数据库表** | 素材箱 P0 用 localStorage 持久化，不污染 6 张核心表 |
| **新增后端业务逻辑** | 批量生成完全复用现有 `POST /api/projects/:projectId/tasks`，前端编排 |
| **PDF 解析** | 质量不稳定，P2 评估 |
| **公众号链接抓取** | 授权 / 版权 / 反爬三重风险，P2 评估 |
| **Word 解析** | 需引入 `mammoth.js` 依赖，P1 |
| **HTML 文件解析** | 需正文提取算法，P1 |
| **普通网页链接抓取** | 需后端代理，P1 |
| **每篇素材独立配置** | P0 只支持「统一配置驱动所有素材」，保持简单 |
| **批量进度 SSE 流式推送** | P0 用轮询（复用现有 `useTaskStatus`），与单篇链路一致 |
| **批量任务并发限流后端** | P0 前端串行创建 task（与现有 `NewRewritePage` 多平台循环一致），不引入后端调度 |
| **素材版本管理** | 素材编辑后覆盖，不保留历史版本 |
| **素材与生成结果的持久化追溯关系** | P0 只在内存 / localStorage 维护「本次批量」的素材→taskId 映射，不入库 |
| **素材标签 / 分类** | P0 只按来源类型标记，不做自定义标签 |
| **素材全文搜索** | P0 只按标题搜索，正文不索引 |
| **批量导出汇总报告** | P0 只支持单格导出（复用现有 `ExportButton`），汇总报告 P1 |
| **素材箱跨工作区共享** | 素材归属于单个工作区，不跨工作区 |
| **素材协作编辑** | P0 单用户，无协作 |

---

## 8. 需不需要新后端 API

### 8.1 P0 结论：不需要

P0 的所有能力都可以在前端完成：

| 能力 | 前端实现 | 是否需要后端 |
|------|----------|--------------|
| 粘贴正文入箱 | `textarea` + localStorage | 否 |
| Markdown / TXT 文件读取 | `FileReader.readAsText` | 否 |
| 素材持久化 | localStorage（按 projectId 分键） | 否 |
| 素材列表 / 编辑 / 删除 | 纯前端状态管理 | 否 |
| 批量生成 N×M 个 task | 循环调用现有 `POST /api/projects/:projectId/tasks` | 否（复用现有 API） |
| 批量结果轮询 | 复用 `useTaskStatus` / `useTaskDetail` | 否（复用现有 API） |
| 单格重试 | 复用 `POST /api/tasks/:id/retry` | 否（复用现有 API） |
| 单格导出 | 复用 `GET /api/outputs/:id/export?format=markdown` | 否（复用现有 API） |

### 8.2 P1 需要新增的后端 API

| API | 用途 | 备注 |
|-----|------|------|
| `POST /api/inbox/fetch-url` | 抓取普通网页链接，返回 Markdown 正文 | 需处理 CORS、超时、robots.txt |
| `POST /api/inbox/parse-file` | 后端解析 HTML / Word / PDF 文件 | 前端解析不稳定时可后置 |

P1 新增 API 不修改现有 6 张表的 schema，可独立新增 `inbox_materials` 表（P1 评估）。

### 8.3 P0 对现有 API 的使用方式

完全沿用 `rewriteTaskApi.create`：

```typescript
// 伪代码：批量生成编排
for (const material of selectedMaterials) {
  for (const platform of selectedPlatforms) {
    const task = await rewriteTaskApi.create(projectId, {
      title: material.title,
      original_content: material.content,
      perspective: config.perspective,
      publish_platform: platform,
      source_policy: config.sourcePolicy,
      output_length: config.outputLength,
      need_schema: platform === '官网文章' ? config.needSchema : false,
      brand_fact_ids: config.brandFactIds,
    })
    taskIds.push(task.id)
  }
}
navigate(`/batch-result?taskIds=${taskIds.join(',')}`)
```

**注意**：与 `NewRewritePage` 多平台提交逻辑完全一致，只是外层多了一层素材循环。不触碰后端 `rewrite_service.kickoff` 的非阻塞线程模型。

---

## 9. 需不需要数据库表

### 9.1 P0 结论：不需要

P0 素材箱用 localStorage 持久化，理由：

1. **不动数据库是硬约束**：项目内存明确「Must implement exactly 6 data tables」，P0 不应新增第 7 张表。
2. **素材是「半结构化、高频变动」的中间态**：与 `brand_facts`（结构化、长期稳定）不同，素材在入箱后可能被编辑、删除、批量消费，localStorage 的读写特性更适合。
3. **P0 验证产品价值**：P0 的目标是验证「素材箱 → 批量生成」这条链路是否被用户接受，而非素材的跨设备同步。localStorage 足够。
4. **降低迁移成本**：若 P0 验证失败，localStorage 方案可整体回滚，不影响后端。

### 9.2 localStorage 数据结构

按 projectId 分键，单工作区独立：

```typescript
// 键名：`inbox:${projectId}`
interface InboxMaterial {
  id: string                  // UUID，前端生成
  project_id: string
  title: string
  content: string
  source_type: 'paste' | 'markdown' | 'txt' | 'html' | 'url' | 'word' | 'pdf'
  source_meta?: {
    filename?: string
    url?: string
    fetched_at?: string
  }
  char_count: number          // 入箱时统计
  status: 'ready' | 'too_short' | 'parse_failed'
  created_at: string
  updated_at: string
}

type InboxStorage = InboxMaterial[]
```

### 9.3 localStorage 容量与降级

- 单工作区上限：50 篇素材（按平均 5KB/篇估算，约 250KB，远低于 localStorage 5-10MB 上限）。
- 超出上限：提示「素材数量已达上限，请删除旧素材或导出后清理」。
- 单篇正文上限：50,000 字符（防止超大文本撑爆配额）。
- localStorage 不可用（隐私模式 / 配额满）：降级为 sessionStorage，并提示「素材不会跨会话保留」。

### 9.4 P1 数据库表草案（评估，P0 不实施）

若 P0 验证通过、P1 需要跨设备同步或后端解析，再新增 `inbox_materials` 表：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (UUID) | PK |
| project_id | String (UUID) | FK → projects.id |
| title | String(200) | |
| content | Text | 原文 |
| source_type | String(20) | paste/markdown/txt/html/url/word/pdf |
| source_meta | Text (JSON) | 文件名 / URL / 抓取时间等 |
| char_count | Integer | |
| status | String(20) | ready/too_short/parse_failed |
| last_generated_at | DateTime | 最近一次被批量消费的时间 |
| created_at | DateTime | |
| updated_at | DateTime | |

P1 实施时需走 Alembic 迁移，并在 `localStorage → DB` 提供一次性导入工具。

---

## 10. 如何复用现有多平台任务创建逻辑

### 10.1 现有逻辑定位

`NewRewritePage.tsx` 的 `handleSubmit`（第 103-134 行）已实现「1 篇 × N 平台」的循环创建：

```typescript
// 单平台
if (platforms.length === 1) {
  createMut.mutate(buildPayload(platforms[0]), { onSuccess: ... })
  return
}
// 多平台：循环创建 + 跳转
const createdIds: string[] = []
for (const platform of platforms) {
  const task = await rewriteTaskApi.create(projectId, buildPayload(platform))
  createdIds.push(task.id)
}
navigate(`/multi-platform-result?taskIds=${createdIds.join(',')}`)
```

`buildPayload(platform)` 负责按平台规则生成 `TaskCreateInput`，其中 `need_schema` 按平台强制（官网文章跟随用户开关，自媒体平台强制 false）。

### 10.2 批量改写的复用方式

批量改写是「M 篇 × N 平台」，只需在 `NewRewritePage` 的循环外层再套一层素材循环：

```typescript
// 伪代码（P0 实现时落在批量生成抽屉的提交 handler）
const createdIds: string[] = []
const matrix: MatrixCell[][] = []   // 用于结果矩阵

for (const material of selectedMaterials) {
  const row: MatrixCell[] = []
  if (material.char_count < 50) {
    // 过短跳过，矩阵置灰
    selectedPlatforms.forEach(p => row.push({ status: 'too_short' }))
    matrix.push(row)
    continue
  }
  for (const platform of selectedPlatforms) {
    const task = await rewriteTaskApi.create(projectId, {
      title: material.title || material.content.slice(0, 40),
      original_content: material.content,
      perspective: config.perspective,
      publish_platform: platform,
      source_policy: config.sourcePolicy,
      output_length: config.outputLength,
      need_schema: platform === '官网文章' ? config.needSchema : false,
      brand_fact_ids: config.brandFactIds,
    })
    createdIds.push(task.id)
    row.push({ taskId: task.id, status: 'pending' })
  }
  matrix.push(row)
}

// 把矩阵结构存入 sessionStorage 供结果页渲染
sessionStorage.setItem(`batch:${batchId}`, JSON.stringify({
  materials: selectedMaterials.map(m => ({ id: m.id, title: m.title })),
  platforms: selectedPlatforms,
  matrix,
}))
navigate(`/batch-result?batchId=${batchId}`)
```

### 10.3 复用要点

| 复用对象 | 复用方式 | 是否修改 |
|----------|----------|----------|
| `rewriteTaskApi.create` | 直接调用，不改签名 | 否 |
| `POST /api/projects/:projectId/tasks` | 直接命中，不改后端 | 否 |
| `rewrite_service.kickoff` | 后端自动触发，不改 | 否 |
| `buildPayload` 思路 | 抽取为共享函数 `buildTaskPayload(material, platform, config)` | 抽取，不改原 NewRewritePage 行为 |
| `useTaskStatus` / `useTaskDetail` | 结果矩阵单元格轮询直接复用 | 否 |
| `useRetryTask` | 失败单格重试直接复用 | 否 |
| `ExportButton` | 单格导出直接复用 | 否 |
| `RewriteConfigPanel` | 批量抽屉内的配置区复用其子集（平台多选 + 视角 + 策略 + 长度 + Schema + 事实选择） | 复用，可能需要 `variant='compact'` |

### 10.4 抽取共享函数的边界

为避免 `NewRewritePage` 和批量抽屉重复实现 `buildPayload`，建议抽取：

```typescript
// frontend/src/lib/taskPayload.ts（新增）
export function buildTaskPayload(
  title: string,
  content: string,
  platform: Platform,
  config: RewriteConfig,
): TaskCreateInput { ... }

export function resolveNeedSchema(platform: Platform, userChoice: boolean): boolean {
  return platform === '官网文章' ? userChoice : false
}
```

`NewRewritePage` 与批量抽屉都引用该函数。这是「抽取共享逻辑」，不属于「修改现有逻辑」——`NewRewritePage` 的行为保持不变。

---

## 11. 最小可执行版本（MVP）

### 11.1 MVP 范围

| 模块 | MVP 包含 | MVP 不包含 |
|------|----------|------------|
| 素材箱 | 粘贴正文入箱、Markdown/TXT 文件拖入、列表展示、编辑、删除、按标题搜索 | HTML/Word/PDF/URL/公众号链接 |
| 解析确认 | 不需要（P0 来源无解析歧义） | 全部 |
| 批量生成抽屉 | 选 N 素材 × M 平台、统一配置、生成规模预警 | 单篇独立配置、并发限流 |
| 批量结果矩阵 | M×N 矩阵、单元格状态轮询、单格查看 / 重试 / 导出 | 汇总报告、批量导出 |
| 持久化 | localStorage（按 projectId 分键） | 数据库表、跨设备同步 |
| 后端 | 零改动 | 零改动 |

### 11.2 MVP 用户旅程

```
1. 用户进入工作区 /projects/:projectId
2. 点击 Sidebar「素材箱」→ /projects/:projectId/inbox
3. 点击「+ 新增素材」→ 弹窗粘贴标题 + 正文 → 保存
   （或拖入 .md / .txt 文件，自动入箱）
4. 重复 3，积累 3-5 篇素材
5. 勾选若干素材 → 点击「批量生成发稿包」
6. 批量抽屉弹出：选 4 个平台、统一配置 → 看到「3×4=12 个发稿包」预警
7. 点击「开始批量生成」→ 前端串行创建 12 个 task → 跳转 /batch-result?batchId=...
8. 矩阵页轮询：12 个单元格陆续从 ⏳ 变 ✅ / ❌
9. 用户点击任意 ✅ 单元格 → 跳转 /tasks/:taskId/result 查看详情
10. 用户点击 ❌ 单元格的「重试」→ 该格重新变为 ⏳
11. 完成后逐格点击 ExportButton 导出 Markdown
```

### 11.3 MVP 实现拆解（仅说明，不含代码）

#### 11.3.1 新增文件

| 文件 | 职责 |
|------|------|
| `frontend/src/lib/inboxStorage.ts` | localStorage 读写、分键、容量控制、降级 |
| `frontend/src/lib/taskPayload.ts` | `buildTaskPayload` / `resolveNeedSchema` 共享函数 |
| `frontend/src/hooks/useInboxMaterials.ts` | 素材 CRUD hook（封装 localStorage） |
| `frontend/src/components/inbox/InboxMaterialCard.tsx` | 单篇素材卡片 |
| `frontend/src/components/inbox/InboxAddDialog.tsx` | 新增素材弹窗 |
| `frontend/src/components/inbox/BatchGenerateDrawer.tsx` | 批量生成抽屉 |
| `frontend/src/components/inbox/BatchResultMatrix.tsx` | 结果矩阵表格 |
| `frontend/src/pages/BatchResultPage.tsx` | 批量结果页 |

#### 11.3.2 修改文件

| 文件 | 修改内容 |
|------|----------|
| `frontend/src/pages/InboxPage.tsx` | 从占位页改为真实素材箱页面 |
| `frontend/src/App.tsx` | 新增 `/batch-result` 路由 |
| `frontend/src/pages/NewRewritePage.tsx` | `buildPayload` 改为引用 `taskPayload.ts`（行为不变） |

#### 11.3.3 不修改

- 后端任何文件
- `RewriteService` / `LLMService` / `ScoringService`
- 6 张数据库表
- `MultiPlatformResultPage.tsx`（保持单篇多平台结果页不变）
- `Sidebar.tsx`（素材箱导航已存在）

### 11.4 MVP 完成定义（DoD）

1. 用户可在素材箱粘贴 / 拖入 Markdown-TXT 入箱，刷新页面后素材仍在。
2. 素材箱支持编辑、删除、按标题搜索。
3. 勾选 ≥1 篇素材后，底部出现「批量生成发稿包」按钮。
4. 批量抽屉可多选平台、配置视角 / 策略 / 长度 / Schema / 事实。
5. 提交后跳转批量结果矩阵，矩阵正确渲染 M×N 个单元格。
6. 单元格状态随 task 状态实时更新（轮询）。
7. 完成单元格可点击跳转结果页，失败单元格可重试。
8. 单格可导出 Markdown。
9. 素材过短（< 50 字）时单元格置灰，不创建 task。
10. 全程不调用任何新后端 API，不动数据库。

---

## 12. 风险和验收标准

### 12.1 风险清单

| 编号 | 风险 | 等级 | 影响 | 应对策略 |
|------|------|------|------|----------|
| R1 | **批量生成导致 LLM 调用爆炸** | 高 | M×N 个 task × 每 task 2-3 次 LLM 调用 = 大量 token 消耗与并发压力 | 1. 前端串行创建 task（与现有 `NewRewritePage` 一致）；2. 矩阵预警「建议分批」；3. P0 不做并发限流，但文档明确「单次批量建议 ≤ 6 个」 |
| R2 | **后端线程堆积** | 高 | `rewrite_service.kickoff` 每次起一个 daemon 线程，12 个 task = 12 个并发线程，可能拖慢后端 | 1. P0 串行创建，后端线程按创建速度自然错峰；2. 监控 `llm_call_logs` 的 latency；3. P1 评估是否引入后端队列 |
| R3 | **localStorage 容量超限** | 中 | 素材过多 / 单篇过大导致写入失败 | 1. 单工作区 50 篇上限；2. 单篇 50,000 字符上限；3. 写入失败时降级 sessionStorage + 提示 |
| R4 | **批量结果矩阵轮询压力** | 中 | 12 个单元格 × 每 3s 轮询 = 4 QPS 持续请求 | 1. 复用 `useTaskStatus` 的轮询策略；2. 完成的单元格停止轮询；3. 全部完成后停止所有轮询 |
| R5 | **部分失败导致用户困惑** | 中 | 12 个 task 中 3 个失败，用户不知道如何处理 | 1. 矩阵顶部进度汇总「8/12 完成，1 失败」；2. 失败单元格显眼标识 + 悬停 error_message + 单格重试 |
| R6 | **素材与生成结果追溯丢失** | 中 | 刷新批量结果页后，素材→taskId 映射可能丢失 | 1. 映射存 sessionStorage（按 batchId）；2. 提示用户「结果页 24 小时内有效，过期请从历史任务查找」；3. task 本身已持久化在 `rewrite_tasks` 表，不会丢 |
| R7 | **跨工作区素材串扰** | 中 | localStorage 键名设计错误导致 A 工作区看到 B 工作区素材 | 1. 键名严格带 `projectId`：`inbox:${projectId}`；2. 切换工作区时重新加载 |
| R8 | **素材版权合规** | 中 | 用户粘贴他人版权内容批量生成 | 1. 素材箱底部常驻提示「请确保你拥有素材的版权或已获授权」；2. P0 不做强制校验；3. 公众号链接 P2 才做，且强制版权声明 |
| R9 | **MVP 范围膨胀** | 高 | 实现过程中顺手加 HTML 解析 / 单篇独立配置等 | 1. 严格对照第 7 节「P0 不做」清单；2. QA 阶段做边界检查 |
| R10 | **`buildPayload` 抽取破坏 NewRewritePage 行为** | 低 | 重构导致单篇链路回归 | 1. 抽取后跑一遍单篇多平台生成回归测试；2. `npx tsc --noEmit` + `npm run build` 验证 |

### 12.2 验收标准

#### 12.2.1 功能验收

| 编号 | 验收项 | 验证方法 |
|------|--------|----------|
| A1 | 素材箱页面可正常访问，无白屏 | 访问 `/projects/:id/inbox` |
| A2 | 粘贴正文可入箱，列表立即显示 | 新增素材 → 列表出现 |
| A3 | 拖入 `.md` 文件可入箱，标题取文件名 | 拖入文件 → 列表出现 |
| A4 | 拖入 `.txt` 文件可入箱 | 拖入文件 → 列表出现 |
| A5 | 刷新页面后素材仍在 | F5 → 列表不变 |
| A6 | 编辑素材后内容更新 | 编辑 → 保存 → 列表更新 |
| A7 | 删除素材后列表更新 | 删除 → 确认 → 列表减少 |
| A8 | 按标题搜索可过滤列表 | 输入关键词 → 列表过滤 |
| A9 | 勾选素材后底部出现批量操作栏 | 勾选 → 操作栏浮起 |
| A10 | 批量抽屉可多选平台 | 打开抽屉 → 选 4 个平台 |
| A11 | 批量抽屉显示「M×N」生成规模 | 选 3 篇 × 4 平台 → 显示「12 个发稿包」 |
| A12 | 提交后跳转批量结果矩阵 | 提交 → URL 变为 `/batch-result?batchId=...` |
| A13 | 矩阵正确渲染 M×N 个单元格 | 矩阵行数 = 素材数，列数 = 平台数 |
| A14 | 单元格状态随 task 状态更新 | 等待 → 单元格从 ⏳ 变 ✅ |
| A15 | 完成单元格可点击跳转结果页 | 点击 ✅ → 跳 `/tasks/:id/result` |
| A16 | 失败单元格可重试 | 点击重试 → 单元格变 ⏳ → 最终 ✅ |
| A17 | 单格可导出 Markdown | 点击导出 → 下载 .md 文件 |
| A18 | 过短素材单元格置灰，不创建 task | 素材 < 50 字 → 该行全灰 |
| A19 | 跨工作区素材不串扰 | 切换工作区 → 素材列表变化 |
| A20 | 单篇链路（NewRewritePage）行为不变 | 走一遍单篇多平台生成 → 与改造前一致 |

#### 12.2.2 边界验收

| 编号 | 验收项 |
|------|--------|
| B1 | 未新增任何后端 `.py` 文件 |
| B2 | 未修改任何后端 `.py` 文件 |
| B3 | 未新增数据库表（6 张表不变） |
| B4 | 未修改数据库表 schema |
| B5 | 未修改 `rewrite_service.py` / `llm_service.py` / `scoring_service.py` |
| B6 | 未修改 `MultiPlatformResultPage.tsx` |
| B7 | 未修改 `Sidebar.tsx`（素材箱导航已存在） |
| B8 | 未引入新的 npm 大依赖（`mammoth` / `pdfjs` / `turndown` 等均不引入） |
| B9 | 未做 HTML / Word / PDF / URL / 公众号链接解析 |
| B10 | 未做 SSE / 流式输出 |
| B11 | 未做权限 / 登录 / RBAC |

#### 12.2.3 工程验收

| 编号 | 验收项 |
|------|--------|
| C1 | `npx tsc --noEmit` 通过（exit 0） |
| C2 | `npm run build` 通过 |
| C3 | 前端 dev server 可正常启动 |
| C4 | localStorage 键名带 projectId，不污染全局 |
| C5 | 素材箱在 Global Mode（未选工作区）下不可访问（路由保护） |
| C6 | 批量结果页在无 batchId 时显示空状态 |

### 12.3 验收方式

- **功能验收 A1-A20**：人工走查 + 浏览器 DevTools 观察 network / localStorage
- **边界验收 B1-B11**：`git diff` 检查变更文件清单，对照第 7 节红线
- **工程验收 C1-C6**：命令行执行 + 路由访问

---

## 附录 A：与现有架构的映射关系

| 现有对象 | 本方案的关系 |
|----------|--------------|
| `InboxPage.tsx`（占位页） | 改造为真实素材箱页面 |
| `NewRewritePage.tsx`（单篇页） | 保持不变，仅 `buildPayload` 抽取共享 |
| `MultiPlatformResultPage.tsx`（1×N 网格） | 保持不变，批量结果走新的 `BatchResultPage` |
| `RewriteConfigPanel.tsx`（配置面板） | 批量抽屉复用其子集 |
| `rewriteTaskApi.create`（单任务创建） | 批量生成循环调用，不改 |
| `useTaskStatus` / `useTaskDetail`（轮询 hooks） | 矩阵单元格直接复用 |
| `useRetryTask`（重试 hook） | 失败单元格直接复用 |
| `ExportButton`（导出组件） | 单格导出直接复用 |
| `contentMetrics.ts`（字数统计） | 素材字数统计直接复用 |
| Sidebar 素材箱导航（已存在） | 不改 |
| 路由 `/projects/:projectId/inbox`（已存在） | 不改 |
| 6 张数据库表 | 不动 |

## 附录 B：P1/P2 路线图（参考，不承诺）

| 阶段 | 范围 |
|------|------|
| **P0**（本方案） | 粘贴 + Markdown/TXT 入箱；批量生成；矩阵结果；localStorage |
| **P1** | HTML 文件解析；普通网页链接抓取（后端 API）；Word 文件解析；素材入库（`inbox_materials` 表）；批量导出汇总报告；单篇独立配置覆盖 |
| **P2** | 公众号链接抓取（含版权声明 + 反爬兜底）；PDF 文本提取；素材标签 / 分类；素材全文搜索；素材与 task 持久化追溯关系 |
| **P3+** | 素材协作；素材版本管理；批量调度队列（后端）；并发限流；跨设备同步 |

---

> 本文档为方案论证，不含代码实现。开发启动前需总控复核 P0 范围与红线，确认后方可进入实现阶段。
