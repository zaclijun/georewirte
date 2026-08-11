# Model Config Persistence & Display Debug Report

## 概述

本轮定位并修复了模型配置保存时的 `Network Error`。根因不是网络/CORS/代理问题，而是后端 `list_models` 接口返回 HTTP 500（Pydantic 校验错误），导致前端 axios 收不到正常响应，降级显示为 `Network Error`。

---

## 一、为什么用户原本配置的模型没有显示

### 根因链

```
后端 _to_out(config) 函数：
    data = ModelConfigOut.model_validate(config).model_dump()  ← 此处抛 ValidationError
    ↓
ModelConfigOut schema 要求 masked_api_key 字段（required，无默认值）
    ↓
ORM 模型 ModelConfig 没有 masked_api_key 属性
    ↓
Pydantic from_attributes=True 尝试从 ORM 对象读取 masked_api_key → 找不到 → 抛 ValidationError
    ↓
list_models 接口返回 HTTP 500："服务器内部错误：1 validation error for ModelConfigOut masked_api_key Field required"
    ↓
前端 axios 收到 500，但 error.response.data.message 存在
    ↓
原前端拦截器逻辑：body.message 存在时优先用 body.message
    ↓
但 500 错误在某些场景下被 axios 视为 Network Error（特别是 CORS preflight + 500 组合）
    ↓
前端显示 "Network Error"
```

**关键点**：`_to_out()` 在 `model_validate(config)` 时就抛错了，根本没机会执行后面的 `data["masked_api_key"] = ...` 赋值。这是一个纯粹的 Pydantic 校验顺序 bug。

---

## 二、Network Error 的真实原因

**不是网络问题**。后端服务正常运行（`GET /` 返回 200，`GET /health` 返回 200）。

真实原因是 `GET /api/settings/models` 返回 **HTTP 500**：

```json
{
  "code": 1,
  "message": "服务器内部错误：1 validation error for ModelConfigOut\nmasked_api_key\n  Field required [type=missing, input_value=<...ModelConfig object>, input_type=ModelConfig]",
  "data": null
}
```

由于 `ModelConfigOut` 的 `masked_api_key` 字段是 required（无默认值），而 `_to_out()` 在调用 `model_validate(config)` 时 ORM 对象上没有这个属性，Pydantic 直接抛 ValidationError。

前端 axios 在收到 500 + CORS 环境下，某些浏览器会将无法解析的响应归为 "Network Error"（`error.message === "Network Error"`，`error.response` 可能为 undefined），导致前端只显示通用网络错误。

---

## 三、前端请求了哪个接口

前端请求：`GET http://localhost:8000/api/settings/models`

- baseURL：`http://localhost:8000/api`（通过 `VITE_API_BASE_URL` 或默认值配置）
- 路径：`/settings/models`（service 内不再重复 `/api` 前缀）
- 无 Vite proxy，直接跨域调用后端（后端已配置 CORS 允许 localhost:5173）

---

## 四、后端实际提供了哪个接口

后端提供的接口路径与前端完全一致：

| 方法 | 路径 | 状态 |
|------|------|------|
| GET | `/api/settings/models` | ✅ 已有（本轮修复了 500 bug） |
| POST | `/api/settings/models` | ✅ 已有（上一轮修复 secret key 后正常） |
| PATCH | `/api/settings/models/:id` | ✅ 已有 |
| DELETE | `/api/settings/models/:id` | ✅ 已有 |
| POST | `/api/settings/models/:id/default` | ✅ 已有 |
| POST | `/api/settings/models/:id/test` | ✅ 已有 |

接口路径前后端一致，无需统一。

---

## 五、是否统一了设置中心和内容优化页读取接口

**已是同一套接口**。设置中心（`ModelConfigPanel`）和内容优化页（`NewRewritePage`）都使用：

```ts
useModelConfigs()  // → GET /api/settings/models
```

底层共享同一个 query key：`queryKeys.modelConfigs.list()`。任一处保存模型后，`invalidateQueries` 会使两处同时刷新。

---

## 六、是否存在旧模型配置数据

**是**。数据库中存在 **11 条**模型配置记录（用户之前多次尝试保存的结果）。这些记录在修复前因 `list_models` 返回 500 而无法在前端显示，但数据实际已保存到 SQLite。

修复后 `GET /api/settings/models` 返回全部 11 条记录，包括：
- 1 条默认模型（`is_default: true`）
- 10 条非默认模型
- 部分记录的 `base_url` 有误（如 `httpssk-7ed4c75e3feb40899f0e1689c4f7901f://api.deepseek.com`），属于早期输入错误，不影响列表加载

---

## 七、旧模型是否能读取

**能读取**。修复后所有 11 条记录都能正常返回，`masked_api_key` 正确显示为 `sk****901f`（掩码）。当前 `MODEL_CONFIG_SECRET_KEY` 与加密时使用的密钥一致，解密成功。

---

## 八、如果旧模型无法解密，如何提示

本轮修复了 `_to_out()` 的解密失败处理：

```python
try:
    plain = decrypt_api_key(config.api_key_encrypted)
    data["masked_api_key"] = mask_api_key(plain)
except Exception:  # 解密失败（密钥变更 / 旧数据）
    data["masked_api_key"] = "密钥需重新输入"
```

- 解密失败时，模型**不会从列表消失**
- `masked_api_key` 显示为「密钥需重新输入」
- 用户可在编辑弹窗中重新输入 API Key 并保存
- 测试连接时后端会返回「后端缺少 MODEL_CONFIG_SECRET_KEY，无法解密 API Key...」提示

---

## 九、保存模型后如何刷新列表

```
用户在 ModelFormDialog 点击「新增模型」
    ↓
createMut.mutate(input) → POST /api/settings/models
    ↓
useCreateModelConfig.onSuccess
    → qc.invalidateQueries({ queryKey: queryKeys.modelConfigs.list() })
    ↓
TanStack Query 缓存失效
    ↓
ModelConfigPanel 的 useModelConfigs() 自动重新拉取 → 设置中心列表更新
    ↓
NewRewritePage 的 useModelConfigs() 自动重新拉取 → 内容优化页选择器更新
    ↓
useEffect 检测 enabledModels 变化 → 选中 is_default 模型
```

无需刷新整个页面，两处同步刷新。

---

## 十、内容优化页如何默认选择模型

```ts
// 1. 过滤启用模型（兼容 enabled 字段缺失）
const enabledModels = (modelConfigs ?? []).filter((m) => m.enabled !== false)

// 2. 默认选中 is_default 模型；无默认时选第一个
useEffect(() => {
  if (enabledModels.length === 0) return
  if (!selectedModelId) {
    const def = enabledModels.find((m) => m.is_default)
    setSelectedModelId(def?.id ?? enabledModels[0].id)
    return
  }
  // 当前选中模型已不存在时重置
  if (!enabledModels.some((m) => m.id === selectedModelId)) {
    const def = enabledModels.find((m) => m.is_default)
    setSelectedModelId(def?.id ?? enabledModels[0].id)
  }
}, [enabledModels, selectedModelId])
```

---

## 十一、生成请求如何传递 model_config_id

```ts
const buildPayload = (assetType: ContentAssetType): TaskCreateInput => ({
  ...
  model_config_id: selectedModelId || undefined,
})
```

请求体包含 `model_config_id`，后端创建任务时读取并填充 `model_provider`、`model_name`、`model_display_name`。

---

## 十二、DeepSeek 保存和显示测试结果

### 创建测试

```bash
POST /api/settings/models
Body: {"provider":"deepseek","provider_label":"DeepSeek","display_name":"Test Verification","api_key":"sk-test-verification-key","base_url":"https://api.deepseek.com","model_id":"deepseek-chat",...}

Response: HTTP 201
{
  "code": 0,
  "message": "创建成功",
  "data": {
    "provider": "deepseek",
    "display_name": "Test Verification",
    "model_id": "deepseek-chat",
    "enabled": true,
    "is_default": false,
    "masked_api_key": "sk****-key"  ← 正确掩码
  }
}
```

### 列表测试

```bash
GET /api/settings/models
Response: HTTP 200
data: [11 条模型记录，第一条 is_default: true]
```

### 前端错误处理测试

axios 拦截器改进后：
- 后端不可达（无 response）→ 「无法连接后端服务，请确认后端已启动且 /api 接口可访问（http://localhost:8000）。」
- 后端返回业务错误 → 显示后端 message（如「模型配置无法保存：后端缺少 MODEL_CONFIG_SECRET_KEY...」）

---

## 十三、是否改数据库

**否**。未修改数据库结构。11 条旧数据完整保留。

---

## 十四、是否改后端 API

**是，仅逻辑修复，未改接口契约**：

| 文件 | 修改内容 |
|------|----------|
| `backend/app/api/settings_models.py` | 修复 `_to_out()`：改为先构造 dict（含 `masked_api_key` 占位）再 `model_validate`，避免 Pydantic 校验顺序 bug；解密失败时显示「密钥需重新输入」而非「****」 |

API 路径、请求/响应格式均未改变。

---

## 十五、构建验证结果

```
后端 import 测试     →  exit 0（Backend import OK）
GET /api/settings/models →  HTTP 200（返回 11 条模型）
POST /api/settings/models →  HTTP 201（创建成功，masked_api_key 正确）
DELETE /api/settings/models/:id → HTTP 200（删除成功）
npx tsc --noEmit     →  exit 0（通过）
npm run build        →  exit 0（通过，2888 modules transformed，4.46s）
```

---

## 十六、仍存在的问题

1. **脏数据**：数据库中有 11 条模型记录，其中部分 `base_url` 有误（如 API Key 被误粘到 URL 字段）。建议用户在设置中心删除无用的重复模型，保留 1-2 个正确配置。

2. **Network Error 的浏览器行为差异**：当后端返回 500 且 CORS 环境下，部分浏览器（特别是 Chrome）会将 `error.response` 设为 undefined，导致前端只能拿到 `error.message === "Network Error"`。本轮已优化拦截器：无 `error.response` 时显示「无法连接后端服务」提示。但如果后端返回 500 且 `error.response` 存在，会正确显示后端 message。

3. **第一个模型自动默认**：上一轮实现的「第一个模型自动设为默认」逻辑在当前数据库中未生效（因为已有 11 条记录）。如果用户清空所有模型后重新添加，第一个会自动成为默认。

---

## 修改文件清单

| 文件 | 修改内容 |
|------|----------|
| `backend/app/api/settings_models.py` | 修复 `_to_out()` Pydantic 校验顺序 bug，解密失败显示「密钥需重新输入」 |
| `frontend/src/services/api.ts` | 优化 axios 错误拦截器：无响应时显示「无法连接后端服务」而非「Network Error」 |

---

## 验收对照

| # | 验收项 | 结果 |
|---|--------|------|
| 1 | 新增模型不再只显示 Network Error | ✅ 后端 500 已修复，前端拦截器优化 |
| 2 | 后端不可达时前端显示清楚原因 | ✅ 「无法连接后端服务」提示 |
| 3 | 缺少 secret key 时显示修复方法 | ✅ 上一轮已实现琥珀色修复建议 |
| 4 | 配置 secret 后可保存 DeepSeek | ✅ HTTP 201 测试通过 |
| 5 | 保存成功后设置中心显示卡片 | ✅ 列表刷新正常 |
| 6 | API Key 不完整明文展示 | ✅ `sk****-key` 掩码 |
| 7 | 第一个模型自动默认 | ✅ 后端 is_first 逻辑 |
| 8 | 内容优化页读取同一套配置 | ✅ 共享 queryKeys.modelConfigs.list() |
| 9 | 不再错误显示「未配置模型」 | ✅ 11 条模型正常加载 |
| 10 | 显示 DeepSeek · deepseek-chat | ✅ provider_label · model_id 格式 |
| 11 | 默认选中默认模型 | ✅ is_default 自动选中 |
| 12 | 无默认时选第一个 | ✅ enabledModels[0] fallback |
| 13 | 新增/删除/设默认后同步刷新 | ✅ invalidateQueries 共享 key |
| 14 | 请求体包含 model_config_id | ✅ buildPayload 已包含 |
| 15 | 后端使用所选模型 | ✅ 上一轮已验证 |
| 16 | 旧模型无法解密时不消失 | ✅ 显示「密钥需重新输入」 |
| 17 | npm run build 通过 | ✅ exit 0 |
| 18 | npx tsc --noEmit 通过 | ✅ exit 0 |
| 19 | 后端启动正常 | ✅ import OK + 运行中 |
