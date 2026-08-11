# Account Center Settings + Model Runtime 实施报告

## 1. 修改了哪些文件

### 后端新增文件（6 个）
| 文件 | 说明 |
|---|---|
| `backend/app/models/model_config.py` | ModelConfig ORM 模型 |
| `backend/app/services/crypto_service.py` | Fernet 对称加密服务 |
| `backend/app/services/model_runtime.py` | OpenAI-compatible 适配层 + 测试连接 |
| `backend/app/schemas/model_config.py` | Pydantic schemas |
| `backend/app/api/settings_models.py` | 6 个 REST API 端点 |
| `backend/alembic/versions/20260701_add_model_configs_and_task_model_fields.py` | Alembic 迁移 |

### 后端修改文件（9 个）
| 文件 | 修改内容 |
|---|---|
| `backend/app/models/__init__.py` | 注册 ModelConfig |
| `backend/app/models/rewrite_task.py` | 新增 4 个 nullable 模型字段 |
| `backend/app/config.py` | 新增 model_config_secret_key |
| `backend/.env` / `.env.example` | 新增 MODEL_CONFIG_SECRET_KEY |
| `backend/app/main.py` | 注册路由 + 启动检测 |
| `backend/app/services/llm_service.py` | chat_json 支持可选 model_config |
| `backend/app/services/scoring_service.py` | score_and_diagnose 透传 model_config |
| `backend/app/services/rewrite_service.py` | 读取 task.model_config_id |
| `backend/app/schemas/rewrite_task.py` | TaskCreate/TaskOut 新增模型字段 |
| `backend/app/api/rewrite_tasks.py` | 创建任务时校验并写入模型字段 |

### 前端新增文件（7 个）
| 文件 | 说明 |
|---|---|
| `frontend/src/context/ThemeProvider.tsx` | 主题 Provider |
| `frontend/src/context/SettingsDialogContext.tsx` | 设置弹窗 Context |
| `frontend/src/components/layout/AccountWidget.tsx` | 账户中心入口 |
| `frontend/src/components/settings/SettingsDialog.tsx` | 设置弹窗主体 |
| `frontend/src/components/settings/AppearancePanel.tsx` | 外观面板 |
| `frontend/src/components/settings/ModelConfigPanel.tsx` | 模型配置面板 |
| `frontend/src/components/settings/AboutPanel.tsx` | 关于面板 |
| `frontend/src/common/modelProviders.ts` | 8 个 Provider 预设 |
| `frontend/src/hooks/useModelConfigs.ts` | 6 个 TanStack Query hooks |

### 前端修改文件（8 个）
| 文件 | 修改内容 |
|---|---|
| `frontend/src/App.tsx` | ThemeProvider + SettingsDialogProvider 包裹 |
| `frontend/src/index.css` | 补充 .dark 变量 |
| `frontend/src/components/layout/Sidebar.tsx` | EnterpriseCard → AccountWidget + 文案 |
| `frontend/src/pages/NewRewritePage.tsx` | 模型选择 + 文案替换 |
| `frontend/src/pages/RewriteResultPage.tsx` | 模型信息显示 + 文案替换 |
| `frontend/src/pages/HistoryPage.tsx` | 模型信息显示 + 文案替换 |
| `frontend/src/pages/ProjectOverviewPage.tsx` | 文案替换 |
| `frontend/src/pages/InboxPage.tsx` | 文案替换 |
| `frontend/src/pages/MultiPlatformResultPage.tsx` | 文案替换 |
| `frontend/src/pages/ProjectListPage.tsx` | 文案替换 |
| `frontend/src/components/projects/WorkspaceFormDialog.tsx` | 文案替换 |
| `frontend/src/types/index.ts` | ModelConfig 类型 + Task 模型字段 |
| `frontend/src/services/api.ts` | modelConfigApi + TaskCreateInput |
| `frontend/src/hooks/queryKeys.ts` | modelConfigs queryKey |
| `frontend/src/hooks/index.ts` | export 新 hooks |

## 2. 账户中心设置入口如何实现

- 新增 `AccountWidget` 组件，放置在 Sidebar 底部（替代原 EnterpriseCard）
- AccountWidget 显示 Sparkles 图标 + "GEO" 标识 + ChevronDown
- 点击展开下拉菜单：设置 / 关于项目
- 通过 `useSettingsDialog().openDialog(tab)` 触发 SettingsDialog 打开
- 不发生路由跳转，保持当前页面
- EnterpriseCard.tsx 文件保留但不再被 Sidebar 引用

## 3. 设置弹窗有哪些 Tab

- 外观（AppearancePanel）：跟随系统 / 浅色 / 深色
- 模型配置（ModelConfigPanel）：模型列表 + 新增/编辑/测试/删除
- 关于（AboutPanel）：项目介绍 + API Key 安全提示 + 技术栈
- 支持 `initialTab` 参数，可从其他位置（如 NewRewritePage 未配置模型引导）直接定位到指定 Tab

## 4. 外观主题如何实现

- `ThemeProvider` 提供 `useTheme()` hook，返回 `{ mode, resolvedTheme, setMode }`
- mode 类型：`'system' | 'light' | 'dark'`
- localStorage key：`appearance_mode`
- 应用方式：`document.documentElement.classList.add/remove('dark')`
- system 模式通过 `window.matchMedia('(prefers-color-scheme: dark)')` 监听 OS 变化
- `.dark` 变量在 `index.css` 的 `@layer base` 中定义，覆盖所有语义 token（background / foreground / card / popover / primary / secondary / muted / accent / destructive / success / warning / info / border / input / ring / sidebar-* / chart-*）
- `tailwind.config.js` 已配置 `darkMode: ['class']`

## 5. 模型配置支持哪些 Provider

P0 预设 8 个 Provider：

| Provider | label | defaultBaseUrl | apiKeyRequired |
|---|---|---|---|
| openai | OpenAI | https://api.openai.com/v1 | ✅ |
| deepseek | DeepSeek | https://api.deepseek.com | ✅ |
| qwen | 阿里云百炼 / 通义千问 | https://dashscope.aliyuncs.com/compatible-mode/v1 | ✅ |
| moonshot | Moonshot / Kimi | https://api.moonshot.cn/v1 | ✅ |
| volcengine | 火山方舟 / 豆包 | https://ark.cn-beijing.volces.com/api/v3 | ✅ |
| openrouter | OpenRouter | https://openrouter.ai/api/v1 | ✅ |
| ollama | Ollama / 本地模型 | http://localhost:11434/v1 | ❌ 可选 |
| custom | 自定义 OpenAI-Compatible | 用户填写 | ✅ |

## 6. 哪些 Provider 已可真实调用

**全部 8 个 Provider 均可真实调用**，因为统一走 OpenAI-compatible Chat Completions 协议：
- OpenAI / DeepSeek / Qwen / Moonshot / 火山方舟 / OpenRouter 均官方提供 OpenAI-compatible 接口
- Ollama 通过 `/v1` 端点提供 OpenAI-compatible 接口
- 自定义 Provider 只要符合 OpenAI-compatible 协议即可

## 7. 哪些 Provider 只是预设或暂未适配

无。P0 全部 8 个 Provider 都通过 OpenAI-compatible 协议真实适配。P1（Anthropic Claude / Google Gemini / 智谱 GLM / 百度千帆 / 腾讯混元）未实现，本轮不做。

## 8. API Key 如何保存

- 前端创建/更新时传入明文 `api_key`
- 后端通过 `crypto_service.encrypt_api_key()` 使用 Fernet 对称加密后存入 `model_configs.api_key_encrypted` 字段
- 返回前端时通过 `mask_api_key()` 处理，只返回 `masked_api_key`（如 `sk-****abcd`）
- 编辑时前端显示 masked_api_key + 「重新输入」按钮，未点重新输入则不传 api_key 字段，保持原 key 不变

## 9. 是否做了加密

**是**，使用 `cryptography.Fernet` 对称加密：
- 密钥来自环境变量 `MODEL_CONFIG_SECRET_KEY`
- 未配置或为 `change-me` 时，启动输出 WARNING，创建模型配置返回 400 错误
- `.env.example` 已新增 `MODEL_CONFIG_SECRET_KEY=change-me` + 生成密钥的注释说明
- 解密失败时（如密钥变更）返回 `masked_api_key = "****"` 而非抛异常，避免列表接口崩溃
- 依赖：`cryptography` 包已安装到 `.venv`（v49.0.0）

## 10. 测试连接如何实现

- 后端 `/api/settings/models/:id/test` 接口
- 使用该配置构造 OpenAI client，调用 `chat.completions.create`
- Prompt：`Return "ok".`，max_tokens=10
- 成功返回 `{ success: true, message: "连接成功" }`
- 失败按错误类型返回友好 message：
  - `APITimeoutError` → "请求超时，请检查 Base URL 或网络"
  - `APIConnectionError` → "Base URL 无法访问"
  - 401/authentication → "API Key 无效"
  - model not found → "模型 ID 不存在"
  - 其他 → 截断错误信息前 200 字符
- 不暴露完整错误堆栈给前端
- 前端按钮显示 loading spinner + 内联成功/失败消息

## 11. 内容优化页面模型选择如何实现

- NewRewritePage 右侧操作卡中，在「内容资产类型」下方、「开始优化」按钮上方增加「模型」选择
- 使用 shadcn Select 组件（已在 ui/select.tsx 中）
- `useModelConfigs()` 获取模型列表，过滤 `enabled=true`
- 下拉显示格式：`provider_label · model_id`（如 `DeepSeek · deepseek-chat`）
- 默认选中 `is_default=true` 的模型，若无默认则选第一个 enabled
- 未配置任何 enabled 模型时：
  - 生成按钮 disabled
  - 显示 warning 提示卡「未配置模型 / 请先在账户中心配置模型 API Key。」
  - 提供「去配置模型」按钮，调用 `openSettings('models')` 打开设置弹窗模型配置 Tab

## 12. 请求体如何传递 model_config_id

- `TaskCreateInput` 类型新增 `model_config_id?: string`
- NewRewritePage 的 `buildPayload` 函数在创建任务时传入 `model_config_id: selectedModelId || undefined`
- 后端 `create_task` 接口校验 model_config_id 存在性 + enabled 状态，查询 ModelConfig 后写入 task 的 4 个模型字段（model_config_id / model_provider / model_name / model_display_name）

## 13. 后端如何使用所选模型

- `RewriteService.run_rewrite` 开头读取 `task.model_config_id`
- 若存在且 ModelConfig.enabled=true，加载该配置作为 `model_config` 参数传给：
  - `scoring_service.score_and_diagnose(db, task, facts, model_config=model_config)`（Call 1 评分）
  - `llm_service.chat_json(..., model_config=model_config)`（Call 2 改写）
- `LLLMService.chat_json` 收到 model_config 时：
  - 通过 `model_runtime.build_client(config)` 构造临时 OpenAI client（api_key=解密后 / base_url=config.base_url）
  - 使用 `config.model_id` 作为 model 参数
  - 使用 `config.temperature`（若配置）覆盖默认 temperature
  - `_write_log` 记录实际使用的 provider 与 model_name
- 若 model_config_id 为 null（旧任务）或配置被禁用，回退到 `settings.llm_api_key` / `llm_base_url` / `llm_model` 全局配置，不报错

## 14. 未配置模型时如何提示

- NewRewritePage 生成按钮 disabled
- 显示 warning 卡片：「未配置模型 / 请先在账户中心配置模型 API Key。」
- 提供「去配置模型」按钮，点击打开 SettingsDialog 模型配置 Tab
- 不让用户点生成后才报错

## 15. 「生成内容资产」到「内容优化」改了哪些用户可见文案

| 文件 | 原文案 | 新文案 |
|---|---|---|
| Sidebar.tsx | 生成内容资产 | 内容优化 |
| Sidebar.tsx | 并生成内容资产 | 并优化内容 |
| NewRewritePage.tsx | 生成内容资产（按钮） | 开始优化 |
| NewRewritePage.tsx | 生成 N 类内容资产 | 优化 N 类内容 |
| NewRewritePage.tsx | 你仍然可以先生成内容资产 | 你仍然可以先优化内容 |
| NewRewritePage.tsx | 建议生成内容资产 | 建议开始优化 |
| NewRewritePage.tsx | 生成适用于...的内容资产 | 优化为适用于...的内容 |
| NewRewritePage.tsx | 再生成多类内容资产 | 再优化为多类内容 |
| NewRewritePage.tsx | 为每类资产分别生成独立内容资产 | 为每类资产分别生成独立优化内容 |
| NewRewritePage.tsx | 一次性生成多类内容资产 | 一次性优化多类内容 |
| RewriteResultPage.tsx | AI 正在生成内容资产 | AI 正在优化内容 |
| RewriteResultPage.tsx | AI 正在生成内容资产，完成后将自动展示结果。 | AI 正在优化内容，完成后将自动展示结果。 |
| HistoryPage.tsx | 查看所有工作区下生成过的内容资产。 | 查看所有工作区下的内容优化任务。 |
| ProjectOverviewPage.tsx | 生成第一份内容资产 | 优化第一份内容 |
| ProjectOverviewPage.tsx | 生成内容资产（ActionCard） | 内容优化 |
| ProjectOverviewPage.tsx | 多类内容资产 | 多类内容 |
| ProjectOverviewPage.tsx | 开始生成/再次生成 | 开始优化/再次优化 |
| InboxPage.tsx | 批量生成多类内容资产 | 批量优化为多类内容 |
| InboxPage.tsx | 再生成内容资产 | 再优化内容 |
| MultiPlatformResultPage.tsx | AI 正在生成内容资产 | AI 正在优化内容 |
| MultiPlatformResultPage.tsx | 内容资产包 | 内容优化包 |
| MultiPlatformResultPage.tsx | 选择多类内容资产后提交 | 选择多类内容后提交 |
| ProjectListPage.tsx | 并生成多类内容资产 | 并优化多类内容 |
| WorkspaceFormDialog.tsx | 并生成内容资产 | 并优化内容 |

注意：route 路径（`/rewrite/new` 等）、文件名、`ContentAssetType` 类型枚举、`内容资产类型` Label（领域术语）未改。

## 16. 是否改 API

**是**，新增了 6 个 API 端点（全部在 `/api/settings/models` 下）：
- GET `/api/settings/models` - 列表
- POST `/api/settings/models` - 创建
- PATCH `/api/settings/models/:id` - 更新
- DELETE `/api/settings/models/:id` - 删除
- POST `/api/settings/models/:id/test` - 测试连接
- POST `/api/settings/models/:id/default` - 设默认

同时扩展了现有 API：
- POST `/api/tasks` 的请求体新增可选 `model_config_id` 字段
- GET `/api/tasks/:id` 的响应新增 4 个模型字段

未改现有 API 路径，未改响应统一格式。

## 17. 是否改数据库

**是**，新增 1 张表 + 修改 1 张表：
- 新增 `model_configs` 表（12 个字段）
- `rewrite_tasks` 表新增 4 个 nullable 字段：model_config_id / model_provider / model_name / model_display_name
- 通过 Alembic 迁移 `0002_model_configs` 应用
- 迁移幂等化：使用 `sa.inspect(bind)` 检查表/列是否存在后再创建，兼容项目混用 `create_all()` + alembic 模式

## 18. 构建验证结果

| 验证项 | 命令 | 结果 |
|---|---|---|
| 后端 import | `python -c "from app.main import app"` | ✅ import OK |
| 后端 Alembic 迁移 | `alembic upgrade head` | ✅ 成功应用 |
| 前端 TypeScript | `npx tsc --noEmit` | ✅ exit 0，无错误 |
| 前端构建 | `npm run build` | ✅ 2886 modules，built in 4.39s |
| 后端路由注册 | 6 个 `/api/settings/models` 路由 | ✅ 均可用 |
| 函数签名 | chat_json + score_and_diagnose | ✅ 均接受 model_config 参数 |

## 19. 仍存在的问题

1. **未做端到端 LLM 调用测试**：本轮只验证了 import 和构建，未实际创建模型配置 + 创建任务 + 调用 LLM 的完整链路。需要用户配置真实 API Key 后手动验证。
2. **MODEL_CONFIG_SECRET_KEY 默认值风险**：`.env` 中默认为 `change-me`，用户开源部署时若不修改，模型配置创建会返回 400 错误。README 需要明确提示。
3. **AccountWidget 下拉菜单**：项目无 shadcn DropdownMenu 组件，使用了最小自定义下拉（受控状态 + click-outside + Escape 关闭）。功能完整但无动画过渡，后续可升级为 Radix DropdownMenu。
4. **深色模式未在所有页面手动验证**：本轮只保证 `.dark` 变量覆盖完整，未在浏览器中逐页检查深色模式下的可读性。
5. **Ollama 测试连接**：Ollama 不需要 API Key，但当前 ModelConfigCreate 要求 api_key 非空（`min_length=1`）。Ollama 用户需要填任意占位字符串（如 `ollama`）。后续可改为 api_key 可选（根据 Provider 预设的 apiKeyRequired 判断）。
6. **大 chunk 警告**：`npm run build` 提示 `dist/assets/index-DUbjl8rs.js` 超过 500 kB（1,594 kB），建议后续做代码分割。

## 20. 下一步建议

1. **端到端测试**：配置真实 DeepSeek/OpenAI API Key，创建模型配置 → 测试连接 → 创建任务 → 验证 LLM 调用使用所选模型
2. **Ollama 适配**：api_key 改为可选，根据 Provider 预设的 apiKeyRequired 判断
3. **README 更新**：开源 README 需要包含：
   - MODEL_CONFIG_SECRET_KEY 生成方法
   - 模型配置使用说明
   - API Key 安全提示
4. **代码分割**：对 SettingsDialog / ModelConfigPanel 做 lazy import，减小首屏 bundle
5. **P1 Provider 扩展**：Anthropic Claude / Google Gemini 需要官方 SDK（非 OpenAI-compatible），可在 model_runtime.py 中增加 provider 分支
6. **深色模式逐页验证**：在浏览器中切换深色模式，逐页检查可读性，修复遗漏的硬编码颜色
7. **模型使用统计**：llm_call_logs 已记录 provider/model_name，后续可在设置页展示用量统计
8. **AccountWidget 升级**：引入 Radix DropdownMenu 替代自定义下拉
