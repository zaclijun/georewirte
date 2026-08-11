# GEO Rewrite Workbench — QA 体验报告

**测试视角**：第一次使用产品的客户（不读代码、不看文档，只看界面）
**测试范围**：前端 6 条路由 + 关键交互链路（创建项目 → 建事实 → 改写 → 看结果 → 导出）
**测试方式**：静态走查代码 + 客户视角场景推演
**仅记录体验问题，不修代码**

---

## 总评

> **结论：当前产品对第一次使用的客户基本不可用。最核心的"创建项目"入口是死按钮，整个主流程第一步就断裂。**

严重度分布：
- 🔴 阻断（P0）：3 项 —— 主流程根本走不通
- 🟠 严重（P1）：7 项 —— 关键状态/反馈缺失，客户会以为产品坏了
- 🟡 一般（P2）：8 项 —— 体验割裂、文案误导
- 🔵 轻微（P3）：6 项 —— 细节打磨

---

## 一、第一次使用：是否知道怎么创建项目？🔴 阻断

### 1. 🔴【阻断】"新建项目"按钮是死的，点击无任何反应
- **位置**：[ProjectListPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/ProjectListPage.tsx) 顶部 TopBar 的「新建项目」按钮
- **现象**：按钮渲染正常，但没有绑定任何点击行为（无 `onClick`、无 `asChild`、无 `Link` 包裹）。客户第一次进来，看到大按钮点下去——什么都没发生。
- **客户感受**："这产品坏了 / 我是不是没权限？"
- **影响**：这是主流程的第一步，断了之后整条链路（事实库、改写、结果、导出）全部无法触达。`useCreateProject` hook 已经写好但没有被任何页面调用。

### 2. 🟠 空状态引导文案指向死按钮
- **位置**：项目列表为空时的空状态卡片
- **文案**："还没有项目，点击右上角「新建项目」开始"
- **问题**：文案引导客户去点那个死按钮，放大了 1 号问题的挫败感。

### 3. 🟡 首次进入没有 Onboarding 引导
- **现象**：客户首次访问 `/` 被重定向到 `/projects`，看到"内容治理工作台"标题、4 个统计卡片（项目数 0、任务数 0、平均改后评分 0、待补充来源 7）、Enterprise Banner、空项目列表。
- **缺失**：
  - 没有"第一步该做什么"的步骤引导（1.建项目 → 2.填事实 → 3.粘贴原文 → 4.看结果）
  - 没有"什么是 GEO 改写"的概念解释
  - 没有"为什么我要建项目"的上下文
- **客户感受**：不知道这个产品是给谁用的、自己该做什么。

### 4. 🔴【阻断】"待补充来源"统计卡片是假数据，会误导客户
- **位置**：[ProjectListPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/ProjectListPage.tsx) 第 28 行 `const pendingSources = 7 // 暂无对应接口，mock 占位`
- **现象**：即使没有任何项目，首页也永远显示"待补充来源 7"。
- **客户感受**："我有 7 个待补充来源？在哪里看？"——找不到任何入口。
- **影响**：客户测试时会基于这个数字做错误判断，认为系统已经跑过任务。

### 5. 🟠 "平均改后评分"在真实环境永远显示 0 或 —
- **位置**：同上页面的 MetricCard "平均改后评分"
- **问题**：前端依赖 `project.avg_geo_score` 字段，但后端 `ProjectOut` schema 只返回 `task_count`，没有 `avg_geo_score`、`last_task_at` 字段。真实 API 数据里这两个字段永远是 `undefined`。
- **客户感受**：永远看到评分 0 / "—"，以为产品没在工作。

---

## 二、是否知道怎么创建 Brand Facts？🟠 严重（依赖项目先建好）

### 6. 🟠 Sidebar「品牌事实库」「新建改写」在未选项目时灰掉，但引导不足
- **位置**：[Sidebar.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/layout/Sidebar.tsx)
- **现象**：未选项目时这两项 `disabled`，hover 提示"请先选择项目"。
- **问题**：新客户不知道"选择项目"是什么动作。实际操作是点项目卡片的"进入项目"链接，但 Sidebar 没有"先去项目列表选一个"的引导。
- **客户感受**：菜单是灰的，不知道怎么激活。

### 7. 🟡 ProjectCard「进入项目」直接跳到事实库，没有项目概览页
- **位置**：[ProjectCard.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/projects/ProjectCard.tsx) 第 49 行 `to={/projects/${project.id}/facts}`
- **问题**：客户期望"进入项目"看到项目仪表盘（任务列表、统计、最近活动），但实际直接跳进事实库。没有项目级的任务列表页，只能在「历史任务」里按项目分组看。
- **客户感受**：导航层级缺失，"我项目里的任务在哪里？"

### 8. 🟢 BrandFacts 页面本身体验较好
- 「新增事实」按钮有 onClick，弹窗表单字段完整（标题、内容、类型、证据等级、来源类型、来源链接、标签）
- 空状态有 CTA，搜索/筛选交互完整
- **小问题**：标签输入用"英文逗号分隔"，但中文客户习惯输入中文逗号「，」，输入「公司介绍，官方」会被当成一个标签。

---

## 三、是否知道怎么开始 Rewrite？🟡 一般

### 9. 🟡 NewRewritePage 默认视角前后端不一致
- **位置**：[NewRewritePage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/NewRewritePage.tsx) 第 46 行 `perspective: project?.default_perspective ?? '品牌方'`
- **问题**：前端 fallback 是"品牌方"，但后端 `ProjectBase.default_perspective` 默认是"第三方"。当项目数据获取失败 fallback 到 mockProjects 时，会用"品牌方"，与后端默认值冲突。
- **客户感受**：同一项目在不同环境下默认视角不一致，难以复现。

### 10. 🟡 平台选项前后端不一致
- **前端**：`PLATFORMS` 只有 4 个（官网文章、公众号、知乎问答、小红书）
- **后端**：`platforms.md` 有 11 个（多出微博、抖音、LinkedIn、X/Twitter、YouTube、行业媒体、新闻稿）
- **更严重**：前端用「知乎问答」，后端平台规则文件标题是「知乎专栏」。`prompt_service.get_platform_rules` 用标题匹配，前端传「知乎问答」时后端找不到对应规则，会静默 fallback 到"（无特殊平台规则）"。
- **客户感受**：选了"知乎问答"但改写结果没有任何知乎风格调整，不知道为什么。

### 11. 🟡 「取消」按钮用 `navigate(-1)`，直接进 URL 时会退出站点
- **位置**：NewRewritePage 第 147 行 `onClick={() => navigate(-1)}`
- **问题**：如果客户直接通过分享链接进入新建改写页，点取消会退到浏览器历史上一页（可能是别的网站或空白页）。
- **客户感受**：点取消后产品"消失了"。

### 12. 🟢 「开始改写」按钮状态清晰
- 提交中显示 Loader2 + "提交中…"，禁用按钮
- 标题或原文为空时禁用
- 错误信息在下方红色提示框展示
- **小问题**：原文只有字符计数，没有"建议至少 N 字"的最低门槛提示。SKILL.md 规定 < 20 字应该拒绝，但前端没有提示。

---

## 四、是否知道哪里看 Result？🔴 阻断（失败态）

### 13. 🔴【阻断】任务失败时结果页完全不显示错误，伪装成"排队中"
- **位置**：[RewriteResultPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/RewriteResultPage.tsx) 第 94 行 `if (isTaskActive(task) || !output)`
- **现象**：`isTaskActive` 只判断 pending/running。但当 `task.status === 'failed'` 且没有 output 时，也会走到这个分支，渲染 `TaskRunningView`。
- **TaskRunningView 里**：failed 状态既不是 running 也不是 pending，所以显示「RefreshCw 图标 + "任务排队中" + "系统将尽快开始处理"」。
- **客户感受**：任务其实已经失败了（比如 LLM_API_KEY 没配），但页面一直显示"排队中"，客户会无限等待。
- **`task.error_message`** 字段后端有数据，但前端完全没渲染。没有「重试」按钮。
- **影响**：这是 P0 最严重的体验漏洞之一。客户测试时如果没配 API Key，所有任务都会卡在这个"假排队"状态。

### 14. 🟠 HistoryPage 失败任务也不显示错误原因
- **位置**：[HistoryPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/HistoryPage.tsx)
- **现象**：表格只显示红色「失败」徽章，没有 tooltip、没有展开行、没有点击查看错误。
- **客户感受**：看到一排失败任务，但不知道为什么失败，无法自助排查。

### 15. 🟠 TaskRunningView「返回历史」按钮跳转目标不直觉
- **位置**：RewriteResultPage 第 277 行 `<Link to="/history">返回历史</Link>`
- **问题**：客户从 `/projects/:id/rewrite/new` 提交后跳到结果页，等待时点"返回历史"会跳到全局历史页，而不是回到项目或新建页。
- **客户感受**：导航断层，"我刚才那个项目去哪了？"

### 16. 🟡 任务排队文案与实际行为不符
- **现象**：后端 `create_task` 立即调用 `rewrite_service.kickoff()` 起后台线程，没有真正的队列。pending 只是极短暂的过渡态（毫秒级）。
- **前端文案**：「任务排队中」「系统将尽快开始处理，请稍候」
- **客户感受**：以为有调度延迟，实际是同步触发。

### 17. 🟢 完成态结果页内容丰富
- 4 个 Tab（改写正文、原文对比、FAQ、Schema）清晰
- 右侧 Inspector 含质量状态、评分对比、雷达图、优化策略、待补充来源、待补充事实
- 评分提升用绿色 Badge 标注
- **小问题**：顶部「复制正文」按钮在 Schema Tab 下仍然只复制正文，但客户在 Schema Tab 期望复制 JSON。

---

## 五、是否知道怎么 Export？🟠 严重

### 18. 🟠 「导出 Markdown」按钮文案固定，无法选 JSON 格式
- **位置**：[ExportButton.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/common/ExportButton.tsx)
- **现象**：按钮 label 写死"导出 Markdown"，`format` prop 默认 markdown 但前端没有任何 UI 让客户切换到 json。后端 `/outputs/:id/export?format=json` 接口存在，但前端无法触达。
- **客户感受**：想要 JSON 版本给开发用，找不到入口。

### 19. 🟠 导出会静默改变「质量状态」为"已导出"，客户无预期
- **位置**：后端 [export.py](file:///Users/zachary/Downloads/geo-rewrite-skill/backend/app/api/export.py) 第 37 行 `output.review_status = "exported"`
- **现象**：客户点"导出 Markdown"，按钮显示"已导出"1.8 秒后恢复。但实际后端把 review_status 从 ready/review/needs_material 改成了 exported。
- **客户再次进入结果页**：发现右侧"质量状态"变成蓝色"已导出"，不知道为什么状态变了。
- **客户感受**："我只是下载个文件，为什么质量状态变了？还能改吗？"
- **更严重**：状态不可逆，即使重新改写生成新版本，旧版本永远是"已导出"，客户可能以为旧版本被锁定了。

### 20. 🟡 HistoryPage 表格里的导出按钮只有图标，无文字无 tooltip
- **位置**：[HistoryPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/HistoryPage.tsx) 第 311-319 行
- **现象**：`size="sm" variant="ghost" className="h-8 w-8 px-0"`，只有一个 Download 图标。
- **客户感受**：不知道这个图标是导出、下载还是别的什么。

### 21. 🟡 HistoryPage「重新改写」按钮也是死的
- **位置**：[HistoryPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/HistoryPage.tsx) 第 307-309 行
- **现象**：RefreshCw 图标按钮，`title="重新改写"`，但没有 `onClick`。
- **客户感受**：点了一下没反应，以为产品卡了。

### 22. 🟡 running 任务的「重新改写」按钮没有禁用
- **位置**：HistoryPage 表格行
- **问题**：表格没有按 `task.status` 禁用操作按钮。running 任务点"重新改写"会被后端拒绝（"任务正在执行中"），但前端没有预判。
- **客户感受**：点了之后弹个错误，体验粗糙。

---

## 六、所有提示是否清晰？🟡 一般

### 23. 🟡 API 失败时静默 fallback 到 mock 数据，只在角落小字提示
- **位置**：ProjectListPage、BrandFactsPage、NewRewritePage、RewriteResultPage、HistoryPage 都有
- **现象**：API 报错时自动用 `mockProjects` / `mockBrandFacts` / `mockTasks` / `mockOutput` 顶替，只在角落显示小小"（离线 mock）"。
- **客户感受**：第一次用产品的客户根本不知道什么是"离线 mock"，以为这些就是真实数据。会基于假数据做决策、写反馈。
- **影响**：客户测试时如果后端没起，整个产品看起来"能用"，但所有操作都不会真正生效，严重浪费客户时间。

### 24. 🟡 Enterprise Banner / Upgrade Button 出现在每个页面
- **位置**：ProjectListPage 顶部 Banner、Sidebar 底部 EnterpriseCard、BrandFactsPage 侧栏 Upgrade 按钮
- **问题**：P0 阶段就出现付费墙/销售引流，让客户以为这是试用版，功能受限。
- **客户感受**："我能不能用是不是要付费？"

### 25. 🟡 「高级参数」折叠区只显示一句"P1 启用"
- **位置**：[RewriteConfigPanel.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/rewrite/RewriteConfigPanel.tsx) 第 197-203 行
- **文案**："目标受众、目标关键词、内容类型等参数将在 P1 启用。当前 P0 仅保留必填项，确保低学习成本。"
- **问题**：客户不知道什么是 P0/P1，这是内部术语。
- **客户感受**："P1 是什么？我买到的是阉割版？"

### 26. 🟡 「证据等级」含"传闻"选项，与"事实库"定位矛盾
- **位置**：constants.ts EVIDENCE_LEVELS，含 `anecdotal: '传闻'`
- **问题**：事实库号称"可信资料底座"，但允许录入"传闻"级别的证据，与 GEO 强调的高事实密度冲突。
- **客户感受**：困惑——我该把道听途说也录进去吗？

### 27. 🟢 文案总体清晰的部分
- BrandFact 表单 placeholder 具体示例（"例如：Acme 公司定位"）
- 改写配置面板每个策略都有 description
- 空状态文案基本到位（除 1 号死按钮外）

---

## 七、所有状态是否合理？🔴 阻断（失败态）

### 28. 🔴【阻断】失败状态在结果页被伪装成"排队中"
- 见 13 号问题。这是状态设计最大的漏洞。

### 29. 🟠 「已导出」状态不可逆且无解释
- 见 19 号问题。

### 30. 🟠 running 任务的「重新改写」「删除」按钮在 HistoryPage 没禁用
- 见 22 号问题。

### 31. 🟡 「质量状态」四个值的语义对客户不直观
- **位置**：constants.ts REVIEW_STATUS_META
  - ready / review / needs_material / exported
  - 中文：可发布 / 建议检查 / 需补充材料 / 已导出
- **问题**：
  - "可发布"和"已导出"是什么关系？可发布的是不是还没导出？
  - "建议检查"和"需补充材料"的边界不清晰
  - 导出后状态变成"已导出"，那原来"可发布"的判断还有效吗？
- **客户感受**：四个状态混在一起，不知道该基于哪个做发布决策。

### 32. 🟡 任务状态 pending → running → completed/failed 的过渡对客户不透明
- pending 持续毫秒级，客户基本看不到
- running 持续 30-90 秒，但前端只在结果页轮询，HistoryPage 不轮询
- **客户感受**：在 HistoryPage 看到 running 任务，等 1 分钟刷新还是 running，不知道是不是卡死了。

### 33. 🟢 状态徽章颜色基本合理
- pending 灰、running 黄+脉动、completed 绿、failed 红——符合直觉
- 改前/改后评分对比用绿色 +N 徽章突出提升

---

## 八、所有按钮是否可理解？🟡 一般

### 34. 🔴「新建项目」按钮 —— 死的，见 1 号
### 35. 🟠 HistoryPage「重新改写」图标按钮 —— 死的，见 21 号
### 36. 🟡 HistoryPage 导出图标按钮 —— 无文字无 tooltip，见 20 号
### 37. 🟡 Schema Tab 顶部「复制正文」按钮 —— 在 Schema Tab 下语义错位，见 17 号
### 38. 🟡 「复制 JSON」按钮成功无反馈
- **位置**：RewriteResultPage Schema Tab 第 207-209 行
- **现象**：`copyToClipboard(schemaJson)` 后没有 setCopited 状态，按钮一直显示"复制 JSON"。
- **客户感受**：点了不知道有没有成功。

### 39. 🟢 清晰可理解的按钮
- 「新增事实」「保存修改」「取消」「开始改写」「复制正文」（非 Schema Tab）「导出 Markdown」（结果页有文字）

---

## 九、按优先级汇总（给 PM 排期用）

### 🔴 阻断（必须先修，否则客户走不通主流程）
1. **「新建项目」按钮无点击行为** —— 主流程第一步断裂
2. **任务失败时结果页伪装成"排队中"** —— 客户无限等待
3. **首页「待补充来源 = 7」是写死假数据** —— 误导客户决策

### 🟠 严重（关键状态/反馈缺失）
4. 空状态文案指向死按钮
5. 「平均改后评分」字段后端不返回，永远显示 0/—
6. HistoryPage 失败任务不显示错误原因
7. TaskRunningView「返回历史」跳转目标不直觉
8. 导出按钮文案固定"Markdown"，无法选 JSON
9. 导出静默改 review_status 为"已导出"，无预期
10. API 失败静默 fallback 到 mock，新客户无法识别

### 🟡 一般（体验割裂、文案误导）
11. 首次进入无 Onboarding 引导
12. ProjectCard「进入项目」跳过项目概览直奔事实库
13. 默认视角前后端不一致（品牌方 vs 第三方）
14. 平台选项前后端不一致（4 个 vs 11 个，"知乎问答" vs "知乎专栏"）
15. 「取消」用 navigate(-1)，直接进 URL 会退出站点
16. 任务排队文案与同步触发行为不符
17. HistoryPage 导出/重新改写图标按钮无文字无 tooltip
18. running 任务操作按钮未禁用
19. 「高级参数」用 P0/P1 内部术语
20. Enterprise 销售元素过早出现
21. 「证据等级」含"传闻"与事实库定位矛盾
22. 质量状态四个值语义不直观
23. HistoryPage 不轮询 running 任务
24. Schema Tab 顶部「复制正文」语义错位

### 🔵 轻微（打磨项）
25. 「复制 JSON」成功无反馈
26. 标签输入用英文逗号分隔，中文客户易踩坑
27. 原文无最低字数提示
28. 删除任务无 loading 反馈
29. 空项目列表 CTA 文案指向死按钮
30. 没有全局 Toast/错误边界

---

## 十、建议客户测试前置条件（给 QA Owner）

由于 1 号和 2 号问题，建议客户测试前**先由开发预置**：
- 至少 1 个项目（直接写库或临时给「新建项目」按钮接上 `useCreateProject`）
- `.env` 配好 `LLM_API_KEY`，否则所有任务都会进入失败态被伪装成"排队中"
- 关闭 mock fallback 或在 UI 上明确标注"演示数据"，避免客户把 mock 当真实数据测

否则客户第一次进来会得出"产品完全不能用"的结论，而这其实是死按钮 + 失败态伪装共同造成的误判。
