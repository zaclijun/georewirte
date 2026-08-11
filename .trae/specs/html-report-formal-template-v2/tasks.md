# Tasks

- [x] Task 1: 重写 exportHtml.ts 报告容器与 Header
  - [x] SubTask 1.1: 将 body 改为浅灰背景 + `.report` 容器（max-width 980px、白底、subtle border、border-radius 12px），移除大渐变 Hero
  - [x] SubTask 1.2: 新增正式 report-header（左右结构：左侧 kicker「GEO 内容优化报告」+ h1 文章标题 + meta 行；右侧 logo-fallback「GEO」），底部 3px 蓝色强调线
  - [x] SubTask 1.3: Section 改为 `.section`（padding-top + border-top 分割线），替换大圆角阴影卡片；新增 `.mini-panel` 小型面板用于两栏
  - [x] SubTask 1.4: 主题色统一为蓝色（`--report-accent: #2563eb` / `--report-accent-dark: #1d4ed8` / `--report-accent-soft: #eff6ff`），移除红色调

- [x] Task 2: 实现发布检查摘要节
  - [x] SubTask 2.1: 新增「发布检查摘要」section 作为 Header 后第一节
  - [x] SubTask 2.2: 实现 5 个 summary-card（发布状态 / 终稿评分 / 评分变化 / 待补来源数 / 质量状态），无评分时显示「—」
  - [x] SubTask 2.3: 实现两栏 `.two-col`：「为什么是这个状态」（基于质量门禁 + 来源缺口生成）+ 「主要优化点」（基于 optimization_strategy 前 N 条生成）

- [x] Task 3: 实现 Score Hero 评分诊断
  - [x] SubTask 3.1: 新增 `renderScoreHero(scoreSummary, variant)` 函数，输出总分大数字 + A-E 等级 badge + 维度评分条
  - [x] SubTask 3.2: 等级规则 90+ A / 80-89 B / 70-79 C / 60-69 D / <60 E
  - [x] SubTask 3.3: 初稿评分 Hero（蓝灰/深蓝调）+ 终稿评分 Hero（蓝色/绿色调），无评分时显示「暂无评分数据」
  - [x] SubTask 3.4: 替换原维度评分长表格为 Score Hero 内的维度评分条

- [x] Task 4: 调整报告顺序与合并节
  - [x] SubTask 4.1: 按新顺序排列 section：Header → 发布检查摘要 → 评分诊断 → 主要优化建议 → 待补证据与风险 → 终稿正文 → 原始素材 → FAQ/发布建议 → 免责声明 → Footer
  - [x] SubTask 4.2: 将「来源缺口」与「待补充事实」合并为「待补证据与风险」一节，内含两个子块 + callout/风险列表样式
  - [x] SubTask 4.3: 优化建议提前到正文之前，按高/中/低优先级分组，badge 颜色区分（红/橙/绿）

- [x] Task 5: 终稿正文与原始素材顺序调整
  - [x] SubTask 5.1: 终稿正文 section 移到原始素材之前
  - [x] SubTask 5.2: 移除长文左右并排全文对比结构，改为各自独立 `.article-body` 展示
  - [x] SubTask 5.3: 原始素材用 `.muted-article` 弱化样式

- [x] Task 6: 实现终稿正文复制按钮（离线 JS）
  - [x] SubTask 6.1: 终稿正文 section 标题右侧加 `<button class="copy-final-btn" data-copy-final>复制终稿正文</button>`
  - [x] SubTask 6.2: 用 `JSON.stringify(cleanFinalArticle(output.final_article, assetType))` 安全注入 `<script>` 变量 `FINAL_ARTICLE_TEXT`
  - [x] SubTask 6.3: 内置复制脚本：navigator.clipboard 优先，fallback textarea + execCommand('copy')；点击后显示「已复制」1.6s 恢复；失败显示「复制失败，请手动选择正文」
  - [x] SubTask 6.4: 展示用 `renderMarkdownLikeHtml(cleanedArticle)`，复制用 `cleanFinalArticle` 原文（两份数据独立注入）
  - [x] SubTask 6.5: 打印样式隐藏复制按钮

- [x] Task 7: 发布建议 / FAQ / 打印 / 旧任务兼容收尾
  - [x] SubTask 7.1: FAQ 剥离开头重复 `## FAQ` 标题，用 renderMarkdownLikeHtml 渲染
  - [x] SubTask 7.2: 发布建议 PlatformPublishGuide 继续卡片化，不展示原始 JSON；普通 Schema 美化展示
  - [x] SubTask 7.3: 打印样式：A4、body 白底、`.report` 去边框圆角阴影、section break-inside avoid、复制按钮隐藏
  - [x] SubTask 7.4: 已下线平台 meta 显示「历史内容资产」，底部小提示；无评分/无建议/无缺口均不报错

- [x] Task 8: 构建验证与报告
  - [x] SubTask 8.1: `npx tsc --noEmit` 通过
  - [x] SubTask 8.2: `npm run build` 通过
  - [x] SubTask 8.3: 输出 `html-report-formal-template-v2-report.md`

# Task Dependencies
- Task 2/3/4/5/6 可在 Task 1 容器与样式基础上并行规划，但实现时按顺序写入同一文件 exportHtml.ts，建议串行实现
- Task 7 依赖 Task 1-6 完成
- Task 8 依赖 Task 1-7 完成
