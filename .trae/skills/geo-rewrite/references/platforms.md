# Platform Rules

Use these rules only after understanding the article and requested audience.

## 官网文章

- Stable knowledge-base structure: definition, capability, scenarios, evidence, FAQ.
- Good for brand facts, product pages, solution pages, help content, and long-term AI citation.

## 公众号

- Mobile-friendly narrative, clear section rhythm, complete argument, readable Chinese longform.
- Keep headings concrete and paragraphs compact.

## 知乎专栏

- Explanation and decision-support structure.
- Include question framing, selection criteria, scenarios, comparisons, and caveats.

## 小红书

- Practical, short, scenario-based, checklist-friendly.
- Avoid heavy jargon, exaggerated promises, and unverifiable claims.

## 微博

- Short summary version with 3-5 key points.
- Keep claims tight and source-aware.

## 抖音

- Output script-like structure: hook, segments, subtitle points, closing action.
- Avoid claims that require unavailable proof.

## LinkedIn

- International B2B tone, industry framing, business value, evidence, professional credibility.

## X/Twitter

- Thread-friendly points; each point should be independently understandable.

## YouTube

- Video script with title, hook, chapters, narration bullets, and close.

## 行业媒体

- Objective, evidence-led, with industry background and source labels.

## 新闻稿

- Inverted pyramid; first paragraphs answer who, what, when, where, why, and impact.
- Avoid marketing headlines and unsupported comparative claims.

---

# 内容资产类型规则（P0 启用 6 类）

以下 6 类取代旧「平台稿件」作为一级生成目标。旧平台值（官网文章 / 公众号 / 知乎问答 / 小红书）仅用于历史任务兼容，新任务必须使用以下 6 类之一。

## 自有官网内容

- 用于官网、帮助中心、知识库页面，强化 AI 可抓取、可理解、可引用的品牌事实。
- Stable knowledge-base structure: definition, capability, scenarios, evidence, FAQ.
- 生成 Schema JSON-LD（Article / FAQPage / Service 等，按内容选择）。
- 强调长期 AI 引用价值，结构要经得起时间考验。
- 对应旧平台：官网文章。

## 新闻通稿 / 权威背书稿

- 用于品牌发布、产品发布、合作动态和对外传播，语气正式克制，适合媒体转载或公关发布。
- Formal, restrained press-release tone; minimize marketing language.
- Inverted pyramid: lead answers who/what/when/where/why; body adds background and key facts.
- 不得假装已被某某官媒报道；不得冒用媒体身份；不得写「新华社报道」「人民日报报道」等虚假来源；不得伪造领导发言、合作方发言、数据。
- 不生成 Schema JSON-LD，输出 PlatformPublishGuide（含 headline_options / lead / key_facts / media_publish_notes / risk_notes）。

## 行业垂媒稿

- 用于行业媒体、垂直媒体或产业内容场景，让品牌进入行业语境。
- Objective, evidence-led, with industry background and source labels.
- 必须包含：行业背景、用户痛点、品牌/产品/服务切入、行业趋势关联、场景化表达。
- 专业但不硬广；不得假装已经被某行业媒体报道；不得编造行业数据；不得虚构第三方评价。
- 不生成 Schema JSON-LD，输出 PlatformPublishGuide（含 industry_angle / key_points / source_gaps / publish_advice）。

## 问答型内容

- 用于知乎、FAQ、搜索问答和 AI 问答素材，覆盖用户真实决策问题。
- Explanation and decision-support structure: question framing, clear conclusion first, then evidence.
- 问题导向、结论先行、分点论证、事实依据、常见追问。
- 适合 FAQ / 知乎 / AI 问答场景的结构。
- 对应旧平台：知乎问答。
- 不生成 Schema JSON-LD，输出 PlatformPublishGuide（含 question_title / answer_summary / follow_up_questions / source_gaps）。

## 案例 / 客户故事

- 用于客户案例、服务案例、项目复盘和成功故事，证明品牌真实解决过问题。
- Structure: background → problem → solution → execution → result → reusable experience.
- 真实、具体、问题-解决方案-结果结构。
- 不得编造客户名称、结果数据、合作细节；缺少案例事实时必须标注「待补充事实」。
- 不生成 Schema JSON-LD，输出 PlatformPublishGuide（含 case_structure / missing_case_facts / publish_advice）。

## 企业自媒体稿

- 用于公众号、企业号、品牌动态等自媒体渠道，提升可读性和传播表达。
- Mobile-friendly narrative, clear section rhythm, complete argument, readable Chinese longform.
- 适合公众号 / 企业号，移动端可读，有传播感但不过度营销。
- Keep headings concrete and paragraphs compact.
- 对应旧平台：公众号。
- 不生成 Schema JSON-LD，输出 PlatformPublishGuide（含 headline_options / opening_hook / publish_advice / cta）。
