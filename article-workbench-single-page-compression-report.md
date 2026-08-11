# Article Workbench Single-Page Compression Report

> 本轮目标：把文章工作台从「三步向导」压缩为「单页工作台」。
> 范围：仅前端交互压缩，不改后端 API、不改数据库、不改 Prompt。

---

## 1. 修改了哪些文件

| 文件 | 修改类型 | 说明 |
|---|---|---|
| `frontend/src/pages/NewRewritePage.tsx` | 重写 | 三步向导压缩为单页两栏布局；删除 StepIndicator、ModeCard；新增 togglePlatform、wsType 同步 useEffect、编辑/预览切换 |
| `frontend/src/components/rewrite/RewriteConfigPanel.tsx` | 修改 | 删除「高级参数（P1 占位）」空折叠块；Schema 开关按平台自动隐藏（非官网平台不展示） |
| `frontend/src/common/workspace.ts` | 新增函数 | 新增 `getDefaultPlatformsByWorkspaceType(type): Platform[]`，按 workspace_type 返回默认多平台数组 |

---

## 2. 三步向导如何压缩为单页工作台

### 压缩前（三步状态机）

```text
Step 1: 导入文章（粘贴 / 上传 / 链接）→ 点「确认母稿」
Step 2: 确认母稿（只读预览）→ 点「继续」
Step 3: 选择模式（先诊断 / 直接生成）+ 选择平台 + 高级设置 → 点「生成内容包」
```

状态类型：`type WorkbenchStep = 'import' | 'confirm' | 'configure'`

### 压缩后（单页两栏）

```text
左侧：文章编辑区
  - 导入方式切换（粘贴正文 / 上传文件 / 粘贴链接）
  - 文章标题（自动识别时显示轻提示）
  - 文章正文（编辑 / 预览切换）
  - 内容规模统计（常驻）

右侧：生成操作卡（sticky）
  - 平台选择（compact chips）
  - 诊断结果（可选）
  - 生成内容包（主按钮）
  - 先诊断（次按钮）
  - 高级设置（折叠）
  - 知识库提示
```

### 删除的内容

- `WorkbenchStep` 类型定义
- `step` state（`useState<WorkbenchStep>`）
- `StepIndicator` 子组件（1/2/3 步骤条）
- `ModeCard` 子组件（先诊断 / 直接生成 卡片）
- 独立「确认母稿」页面（Step 2 整块）
- 平台大卡片（改为 compact chips）
- 旧的 `PLATFORM_DESCRIPTIONS`（改为 `PLATFORM_SHORT_DESC` tooltip）
- `Database` 图标导入（原「补充知识库」按钮已移除）
- `Settings2` / `FileCode` / `PenLine` 图标导入（原 Step 2/3 专用，不再使用）

### 新增的内容

- `titleAutoFilled` state：docx/html 上传后自动识别标题时设为 true，显示「已自动识别标题，可手动修改。」
- `viewMode` state：`'edit' | 'preview'`，正文区编辑/预览切换
- `platformsTouchedRef` ref：用户手动修改平台后标记，防止 wsType 默认值覆盖
- `ALL_PLATFORMS` 常量：平台 chip 渲染顺序
- `PLATFORM_SHORT_DESC` 常量：chip tooltip 短说明
- `togglePlatform` 函数：平台 chip 点击处理，设置 touched 标记
- wsType 同步 `useEffect`：wsType 异步加载后同步默认平台

---

## 3. 是否删除独立确认母稿步骤

**是。** 已完全删除独立「确认母稿」步骤（原 Step 2）。

- 用户粘贴标题和正文后，不需要点「确认母稿」，可直接点击右侧「生成内容包」。
- 用户上传 docx 后，标题和正文自动填入编辑区，可直接编辑或生成。
- 原确认母稿页面的只读预览功能改为正文区内的「预览」切换模式（非独立页面）。

---

## 4. 编辑 / 预览如何实现

在左侧文章编辑区的正文 Label 右侧增加一个 segmented control：

```text
[编辑] [预览]
```

实现方式：

```typescript
const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')
```

- `viewMode === 'edit'`：渲染 `<Textarea>`，用户可编辑正文
- `viewMode === 'preview'`：渲染 `<MarkdownRenderer>`，只读预览
- 切换只影响正文显示模式，不影响 `content` state 数据
- 预览区正文为空时显示「正文为空，无法预览。」

---

## 5. 先诊断按钮如何处理

- **取消**：任务模式选择卡片（`ModeCard` 组件）
- **改为**：右侧操作卡中的次按钮（`variant="outline"`）

```text
[生成内容包]  ← 主按钮（default variant）
[先诊断]      ← 次按钮（outline variant）
```

逻辑：

- 点击「先诊断」→ 调用 `runDiagnosis()`（前端启发式预诊断，非 LLM 深度诊断）
- 诊断进行中显示 loading spinner
- 诊断完成后在按钮上方展示 `DiagnosisPanel` 结果
- 诊断结果展示后，「生成内容包」按钮仍然可见，用户可继续生成
- 不强制用户先诊断；`taskMode` 默认 `'direct'`
- 内部保留 `taskMode` state（`runDiagnosis` 时设为 `'diagnose'`），但 UI 不再展示模式卡片

---

## 6. 生成内容包按钮如何处理

- **主按钮**（`default` variant，全宽）
- 沿用现有 `handleSubmit` 逻辑，无任何改动
- 按钮文案动态：

```text
生成内容包              ← 单平台
生成 2 个平台内容包      ← 多平台
生成 4 个平台内容包      ← 多平台
提交中…                 ← submitting
```

- disabled 规则：
  - `!hasArticle`（标题或正文为空）→ disabled
  - `submitting`（正在提交）→ disabled
  - 平台至少保留 1 个（`togglePlatform` 保证不可清空到 0）

---

## 7. 平台选择如何移到右侧

### 压缩前

平台选择在主区域 Step 3 的大卡片中，每个平台显示名称 + 长说明。

### 压缩后

平台选择移到右侧操作卡的顶部，使用 compact chip：

```text
生成平台
☑ 官网文章    ☑ 公众号
☐ 小红书      ☐ 知乎问答
```

每个 chip：
- 左侧 3×3px 勾选框（active 时填充 primary 色 + ✓）
- 平台名称
- `title` 属性显示短说明（tooltip）：
  - 官网文章：`GEO 正文 / FAQ / Schema`
  - 公众号：`移动端长文与发布建议`
  - 小红书：`图文脚本 / Caption / 标签`
  - 知乎问答：`问答结构 / 论证依据`

点击 chip 调用 `togglePlatform(platform)`。

---

## 8. 默认平台如何按 workspace_type 设置

### 实现方式

在 `frontend/src/common/workspace.ts` 新增：

```typescript
export function getDefaultPlatformsByWorkspaceType(
  type: WorkspaceType | undefined | null,
): Platform[] {
  switch (type) {
    case 'brand':       return ['官网文章', '公众号']
    case 'media':       return ['公众号', '小红书']
    case 'professional': return ['公众号', '知乎问答']
    case 'agency':      return ['官网文章']
    default:            return ['官网文章']
  }
}
```

### 初始化

```typescript
const [config, setConfig] = useState<RewriteConfig>({
  platforms: getDefaultPlatformsByWorkspaceType(wsType),
  ...
})
```

### wsType 异步加载后同步

```typescript
useEffect(() => {
  if (platformsTouchedRef.current) return
  setConfig((c) => ({ ...c, platforms: getDefaultPlatformsByWorkspaceType(wsType) }))
}, [wsType])
```

### 用户手动修改后不被覆盖

`togglePlatform` 中设置 `platformsTouchedRef.current = true`，后续 wsType 变化不再覆盖用户选择。

---

## 9. 高级设置如何收敛

### RewriteConfigPanel.tsx 修改

1. **删除**「高级参数（P1 占位）」空折叠块（原 `showAdvanced` state + `Settings2` 图标 + 空内容块）
2. **Schema 开关按平台自动隐藏**：

```typescript
const showSchemaSwitch = value.platforms.includes('官网文章')
```

- 官网文章在选中平台中时 → 显示 Schema 开关
- 非官网平台（公众号 / 小红书 / 知乎问答）→ 自动隐藏 Schema 开关（按平台自动处理，无需用户干预）

### NewRewritePage.tsx 中的高级设置

- 默认折叠（`showAdvanced = false`）
- 展开后渲染 `RewriteConfigPanel`（`hidePlatforms` 隐藏平台区块，因平台已上移到操作卡顶部）
- 高级设置区块视觉弱化，不抢主按钮

---

## 10. 是否改了后端 API

**否。** 本轮未修改任何后端 API。

- `handleSubmit` 沿用现有 `createMut.mutate` + `buildPayload` 逻辑
- `buildPayload` 字段不变（title, original_content, perspective, publish_platform, source_policy, output_length, need_schema, brand_fact_ids）
- 多平台仍调用 `rewriteTaskApi.create(projectId, buildPayload(platform))`
- `resolveNeedSchema` 规则不变（官网文章 → config.needSchema，其它平台 → false）

---

## 11. 是否改了数据库

**否。** 本轮未修改任何数据库表结构或迁移。

---

## 12. 单平台生成验证

逻辑路径：

1. 用户粘贴标题 + 正文 → `hasArticle = true`
2. 默认平台（如 brand → 官网文章 + 公众号）或用户选择 1 个平台
3. 点击「生成内容包」→ `handleSubmit()`
4. `platforms.length === 1` → 走 `createMut.mutate(buildPayload(platforms[0]))`
5. 成功 → 清除草稿 → `navigate('/tasks/${task.id}/result')`

验证：`handleSubmit` 单平台分支未改动，`buildPayload` 未改动，跳转路径不变。

---

## 13. 多平台生成验证

逻辑路径：

1. 用户选择 2+ 平台
2. 点击「生成内容包」→ `handleSubmit()`
3. `platforms.length > 1` → `Promise.allSettled(platforms.map(...))`
4. 收集 `createdIds` + `failedPlatforms`
5. 全部失败 → 显示 errorMsg，不跳转
6. 部分或全部成功 → 清除草稿 → `navigate('/multi-platform-result?taskIds=...')`
7. 部分失败 → 跳转后 `setTimeout(alert(...))` 提示

验证：`Promise.allSettled` 多平台逻辑完全保留，部分失败 alert 提示不变。

---

## 14. docx 上传验证

逻辑路径：

1. 用户切换到「上传文件」tab
2. 点击或拖拽 .docx 文件
3. `handleFileUpload(file)` → `isLegacyDoc` / `isPdf` / `isAcceptedFile` 检查
4. `inferSource(file)` → `'docx'`
5. `parseDocxToText(file)` → mammoth 浏览器端解析
6. `setContent(text)` 填入正文
7. 若 `docxTitle` 且 `!title.trim()` → `setTitle(docxTitle)` + `setTitleAutoFilled(true)`
8. `setImportTab('paste')` 切回粘贴 tab（用户可直接编辑）
9. 显示「已自动识别标题，可手动修改。」轻提示
10. 用户可直接点击「生成内容包」

验证：
- mammoth 解析逻辑未改动
- `setTitleAutoFilled` 新增，仅影响 UI 提示
- 上传后不再跳到独立确认页
- txt / md / html 上传逻辑同样保留

---

## 15. 草稿恢复验证

逻辑路径：

1. 进入页面 → `useEffect([projectId])` 检测 `localStorage.getItem('article_draft:${projectId}')`
2. 检测到草稿 → `setDraftBanner(draft)` → 顶部显示草稿恢复提示
3. 用户点「恢复」→ `restoreDraft(draft)` → 填入 title / content / sourceType
4. 用户点「丢弃」→ `discardDraft()` → 清除 localStorage + 隐藏 banner
5. 输入变化 → `useEffect([title, content, sourceType, draftKey])` 防抖 600ms 自动保存
6. 提交成功 → `localStorage.removeItem(draftKey)` 清除草稿

验证：草稿暂存 useEffect / restoreDraft / discardDraft 全部保留，逻辑未改动。

---

## 16. 构建验证结果

```bash
$ npx tsc --noEmit
（无输出，exit code 0）

$ npm run build
> tsc -b && vite build
✓ 2877 modules transformed.
dist/index.html                     0.46 kB │ gzip:   0.34 kB
dist/assets/index-RO4Lc3MT.css     42.41 kB │ gzip:   8.12 kB
dist/assets/index-1hs0KfWf.js   1,556.83 kB │ gzip: 451.07 kB
✓ built in 4.65s
```

- `npx tsc --noEmit`：通过（0 errors）
- `npm run build`：通过（2877 modules transformed，4.65s）

---

## 17. 仍存在的问题

1. **`taskMode` state 为死代码**：`taskMode` 在 `runDiagnosis` 中被 `setTaskMode('diagnose')` 设置，但 `taskMode` 变量本身在新 JSX 中未被读取。因 tsconfig `noUnusedLocals=false` 不会报错，但属于冗余 state。保留是为了未来扩展（如根据 taskMode 决定生成流程是否含深度诊断）。

2. **bundle 体积警告**：`dist/assets/index-1hs0KfWf.js` 1,556 kB 超过 500 kB 警告阈值。这是既有问题（mammoth + react-markdown 等依赖），本轮未引入新依赖，不在本轮范围内处理。

3. **「粘贴链接」仍为占位**：按规范要求，链接解析不做抓取，仅显示占位提示。用户需切回粘贴或上传。

4. **右侧操作卡 sticky 在小屏不生效**：`lg:sticky lg:top-6` 仅在 `lg`（≥1024px）以上生效。小屏下右侧卡片堆叠在左侧下方，非 sticky。这是预期行为（小屏不适合 sticky 两栏）。

5. **诊断结果位置**：诊断结果（`DiagnosisPanel`）展示在右侧操作卡的错误提示下方、按钮上方。若诊断结果较长，可能把按钮推到可视区下方。可考虑后续限制 DiagnosisPanel 高度或改为折叠。

---

## 18. 下一步建议

1. **P1 - 链接解析**：实现网页链接 / 公众号链接正文抓取，替换当前占位。
2. **P1 - 诊断结果折叠**：当 DiagnosisPanel 内容较长时，默认折叠摘要，点击展开详情，避免挤压操作按钮。
3. **P2 - 素材库批量导入**：当前 InboxPage 已收敛为素材库占位，后续可接入批量素材管理。
4. **P2 - code-splitting**：对 mammoth / react-markdown 等大依赖做动态 import，降低首屏 bundle 体积。
5. **P2 - taskMode 清理**：若确认 taskMode 在未来无扩展用途，可移除该 state 及 `setTaskMode` 调用，减少冗余。
6. **P2 - 移动端适配**：小屏下右侧操作卡可改为底部固定 bar 或抽屉式，提升移动端生成操作的可达性。
