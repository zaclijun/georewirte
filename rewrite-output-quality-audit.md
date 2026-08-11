# GEO Rewrite 输出质量与结果页审计

> 审计对象：当前 rewrite 真实产出（任务 `2469953e` / 输出 `2bedabc7`，法律案例普法文，平台=官网文章，视角=第三方，source_policy=mark_missing_sources，brand_facts=空）
> 审计范围：仅「输出质量 + 结果页呈现」，不改 API / 数据库 / Hooks / 业务逻辑
> 原始评分：before 87 → after 88（+1），review_status=review

---

## 一、当前生成内容的问题

### 1.1 致命问题：`final_article` 不纯净，混入了 FAQ / 律师简介 / 免责声明

这是当前最严重的问题，直接导致「不像企业级交付包」。

`final_article` 字段实际内容里出现了：

- `## 常见问题 FAQ`（含 Q1/Q2/Q3 三组问答）
- `## 律师与律所简介`
- `## 免责声明`

而 `rewrite-package.md` 明确要求：

> final_article 必须纯净，只包含正文 Markdown，不含评分、策略、**FAQ**、Schema、前后对比等任何过程性文字。

后果：
- 结果页「改写正文」Tab 与「FAQ」Tab **内容重复**（FAQ 在正文里出现一次，在 faq_content 里又出现一次，且两份 FAQ 内容不同——正文里是 Q1/Q2/Q3 粗体格式，faq_content 里是 6 个 `### 问题` 格式）。
- 导出的 Markdown 里 FAQ 出现两次，律师简介/免责声明也混在正文里，客户拿到的「正文」不是干净交付稿。
- 违反 prompt 自身的硬约束，说明当前 prompt 对「纯净性」的强制力不足。

### 1.2 改写像「原样重排」而非「内容增强」

原文已是高质量（87 分，触发「高质量保护模式」），改写后 88 分。但 `comparison_summary` 自称做了 5 项优化（标题改写、加入 AI Trigger、FAQ 扩展、Schema 复合结构、未改事实）。

实际对照原文与改后正文：
- 案件事实、争议焦点、法院查明、裁判结果、法律依据、风险指引的**段落结构与事实细节几乎逐条对应**。
- 改写主要做了三件事：① 把「争议焦点一/二/三」改成有序列表；② 插入了定义句（无民事行为能力人）、对比句（与传统侵权自己责任）、因果句（之所以强调完整证据）；③ 把「核心结论」段拆细。

问题：
- **事实密度零提升**：因 brand_facts 为空 + 防幻觉严格 + mark_missing_sources，改写没有补充任何新数据、新来源、新机制解释。comparison_summary 直言「未改动事实」。
- **「做了很多但评分只涨 1 分」的内在矛盾**没有解释，客户会质疑「那这 5 项优化为什么没体现到分数」。
- 高质量保护模式被当成「原样保留」的借口，而非「轻量增强 + 补齐交付包元信息」。

### 1.3 标题：语义完整但偏长，缺少「交付标题感」

改后标题：《未成年人骑自行车撞伤行人案：监护人责任认定与赔偿规则解析——基于上海法院判例》

- 优点：包含核心争议点 + 判例背景，语义完整。
- 问题：32 字偏长；副标题「——基于上海法院判例」在官网文章场景下可压缩；缺少「可被 AI 直接抽取为答案」的结论式标题变体（如「未成年人撞伤行人，监护人为何全额担责？」）。

### 1.4 摘要/核心结论：被弱化，没有独立「内容摘要」模块

原文有「核心结论」段（结论先行，3 条要点），改后正文把这个模块拆散到「## 案件事实」之前的一小段，**没有独立的 `## 内容摘要` 或 `> 核心结论` 区块**。

- 对 AI 抽取不友好：生成式 AI 优先抽取「最容易结构化解析的内容块」，独立摘要块是最高价值的抽取目标。
- 对结果页首屏不友好：正文 Tab 顶部缺少可一眼读懂的摘要。

### 1.5 事实密度不足 / 缺失来源提示不够具体

`missing_sources` 只有 2 条，且都是「若希望…可补充…」的弱建议：

1. 「若希望强化风险指引的统计支持，可补充近年上海法院未成年人交通肇事监护人担责率的脱敏统计数据」
2. 「曹小姐『休养诊疗八个月』『数十场商务行程』的具体数量若需更精确，可基于当事人陈述或证据进一步明确」

问题：
- 原文其实有大量**可强化的来源缺口**未被指出：判例案号 `(2024) 沪 0112 民初 7621 号` 的判决书公开链接、医院诊断报告、5000/30000 元垫付的收据、商务行程取消证明等。这些是「原文提到但缺可验证来源」的典型缺口，应进入 missing_sources。
- 当前 missing_sources 更像「锦上添花建议」而非「事实缺口清单」，不符合 prompt 里「❌ 错误：需要补充数据来源 / ✅ 正确：市场占有率 35% 的数据来源（原文第 3 段）」的规范。

### 1.6 FAQ 太模板化

`faq_content` 里 6 个 FAQ，问题句式集中在「是否…」「为何…」「如何…」，答案多为复述正文。

- 缺少**对比型 FAQ**（如「监护人与未成年人本人责任如何区分？」）
- 缺少**参数型 FAQ**（如「误工费主张需要哪些具体凭证？」——可基于原文已列的凭证清单）
- 缺少**场景型 FAQ**（如「孩子在小区骑行撞人，监护人不全程贴身就一定担责吗？」）
- 答案没有引用正文段落或法律条款编号，AI 抽取价值低。

### 1.7 Schema 建议太弱

当前 Schema：`Article + FAQPage`。

Article 问题：
- `articleBody` 是一整段压缩文本（核心结论+案件事实+争议焦点+法院查明+裁判结果+法律依据+风险指引全部塞进一个字符串），**AI 无法分段抽取**。
- 实体属性单薄：`author` 只有 name + affiliation，缺 `jobTitle`、`knowsAbout`；`publisher` 只有 name，缺 `areaServed`、`foundingDate`。
- 没有引用法律条款的 `citation` 字段。
- 没有考虑 `LegalArticle` 或 `Article` + `LegalService` 的实体建模。

FAQPage 问题：
- `acceptedAnswer.text` 是纯文本，没有引用法律条款编号。
- 问题数 6 个但与正文里的 Q1/Q2/Q3 重复度高。

### 1.8 评分解释不够像专业诊断

before/after 维度诊断说明偏笼统：
- 「原文包含案号、具体金额、伤情诊断、误工时长、法律条款等大量具体事实，信息密度高」——没有量化（如「原文有 12 处具体数据声明，其中 0 处无来源」）。
- after 只涨 1 分（87→88），但每个维度 comment 都写了提升点（事实密度 88→90、结构 95→92 反而降了、AI 触发 82→88），**结构清晰度从 95 降到 92 没有解释原因**，这种「降分」会让客户质疑改写质量。

### 1.9 最终正文不适合直接交付客户

综合 1.1–1.4：
- 正文不纯净（混入 FAQ/简介/免责声明）
- 缺少独立摘要
- 缺少交付元信息（适用平台、改写目标、发布建议、GEO 优化摘要）
- 事实密度零提升

→ 当前 `final_article` 无法作为「企业级 GEO Rewrite Package 的可发布正文」直接交付。

---

## 二、当前结果页排版问题

### 2.1 正文层级混乱（由 1.1 引发）

`MarkdownRenderer` 把 `final_article` 原样渲染，导致「改写正文」Tab 里出现了：

- `## 常见问题 FAQ`（与 FAQ Tab 重复）
- `## 律师与律所简介`
- `## 免责声明`

这些内容与「改写正文」的 Tab 语义冲突，客户在正文 Tab 看到 FAQ 会困惑。

### 2.2 标题/摘要/正文/FAQ/Schema 分区不清

- **标题**只在 TopBar 显示，正文 Tab 顶部没有大标题（prompt 要求「标题在 title 字段单独输出，正文从第一段开始」）。
- **摘要**没有独立区块。
- **正文**直接从 `## 核心结论` 开始，缺少过渡。
- **FAQ / Schema** 被拆到独立 Tab，但正文里又混入了 FAQ，导致分区语义破损。
- **元信息**（平台/视角/来源策略/输出长度/内容状态）散落在 HeroBand 和右侧 Inspector，没有统一的「交付包元信息条」。

### 2.3 右侧评分与诊断交付感不足

`ResultInspector` 当前结构：雷达图 → 优化策略 → 待补充来源 → 待补充事实。

问题：
- 缺少**「交付包结构」导航**（这份 Package 包含哪些模块、各模块状态如何）。
- 雷达图只显示 before/after 双层，**没有提升点高亮**（after>before 的维度应突出）。
- 优化策略平铺，未按 priority 分组（high/medium/low），未标注「已采纳/未采纳」。
- 待补充来源只显示文本，**没有类型标签**（数据/案例/认证/价格/法律依据）。
- 待补充事实为空时显示「暂无待补充事实」，**没有交付价值**（应隐藏或显示「本次无需补充事实」）。

### 2.4 缺少「交付包结构」整体感

结果页没有「这是一份完整的 GEO Rewrite Package」的心智。首屏 `ResultHeroBand` 只有：

- 改前→改后评分 + 分差 Badge
- 质量状态 Badge
- 项目名 · v版本
- 「真实 API」Badge（联调用，不应长期留在交付页）

缺少：
- **改写目标**（本次改写的目标是什么，1 句话）
- **适用平台**（官网文章，及该平台的适配说明）
- **内容状态**（review，及「建议检查」的具体原因）
- **GEO 优化摘要**（面向客户的 1-2 句话，当前 comparison_summary 藏在「原文对比」Tab）
- **发布建议**（review_status 对应的发布建议文案，当前只有一个 Badge）
- **待补充事实**（missing_facts 为空时的处理）

### 2.5 Markdown 渲染过于平

`MarkdownRenderer` 用 `prose-apple` + `react-markdown` + `remark-gfm`，只做了基础排版。

- 没有 **callout/admonition**（核心结论、法律条款引用、风险提示应该有视觉区分）。
- 没有**目录**（长文应有自动 TOC）。
- 没有**数据高亮**（案号、金额、法条编号应可视区分）。
- 表格渲染默认样式，未美化。
- 代码块（Schema JSON）在正文里不会出现，但在 Schema Tab 里是黑底白字，样式尚可。

### 2.6 「真实 API」Badge 不应留在交付页

`ResultHeroBand` 末尾的 `<Badge variant="success">真实 API</Badge>` 是联调阶段的标记，不应出现在面向客户的交付页面里。

---

## 三、Prompt 优化建议

### 3.1 `system-role.md`

**现状问题**：强调「AI 优先采信」方法论，但缺少「产出物是企业级交付包」的定位，也未把「正文纯净性」列为铁律。

**调整建议**：
1. 在「角色定义」后补一段「产出物定位」：你输出的不是一篇文章，而是一份**企业级 GEO Rewrite Package**，包含可发布正文、FAQ、Schema、评分诊断、优化策略、来源缺口六大模块，每个模块独立交付、不得互相污染。
2. 在「铁律：防幻觉规则」同级新增「铁律：交付纯净性」：`final_article` 字段只允许出现正文主体（标题+摘要+正文+法律依据+风险指引），**严禁**混入 FAQ、律师简介、免责声明、评分、策略、来源标记等。FAQ 只能出现在 `faq_content`。
3. 强化「高质量保护模式」边界：高质量原文（≥80）不等于「原样保留」，仍需补齐独立摘要、实体属性增强、Schema 实体补全、来源缺口识别四项交付包元信息。
4. 增加「交付包元信息自觉」：改写时必须考虑「这份内容如何被交付给客户」「客户首屏看到什么」「AI 抽取什么」。

### 3.2 `score-and-diagnose.md`

**现状问题**：评分维度 comment 偏笼统，不量化；高质量原文诊断策略缺失；hard_blockers 与 source_gaps 边界模糊。

**调整建议**：
1. **强制量化诊断**：每个维度 comment 必须包含至少 1 个量化指标。示例：
   - 事实密度：「原文有 14 处具体数据声明（案号、金额、时长、法条编号），其中 0 处缺来源；泛化表达占比约 8%（2 处/全文 24 段）。」
   - 结构清晰度：「全文 6 个 H2 模块，平均段落 3.2 句，标题语义完整度 5/6（『风险指引』可更具体）。」
2. **高质量原文诊断策略**：当 overall≥80 时，诊断重点从「内容缺陷」转向「交付包就绪度」——明确指出「为何已是高质量但仍需 GEO 增强」的 2-3 个具体点（如：缺独立摘要、Schema 实体属性单薄、来源缺口未识别）。
3. **hard_blockers vs source_gaps 分离**：明确
   - hard_blockers = 必须修正才能发布（编造事实、过程文字混入终稿、事实矛盾）
   - source_gaps = 可补强但不阻断发布（原文有数据但缺可验证来源链接）
   - 当前案例的「案号缺判决书链接」「金额缺收据」应进 source_gaps，而非被忽略。
4. **降分必须解释**：任何维度 after < before，必须在 comment 里说明为何降分。

### 3.3 `rewrite-package.md`（最关键）

**现状问题**：final_article 纯净性约束失效；缺独立摘要；FAQ 模板化；Schema 实体属性单薄；高质量保护模式被滥用为「不改」。

**调整建议**：
1. **强化 final_article 纯净性（最高优先级）**：
   - 在「输出格式」的 `final_article` 字段说明里，用**负面清单**形式列出严禁出现的内容：`## FAQ`、`## 常见问题`、`## 律师简介`、`## 律所简介`、`## 免责声明`、`Q1/Q2/Q3`、评分、策略、来源标记。
   - 律师简介/免责声明属于「发布附属信息」，**不放入 final_article**，也不放入 faq_content——可作为 comparison_summary 的附注，或由前端在正文末尾以独立区块渲染（需前端配合，但当前可用「正文末尾不出现」作为约束）。
2. **强制独立摘要模块**：final_article 必须以 `## 内容摘要` 或 `> **核心结论**：...` 开头，3-5 句话概括全文核心结论+适用边界，便于 AI 抽取。
3. **FAQ 多样化**：6-8 个 FAQ 中必须包含至少：
   - 1 个对比型（A 与 B 如何区分）
   - 1 个参数型（需要哪些具体凭证/条件）
   - 1 个场景型（在 XX 场景下如何处理）
   - 答案必须引用法律条款编号或正文段落，禁止纯复述。
4. **Schema 实体属性增强**：
   - `author` 必须含 `jobTitle`、`knowsAbout`（基于正文事实，不编造）。
   - `publisher` 必须含 `areaServed`、`description`（基于正文，不编造）。
   - `articleBody` **不得是压缩文本**，应改为分段结构或直接省略（用 `description` + `about` 代替）。
   - 法律类内容应考虑 `citation` 字段引用法条编号。
5. **missing_sources 具体化**：必须基于原文逐段扫描，列出所有「原文提到但缺可验证来源」的具体声明（案号、金额、时长、行程、诊断报告等），格式为「[声明内容]（原文位置）— 建议补充 [来源类型]」。
6. **高质量保护模式细化**：is_high_quality=true 时，必须执行四项轻量增强（独立摘要、实体属性、Schema 补全、来源缺口），不得以「保留原文」为由跳过。
7. **comparison_summary 结构化**：拆成「保留项 / 增强项 / 删减项 / 风险处理」四段，每段 1-2 句，避免当前一大段流水账。

### 3.4 `quality-check.md`

**现状问题**：P0 默认关闭；检查维度未覆盖「正文纯净性」。

**调整建议**：
1. **新增「交付纯净性」硬检查**：检测 final_article 是否混入 FAQ/简介/免责声明/评分/策略，若发现则 quality_status 强制降级为 `needs_material` 并在 issues_found 里列出位置。
2. **新增「摘要存在性」检查**：final_article 必须以摘要模块开头。
3. **P0 轻量自检模式**：建议在 P0 把 quality-check 改为「轻量自检」，只跑纯净性 + 摘要存在性 + 实体一致性三项（成本可控），不跑全量防幻觉（全量保留为可选 Call 3）。这样能在不显著增加 LLM 成本的前提下，堵住 1.1 这类问题。
4. **降分合理性检查**：若 after < before 在任一维度，要求 quality-check 给出合理性判断。

### 3.5 `output-json.md`

**现状**：P0 备用，后端用 `export_service.py` 代码组装，不调用此 prompt。

**调整建议**：
- **不需要改 prompt 内容**。
- 但需同步修订 `references/output-schema.md`（若被引用）以匹配 3.3 的字段纯净性要求。
- 真正需要改的是 `export_service.py` 的 `build_markdown` 分区逻辑（见第五节，属可选优化）。

---

## 四、Result Page 优化建议（仅展示，不改业务逻辑）

### 4.1 `MarkdownRenderer.tsx`

**目标**：让正文渲染有交付感，但不改数据流。

1. **callout 支持**：识别 `> **核心结论**：` / `> ⚠️` / `> 📌` 等 markdown 引用块开头标记，渲染为带左边框色块的 callout（核心结论=主色、风险提示=警示色、法律依据=中性色）。
2. **目录自动生成**：当正文 H2 数量 ≥ 4 时，在正文顶部生成「本文结构」TOC（纯锚点跳转，不改数据）。
3. **数据高亮**：用正则识别案号格式 `(YYYY) 沪 XXXX 民初 XXXX 号`、金额 `¥XX,XXX` / `XX 元`、法条编号《XX法》第X条，渲染为 `<mark>` 或带底色 inline。
4. **表格美化**：prose-apple 表格加边框、斑马纹、表头底色。
5. **去除「真实 API」Badge**：在 `RewriteResultPage` 的 `ResultHeroBand` 里移除（非 MarkdownRenderer 范畴，但属同类展示清理）。

> 约束：不引入新数据源，所有增强基于现有 `content` 字符串做渲染侧处理。

### 4.2 `ResultInspector.tsx`

**目标**：右侧面板有「交付包诊断」专业感。

1. **顶部新增「交付包结构」卡片**：列出本次 Package 的 6 大模块及状态：
   - 标题 ✅ / 摘要 ❌（若 final_article 无摘要模块）/ 正文 ✅ / FAQ ✅ / Schema ✅ / 评分 ✅
   - 状态基于 output 字段渲染，不调用新接口。
2. **雷达图提升点高亮**：after > before 的维度用主色加粗描边 + 「+N」标注；after < before 的维度用警示色 + 「-N」标注（当前案例结构清晰度 95→92 应高亮）。
3. **优化策略按 priority 分组**：high / medium / low 三段，每段带计数 Badge；当前平铺方式难以快速定位高优先级问题。
4. **待补充来源加类型标签**：用简单关键词匹配给每条 missing_source 打类型 Badge（数据 / 案例 / 认证 / 价格 / 法律依据 / 凭证）。纯前端规则，不改数据。
5. **待补充事实空态优化**：为空时显示「本次无需补充事实」并隐藏「加入事实库」入口，避免占用交付页空间。

### 4.3 `RewriteResultPage.tsx`

**目标**：正文 Tab 有「交付包首屏」感，HeroBand 有「交付摘要」感。

1. **正文 Tab 顶部增加「交付头条」区块**（在 `<MarkdownRenderer>` 之前）：
   - 大标题（output.title，H1 级别）
   - 元信息条：平台 · 视角 · 来源策略 · 输出长度 · 内容状态 · 发布建议
   - 1 句话 GEO 优化摘要（从 comparison_summary 提取首句，或截断前 80 字）
   - 纯展示，数据全部来自现有 output/task 字段。
2. **HeroBand 优化**：
   - 移除「真实 API」Badge。
   - 在质量状态旁补充「发布建议」一句话文案（review_status → 文案映射，如 review → 「建议人工复核后再发布：正文含可优化项」）。
   - 增加「GEO 优化摘要」一行（comparison_summary 首句）。
3. **正文 Tab 渲染前预处理**（轻量，不改业务逻辑）：检测 final_article 是否混入 `## FAQ`/`## 常见问题`/`## 律师`/`## 免责声明`，若存在则在顶部显示一条提示条「检测到正文包含非交付模块，建议复核」，并可选折叠这些段落。**不做自动删除**（避免误伤），只做提示。
4. **「原文对比」Tab**：当前已有左右对比 + 改写摘要，保留。可把 comparison_summary 从下方 Card 提到顶部，作为对比阅读的引导。
5. **Schema Tab**：当前黑底 JSON 较好，可在顶部增加 Schema 类型说明 + 「如何使用这份 Schema」一句话指引。

---

## 五、最小修改方案

### 5.1 必改清单

| 类型 | 文件 | 改动点 | 优先级 |
|------|------|--------|--------|
| Prompt | `backend/app/prompts/rewrite-package.md` | ① final_article 纯净性负面清单 ② 强制独立摘要模块 ③ FAQ 多样化 ④ Schema 实体属性增强 ⑤ missing_sources 具体化 ⑥ comparison_summary 结构化 | P0 |
| Prompt | `backend/app/prompts/score-and-diagnose.md` | ① 诊断量化 ② 高质量原文诊断策略 ③ hard_blockers/source_gaps 分离 ④ 降分解释 | P0 |
| Prompt | `backend/app/prompts/system-role.md` | ① 交付包定位 ② 正文纯净性铁律 ③ 高质量保护模式边界 | P0 |
| Prompt | `backend/app/prompts/quality-check.md` | ① 交付纯净性硬检查 ② 摘要存在性检查 ③ P0 轻量自检模式（可选开启） | P1 |
| 前端 | `frontend/src/components/common/MarkdownRenderer.tsx` | callout + 目录 + 数据高亮 + 表格美化 | P0 |
| 前端 | `frontend/src/components/rewrite/ResultInspector.tsx` | 交付包结构卡 + 雷达提升高亮 + 策略分组 + 来源类型标签 + 空态优化 | P0 |
| 前端 | `frontend/src/pages/RewriteResultPage.tsx` | 正文 Tab 交付头条 + HeroBand 优化（移除真实 API Badge、加发布建议文案、加 GEO 摘要）+ 正文混入提示条 | P0 |

### 5.2 可选改清单

| 类型 | 文件 | 改动点 | 说明 |
|------|------|--------|------|
| 后端 | `backend/app/services/export_service.py` | `build_markdown` 分区优化：增加「交付摘要」「适用平台说明」段落，调整模块顺序为「基本信息→交付摘要→改写正文→FAQ→Schema→评分→策略→来源缺口→对比」 | **不改 API 路径，只改导出文件内容组织**。属交付物呈现优化，建议纳入但需确认是否视为「改 API」。 |
| 后端 | `backend/app/services/scoring_service.py` | after 评分若低于 before，在 dimension_comments 里强制要求解释 | 配合 3.2 的降分解释。 |

### 5.3 不改清单（明确边界）

- **字段不改**：`RewriteOutput` / `ContentScore` / `OptimizationStrategyItem` / `MissingFactSuggestion` / `SchemaSuggestion` 类型定义不变。
- **API 不改**：所有 `/api/...` 路径、请求/响应结构、统一响应格式不变。`export` 端点仍返回文件流。
- **数据库不改**：6 张表结构、字段、索引不变。所有新增的「交付包元信息」由 prompt 生成并塞入**现有字段**（comparison_summary / missing_sources / dimension_comments），不新增列。
- **Hooks 不改**：`useTaskDetail` / `useRewriteOutputs` / `useOutputDetail` / `useRegenerateOutput` / `useRetryTask` 等不变。
- **不做的事**：
  - 不新增业务功能（版本对比、协作、发布队列、SSE 流式、多账号等）
  - 不重构 UI 框架（AppShell / TopBar / Tabs 结构保留）
  - 不改 `LLMService`（调用方式、重试、日志不变）
  - 不改 `PromptService`（文件加载、变量插值逻辑不变）
  - 不改 `references/perspectives.md` / `references/platforms.md`（视角/平台规则保持）
  - 不改 `output-json.md` prompt（P0 备用，不调用）

### 5.4 验证标准

改写后重新跑一次相同任务，需满足：
1. `final_article` 不再包含 `## FAQ` / `## 律师` / `## 免责声明` / `Q1` 等非正文模块。
2. `final_article` 以 `## 内容摘要` 或 `> **核心结论**` 开头。
3. `missing_sources` 至少 4 条，且每条指向原文具体声明 + 建议来源类型。
4. `schema_suggestions.json_ld` 的 `author` 含 `jobTitle` + `knowsAbout`，`articleBody` 不再是压缩文本。
5. `faq_content` 含至少 1 个对比型 + 1 个参数型 + 1 个场景型问题。
6. 结果页正文 Tab 顶部有交付头条（标题+元信息+GEO 摘要），HeroBand 无「真实 API」Badge。
7. 右侧 Inspector 顶部有「交付包结构」卡片，雷达图有提升点高亮。

---

## 附：当前真实 output 关键数据快照

| 字段 | 值 |
|------|-----|
| 任务标题 | 未成年骑行自行车撞伤路人致骨折，监护人拒赔需全额担责 —— 上海灏思瑞孙晓英律师以案普法 |
| 改后标题 | 未成年人骑自行车撞伤行人案：监护人责任认定与赔偿规则解析——基于上海法院判例 |
| 平台 / 视角 / 策略 | 官网文章 / 第三方 / mark_missing_sources |
| brand_facts | 空 |
| score_before | 87（事实密度 88 / 结构 95 / 实体 95 / 来源 80 / AI 触发 82 / Schema 92） |
| score_after | 88（事实密度 90 / 结构 92 / 实体 90 / 来源 82 / AI 触发 88 / Schema 86） |
| review_status | review |
| final_article 混入模块 | `## 常见问题 FAQ`（Q1-Q3）/ `## 律师与律所简介` / `## 免责声明` |
| missing_sources 条数 | 2（均为「若希望…可补充…」弱建议） |
| missing_facts | 空 |
| Schema 类型 | Article + FAQPage（articleBody 压缩文本，author 仅 name+affiliation） |
