# History Table Layout Hotfix 报告

> 本轮目标：修复历史任务列表表格布局问题——操作列过窄、「导出 Markdown」与删除图标重叠、标题不可读、窄屏挤压。
>
> 完成时间：2026-06-26
> 实现范围：纯前端 UI hotfix，不动后端 API / 数据库 / Prompt / 多平台发稿包逻辑。

---

## 1. 修改了哪些文件

| 文件 | 改动类型 | 关键变更 |
| --- | --- | --- |
| `frontend/src/components/common/ExportButton.tsx` | 新增 prop | 增加 `label?: string` 与 `compact?: boolean`，支持紧凑模式（仅 icon 无文字） |
| `frontend/src/components/common/RewriteStatusBadge.tsx` | 样式调整 | 增加 `min-w-[72px]` 固定状态 pill 最小宽度，避免不同状态文案长度导致列宽抖动 |
| `frontend/src/pages/HistoryPage.tsx` | 重构表格布局 | 横向滚动容器 + 9 列明确列宽 + 操作列重构 + Header 文案修正 |

**总计**：3 个文件修改，0 新增文件，0 后端改动。

---

## 2. 重叠问题根因

旧版 `TaskTableView` 使用 CSS Grid 布局，列宽模板为：

```
grid-cols-[1fr_110px_90px_110px_70px_70px_80px_150px_180px]
```

合计固定列宽 = 110+90+110+70+70+80+150+180 = 860px，加上 `1fr` 标题列与 `gap-2`，理论最小宽度约 1140px。

**根因 1：操作列 180px 容纳 4 个按钮 + ExportButton 全文案**

操作列原内容：
- 查看（icon-sm）
- 重新改写（icon-sm）
- ExportButton（显示「导出 Markdown」全文案 + icon，h-8 px-0 但有内边距）
- 删除（icon-sm）

`导出 Markdown` 中文 4 字 + icon + 内边距，实际渲染宽度约 120~140px，加上前后 3 个 icon-sm（每个 32px）+ `gap-1`（4px×3=12px），合计约 220px，远超 180px 列宽 → 文字与图标重叠。

**根因 2：外层无横向滚动容器**

旧版直接在 `<Card className="overflow-hidden">` 内放 grid，当容器宽度 < 1140px 时，grid 会强制压缩各列，导致：
- 标题列 `1fr` 被压缩到极窄，truncate 仍生效但几乎看不到内容
- 平台 / 视角列 `110px / 90px` 被压缩
- 操作列 `180px` 不足以容纳按钮，但按钮 `whitespace-nowrap` 导致溢出 → 与相邻列内容重叠

**根因 3：ExportButton 无紧凑模式**

`ExportButton` 固定显示「导出 Markdown」，无 `compact` 或 `label` prop，无法在空间受限的表格中缩短文案。

**根因 4：Header 计数语义错误**

TopBar 右侧显示 `{projectList.length} 个项目`，但页面内容是任务列表，用户看到「3 个项目」会误以为是任务数。

---

## 3. 表格列宽如何调整

### 新列宽模板

```tsx
const gridCols =
  'grid-cols-[minmax(260px,1fr)_100px_100px_130px_70px_70px_80px_160px_220px]'
```

| 列 | 旧宽 | 新宽 | 说明 |
| --- | --- | --- | --- |
| 标题 | 1fr | `minmax(260px,1fr)` | 最小 260px，最大弹性，单行 truncate |
| 平台 | 110px | 100px | 够「官网文章」4 字 |
| 视角 | 90px | 100px | 够「品牌方」3 字 |
| 状态 | 110px | 130px | 配合 RewriteStatusBadge min-w-[72px] |
| 改前 | 70px | 70px | 数字 |
| 改后 | 70px | 70px | 数字 |
| 提升 | 80px | 80px | Badge |
| 创建时间 | 150px | 160px | `whitespace-nowrap` 防换行 |
| 操作 | 180px | 220px | 容纳 查看/导出/删除 + gap-2 |

**合计最小宽度**：260+100+100+130+70+70+80+160+220 = 1190px（含 gap 约 1210px）

### 横向滚动容器

```tsx
<Card className="overflow-hidden">
  <div className="overflow-x-auto">
    <div className="min-w-[1210px] w-full">
      {/* 表头 + 行 */}
    </div>
  </div>
</Card>
```

- 外层 `overflow-x-auto`：窄屏可横向滚动
- 内层 `min-w-[1210px]`：保证列宽不被压缩
- `overflow-hidden` 仍在 Card 层，避免圆角溢出

### 标题列处理

```tsx
<div className="min-w-0">
  <Link
    to={`/tasks/${t.id}/result`}
    className="block truncate font-medium text-foreground hover:text-primary"
    title={t.title}
  >
    {t.title}
  </Link>
</div>
```

- `min-w-0`：允许 flex/grid 子项收缩到 content 宽度以下
- `truncate`：单行省略
- `title={t.title}`：hover 显示完整标题

### 创建时间列

```tsx
<span className="whitespace-nowrap text-xs text-muted-foreground">
  {formatDateTime(t.created_at)}
</span>
```

- `whitespace-nowrap`：防止 `2026-06-26 19:45` 换行

---

## 4. 操作列如何调整

### 旧版（问题）

```tsx
<div className="flex items-center justify-end gap-1">
  <Button size="icon-sm" variant="ghost" title="查看">...</Button>
  <Button size="icon-sm" variant="ghost" title="重新改写">...</Button>  {/* 未实现功能 */}
  <ExportButton ... title="导出 Markdown" />  {/* 显示「导出 Markdown」全文案 */}
  <Button size="icon-sm" variant="ghost" title="删除">...</Button>
</div>
```

- 4 个元素挤在 180px 列宽内
- ExportButton 全文案占用 ~130px
- gap-1（4px）过小，易误触

### 新版（修复）

```tsx
<div className="flex items-center justify-end gap-2 whitespace-nowrap">
  {/* 1. 查看：icon-only */}
  <Button asChild size="icon-sm" variant="ghost" title="查看结果">
    <Link to={`/tasks/${t.id}/result`} aria-label="查看结果">
      <Eye className="h-3.5 w-3.5" />
    </Link>
  </Button>

  {/* 2. 导出：compact 模式，仅 icon，title 补全含义 */}
  {t.status === 'completed' && t.output_id ? (
    <ExportButton
      outputId={t.output_id}
      filename={t.title || 'rewrite'}
      fallbackContent=""
      size="sm"
      variant="ghost"
      compact          // ← 关键：仅显示 icon
      title="导出 Markdown"
      className="h-8 w-8 px-0"
    />
  ) : (
    <span className="inline-block h-8 w-8" aria-hidden />  {/* 占位保持列宽稳定 */}
  )}

  {/* 3. 删除：icon-only，aria-label，危险色 hover */}
  <Button
    size="icon-sm"
    variant="ghost"
    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
    title="删除任务"
    aria-label="删除任务"
    onClick={() => { if (confirm(...)) deleteMut.mutate(t.id) }}
  >
    <Trash2 className="h-3.5 w-3.5" />
  </Button>
</div>
```

### 关键改进

| 项目 | 旧 | 新 |
| --- | --- | --- |
| 元素数量 | 4（含未实现的「重新改写」） | 3（移除未实现的重新改写） |
| ExportButton 文案 | 「导出 Markdown」全显 | `compact` 仅 icon |
| gap | `gap-1`（4px） | `gap-2`（8px） |
| 删除按钮 aria-label | 无 | `aria-label="删除任务"` |
| 删除按钮间距 | 紧贴导出 | gap-2 明显间距 |
| 列宽 | 180px | 220px |
| 占位 | 无 | 未完成状态用 `h-8 w-8` 占位保持行高一致 |

### 删除按钮安全性

- `gap-2`：与导出按钮至少 8px 间距
- `aria-label="删除任务"`：屏幕阅读器可读
- `title="删除任务"`：hover tooltip
- `text-destructive hover:bg-destructive/10`：危险色 hover，默认不抢眼
- `confirm()` 确认弹窗保留（沿用旧逻辑，未新增复杂弹窗）

---

## 5. ExportButton 是否新增 compact / label prop

**是，已新增两个 prop。**

### `label?: string`

自定义按钮文案。不传时默认「导出 Markdown」。

```tsx
<ExportButton label="导出" />  // 显示「导出」
<ExportButton />                // 显示「导出 Markdown」（默认）
```

### `compact?: boolean`

紧凑模式，仅显示 icon，不显示文字。与 `label` 互斥（compact 优先）。

```tsx
<ExportButton compact />  // 仅 Download icon
```

### 行为细节

- `compact` 模式下，`title` 自动 fallback 为「导出 Markdown」（如果未显式传 title）
- `done`（已导出）状态仍显示 `Check` icon，无文字
- `loading`（导出中）状态仍显示 `Loader2` icon + spin，无文字
- 其他页面不传 `compact` / `label` 时，行为完全不变（向后兼容）

### 兼容性验证

`ExportButton` 在以下页面使用：
- `HistoryPage.tsx`：本轮改为 `compact`
- `RewriteResultPage.tsx`：未传 `compact` / `label`，行为不变
- `MultiPlatformResultPage.tsx`：未传 `compact` / `label`，行为不变

---

## 6. 是否影响其他页面

### 直接影响

| 页面 | 影响 | 说明 |
| --- | --- | --- |
| `HistoryPage` | ✅ 改进 | 表格布局重构，操作列不再重叠 |
| `RewriteResultPage` | ❌ 无影响 | 未传新 prop，ExportButton 行为不变 |
| `MultiPlatformResultPage` | ❌ 无影响 | 未传新 prop，ExportButton 行为不变 |

### 间接影响

| 组件 | 影响 | 说明 |
| --- | --- | --- |
| `RewriteStatusBadge` | ✅ 改进 | `min-w-[72px]` 全局生效，所有使用该组件的页面状态 pill 宽度更稳定 |
| `ProjectOverviewPage` | ✅ 改进 | 最近任务列表复用 RewriteStatusBadge，状态列更稳定 |

### 未影响

- 后端 API
- 数据库
- Prompt
- LLMService
- RewriteService
- 多平台发稿包逻辑
- 任务状态机

---

## 7. 是否改了后端 API

**否。**

本轮零后端改动。所有修复均在 UI 层：
- 表格布局 CSS Grid 列宽调整
- 横向滚动容器
- ExportButton 新增 prop（纯前端）
- RewriteStatusBadge 样式调整
- Header 文案修正

---

## 8. 是否改了数据库

**否。**

未新增表、字段、索引、迁移。所有改动均在 `frontend/src/` 目录内。

---

## 9. 验收结果

| 验收项 | 状态 | 说明 |
| --- | --- | --- |
| 1. 不再出现文字或按钮重叠 | ✅ | 列宽 220px + gap-2 + compact ExportButton |
| 2. 「导出 Markdown」不再与删除图标重叠 | ✅ | ExportButton compact 模式仅 icon，gap-2 间距 |
| 3. 操作列显示为 查看/导出/删除 | ✅ | 移除未实现的「重新改写」，3 个 icon-only 按钮 |
| 4. 标题列长标题省略，hover/title 可查看 | ✅ | `truncate` + `title={t.title}` |
| 5. 状态 pill 不挤压其他列 | ✅ | RewriteStatusBadge `min-w-[72px]` + 状态列 130px |
| 6. 创建时间列不换行 | ✅ | `whitespace-nowrap` |
| 7. 表格窄屏可横向滚动 | ✅ | `overflow-x-auto` + `min-w-[1210px]` |
| 8. 删除按钮与导出按钮有明显间距 | ✅ | `gap-2`（8px） |
| 9. 右上角计数文案正确 | ✅ | 移除「N 个项目」，改为页面描述文案 |
| 10. 多平台发稿包结果页不受影响 | ✅ | MultiPlatformResultPage 未改动，ExportButton 向后兼容 |
| 11. ExportButton 其他页面仍正常 | ✅ | 未传 compact/label 时行为不变 |
| 12. npm run build 通过 | ✅ | 4.00s，零错误 |
| 13. npx tsc --noEmit 通过 | ✅ | 零类型错误 |

---

## 10. 仍存在的问题

### 1. 「重新改写」功能被移除

旧版操作列有 4 个按钮：查看 / 重新改写 / 导出 / 删除。其中「重新改写」按钮（RefreshCw icon）从未实现真实功能（仅 `disabled={t.status === 'running'}`，无 onClick）。

本轮为修复重叠问题，移除了该按钮。如未来需要实现「重新改写」功能，需重新设计操作列布局（可能需要改为下拉菜单 Dropdown）。

**影响**：无功能损失（原本就是无功能按钮），但 UI 上少了一个入口。

### 2. 窄屏体验仍是横向滚动

P0 按规范要求「不需要做移动端卡片版」。窄屏（< 1210px）下用户需横向滚动查看完整表格。在移动设备上体验一般，但符合规范要求。

### 3. Header 未显示任务总数

规范第 9 条建议「共 N 条任务」。当前实现选择移除计数（因为任务总数需要聚合各项目任务，涉及多个 useRewriteTasks 调用，难以在 Header 同步显示准确总数）。

每个 PerProjectTaskTable 卡片底部仍显示「共 N 条」该工作区任务数，用户可逐卡片累加。

**未来改进**：可在 AggregatedTaskTable 内部维护 totalCount state，通过 callback 上报各项目任务数，聚合后在 Header 显示。

### 4. 占位 span 可能影响视觉一致性

未完成任务（非 completed 状态或无 output_id）的操作列会显示一个 `h-8 w-8` 的空 span 占位，代替 ExportButton。这保证了对齐，但视觉上有一个「空位」。

**替代方案**：可改为 disabled 状态的 ExportButton，但会显示一个灰色下载图标，可能误导用户以为可导出。当前选择占位更清晰。

### 5. 横向滚动时表头不固定

当前表头与行内容在同一个 `min-w-[1210px]` 容器内，横向滚动时表头会随内容一起滚动。如果用户横向滚动查看右侧列，表头会消失在视野。

**未来改进**：可使用 `position: sticky; left: 0` 让表头固定，但会增加 CSS 复杂度，不属于本轮 hotfix 范围。

---

## 附录：本轮关键文件清单

```
frontend/src/components/common/ExportButton.tsx           [修改] 新增 label / compact prop
frontend/src/components/common/RewriteStatusBadge.tsx     [修改] 新增 min-w-[72px]
frontend/src/pages/HistoryPage.tsx                        [修改] 表格布局重构 + Header 文案
```

**总计**：3 个文件修改，0 新增文件，0 后端改动，0 数据库改动。

---

## 验收清单对照

| 验收项 | 状态 |
| --- | --- |
| A. 不再出现文字或按钮重叠 | ✅ |
| B. 「导出 Markdown」不再与删除图标重叠 | ✅ |
| C. 操作列显示为 查看/导出/删除 | ✅ |
| D. 标题列长标题省略，hover/title 可查看 | ✅ |
| E. 状态 pill 不挤压其他列 | ✅ |
| F. 创建时间列不换行 | ✅ |
| G. 表格窄屏可横向滚动 | ✅ |
| H. 删除按钮与导出按钮有明显间距 | ✅ |
| I. 右上角计数文案正确 | ✅ |
| J. 多平台发稿包结果页不受影响 | ✅ |
| K. ExportButton 其他页面仍正常 | ✅ |
| L. npm run build 通过 | ✅ |
| M. npx tsc --noEmit 通过 | ✅ |

**本轮 hotfix 交付完成。**
