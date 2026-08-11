# Tasks

- [x] Task 1: 修复 SettingsDialog Tab 无法点击 + 改为左侧菜单布局
  - [x] SubTask 1.1: 在 `SettingsDialog.tsx` 中增加本地 `activeTab` state（`'appearance' | 'models' | 'about'`），初始值取自 `initialTab`
  - [x] SubTask 1.2: 监听 `open` 变化，弹窗打开时把 `activeTab` 重置为 `initialTab`
  - [x] SubTask 1.3: 移除 shadcn `<Tabs>` / `<TabsList>` / `<TabsTrigger>` / `<TabsContent>`，改为左侧 `<aside>` 菜单 + 右侧 `<main>` 内容区
  - [x] SubTask 1.4: 左侧菜单项使用 `<button>`，点击时 `setActiveTab('models')` 等，选中态高亮（`bg-secondary text-foreground`，非强蓝）
  - [x] SubTask 1.5: 右侧内容区根据 `activeTab` 条件渲染 `<AppearancePanel />` / `<ModelConfigPanel />` / `<AboutPanel />`
  - [x] SubTask 1.6: 弹窗尺寸改为 `max-w-[820px]`，高度 `max-h-[80vh]`，左右布局 `flex`，左侧宽 180px 固定，右侧 `flex-1 overflow-y-auto`
  - [x] SubTask 1.7: 深色模式验证：左侧菜单、内容区、文字、选中态均可读

- [x] Task 2: ModelFormDialog 从右侧抽屉改为居中弹窗
  - [x] SubTask 2.1: 在 `ModelConfigPanel.tsx` 中，把 `<DialogContent side="right" className="flex flex-col gap-4">` 改为 `<DialogContent side="center" className="flex max-h-[80vh] max-w-[600px] flex-col gap-4">`
  - [x] SubTask 2.2: 表单内容区 `flex-1 space-y-4 overflow-y-auto pr-1` 保留，确保内部滚动
  - [x] SubTask 2.3: 验证嵌套弹窗 z-index：Radix Dialog 默认 z-50，新增弹窗在设置弹窗之上能正常交互（如点击、输入、滚动）
  - [x] SubTask 2.4: 验证 ESC 键行为：先关闭新增弹窗，不关闭设置弹窗（Radix 默认行为，需确认）
  - [x] SubTask 2.5: 深色模式验证：新增弹窗背景、输入框、按钮可读

- [x] Task 3: 模型配置空状态文案收敛
  - [x] SubTask 3.1: 顶部操作条保留「新增模型」主按钮
  - [x] SubTask 3.2: 空状态 EmptyState 的 action 按钮改为轻量 ghost 变体，或移除（只保留顶部按钮）
  - [x] SubTask 3.3: 空状态文案改为：「暂未配置模型 / 添加一个 OpenAI-Compatible 模型源后，即可在内容优化中选择模型运行。」

- [x] Task 4: 验证账户中心与内容优化页复用同一设置弹窗
  - [x] SubTask 4.1: 确认 `AccountWidget.tsx` 调用 `openDialog('appearance' | 'about')`，无需修改
  - [x] SubTask 4.2: 确认 `NewRewritePage.tsx` 调用 `openDialog('models')`，无需修改
  - [x] SubTask 4.3: 验证从内容优化页打开设置后关闭，NewRewritePage 草稿状态不丢失（弹窗是 overlay，不卸载页面）

- [x] Task 5: 构建验证与报告
  - [x] SubTask 5.1: `cd frontend && npx tsc --noEmit` 通过
  - [x] SubTask 5.2: `cd frontend && npm run build` 通过
  - [x] SubTask 5.3: 输出 `account-center-settings-dialog-fix-report.md`，含 14 项必填章节

# Task Dependencies

- Task 2、Task 3 独立，可与 Task 1 并行
- Task 4 依赖 Task 1 + Task 2 完成
- Task 5 依赖所有前置任务

# Parallelizable Work

- Task 1（SettingsDialog 重写）、Task 2（ModelFormDialog 改居中）、Task 3（空状态文案）可并行
