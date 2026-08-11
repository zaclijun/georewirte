# Account Center Settings + Model Runtime Spec

## Why

项目准备开源，需要让用户通过自己的模型 API Key 使用系统。当前 LLM 配置只读 `.env` 全局单实例（`LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL`），开源后用户无法在前端配置自己的模型。设置入口必须放在左下角账户中心，不能放成 Sidebar 一级菜单，避免与业务导航混淆。

同时，用户可见文案「生成内容资产」需要统一改为「内容优化」，更贴近用户认知。

## What Changes

### 前端
- 左下角 `EnterpriseCard` 替换为 `AccountWidget` 账户中心入口（DropdownMenu：设置 / 关于项目）
- 新增 `SettingsDialog`（Tabs：外观 / 模型配置 / 关于）
- 新增 `ThemeProvider` + `useTheme`（system/light/dark，localStorage key=`appearance_mode`）
- 新增 `useModelConfigs` / `useCreateModelConfig` 等 hooks
- `NewRewritePage` 右侧操作卡增加「模型」选择（位于内容资产类型下、生成按钮上）
- 未配置模型时生成按钮 disabled + 引导跳转设置弹窗「模型配置」Tab
- 用户可见文案「生成内容资产」→「内容优化」（Sidebar / 按钮 / 结果页 / 历史任务）

### 后端
- 新增 `model_configs` 数据表（id / provider / display_name / api_key 加密 / base_url / model_id / enabled / is_default / temperature / max_tokens / created_at / updated_at）
- 新增 `/api/settings/models` CRUD + `/test` + `/default` API
- 新增 `model_runtime.py` 统一 OpenAI-compatible 调用适配层
- `RewriteTask` 表新增 nullable 字段：`model_config_id` / `model_provider` / `model_name` / `model_display_name`（不破坏旧任务读取）
- `LLMService.chat_json` 支持可选 `model_config` 参数，未传时回退到 settings 全局配置（兼容旧任务）
- `RewriteService` 在执行时读取 task.model_config_id 并传给 LLMService
- `.env.example` 新增 `MODEL_CONFIG_SECRET_KEY=change-me`
- 启动时检测 `MODEL_CONFIG_SECRET_KEY`，未配置则 warning

### 安全
- API Key 数据库存储使用 Fernet 对称加密（基于 `MODEL_CONFIG_SECRET_KEY`）
- 返回前端时只返回 `masked_api_key`（如 `sk-****abcd`），绝不返回完整 Key
- `.env.example` 只放字段名，不放真实 Key

## Impact

- **Affected specs**：无（本轮新建）
- **Affected code 前端**：
  - `frontend/src/components/layout/Sidebar.tsx`（替换 EnterpriseCard 为 AccountWidget）
  - `frontend/src/components/layout/EnterpriseCard.tsx`（保留但不再被 Sidebar 使用，或删除）
  - `frontend/src/components/layout/AccountWidget.tsx`（新增）
  - `frontend/src/components/settings/SettingsDialog.tsx`（新增）
  - `frontend/src/components/settings/AppearancePanel.tsx`（新增）
  - `frontend/src/components/settings/ModelConfigPanel.tsx`（新增）
  - `frontend/src/components/settings/AboutPanel.tsx`（新增）
  - `frontend/src/context/ThemeProvider.tsx`（新增）
  - `frontend/src/hooks/useModelConfigs.ts`（新增）
  - `frontend/src/services/api.ts`（新增 modelConfigApi）
  - `frontend/src/types.ts`（新增 ModelConfig 类型）
  - `frontend/src/pages/NewRewritePage.tsx`（增加模型选择）
  - `frontend/src/pages/HistoryPage.tsx`（文案改为「内容优化任务」）
  - `frontend/src/pages/RewriteResultPage.tsx`（文案改为「内容优化结果」，显示「使用模型」）
  - `frontend/src/App.tsx`（ThemeProvider 包裹）
  - `frontend/src/common/workspace.ts`（如需调整文案常量）
- **Affected code 后端**：
  - `backend/app/models/model_config.py`（新增）
  - `backend/app/models/rewrite_task.py`（新增 4 个 nullable 字段）
  - `backend/app/schemas/model_config.py`（新增）
  - `backend/app/schemas/rewrite_task.py`（新增 model_config_id 入参与返回字段）
  - `backend/app/api/settings_models.py`（新增）
  - `backend/app/services/model_runtime.py`（新增）
  - `backend/app/services/llm_service.py`（chat_json 支持可选 model_config）
  - `backend/app/services/rewrite_service.py`（读取 task.model_config_id 并传入）
  - `backend/app/services/scoring_service.py`（同上，若 call 1 也需用所选模型）
  - `backend/app/main.py`（注册 settings_models 路由 + 启动时检测 secret）
  - `backend/app/config.py`（新增 model_config_secret_key）
  - `backend/.env.example`（新增 MODEL_CONFIG_SECRET_KEY）
  - `backend/alembic/versions/xxx_add_model_configs.py`（新增迁移）

## ADDED Requirements

### Requirement: 账户中心入口
系统 SHALL 在 Sidebar 左下角提供「账户中心」入口（替代原 EnterpriseCard），点击后显示菜单，包含「设置」和「关于项目」两个选项。

#### Scenario: 打开设置
- **WHEN** 用户点击左下角账户中心 → 设置
- **THEN** 打开 SettingsDialog 弹窗，默认定位到「外观」Tab
- **AND** 不发生路由跳转，保持当前页面

#### Scenario: 跳转模型配置
- **WHEN** 从其他位置（如 NewRewritePage 未配置模型引导按钮）点击「去配置模型」
- **THEN** 打开 SettingsDialog 并自动定位到「模型配置」Tab

### Requirement: 外观主题切换
系统 SHALL 支持三种外观模式：跟随系统 / 浅色 / 深色，并通过 `ThemeProvider` 统一管理。

#### Scenario: 切换主题
- **WHEN** 用户在设置 → 外观中选择「深色模式」
- **THEN** 立即应用深色主题到全站
- **AND** localStorage `appearance_mode` 写入 `dark`
- **AND** 刷新页面后保持深色

#### Scenario: 跟随系统
- **WHEN** 用户选择「跟随系统」且 OS 为深色
- **THEN** 应用深色主题
- **AND** OS 切换为浅色时，应用跟随切换为浅色（通过 matchMedia listener）

### Requirement: 模型配置 CRUD
系统 SHALL 提供 `/api/settings/models` 接口，支持新增 / 查询 / 修改 / 删除模型配置。

#### Scenario: 创建模型配置
- **WHEN** 前端 POST `/api/settings/models` 携带 provider/display_name/api_key/base_url/model_id
- **THEN** 后端加密存储 api_key
- **AND** 返回该条配置，api_key 字段以 `masked_api_key` 形式返回（如 `sk-****abcd`）
- **AND** 不返回完整 api_key

#### Scenario: 查询列表
- **WHEN** 前端 GET `/api/settings/models`
- **THEN** 返回所有模型配置列表
- **AND** 每条只含 `masked_api_key`，不含完整 api_key

#### Scenario: 设置默认
- **WHEN** 前端 POST `/api/settings/models/:id/default`
- **THEN** 该条 `is_default=true`，其他条 `is_default=false`

### Requirement: API Key 加密存储
系统 SHALL 使用 Fernet 对称加密存储 API Key，密钥来自环境变量 `MODEL_CONFIG_SECRET_KEY`。

#### Scenario: 未配置 secret
- **WHEN** 后端启动时 `MODEL_CONFIG_SECRET_KEY` 未配置或为 `change-me`
- **THEN** 日志输出 WARNING：「未配置 MODEL_CONFIG_SECRET_KEY，API Key 将无法加密存储」
- **AND** 模型配置创建接口返回 400 错误，提示用户配置 secret

### Requirement: 模型测试连接
系统 SHALL 提供 `/api/settings/models/:id/test` 接口，使用该配置发起最小请求验证可用性。

#### Scenario: 连接成功
- **WHEN** 后端使用该配置调用 chat.completions，prompt 为 `Return "ok".`
- **AND** 收到正常响应
- **THEN** 返回 `{ success: true, message: "连接成功" }`

#### Scenario: 连接失败
- **WHEN** 调用失败（401 / 网络错误 / 模型不存在等）
- **THEN** 返回 `{ success: false, message: "API Key 无效" / "Base URL 无法访问" / "模型 ID 不存在" / "请求超时" }`
- **AND** 不暴露完整错误堆栈给前端

### Requirement: 任务关联模型
系统 SHALL 在创建改写任务时接受可选 `model_config_id`，并在任务执行时使用该模型配置调用 LLM。

#### Scenario: 使用所选模型
- **WHEN** 前端创建任务时携带 `model_config_id`
- **THEN** 后端将该 id 及对应 provider/model_name/display_name 写入 task
- **AND** RewriteService 执行时读取 task.model_config_id，构造对应 LLM client
- **AND** Call 1（评分）/ Call 2（改写）均使用该模型

#### Scenario: 旧任务兼容
- **WHEN** 任务 `model_config_id` 为 null（旧任务或未选择模型）
- **THEN** 回退到 `settings.llm_api_key` / `llm_base_url` / `llm_model` 全局配置
- **AND** 不报错，不破坏旧任务读取

### Requirement: 内容优化页模型选择
系统 SHALL 在 NewRewritePage 右侧操作卡中提供「模型」选择控件。

#### Scenario: 已配置模型
- **WHEN** 用户已配置至少一个 enabled 模型
- **THEN** 操作卡显示模型下拉，默认选中 `is_default=true` 的模型
- **AND** 显示格式为 `Provider · model_id`（如 `DeepSeek · deepseek-chat`）

#### Scenario: 未配置模型
- **WHEN** 用户没有配置任何 enabled 模型
- **THEN** 生成按钮 disabled
- **AND** 显示提示「请先在账户中心配置模型 API Key。」
- **AND** 提供按钮「去配置模型」，点击打开 SettingsDialog「模型配置」Tab

### Requirement: 文案统一为「内容优化」
系统 SHALL 将用户可见的「生成内容资产」统一改为「内容优化」。

#### Scenario: Sidebar 导航
- **WHEN** 用户进入工作区
- **THEN** Sidebar 显示「内容优化」而非「生成内容资产」

#### Scenario: 生成按钮
- **WHEN** 用户在 NewRewritePage
- **THEN** 按钮文案为「开始优化」/「优化 N 类内容资产」

#### Scenario: 结果页与历史
- **WHEN** 用户查看结果页或历史任务
- **THEN** 标题显示「内容优化结果」/「内容优化任务」

## MODIFIED Requirements

### Requirement: Sidebar 底部区域
原 EnterpriseCard 替换为 AccountWidget 账户中心入口。EnterpriseCard 文件保留但不再被 Sidebar 引用。

### Requirement: LLMService.chat_json
新增可选参数 `model_config: Optional[ModelConfig] = None`，传入时使用该配置构造 client，未传入时回退到 settings 全局配置（兼容旧任务）。

## REMOVED Requirements

### Requirement: EnterpriseCard 在 Sidebar 中的使用
**Reason**: 替换为 AccountWidget 账户中心入口。
**Migration**: EnterpriseCard 组件文件保留（其他位置可能引用），仅 Sidebar.tsx 不再 import。
