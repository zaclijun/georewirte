# Settings Dialog Interaction Fix Spec

## Why

上一轮 `account-center-model-runtime` 已实现账户中心 + 设置弹窗 + 模型配置，但存在严重交互缺陷：设置弹窗内的 Tab（特别是「模型配置」）无法点击切换，根因是 `SettingsDialog.tsx` 中 `<Tabs value={initialTab}>` 受控但未监听 `onValueChange`，导致 value 被 context 钉死。同时新增模型配置使用右侧抽屉（`side="right"`）与设置中心弹窗风格不一致，且顶部横向 Tab 不符合设置中心的导航习惯。本轮修复这些交互问题并统一弹窗形态。

## What Changes

### 前端
- **修复 Tab 无法点击**：`SettingsDialog.tsx` 增加本地 `activeTab` state + `onValueChange` 处理，`initialTab` 仅作为打开时的初始值
- **设置弹窗改为左侧菜单 + 右侧内容布局**：移除 shadcn Tabs 顶部横向 Tab，改为自定义左侧侧边导航（`<aside>` + `<button>`）+ 右侧内容区（`<main>`）
- **设置弹窗尺寸调整**：从 `max-w-2xl`（672px）调整为 `max-w-[820px]`，最大高度 `80vh`，内部滚动
- **新增模型配置改为居中弹窗**：`ModelConfigPanel.tsx` 中 `ModelFormDialog` 的 `<DialogContent side="right">` 改为 `side="center"`，宽度 `max-w-[600px]`，最大高度 `80vh`
- **新增模型弹窗 z-index 层级**：确保在设置弹窗之上可交互（Radix Dialog 嵌套需处理 z-index）
- **空状态文案收敛**：模型配置页空状态文案优化，避免顶部按钮和空状态按钮重复
- **主题兼容验证**：确保深色/浅色模式下左侧菜单、弹窗、输入框可读

### 后端
- 无改动

### 数据库
- 无改动

## Impact

- **Affected specs**：`account-center-model-runtime`（本轮修复其遗留交互问题）
- **Affected code 前端**：
  - `frontend/src/components/settings/SettingsDialog.tsx`（重写：左侧菜单布局 + 本地 activeTab state）
  - `frontend/src/components/settings/ModelConfigPanel.tsx`（ModelFormDialog 改为居中弹窗 + 空状态文案收敛）
  - `frontend/src/context/SettingsDialogContext.tsx`（无改动，initialTab 语义不变）
  - `frontend/src/components/layout/AccountWidget.tsx`（无改动，已正确）
  - `frontend/src/pages/NewRewritePage.tsx`（无改动，已通过 useSettingsDialog 复用同一弹窗）

## ADDED Requirements

### Requirement: 设置弹窗左侧菜单导航
系统 SHALL 将设置弹窗的顶部横向 Tab 改为左侧侧边导航 + 右侧内容区的左右布局。

#### Scenario: 切换菜单
- **WHEN** 用户在设置弹窗中点击左侧菜单的「模型配置」
- **THEN** 右侧内容区切换为模型配置面板
- **AND** 左侧「模型配置」项显示选中高亮
- **AND** 不依赖 context 状态，本地 state 立即响应

#### Scenario: 从外部定位
- **WHEN** 用户从内容优化页点击「去配置模型」
- **THEN** 打开设置弹窗，左侧菜单「模型配置」被选中
- **AND** 右侧显示模型配置面板

### Requirement: 设置弹窗居中尺寸
系统 SHALL 将设置弹窗显示为居中弹窗，宽度 760-860px，最大高度 80vh，内容超出时内部滚动。

#### Scenario: 弹窗显示
- **WHEN** 用户打开设置弹窗
- **THEN** 弹窗水平垂直居中
- **AND** 宽度约为 820px
- **AND** 最大高度不超过 80vh
- **AND** 内容超出时右侧内容区内部滚动（左侧菜单固定）

### Requirement: 新增模型配置居中弹窗
系统 SHALL 将「新增模型配置」从右侧抽屉改为居中弹窗，在设置弹窗之上显示。

#### Scenario: 打开新增模型
- **WHEN** 用户在模型配置页点击「新增模型」
- **THEN** 打开居中弹窗（非右侧抽屉）
- **AND** 设置弹窗不关闭，新增弹窗在设置弹窗之上
- **AND** 新增弹窗宽度约 600px，最大高度 80vh

#### Scenario: 保存后关闭
- **WHEN** 用户填写完成并点击「保存」
- **THEN** 新增弹窗关闭
- **AND** 返回模型配置列表
- **AND** 列表自动刷新显示新增的模型

#### Scenario: 取消
- **WHEN** 用户点击「取消」或关闭按钮
- **THEN** 新增弹窗关闭
- **AND** 返回模型配置列表
- **AND** 设置弹窗保持打开

### Requirement: 弹窗 z-index 层级
系统 SHALL 确保新增模型弹窗的 z-index 高于设置弹窗，不被遮罩挡住。

#### Scenario: 嵌套弹窗交互
- **WHEN** 设置弹窗打开，新增模型弹窗在其之上打开
- **THEN** 新增模型弹窗可正常点击、输入、滚动
- **AND** 新增模型弹窗的遮罩不挡住其自身内容
- **AND** ESC 键先关闭新增模型弹窗（不关闭设置弹窗）

## MODIFIED Requirements

### Requirement: 设置弹窗 Tab 切换机制
原实现使用 shadcn Tabs 受控 `value={initialTab}` 但未监听 `onValueChange`，导致 Tab 无法切换。改为本地 `activeTab` state，`initialTab` 仅在弹窗打开时作为初始值，切换由本地 state 管理。

### Requirement: 模型配置空状态
原空状态同时显示顶部「新增模型」按钮和空状态内的「新增模型」按钮，视觉重复。改为空状态不重复显示主按钮，或顶部按钮改为轻量 ghost 按钮。

## REMOVED Requirements

### Requirement: 设置弹窗顶部横向 Tab
**Reason**: 改为左侧侧边导航，更符合设置中心的导航习惯。
**Migration**: 移除 shadcn Tabs 组件使用，改为自定义 aside + button 实现。
