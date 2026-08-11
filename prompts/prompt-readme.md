# GEO Rewrite Prompt 文件说明文档

> **版本**：v1.0 (P0)
> **生成日期**：2026-06-26
> **适用范围**：GEO 内容改写工作台 P0 版本

---

## 目录结构

```
prompts/
├── system-role.md            # 系统角色定义（所有调用共用的 system prompt）
├── score-and-diagnose.md     # Call 1：原文评分 + 问题诊断 + 优化策略
├── rewrite-package.md        # Call 2：GEO 改写 + FAQ + Schema + 改后评分
├── quality-check.md          # Call 3：质量检查（可选，默认关闭）
├── output-json.md            # 输出整合（可选，后端可直接用代码组装）
└── references/               # 参考资料（从原 Skill 复制）
    ├── perspectives.md       # 9 种视角规则
    └── platforms.md          # 11 种平台规则（P0 启用 4 个）
```

---

## 调用流程（2-3 次模型调用）

### P0 默认：2 次调用

```
用户输入（原文 + 参数）
    │
    ▼
Call 1：score-and-diagnose.md
    │  输入：article + perspective + platform + brand_facts + source_policy
    │  输出：score_before + diagnosis + optimization_strategy + is_high_quality
    │
    ▼
Call 2：rewrite-package.md
    │  输入：article + 所有参数 + is_high_quality + optimization_strategy
    │  输出：title + final_article + FAQ + Schema + score_after + comparison + missing_sources
    │
    ▼
最终结果（后端组装为标准 JSON / Markdown 导出）
```

### 可选：3 次调用（高保障模式）

```
... Call 2 完成后
    │
    ▼
Call 3：quality-check.md（可选）
    │  输入：original_article + rewritten_article + brand_facts + source_policy
    │  输出：quality_status + reasons + warnings + issues_found
    │
    ▼
最终结果（含质量审核结论）
```

---

## 各 Prompt 文件详细说明

### 1. system-role.md

**用途**：系统角色定义，作为每次 LLM 调用的 system message。

**输入变量**：无（固定内容）

**内容要点**：
- GEO 内容架构师角色定义
- DSS+E 核心方法论（Depth / Support / Sources / Entity）
- 防幻觉铁律（8 项绝对禁止）
- AI Trigger Pattern（定义句、对比句、因果句、总结句、证据句、场景句）
- 语言风格规范
- 三种来源策略说明
- 内容质量底线

**使用方式**：
- 每次 LLM 调用都作为 system prompt 传入
- 不与用户消息混在一起

**建议温度**：不适用（system prompt 无温度概念）

---

### 2. score-and-diagnose.md

**用途**：Call 1 — 对原文进行 6 维 GEO 评分、问题诊断、优化策略生成。

**输入变量**：

| 变量名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `{{article}}` | string | 是 | 待评分的原文内容 |
| `{{perspective}}` | string | 是 | 写作视角名称 |
| `{{perspective_rules}}` | string | 是 | 对应视角的规则文本（从 perspectives.md 提取） |
| `{{platform}}` | string | 是 | 发布平台名称 |
| `{{platform_rules}}` | string | 是 | 对应平台的规则文本（从 platforms.md 提取） |
| `{{brand_facts}}` | string | 否 | 品牌事实列表 JSON 字符串 |
| `{{source_policy}}` | string | 是 | 来源策略 |

**输出 JSON 结构**：

```json
{
  "score_before": {
    "overall": 75,
    "dimensions": [
      { "name": "事实密度", "score": 70, "comment": "..." },
      { "name": "结构清晰度", "score": 80, "comment": "..." },
      { "name": "实体一致性", "score": 75, "comment": "..." },
      { "name": "来源权威性", "score": 65, "comment": "..." },
      { "name": "AI 触发覆盖", "score": 72, "comment": "..." },
      { "name": "Schema 就绪度", "score": 68, "comment": "..." }
    ]
  },
  "diagnosis": {
    "hard_blockers": ["硬阻断问题1"],
    "issues": [
      { "type": "factual", "severity": "high", "description": "..." }
    ],
    "source_gaps": ["缺失的数据来源"]
  },
  "is_high_quality": false,
  "optimization_strategy": [
    {
      "issue": "问题描述",
      "action": "优化动作",
      "priority": "high",
      "evidence": "依据或参考"
    }
  ]
}
```

**评分维度说明**：
1. **事实密度**：具体事实、数据、案例、定义的含量
2. **结构清晰度**：层级结构、逻辑连贯、标题语义化
3. **实体一致性**：品牌/产品/术语命名统一性
4. **来源权威性**：引用来源可信度和多源验证程度
5. **AI 触发覆盖**：AI Trigger Pattern 使用频率和质量
6. **Schema 就绪度**：结构化解析为 Schema 的难易程度

**建议温度**：0.1（评分需要客观稳定）

---

### 3. rewrite-package.md

**用途**：Call 2 — 核心改写，一次性输出正文 + FAQ + Schema + 改后评分。

**输入变量**：

| 变量名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `{{article}}` | string | 是 | 原文 |
| `{{brand_facts}}` | string | 否 | 品牌事实列表 JSON 字符串 |
| `{{perspective}}` | string | 是 | 视角 |
| `{{perspective_rules}}` | string | 是 | 视角规则 |
| `{{platform}}` | string | 是 | 平台 |
| `{{platform_rules}}` | string | 是 | 平台规则 |
| `{{source_policy}}` | string | 是 | 来源策略 |
| `{{output_length}}` | string | 是 | 输出长度：short/standard/long |
| `{{is_high_quality}}` | string | 是 | 是否高质量原文：true/false |
| `{{optimization_strategy}}` | string | 是 | 优化策略 JSON 字符串 |
| `{{need_schema}}` | string | 是 | 是否生成 Schema：true/false |
| `{{brand}}` | string | 否 | 品牌名称 |
| `{{product}}` | string | 否 | 产品名称 |
| `{{audience}}` | string | 否 | 目标读者描述 |
| `{{article_type}}` | string | 否 | 文章类型 |

**输出 JSON 结构**：

```json
{
  "title": "改写后的标题",
  "final_article": "纯净可发布 Markdown 正文（不含评分/策略/FAQ/Schema）",
  "faq_content": "## FAQ\n\n### 问题1？\n\n答案1",
  "schema_suggestions": {
    "type": "Article/FAQPage",
    "json_ld": { ... }
  },
  "score_after": {
    "overall": 90,
    "dimensions": [
      { "name": "事实密度", "score": 92, "comment": "..." }
    ]
  },
  "comparison_summary": "前后对比摘要",
  "missing_sources": ["待补充来源1", "待补充来源2"]
}
```

**核心特性**：
- 基于 DSS+E 方法论进行改写
- 支持高质量保护模式（is_high_quality = true 时轻量增强）
- 自动融入 AI Trigger Pattern
- 按平台和视角规则适配内容风格
- FAQ 数量 5-8 个，基于正文内容
- Schema 建议默认包含 Article + FAQPage
- 改后评分客观真实，不虚高
- missing_sources 列出所有缺失证据

**建议温度**：0.3（改写需要一定创造性，但不能太发散）

---

### 4. quality-check.md

**用途**：Call 3（可选）— 最终质量检查，P0 默认关闭。

**输入变量**：

| 变量名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `{{original_article}}` | string | 是 | 原文 |
| `{{rewritten_article}}` | string | 是 | 改写后正文 |
| `{{brand_facts}}` | string | 否 | 品牌事实 |
| `{{source_policy}}` | string | 是 | 来源策略 |
| `{{hard_blockers_before}}` | string | 是 | 原文硬阻断列表 JSON 字符串 |
| `{{missing_sources_list}}` | string | 是 | 待补充来源列表 JSON 字符串 |

**输出 JSON 结构**：

```json
{
  "passed": true,
  "quality_status": "ready",
  "publish_label": "可发布",
  "reasons": ["事实准确", "实体一致", "无编造内容"],
  "highlights": ["事实密度提升 20%", "结构更清晰"],
  "warnings": ["部分数据建议补充来源"],
  "missing_sources": ["补充来源列表"],
  "issues_found": [
    {
      "type": "fact_check",
      "severity": "low",
      "description": "...",
      "location": "正文第 2 段"
    }
  ]
}
```

**检查维度**：
1. 事实真实性检查（防幻觉）
2. 实体一致性检查
3. 来源策略合规检查
4. 语气与合规检查
5. 结构完整性检查

**质量状态枚举**：
- `ready` / `可发布`：内容质量合格
- `review` / `建议检查`：存在小问题，建议人工复核
- `needs_material` / `需补充材料`：关键信息缺失，必须补充

**建议温度**：0.1（质量检查需要客观严谨）

---

### 5. output-json.md

**用途**：将所有结果整合成标准输出格式（备用，P0 后端可直接用代码组装）。

**输入变量**：所有结果字段（title、score_before、final_article、score_after 等）

**输出**：完整 JSON（参考 references/output-schema.md）

**P0 说明**：
- 后端可以直接用代码组装最终输出，不需要调用此 Prompt
- 此文件作为参考和后续扩展备用
- 如果后续需要 AI 智能整合（如自动生成 comparison 摘要），可启用此 Prompt

---

## 视角 & 平台规则使用方式

### perspectives.md（9 个视角）

| 视角 | UI 展示 | 说明 |
|------|---------|------|
| 品牌方 | ✅ 常用 | 第一人称视角，官方事实 |
| 第三方 | ✅ 常用 | 中立行业观察者，默认视角 |
| 用户/客户 | ✅ 常用 | 使用体验、实际场景 |
| 媒体/新闻 | ✅ 常用 | 5W1H 倒金字塔 |
| 内部/员工 | ✅ 常用 | 内部语境、SOP 清晰 |
| 合作商 | 更多视角 | 生态适配、联合方案 |
| 投资者 | 更多视角 | 市场背景、商业模式 |
| 政府/监管 | 更多视角 | 合规优先、边界清晰 |
| 学术/科研 | 更多视角 | 方法严谨、可复现性 |

### platforms.md（P0 启用 4 个）

| 平台 | P0 状态 | 内容特点 |
|------|---------|----------|
| 官网文章 | ✅ 启用 | 知识库式稳定结构 |
| 公众号 | ✅ 启用 | 移动端友好叙事 |
| 知乎问答 | ✅ 启用 | 解释型+决策支持型 |
| 小红书 | ✅ 启用 | 实用、简短、清单式 |
| 微博 | ❌ P1 | |
| 抖音 | ❌ P2 | |
| LinkedIn | ❌ P2 | |
| X/Twitter | ❌ P2 | |
| YouTube | ❌ P2 | |
| 行业媒体 | ❌ P2 | |
| 新闻稿 | ❌ P2 | |

**使用方式**：
1. PromptService 根据传入的 perspective / platform 参数
2. 从 references/perspectives.md 和 references/platforms.md 中提取对应规则
3. 注入到 `{{perspective_rules}}` 和 `{{platform_rules}}` 变量中
4. 不需要把所有视角和平台的规则都写进每个 Prompt 文件

---

## 核心规则保留清单

| 规则 | 所在文件 | 说明 |
|------|----------|------|
| DSS+E 方法论 | system-role.md + rewrite-package.md | 核心改写框架 |
| 6 维 GEO Scorecard | score-and-diagnose.md + rewrite-package.md | 评分体系 |
| source_policy 三策略 | system-role.md + 所有 Prompt | 来源策略 |
| 防幻觉规则 | system-role.md + quality-check.md | 内容安全底线 |
| AI Trigger Pattern | system-role.md + rewrite-package.md | AI 友好写作模式 |
| 高质量保护模式 | score-and-diagnose.md + rewrite-package.md | 高分内容轻量增强 |
| 9 个视角规则 | references/perspectives.md | 视角适配 |
| 11 个平台规则 | references/platforms.md | 平台适配（P0 用 4 个） |
| hard blockers | score-and-diagnose.md | 硬阻断判定 |
| missing_sources | rewrite-package.md + quality-check.md | 缺失来源标记 |

---

## 后端集成建议

### PromptService 设计

```python
class PromptService:
    def load_prompt(self, name: str) -> str:
        """从文件加载 Prompt 模板"""
        pass

    def interpolate(self, template: str, variables: dict) -> str:
        """变量插值，替换 {{variable}}"""
        pass

    def get_perspective_rules(self, perspective: str) -> str:
        """从 perspectives.md 提取对应视角规则"""
        pass

    def get_platform_rules(self, platform: str) -> str:
        """从 platforms.md 提取对应平台规则"""
        pass
```

### LLM 调用封装建议

```python
class LLMService:
    def call_score_diagnose(self, params) -> dict:
        """Call 1：评分 + 诊断 + 策略"""
        system_prompt = prompt_service.load("system-role.md")
        user_prompt = prompt_service.load("score-and-diagnose.md")
        user_prompt = prompt_service.interpolate(user_prompt, params)
        # 调用 LLM，开启 JSON Mode
        # 解析返回 JSON
        return result

    def call_rewrite_package(self, params) -> dict:
        """Call 2：改写 + FAQ + Schema + 改后评分"""
        # 类似
        pass

    def call_quality_check(self, params) -> dict:
        """Call 3：质量检查（可选）"""
        # 类似
        pass
```

### 错误处理建议

1. **JSON 解析失败**：自动重试 1 次，仍失败则记录错误，任务状态设为 failed
2. **字段缺失**：使用默认值填充，关键字段缺失则重试
3. **LLM 超时**：重试 1 次，仍失败则记录错误
4. **评分异常**：改后评分低于改前评分时，记录警告（可能是正常情况，如删减了无依据内容）

---

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-06-26 | P0 初始版本，5 个 Prompt 文件，4 个平台，9 个视角 |
