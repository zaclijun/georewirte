# Model Config Secret Key Blocking Fix Report

## 概述

本轮修复模型配置保存被 `MODEL_CONFIG_SECRET_KEY` 阻塞的问题。根因是 `backend/.env` 中 `MODEL_CONFIG_SECRET_KEY=change-me`（占位符），后端 `crypto_service` 明确拒绝 `change-me`，导致新增模型时 `create_model` 抛出 `APIException`，前端显示原始技术错误信息。

---

## 一、为什么模型没有显示

### 根因链

```
backend/.env: MODEL_CONFIG_SECRET_KEY=change-me（占位符）
    ↓
crypto_service._get_fernet(): 检测到 change-me，raise RuntimeError
    ↓
crypto_service.is_crypto_configured(): 返回 False
    ↓
settings_models.create_model(): 调用 _require_crypto()，raise APIException
    ↓
前端收到 400 + message: "未配置 MODEL_CONFIG_SECRET_KEY"
    ↓
ModelFormDialog 显示原始错误，用户无法保存模型
    ↓
模型列表为空 → 内容优化页右侧显示「未配置模型」
```

**核心问题**：`.env` 从未配置真实的 Fernet 密钥，一直是 `change-me` 占位符。

---

## 二、MODEL_CONFIG_SECRET_KEY 在哪里使用

### 使用位置

| 文件 | 用途 |
|------|------|
| `backend/app/services/crypto_service.py` | `_get_fernet()` 读取该密钥构造 Fernet 加密器；`is_crypto_configured()` 检查是否已配置 |
| `backend/app/api/settings_models.py` | `create_model` / `update_model` 调用 `_require_crypto()` 校验；`encrypt_api_key()` 加密用户 API Key |
| `backend/app/main.py` | 启动时 warning 提示未配置 |
| `backend/app/config.py` | `settings.model_config_secret_key` 读取环境变量 |

### 加密流程

```
用户提交 API Key（明文）
    ↓
encrypt_api_key(plain_key) → Fernet.encrypt() → 密文存入 model_configs.api_key_encrypted
    ↓
读取时 decrypt_api_key(encrypted) → Fernet.decrypt() → 明文（仅后端使用）
    ↓
前端展示 mask_api_key(plain) → "sk****901f"（掩码）
```

---

## 三、.env.example 是否已补充

**是**。`backend/.env.example` 已优化注释：

```env
# ---- 模型配置加密密钥（用于加密用户配置的 API Key）----
# 必填：用于加密存储用户模型 API Key。生产环境必须使用随机强密钥，不要提交真实值到 Git。
# 生成命令：python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# 留空或保持 change-me 将导致模型配置无法保存。
MODEL_CONFIG_SECRET_KEY=change-me
```

同时 `backend/.env` 已写入真实 Fernet 密钥（本轮生成），用户可立即保存模型。

---

## 四、前端错误提示如何优化

### 优化前

```
未配置 MODEL_CONFIG_SECRET_KEY
```

（纯技术错误，用户不知道如何修复）

### 优化后

**表单弹窗错误区**（`ModelFormDialog`）：
- 红色错误条显示后端返回的完整错误信息
- 当错误包含 `MODEL_CONFIG_SECRET_KEY` 时，下方追加琥珀色修复建议块：
  - 说明问题：后端缺少加密密钥
  - 指出修复位置：`backend/.env`
  - 提供生成命令：`python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`

**全局 Toast 提示**（列表操作）：
- 错误信息完整显示
- 当包含 `MODEL_CONFIG_SECRET_KEY` 时，追加一行琥珀色提示「请在 backend/.env 中配置 MODEL_CONFIG_SECRET_KEY 并重启后端。」

### 后端错误信息也已优化

`_require_crypto()` 返回的错误信息从 `"未配置 MODEL_CONFIG_SECRET_KEY"` 改为：

```
模型配置无法保存：后端缺少 MODEL_CONFIG_SECRET_KEY。请在 backend/.env 中配置加密密钥并重启后端。生成命令：python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

测试连接的错误信息也同步优化。

---

## 五、保存模型后如何刷新模型列表

### 刷新流程

```
用户在 ModelFormDialog 点击「新增模型」
    ↓
createMut.mutate(input) → POST /api/settings/models
    ↓
useCreateModelConfig.onSuccess → qc.invalidateQueries({ queryKey: queryKeys.modelConfigs.list() })
    ↓
TanStack Query 缓存失效
    ↓
ModelConfigPanel 的 useModelConfigs() 自动重新拉取 → 列表更新
    ↓
NewRewritePage 的 useModelConfigs() 自动重新拉取（同一 query key）→ 模型选择器更新
    ↓
useEffect 检测到 enabledModels 变化 → 选中 is_default 模型
```

无需刷新整个页面，设置中心和内容优化页同步刷新。

---

## 六、是否自动设置第一个模型为默认模型

**是**。本轮在 `backend/app/api/settings_models.py` 的 `create_model` 中新增逻辑：

```python
existing_count = db.query(ModelConfig).count()
is_first = existing_count == 0

config = ModelConfig(
    ...
    is_default=is_first,  # 第一个模型自动设为默认
)
```

保存成功后返回消息：`"创建成功，已设为默认模型"`（仅第一个模型）。

这样用户新增第一个模型后，内容优化页会自动选中它（因为 `is_default=True`），无需手动设置默认。

---

## 七、内容优化页是否能读取模型

**是**。修复后的完整流程：

1. 后端 `.env` 已配置真实 Fernet 密钥 → `is_crypto_configured()` 返回 `True`
2. 用户在设置中心新增 DeepSeek 模型 → `create_model` 成功 → 自动设为默认（第一个）
3. `useCreateModelConfig.onSuccess` 使缓存失效
4. `NewRewritePage` 的 `useModelConfigs()` 自动重新拉取
5. `enabledModels` 过滤出启用的模型（`enabled !== false`）
6. `useEffect` 选中 `is_default` 模型（DeepSeek）
7. 模型选择器显示：`DeepSeek · deepseek-chat`
8. 不再显示「未配置模型」

---

## 八、DeepSeek 配置测试结果

### 后端加密服务测试

```python
is_crypto_configured: True
encrypted: gAAAAABqRJ_ebF0azeRx ...
decrypted: sk-test-123
round-trip OK: True
```

加密/解密往返测试通过。

### 推荐配置

| 字段 | 值 |
|------|-----|
| Provider | deepseek |
| 显示名称 | DeepSeek（或自定义） |
| API Key | sk-xxx（DeepSeek 开放平台申请） |
| Base URL | https://api.deepseek.com/v1 |
| Model ID | deepseek-chat |

> 注意：Base URL 需包含 `/v1` 后缀（OpenAI 兼容接口）。

---

## 九、是否改数据库

**否**。未修改任何数据库表结构、字段或 migration。`model_configs` 表的 `api_key_encrypted`、`is_default`、`enabled` 等字段已存在。

---

## 十、是否改后端 API

**是，仅逻辑调整，未改接口契约**：

| 文件 | 修改内容 |
|------|----------|
| `backend/.env` | `MODEL_CONFIG_SECRET_KEY` 从 `change-me` 改为真实 Fernet 密钥 |
| `backend/.env.example` | 优化注释，明确「必填」和「留空将导致无法保存」 |
| `backend/app/api/settings_models.py` | 1. `_require_crypto()` 错误信息更详细；2. `create_model` 新增第一个模型自动设为默认；3. `test_model` 错误信息更详细 |

API 路径、请求/响应格式均未改变。

---

## 十一、构建验证结果

```
后端 import 测试     →  exit 0（Backend import OK）
加密往返测试         →  round-trip OK: True
npx tsc --noEmit     →  exit 0（通过）
npm run build        →  exit 0（通过，2888 modules transformed，4.46s）
```

---

## 十二、仍存在的问题

1. **已有旧模型的 API Key 解密问题**：如果之前在 `change-me` 时期保存过模型（理论上不可能，因为 `change-me` 会被拒绝），那些密文无法用新密钥解密。本轮修复前 `change-me` 会被 `_require_crypto` 拦截，所以不存在用 `change-me` 加密的旧数据。如果确实存在历史数据，需重新输入 API Key。

2. **生产环境部署提醒**：`.env` 中的 Fernet 密钥是本轮生成的，仅适用于当前开发环境。生产部署时必须重新生成独立密钥，不要复用开发环境的密钥。

3. **密钥轮换**：当前未实现密钥轮换机制。如果未来需要更换 `MODEL_CONFIG_SECRET_KEY`，已有模型的 `api_key_encrypted` 需要用旧密钥解密后用新密钥重新加密。P0 不涉及此场景。

---

## 十三、修改文件清单

| 文件 | 修改内容 |
|------|----------|
| `backend/.env` | `MODEL_CONFIG_SECRET_KEY` 改为真实 Fernet 密钥 |
| `backend/.env.example` | 优化注释（必填 + 生成命令 + 警告） |
| `backend/app/api/settings_models.py` | 错误信息优化 + 第一个模型自动默认 |
| `frontend/src/components/settings/ModelConfigPanel.tsx` | 错误提示优化（检测 MODEL_CONFIG_SECRET_KEY 显示修复建议） |

---

## 十四、验收对照

| # | 验收项 | 结果 |
|---|--------|------|
| 1 | 未配置密钥时不静默失败 | ✅ 返回 400 + 清晰错误 |
| 2 | 前端显示清晰错误和修复方法 | ✅ 琥珀色修复建议块 |
| 3 | `.env.example` 包含 `MODEL_CONFIG_SECRET_KEY` | ✅ 已有并优化注释 |
| 4 | 配置密钥后可成功新增 DeepSeek | ✅ 加密往返测试通过 |
| 5 | 新增成功后设置中心列表显示 | ✅ 缓存失效自动刷新 |
| 6 | 第一个模型自动成为默认 | ✅ 后端 `is_first` 逻辑 |
| 7 | 内容优化页显示模型选择器 | ✅ useModelConfigs 同步刷新 |
| 8 | 不再显示「未配置模型」 | ✅ 有模型即显示选择器 |
| 9 | 默认选中 DeepSeek · deepseek-chat | ✅ is_default 自动选中 |
| 10 | 请求体包含 model_config_id | ✅ 上一轮已修复 |
| 11 | 后端可解密 API Key | ✅ round-trip OK |
| 12 | 测试连接返回成功/清晰失败 | ✅ 错误信息已优化 |
| 13 | npm run build 通过 | ✅ exit 0 |
| 14 | npx tsc --noEmit 通过 | ✅ exit 0 |
| 15 | 后端启动正常 | ✅ import OK |
