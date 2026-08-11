import type { BrandFact, Project, RewriteOutput, RewriteTask } from '@/types'

/**
 * Mock 数据 - P0 静态 UI 用
 * 不接真实 API；字段对齐接口契约草案
 */

const now = new Date()
const iso = (offsetHours = 0) =>
  new Date(now.getTime() - offsetHours * 3600 * 1000).toISOString()

// ===== Projects =====
export const mockProjects: Project[] = [
  {
    id: 'proj-001',
    name: 'Acme 企业服务',
    description: 'B2B SaaS 品牌内容治理。覆盖产品介绍、客户案例、行业研究三类内容。',
    brand_name: 'Acme',
    default_perspective: '第三方',
    default_platform: '官网文章',
    workspace_type: 'brand',
    task_count: 12,
    avg_geo_score: 86,
    last_task_at: iso(2),
    created_at: iso(24 * 30),
    updated_at: iso(2),
  },
  {
    id: 'proj-002',
    name: 'Lumen 智能硬件',
    description: '消费电子品牌官网与公众号内容改写，强调产品参数与认证一致性。',
    brand_name: 'Lumen',
    default_perspective: '品牌方',
    default_platform: '公众号',
    workspace_type: 'media',
    task_count: 8,
    avg_geo_score: 79,
    last_task_at: iso(26),
    created_at: iso(24 * 60),
    updated_at: iso(26),
  },
  {
    id: 'proj-003',
    name: 'NorthStar 教育平台',
    description: '在线教育品牌，主打知乎问答与小红书短内容，注重事实密度与可验证来源。',
    brand_name: 'NorthStar',
    default_perspective: '用户/客户',
    default_platform: '知乎问答',
    workspace_type: 'media',
    task_count: 23,
    avg_geo_score: 91,
    last_task_at: iso(72),
    created_at: iso(24 * 90),
    updated_at: iso(72),
  },
  {
    id: 'proj-004',
    name: 'Verda 可持续咨询',
    description: '可持续发展咨询品牌，行业研究报告类内容，强调权威来源与多源验证。',
    brand_name: 'Verda',
    default_perspective: '学术/科研',
    default_platform: '官网文章',
    workspace_type: 'professional',
    task_count: 5,
    avg_geo_score: 72,
    last_task_at: iso(24 * 5),
    created_at: iso(24 * 15),
    updated_at: iso(24 * 5),
  },
]

// ===== Brand Facts =====
export const mockBrandFacts: BrandFact[] = [
  {
    id: 'fact-001',
    project_id: 'proj-001',
    fact_type: 'brand',
    title: 'Acme 公司定位',
    content:
      'Acme 是一家成立于 2018 年的企业服务公司，核心业务为基于知识图谱的智能客服与销售自动化平台，总部位于上海。',
    source_type: 'official',
    source_url: 'https://acme.example.com/about',
    evidence_level: 'conclusive',
    tags: ['公司介绍', '官方'],
    is_active: true,
    created_at: iso(24 * 20),
    updated_at: iso(24 * 5),
  },
  {
    id: 'fact-002',
    project_id: 'proj-001',
    fact_type: 'product',
    title: 'Acme Insight Cloud 核心参数',
    content:
      'Acme Insight Cloud v3.2 支持日均处理 1.2 亿次对话请求，平均响应时延 280ms，API 可用性 SLA 99.95%。',
    source_type: 'official',
    source_url: 'https://acme.example.com/products/insight-cloud',
    evidence_level: 'strong',
    tags: ['产品参数', 'SLA'],
    is_active: true,
    created_at: iso(24 * 18),
    updated_at: iso(24 * 4),
  },
  {
    id: 'fact-003',
    project_id: 'proj-001',
    fact_type: 'case',
    title: '某金融客户案例',
    content:
      '某头部城商行 2024 年部署 Acme Insight Cloud 后，客服一次解决率从 62% 提升至 81%，月均节省人力成本约 38 万元。',
    source_type: 'third_party_report',
    source_url: 'https://reports.example.com/case-bank-2024',
    evidence_level: 'strong',
    tags: ['金融', '客户案例', 'ROI'],
    is_active: true,
    created_at: iso(24 * 12),
    updated_at: iso(24 * 3),
  },
  {
    id: 'fact-004',
    project_id: 'proj-001',
    fact_type: 'data',
    title: '2025 企业 AI 渗透率',
    content:
      '截至 2026 年 Q1，超过 63% 的企业已将生成式 AI 纳入核心业务流程，其中市场营销与客服部门渗透率最高。',
    source_type: 'public_data',
    source_url: 'https://research.example.com/enterprise-ai-2026',
    evidence_level: 'strong',
    tags: ['行业数据', '2026'],
    is_active: true,
    created_at: iso(24 * 8),
    updated_at: iso(24 * 2),
  },
  {
    id: 'fact-005',
    project_id: 'proj-001',
    fact_type: 'certification',
    title: 'ISO 27001 信息安全认证',
    content: 'Acme 于 2024 年通过 ISO/IEC 27001:2022 信息安全管理体系认证，证书编号 AC-2024-1129。',
    source_type: 'official',
    source_url: 'https://acme.example.com/trust/iso27001',
    evidence_level: 'conclusive',
    tags: ['安全', '认证'],
    is_active: true,
    created_at: iso(24 * 10),
    updated_at: iso(24 * 6),
  },
  {
    id: 'fact-006',
    project_id: 'proj-001',
    fact_type: 'other',
    title: '创始人背景',
    content: '创始人张某某，前某云服务商算法负责人，2018 年创立 Acme，主导公司从 RPA 向 AI Agent 转型。',
    source_type: 'third_party_report',
    source_url: 'https://news.example.com/founder-profile',
    evidence_level: 'moderate',
    tags: ['创始人', '背景'],
    is_active: false,
    created_at: iso(24 * 25),
    updated_at: iso(24 * 7),
  },
  {
    id: 'fact-007',
    project_id: 'proj-001',
    fact_type: 'data',
    title: '市场规模预测',
    content: '2026 年中国智能客服市场规模预计达 86 亿元，复合增长率 21.4%（2024-2028）。',
    source_type: 'third_party_report',
    source_url: 'https://research.example.com/chatbot-market-2026',
    evidence_level: 'moderate',
    tags: ['市场规模', '预测'],
    is_active: true,
    created_at: iso(24 * 6),
    updated_at: iso(24 * 1),
  },
  {
    id: 'fact-008',
    project_id: 'proj-001',
    fact_type: 'product',
    title: '定价模式',
    content: 'Acme Insight Cloud 采用订阅制定价，基础版起价 4,800 元/月，企业版按并发量计费。',
    source_type: 'official',
    source_url: 'https://acme.example.com/pricing',
    evidence_level: 'conclusive',
    tags: ['定价', '商务'],
    is_active: true,
    created_at: iso(24 * 14),
    updated_at: iso(24 * 4),
  },
]

// ===== Tasks =====
export const mockTasks: RewriteTask[] = [
  {
    id: 'task-001',
    project_id: 'proj-001',
    title: '智能客服平台产品介绍改写',
    original_content:
      '# Acme 智能客服\n\nAcme 是领先的智能客服平台，帮助企业提升效率。\n\n## 功能\n\n- 智能问答\n- 工单流转\n- 数据分析\n\n## 为什么选择我们\n\n我们拥有行业领先的技术，深受客户喜爱。',
    article_type: '产品介绍',
    perspective: '品牌方',
    publish_platform: '官网文章',
    target_audience: '企业 IT 负责人',
    source_policy: 'mark_missing_sources',
    output_length: 'standard',
    need_schema: true,
    brand_fact_ids: ['fact-001', 'fact-002', 'fact-005', 'fact-008'],
    status: 'completed',
    score_before: 62,
    score_after: 88,
    output_id: 'out-001',
    created_at: iso(2),
    updated_at: iso(1),
  },
  {
    id: 'task-002',
    project_id: 'proj-001',
    title: '金融行业案例研究',
    original_content: '某银行使用 Acme 后效果很好，效率提升明显，客户满意度上升。',
    article_type: '客户案例',
    perspective: '第三方',
    publish_platform: '公众号',
    target_audience: '金融机构决策者',
    source_policy: 'use_provided_only',
    output_length: 'long',
    need_schema: true,
    brand_fact_ids: ['fact-003'],
    status: 'completed',
    score_before: 48,
    score_after: 81,
    output_id: 'out-002',
    created_at: iso(28),
    updated_at: iso(27),
  },
  {
    id: 'task-003',
    project_id: 'proj-001',
    title: '企业 AI 渗透趋势分析',
    original_content: '现在很多企业用 AI 了，这是大势所趋。',
    article_type: '行业分析',
    perspective: '媒体/新闻',
    publish_platform: '知乎问答',
    target_audience: '行业从业者',
    source_policy: 'mark_missing_sources',
    output_length: 'standard',
    need_schema: true,
    brand_fact_ids: ['fact-004', 'fact-007'],
    status: 'running',
    created_at: iso(0.2),
    updated_at: iso(0.05),
  },
  {
    id: 'task-004',
    project_id: 'proj-001',
    title: '小红书种草笔记',
    original_content: 'Acme 真的很好用，推荐！',
    perspective: '用户/客户',
    publish_platform: '小红书',
    source_policy: 'use_provided_only',
    output_length: 'short',
    need_schema: false,
    brand_fact_ids: [],
    status: 'pending',
    created_at: iso(0.05),
    updated_at: iso(0.05),
  },
  {
    id: 'task-005',
    project_id: 'proj-001',
    title: 'ISO 27001 安全白皮书节选',
    original_content: '我们很安全，通过了认证。',
    article_type: '白皮书',
    perspective: '品牌方',
    publish_platform: '官网文章',
    source_policy: 'use_provided_only',
    output_length: 'long',
    need_schema: true,
    brand_fact_ids: ['fact-005'],
    status: 'failed',
    error_message: 'LLM 调用超时（30s），请稍后重试或检查网络',
    created_at: iso(50),
    updated_at: iso(49),
  },
  {
    id: 'task-006',
    project_id: 'proj-002',
    title: 'Lumen 智能音箱产品页',
    original_content: 'Lumen 智能音箱音质好，反应快。',
    perspective: '品牌方',
    publish_platform: '官网文章',
    source_policy: 'mark_missing_sources',
    output_length: 'standard',
    need_schema: true,
    brand_fact_ids: [],
    status: 'completed',
    score_before: 55,
    score_after: 78,
    output_id: 'out-003',
    created_at: iso(24),
    updated_at: iso(23),
  },
]

// ===== Output (完整改写结果) =====
export const mockOutput: RewriteOutput = {
  id: 'out-001',
  task_id: 'task-001',
  version: 1,
  parent_version_id: null,
  title: 'Acme Insight Cloud：面向企业的智能客服与销售自动化平台',
  final_article: `# Acme Insight Cloud：面向企业的智能客服与销售自动化平台

## 摘要

Acme Insight Cloud 是 Acme 公司自 2018 年起持续迭代的智能客服与销售自动化平台，核心定位是将知识图谱与大语言模型结合，帮助企业提升客户服务效率与销售转化率。截至 2026 年 Q1，平台日均处理 1.2 亿次对话请求，平均响应时延 280ms，API 可用性 SLA 99.95%。

## 核心能力

### 1. 智能问答

平台基于企业知识图谱构建检索增强生成（RAG）链路，**与传统关键词匹配客服不同的是**，Acme Insight Cloud 能够理解多轮对话上下文，并对模糊提问进行意图澄清。

之所以能够在金融、政企等高合规场景落地，是因为平台通过了 ISO/IEC 27001:2022 信息安全管理体系认证（证书编号 AC-2024-1129），并支持私有化部署与数据隔离。

### 2. 工单流转

平台内置 30+ 标准工单模板，支持按业务规则自动派单与升级。某头部城商行 2024 年部署后，客服一次解决率从 62% 提升至 81%，月均节省人力成本约 38 万元。

### 3. 数据分析

平台提供实时对话质量看板、坐席效能分析与客户流失预警三类核心报表，支持按渠道、产品、地域多维下钻。

## 行业背景

截至 2026 年 Q1，超过 63% 的企业已将生成式 AI 纳入核心业务流程，其中市场营销与客服部门渗透率最高。2026 年中国智能客服市场规模预计达 86 亿元，复合增长率 21.4%（2024-2028）。

## 部署与定价

- **SaaS 版**：基础版起价 4,800 元/月，企业版按并发量计费
- **私有化部署**：支持，需单独询价
- **数据合规**：通过 ISO 27001 认证，支持数据驻留与加密

## 结论

可以得出结论：Acme Insight Cloud 适合中大型企业、对数据安全有较高要求、且希望将客服与销售协同提效的场景。对于以「快速上线」为唯一目标的团队，可优先评估 SaaS 基础版。`,
  faq_content: `## FAQ

### 1. Acme Insight Cloud 适合什么规模的企业？

适合日均对话量 10 万次以上的中大型企业，特别是金融、政企、零售等对合规与数据安全有要求的行业。

### 2. 平台是否支持私有化部署？

支持。私有化部署可满足数据驻留要求，并与企业现有 SSO、审计系统对接。部署周期通常 2-4 周。

### 3. Acme Insight Cloud 与传统客服系统有什么不同？

与传统客服系统不同的是，Acme Insight Cloud 基于知识图谱与大语言模型，能够理解多轮对话上下文、对模糊提问做意图澄清，并自动生成工单与销售线索。

### 4. 是否需要自建知识库？

是的。平台依赖企业提供的知识图谱与品牌事实库作为生成基础，避免幻觉。Acme 提供知识库导入工具与治理后台。

### 5. 平台是否通过信息安全认证？

通过。Acme 于 2024 年获得 ISO/IEC 27001:2022 信息安全管理体系认证，证书编号 AC-2024-1129。

### 6. 定价模式如何？

采用订阅制。SaaS 基础版起价 4,800 元/月，企业版按并发量计费；私有化部署需单独询价。`,
  schema_suggestions: {
    type: 'Article + FAQPage',
    json_ld: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Article',
          headline: 'Acme Insight Cloud：面向企业的智能客服与销售自动化平台',
          datePublished: '2026-06-26',
          author: { '@type': 'Organization', name: 'Acme' },
          publisher: {
            '@type': 'Organization',
            name: 'Acme',
            foundingDate: '2018',
          },
          about: ['智能客服', '销售自动化', '企业服务'],
        },
        {
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: 'Acme Insight Cloud 适合什么规模的企业？',
              acceptedAnswer: {
                '@type': 'Answer',
                text: '适合日均对话量 10 万次以上的中大型企业，特别是金融、政企、零售等对合规与数据安全有要求的行业。',
              },
            },
            {
              '@type': 'Question',
              name: '平台是否支持私有化部署？',
              acceptedAnswer: {
                '@type': 'Answer',
                text: '支持。私有化部署可满足数据驻留要求，部署周期通常 2-4 周。',
              },
            },
          ],
        },
      ],
    },
  },
  optimization_strategy: [
    {
      issue: '原文存在「领先」「深受客户喜爱」等无来源的夸赞表达',
      action: '替换为可验证数据（SLA 99.95%、客户案例 ROI 数据）',
      priority: 'high',
      evidence: 'Acme 官方产品页与第三方案例报告',
    },
    {
      issue: '原文缺少公司背景与成立时间',
      action: '补充 2018 年成立、核心业务、总部位置等品牌实体信息',
      priority: 'high',
      evidence: 'Acme 官方 about 页',
    },
    {
      issue: '原文未提及信息安全认证',
      action: '补充 ISO 27001 认证信息，强化企业可信度信号',
      priority: 'medium',
      evidence: 'Acme trust 页面与证书编号',
    },
    {
      issue: '原文缺少行业背景数据',
      action: '补充 2026 年企业 AI 渗透率 63% 与市场规模 86 亿元数据',
      priority: 'medium',
      evidence: 'research.example.com 2026 行业报告',
    },
    {
      issue: '原文定价信息缺失',
      action: '补充订阅制定价模式与基础版起价',
      priority: 'low',
      evidence: 'Acme pricing 页面',
    },
  ],
  comparison_summary:
    '保留了原文的产品结构与核心功能介绍；增强了事实密度（SLA、客户案例 ROI、行业数据）；补充了实体一致性信息（成立时间、认证、定价）；处理了「领先」「深受客户喜爱」等无来源夸赞的幻觉风险。',
  missing_sources: [
    '某头部城商行客户案例的公开披露链接（当前为第三方报告，建议补充客户授权声明）',
    '2026 年企业 AI 渗透率 63% 的原始调研方法说明',
    '市场规模 86 亿元的测算口径与样本范围',
  ],
  missing_facts: [
    {
      title: 'Acme 客户名单（脱敏）',
      fact_type: 'case',
      content: '建议补充至少 3 个代表性客户的行业、规模、部署时间与量化效果，便于多源验证。',
      reason: '当前仅有 1 个金融案例，AI 引用概率受限',
    },
    {
      title: 'Acme Insight Cloud 历史版本演进',
      fact_type: 'data',
      content: '建议整理 v1.0 至 v3.2 的关键能力演进时间线，用于产品介绍页与白皮书。',
      reason: '提升产品实体权威性与可引用性',
    },
  ],
  review_status: 'review',
  score_before: {
    id: 'score-before-001',
    output_id: 'out-001',
    score_type: 'before',
    overall: 62,
    dimensions: [
      { name: '事实密度', score: 48, comment: '仅一句「帮助企业提升效率」，无任何具体数据' },
      { name: '结构清晰度', score: 70, comment: '有标题层级但段落过短，信息密度低' },
      { name: '实体一致性', score: 65, comment: '品牌名 Acme 出现，但未给出公司全称、成立时间' },
      { name: '来源权威性', score: 30, comment: '无任何来源链接与可验证声明' },
      { name: 'AI 触发覆盖', score: 68, comment: '缺少定义句、对比句、因果句' },
      { name: 'Schema 就绪度', score: 90, comment: '原文已是 Markdown 结构化文本' },
    ],
    created_at: iso(2),
  },
  score_after: {
    id: 'score-after-001',
    output_id: 'out-001',
    score_type: 'after',
    overall: 88,
    dimensions: [
      { name: '事实密度', score: 92, comment: '补充 SLA、响应时延、客户 ROI、行业渗透率等多组数据' },
      { name: '结构清晰度', score: 90, comment: '摘要 → 核心能力 → 行业背景 → 部署 → 结论，层级清晰' },
      { name: '实体一致性', score: 88, comment: '统一 Acme 全称、成立时间、认证编号' },
      { name: '来源权威性', score: 85, comment: '引用官方产品页、案例报告、行业研究，3 处可验证' },
      { name: 'AI 触发覆盖', score: 86, comment: '增加定义句、对比句、因果句、总结句' },
      { name: 'Schema 就绪度', score: 95, comment: '生成 Article + FAQPage 双 Schema' },
    ],
    created_at: iso(1),
  },
  created_at: iso(1),
}
