# Checklist

## 账户中心入口
- [x] 左下角账户中心入口显示在 Sidebar 底部（替代 EnterpriseCard）
- [x] 点击账户中心显示 DropdownMenu，包含「设置」和「关于项目」
- [x] 点击「设置」打开 SettingsDialog 弹窗，不发生路由跳转
- [x] 「设置」不是 Sidebar 一级菜单

## 设置弹窗结构
- [x] SettingsDialog 包含「外观」「模型配置」「关于」三个 Tab
- [x] 支持外部传入 initialTab（用于「去配置模型」直接定位）

## 外观主题
- [x] 外观 Tab 提供三个选项：跟随系统 / 浅色 / 深色
- [x] 选择后立即生效（切换 `<html>` 的 `dark` class）
- [x] 持久化到 localStorage key=`appearance_mode`
- [x] 刷新页面后保留主题
- [x] 跟随系统模式监听 matchMedia 变化
- [x] 深色模式下主布局 / Sidebar / 弹窗 / 表单 / 按钮均可读（.dark 变量已全覆盖）

## 模型配置 - 数据与安全
- [x] 新增 `model_configs` 数据表，含加密的 api_key 字段
- [x] RewriteTask 表新增 4 个 nullable 字段：model_config_id / model_provider / model_name / model_display_name
- [x] Alembic 迁移正常执行
- [x] `.env.example` 新增 `MODEL_CONFIG_SECRET_KEY=change-me`
- [x] 后端启动时检测 secret，未配置则 WARNING
- [x] API Key 使用 Fernet 加密存储
- [x] 返回前端时只返回 `masked_api_key`，绝不返回完整 api_key
- [x] masked_api_key 格式如 `sk-****abcd`

## 模型配置 - API
- [x] GET `/api/settings/models` 返回列表（仅 masked_api_key）
- [x] POST `/api/settings/models` 创建配置（加密存储 api_key）
- [x] PATCH `/api/settings/models/:id` 更新配置
- [x] DELETE `/api/settings/models/:id` 删除配置
- [x] POST `/api/settings/models/:id/test` 测试连接
- [x] POST `/api/settings/models/:id/default` 设置默认
- [x] 设置默认时其他配置 is_default 自动置 false

## 模型配置 - Provider 预设
- [x] P0 预设 8 个 Provider：OpenAI / DeepSeek / Qwen / Moonshot / 火山方舟 / OpenRouter / Ollama / 自定义
- [x] 选择 Provider 后预填默认 base_url 与 model_id 示例
- [ ] Ollama 的 API Key 可选（当前 api_key 必填，Ollama 用户需填占位字符串，报告已记录）

## 模型配置 - 前端面板
- [x] ModelConfigPanel 显示模型列表
- [x] 支持新增模型（表单：Provider / 显示名称 / API Key / Base URL / Model ID / Temperature / Max Tokens）
- [x] 支持编辑模型（API Key 显示掩码，需点「重新输入」才可修改）
- [x] 支持启用 / 禁用模型
- [x] 支持设置默认模型
- [x] 支持测试连接（成功显示「连接成功」，失败显示友好错误）
- [x] 支持删除模型

## 模型测试连接
- [x] 测试使用该配置发起最小请求（prompt: `Return "ok".`）
- [x] 成功返回 `{ success: true, message: "连接成功" }`
- [x] 失败返回友好 message（API Key 无效 / Base URL 无法访问 / 模型 ID 不存在 / 请求超时）
- [x] 不暴露完整错误堆栈

## 任务关联模型
- [x] TaskCreate 接受可选 `model_config_id`
- [x] 创建任务时若传入 model_config_id，写入 task 的 4 个模型字段
- [x] RewriteService 执行时读取 task.model_config_id 并传给 LLMService
- [x] Call 1（评分）与 Call 2（改写）均使用所选模型
- [x] 旧任务（model_config_id 为 null）回退 settings 全局配置，不报错
- [x] llm_call_logs 记录实际使用的 provider 与 model_name

## 内容优化页模型选择
- [x] NewRewritePage 右侧操作卡显示「模型」下拉
- [x] 位置在「内容资产类型」下方、「开始优化」按钮上方
- [x] 已配置模型时默认选中 is_default 模型
- [x] 下拉显示格式 `Provider · model_id`
- [x] 未配置模型时生成按钮 disabled
- [x] 未配置时显示提示「请先在账户中心配置模型 API Key。」
- [x] 未配置时提供「去配置模型」按钮，点击打开 SettingsDialog 模型配置 Tab
- [x] 创建任务时把 model_config_id 传入后端

## 文案统一为「内容优化」
- [x] Sidebar 导航「生成内容资产」→「内容优化」
- [x] NewRewritePage 按钮→「开始优化」/「优化 N 类内容资产」
- [x] RewriteResultPage 标题→「内容优化结果」
- [x] HistoryPage 文案→「内容优化任务」
- [x] route / 文件名未改（仅用户可见文案）

## 结果页与历史任务显示模型
- [x] RewriteResultPage 顶部显示「使用模型：Provider · model_id」（若有）
- [x] HistoryPage 可选显示 model_display_name

## 开源提示
- [x] 关于 Tab 显示「GEO 内容优化工作台 / Open-source GEO Content Optimization Workbench」
- [x] 关于 Tab 显示 API Key 安全提示「请勿将 API Key 提交到公开仓库」
- [x] 无商业 SaaS 付费文案

## 构建验证
- [x] 后端 `python -c "from app.main import app"` 正常
- [ ] 后端测试连接接口可正常调用（手动 curl 验证，需用户配置真实 API Key）
- [x] 前端 `npx tsc --noEmit` 通过
- [x] 前端 `npm run build` 通过
- [ ] 单类型内容优化任务正常生成（需端到端测试）
- [ ] 多类型内容优化任务正常生成（需端到端测试）
- [x] 历史任务读取不受影响（新增字段全 nullable，代码层面兼容）

## 约束遵守
- [x] 未做草稿箱导入
- [x] 未做 PDF / Word / HTML 解析（mammoth 已有但本轮不扩展）
- [x] 未做网页链接抓取
- [x] 未做公众号链接抓取
- [x] 未做自动发布
- [x] 未做完整权限系统 / 多用户团队管理
- [x] 未做计费
- [x] 未大规模重命名后端模型
- [x] 未破坏已有任务生成逻辑
- [x] 未破坏旧任务读取

## 报告
- [x] 输出 `account-center-settings-model-config-report.md`，含 20 项必填章节
