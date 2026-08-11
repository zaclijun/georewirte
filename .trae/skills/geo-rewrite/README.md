# geo-rewrite Skill 包

将 GEO（生成式引擎优化）内容改写功能封装为可复用的项目内 skill。基于 DSS+E 黄金模型与内容资产类型体系，把传统文章重构为更容易被生成式 AI 理解、采信、抽取、引用与推荐的内容。

## 目录结构

```
.trae/skills/geo-rewrite/
├── SKILL.md                    # 主规范：方法论 + 输入/输出 + 评分体系（自包含，可对话式直接执行）
├── README.md                   # 本说明文件
├── references/                 # 规则参考资料（SKILL.md 与 prompts 共用）
│   ├── perspectives.md         # 9 种视角规则
│   ├── platforms.md            # 内容资产类型（6 类）与旧平台规则
│   └── output-schema.md        # 结构化输出 JSON Schema
└── prompts/                    # 工程化 prompt 模板（工作台/API 多步调用）
    ├── system-role.md          # 系统角色定义（每次调用共用）
    ├── score-and-diagnose.md   # Call 1：评分 + 诊断 + 优化策略
    ├── rewrite-package.md      # Call 2：GEO 改写 + FAQ + Schema/发布建议 + 改后评分
    ├── quality-check.md        # Call 3（可选）：质量审核
    ├── output-json.md          # 输出整合参考
    └── references/             # 与顶层 references/ 同源（供 prompt 相对引用）
```

## 使用方式

### 1. 对话式

直接把原文与参数（`mode` / `asset_type` / `perspective` / `source_policy` 等）交给 skill 执行即可，SKILL.md 自包含全部规范。

### 2. 工作台 / API 集成

按「评分诊断 → 改写打包 → 质量检查」多步调用 `prompts/` 模板（详见 SKILL.md「工程化调用」章节），后端实现参考 `backend/app/services/`（`prompt_service.py`、`rewrite_service.py`、`scoring_service.py`）。

## 版本

- v2.0：引入内容资产类型体系（6 类）与资产类型专属评分维度，取代旧平台体系。
- 与后端 `backend/app/prompts/` 保持同源同步。

## 说明

- 不得编造数据、来源与案例；缺失来源必须进入 `missing_sources`。
- `final_article` 为可发布正文，严禁混入 FAQ / Schema / 评分 / 策略 / 发布建议等元信息。
