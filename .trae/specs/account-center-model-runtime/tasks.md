# Tasks

- [x] Task 1: 后端 model_configs 数据表与迁移
  - [ ] SubTask 1.1: 新增 `backend/app/models/model_config.py`（id / provider / provider_label / display_name / api_key_encrypted / base_url / model_id / enabled / is_default / temperature / max_tokens / supports_streaming / timestamps）
  - [ ] SubTask 1.2: 在 `backend/app/models/__init__.py` 注册 ModelConfig
  - [ ] SubTask 1.3: 新增 Alembic 迁移 `add_model_configs_table`（同时给 rewrite_tasks 增加 model_config_id / model_provider / model_name / model_display_name 4 个 nullable 字段）
  - [ ] SubTask 1.4: 在 `backend/app/config.py` 新增 `model_config_secret_key: str = ""`
  - [ ] SubTask 1.5: 在 `backend/.env.example` 新增 `MODEL_CONFIG_SECRET_KEY=change-me`，`.env` 同步增加

- [ ] Task 2: 后端 API Key 加密与 model_runtime 适配层
  - [ ] SubTask 2.1: 新增 `backend/app/services/crypto_service.py`，使用 cryptography.Fernet 实现 encrypt/decrypt，密钥来自 `MODEL_CONFIG_SECRET_KEY`
  - [ ] SubTask 2.2: 新增 `backend/app/services/model_runtime.py`，提供 `generate_with_model_config(model_config_id, messages, temperature, max_tokens)` 统一调用入口（OpenAI-compatible）
  - [ ] SubTask 2.3: 新增 `mask_api_key(api_key)` 工具函数，返回 `sk-****abcd` 形式
  - [ ] SubTask 2.4: 在 `backend/app/main.py` 启动时检测 `MODEL_CONFIG_SECRET_KEY`，未配置则 WARNING

- [x] Task 3: 后端 model_config schemas 与 API
  - [ ] SubTask 3.1: 新增 `backend/app/schemas/model_config.py`（ModelConfigCreate / ModelConfigUpdate / ModelConfigOut 含 masked_api_key / ModelConfigTestResult）
  - [ ] SubTask 3.2: 新增 `backend/app/api/settings_models.py`，实现 GET/POST/PATCH/DELETE `/api/settings/models` + POST `/api/settings/models/:id/test` + POST `/api/settings/models/:id/default`
  - [ ] SubTask 3.3: 在 `backend/app/main.py` 注册 settings_models 路由
  - [ ] SubTask 3.4: 测试连接接口使用 model_runtime 调用，prompt `Return "ok".`，捕获 401/超时/网络错误返回友好 message

- [x] Task 4: 后端 LLMService 支持可选 model_config
  - [ ] SubTask 4.1: 修改 `backend/app/services/llm_service.py`，`chat_json` 新增可选参数 `model_config: Optional[ModelConfig] = None`
  - [ ] SubTask 4.2: 传入 model_config 时构造临时 OpenAI client（api_key=解密后 / base_url=model_config.base_url），使用 model_config.model_id 与 temperature
  - [ ] SubTask 4.3: 未传入时保持原逻辑（回退 settings 全局配置）
  - [ ] SubTask 4.4: llm_call_logs 写入时记录实际使用的 provider 与 model_name

- [x] Task 5: 后端 RewriteService 使用任务关联的模型
  - [ ] SubTask 5.1: 修改 `backend/app/schemas/rewrite_task.py`，TaskCreate 接受可选 `model_config_id`，TaskOut 返回 model_config_id/model_provider/model_name/model_display_name
  - [ ] SubTask 5.2: 修改 `backend/app/api/rewrite_tasks.py`，创建任务时若传入 model_config_id，查询 ModelConfig 并写入 task 的 4 个模型字段
  - [ ] SubTask 5.3: 修改 `backend/app/services/rewrite_service.py`，run_rewrite 时读取 task.model_config_id，查询 ModelConfig 并传给 scoring_service / llm_service
  - [ ] SubTask 5.4: 修改 `backend/app/services/scoring_service.py`，score_and_diagnose 接受可选 model_config 并传给 llm_service.chat_json
  - [ ] SubTask 5.5: 旧任务（model_config_id 为 null）回退 settings 全局配置，不报错

- [x] Task 6: 前端 ThemeProvider 与主题切换
  - [ ] SubTask 6.1: 新增 `frontend/src/context/ThemeProvider.tsx`，提供 `useTheme()` hook，支持 system/light/dark
  - [ ] SubTask 6.2: localStorage key=`appearance_mode`，应用时切换 `<html>` 的 `dark` class
  - [ ] SubTask 6.3: system 模式监听 `matchMedia('(prefers-color-scheme: dark)')` 变化
  - [ ] SubTask 6.4: 在 `frontend/src/App.tsx` 用 ThemeProvider 包裹整个应用
  - [ ] SubTask 6.5: 确认 `frontend/src/index.css` 已配置 `@layer base` 中 `.dark` 变量（若无则补充）

- [ ] Task 7: 前端 AccountWidget 账户中心入口
  - [ ] SubTask 7.1: 新增 `frontend/src/components/layout/AccountWidget.tsx`，显示用户头像/标识 + DropdownMenu（设置 / 关于项目）
  - [ ] SubTask 7.2: 修改 `frontend/src/components/layout/Sidebar.tsx`，把 `<EnterpriseCard />` 替换为 `<AccountWidget />`
  - [ ] SubTask 7.3: AccountWidget 通过 context 或 props 触发 SettingsDialog 打开（提供 `useSettingsDialog()` hook）

- [x] Task 8: 前端 SettingsDialog 与三个 Tab
  - [ ] SubTask 8.1: 新增 `frontend/src/components/settings/SettingsDialog.tsx`，使用 shadcn Dialog + Tabs（外观 / 模型配置 / 关于）
  - [ ] SubTask 8.2: 新增 `frontend/src/components/settings/AppearancePanel.tsx`（三个 radio：跟随系统 / 浅色 / 深色，调用 useTheme）
  - [ ] SubTask 8.3: 新增 `frontend/src/components/settings/AboutPanel.tsx`（开源提示 + GitHub 链接占位 + API Key 安全提示）
  - [ ] SubTask 8.4: SettingsDialog 支持外部传入 initialTab（用于「去配置模型」直接定位到模型配置 Tab）
  - [ ] SubTask 8.5: 在 `frontend/src/App.tsx` 顶层挂载 SettingsDialog（受 context 控制开关）

- [x] Task 9: 前端 ModelConfigPanel 与 Provider 预设
  - [ ] SubTask 9.1: 新增 `frontend/src/common/modelProviders.ts`，定义 P0 Provider 预设（OpenAI / DeepSeek / Qwen / Moonshot / 火山方舟 / OpenRouter / Ollama / 自定义），每个含 default base_url / model_id 示例 / 是否需要 api_key
  - [ ] SubTask 9.2: 新增 `frontend/src/types.ts` 中 ModelConfig 类型定义
  - [ ] SubTask 9.3: 新增 `frontend/src/services/api.ts` 中 modelConfigApi（list/create/update/delete/test/setDefault）
  - [ ] SubTask 9.4: 新增 `frontend/src/hooks/useModelConfigs.ts`（useModelConfigs / useCreateModelConfig / useUpdateModelConfig / useDeleteModelConfig / useTestModelConfig / useSetDefaultModelConfig）
  - [ ] SubTask 9.5: 新增 `frontend/src/components/settings/ModelConfigPanel.tsx`：列表 + 新增/编辑表单（Provider 选择后预填 base_url / model_id）+ 启用开关 + 设为默认 + 测试连接按钮 + 删除按钮
  - [ ] SubTask 9.6: API Key 字段：新增时明文输入，编辑时显示 masked_api_key + 「重新输入」按钮才允许修改
  - [ ] SubTask 9.7: 测试连接按钮调用 test 接口，显示成功/失败 toast

- [ ] Task 10: 前端 NewRewritePage 模型选择
  - [ ] SubTask 10.1: 在 NewRewritePage 右侧操作卡中，「内容资产类型」下方、「开始优化」按钮上方增加「模型」下拉
  - [ ] SubTask 10.2: 使用 useModelConfigs 获取 enabled 模型列表，下拉显示 `Provider · model_id`
  - [ ] SubTask 10.3: 默认选中 `is_default=true` 的模型
  - [ ] SubTask 10.4: 未配置任何 enabled 模型时，生成按钮 disabled，显示提示 + 「去配置模型」按钮（打开 SettingsDialog 模型配置 Tab）
  - [ ] SubTask 10.5: 创建任务时把 `model_config_id` 传入 `rewriteTaskApi.create`

- [x] Task 11: 前端文案统一为「内容优化」
  - [ ] SubTask 11.1: `frontend/src/components/layout/Sidebar.tsx` 中「生成内容资产」→「内容优化」
  - [ ] SubTask 11.2: `frontend/src/pages/NewRewritePage.tsx` 中按钮「生成内容资产」→「开始优化」/「优化 N 类内容资产」
  - [ ] SubTask 11.3: `frontend/src/pages/RewriteResultPage.tsx` 标题/面包屑中相关文案→「内容优化结果」
  - [ ] SubTask 11.4: `frontend/src/pages/HistoryPage.tsx` 中相关文案→「内容优化任务」
  - [ ] SubTask 11.5: 其他出现「生成内容资产」的用户可见文案统一替换（route / 文件名不改）

- [x] Task 12: 结果页与历史任务显示模型信息
  - [ ] SubTask 12.1: RewriteResultPage 顶部 TaskContextBar 增加「使用模型：Provider · model_id」显示（若有）
  - [ ] SubTask 12.2: HistoryPage 列表可在 task card 下方小字显示 model_display_name（若有，可选）

- [x] Task 13: 构建验证与报告
  - [ ] SubTask 13.1: `cd backend && source .venv/bin/activate && python -c "from app.main import app"` 验证后端 import 正常
  - [ ] SubTask 13.2: `cd frontend && npx tsc --noEmit` 通过
  - [ ] SubTask 13.3: `cd frontend && npm run build` 通过
  - [ ] SubTask 13.4: 输出 `account-center-settings-model-config-report.md`，包含 20 项必填章节

# Task Dependencies

- Task 2 依赖 Task 1（需要 ModelConfig 模型与 secret 配置）
- Task 3 依赖 Task 1 + Task 2（需要 schemas + crypto + model_runtime）
- Task 4 依赖 Task 1（需要 ModelConfig 模型）
- Task 5 依赖 Task 4（LLMService 改造完成）
- Task 9 依赖 Task 3（需要后端 API）
- Task 10 依赖 Task 9（需要 useModelConfigs hooks）
- Task 12 依赖 Task 5（需要任务保存 model 信息）
- Task 13 依赖所有前置任务

# Parallelizable Work

- Task 6（前端 ThemeProvider）与 Task 1-5（后端）可并行
- Task 7（AccountWidget）与 Task 8（SettingsDialog）可与 Task 6 并行
- Task 11（文案替换）独立可并行
