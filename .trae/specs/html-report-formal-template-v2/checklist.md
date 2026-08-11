# Checklist

## 报告容器与 Header
- [x] HTML 报告主体是 `.report` 容器（max-width 980px、白底、subtle border），不再是满屏渐变 Hero
- [x] 顶部是正式 report-header（左侧 kicker + h1 标题 + meta；右侧 logo-fallback「GEO」）
- [x] Header 底部有 3px 蓝色强调线
- [x] Section 之间用 border-top 分割线分隔，不是大圆角阴影卡片堆叠
- [x] 主题色为克制蓝色（#2563eb / #1d4ed8 / #eff6ff），无红色主题

## 发布检查摘要
- [x] Header 后第一节是「发布检查摘要」
- [x] 包含 5 个摘要卡片：发布状态 / 终稿评分 / 评分变化 / 待补来源数 / 质量状态
- [x] 有「为什么是这个状态」和「主要优化点」两栏
- [x] 旧任务无评分时卡片显示「—」不报错

## 评分诊断 Score Hero
- [x] 评分诊断使用 Score Hero（总分大数字 + A-E 等级 + 维度评分条）
- [x] 同时展示初稿评分和终稿评分
- [x] 等级规则：90+ A，80-89 B，70-79 C，60-69 D，<60 E
- [x] 不再使用拥挤长表格

## 报告顺序
- [x] 顺序为：Header → 发布检查摘要 → 评分诊断 → 主要优化建议 → 待补证据与风险 → 终稿正文 → 原始素材 → FAQ/发布建议 → 免责声明 → Footer
- [x] 优化建议在正文之前
- [x] 终稿正文在原始素材之前
- [x] 不使用长文左右并排全文对比作为主结构

## 待补证据与风险
- [x] 「来源缺口」与「待补充事实」合并为「待补证据与风险」一节
- [x] 内含两个子块（来源缺口 / 待补充事实）
- [x] 无缺口时显示「暂无明显来源缺口」/「暂无待补充事实」
- [x] 使用 callout / 风险列表样式

## 终稿正文复制按钮
- [x] 「终稿正文」标题右侧有「复制终稿正文」按钮
- [x] 点击后显示「已复制」反馈约 1.6s
- [x] 复制内容是 `cleanFinalArticle(output.final_article, assetType)` 结果
- [x] 复制内容无 `#` / `##` / `###`
- [x] 复制内容不含原文、评分、优化建议、来源缺口、待补事实、免责声明、HTML 标签、报告元信息
- [x] 复用 cleanFinalArticle，未重新实现清洗逻辑
- [x] 通过 JSON.stringify 安全注入 `<script>` 变量
- [x] file:// 本地打开时 fallback textarea + execCommand 生效
- [x] 复制失败显示「复制失败，请手动选择正文」
- [x] 展示用 renderMarkdownLikeHtml，复制用 cleanFinalArticle，两者独立

## 优化建议
- [x] 按高/中/低优先级分组或标注 badge
- [x] 高优先级红色 badge、中优先级橙色 badge、低优先级绿色 badge
- [x] 每条显示问题、建议动作、证据

## Markdown 渲染
- [x] 标题/加粗/blockquote/列表正常渲染
- [x] HTML 报告不再出现 `##`、`###`、`**`、`>` 等原始 Markdown 符号
- [x] FAQ 剥离开头重复 `## FAQ` 标题

## 发布建议
- [x] PlatformPublishGuide 转为可读字段卡片，不展示原始 JSON
- [x] 不展示 image_text_transcript / package_type / canonical_content_suggestion 原始字段名
- [x] 图文卡片脚本以卡片方式展示

## 旧任务与已下线平台
- [x] 旧任务无评分/无建议/无缺口时不报错
- [x] 已下线平台 meta 显示「历史内容资产」，不在首屏强调
- [x] 历史提示放底部小提示

## 打印样式
- [x] @page A4
- [x] 打印时 body 白底
- [x] 打印时 .report 去边框圆角阴影
- [x] 打印时 section break-inside avoid
- [x] 打印时复制按钮隐藏

## 不受影响
- [x] 结果页复制正文功能不受影响（cleanArticle.ts 未改动）
- [x] Markdown 导出功能不受影响（ExportButton markdown 分支未改动）
- [x] 未改后端 API
- [x] 未改数据库

## 构建验证
- [x] npx tsc --noEmit 通过
- [x] npm run build 通过
- [x] HTML 文件离线打开正常
