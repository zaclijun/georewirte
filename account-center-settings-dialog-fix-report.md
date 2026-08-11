# Account Center Settings Dialog 交互修复报告

## 1. 修复了哪些交互问题

| # | 问题 | 修复方式 |
|---|------|----------|
| 1 | 设置中心「模型配置」Tab 无法点击 | 移除 Radix Tabs，改为左侧侧边导航 + 本地 state |
| 2 | 设置中心使用顶部 Tab，不符合设计要求 | 改为左侧侧边导航（外观 / 模型配置 / 关于） |
| 3 | 设置弹窗形态不统一 | 统一为居中弹窗（820px / 80vh / 圆角 16px） |
| 4 | 模型配置页空状态与顶部按钮重复 CTA | 空状态时隐藏顶部按钮，仅在空状态保留主按钮 |
| 5 | 新增模型弹窗嵌套层级未验证 | 确认为居中弹窗，嵌套于设置中心之上，DOM 顺序保证层级正确 |

## 2. 为什么模型配置 Tab 之前无法点击

**根因：Radix Tabs 受控模式缺少 `onValueChange`。**

原 `SettingsDialog.tsx` 代码：

```tsx
<Tabs defaultValue={initialTab} value={initialTab} className="flex-1">
  <TabsList>
    <TabsTrigger value="appearance">外观</TabsTrigger>
    <TabsTrigger value="models">模型配置</TabsTrigger>
    <TabsTrigger value="about">关于</TabsTrigger>
  </TabsList>
  ...
</Tabs>
```

`value={initialTab}` 使 Tabs 进入**受控模式**，但未提供 `onValueChange` 回调。在 Radix UI 中，受控组件的状态只能由父级通过更新 `value` prop 来改变。由于 `initialTab` 仅在 `openDialog(tab)` 调用时更新（此时弹窗才打开），弹窗打开后点击任意 Tab Trigger 都无法改变 `value`，导致切换无效。

点击「外观」看似有效，是因为 `initialTab` 默认值为 `'appearance'`，外观本身就是当前激活项。

## 3. 修改了哪些文件

| 文件 | 改动说明 |
|------|----------|
| `frontend/src/context/SettingsDialogContext.tsx` | 导出 `SettingsTab` 类型，供 SettingsDialog 复用 |
| `frontend/src/components/settings/SettingsDialog.tsx` | 完全重写：移除 Radix Tabs，改为左侧侧边导航 + 本地 `activeTab` state；弹窗改为 820px 居中、80vh 限高、内部滚动 |
| `frontend/src/components/settings/ModelConfigPanel.tsx` | 空状态时隐藏顶部「新增模型」按钮，改为在空状态卡片中渲染唯一主按钮；更新注释 |

**未修改的文件（已验证无需改动）：**
- `frontend/src/pages/NewRewritePage.tsx` — 已通过 `useSettingsDialog().openDialog('models')` 调用统一弹窗
- `frontend/src/components/layout/AccountWidget.tsx` — 已是小菜单形态，调用 `openDialog('appearance')` / `openDialog('about')`
- `frontend/src/components/layout/Sidebar.tsx` — 设置入口在 AccountWidget 中，不在 Sidebar 一级菜单
- `frontend/src/components/ui/dialog.tsx` — 居中弹窗基础组件无需改动
- `frontend/src/components/ui/tabs.tsx` — 保留为通用 UI 组件，SettingsDialog 不再引用

## 4. 设置中心如何改为居中弹窗

`SettingsDialog.tsx` 的 `DialogContent` 配置：

```tsx
<DialogContent
  side="center"
  className="flex max-h-[80vh] w-[min(820px,92vw)] flex-col gap-0 overflow-hidden rounded-2xl p-0"
>
```

- **宽度**：`w-[min(820px,92vw)]`，桌面端 820px，小屏自动收缩到 92vw
- **最大高度**：`max-h-[80vh]`
- **位置**：`side="center"` → `left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`（屏幕居中）
- **圆角**：`rounded-2xl`（16px）
- **背景遮罩**：保留（DialogOverlay `bg-black/20 backdrop-blur-[2px]`）
- **内容溢出**：`overflow-hidden`（外层）+ 右侧内容区 `overflow-y-auto`（内部滚动）

## 5. 左侧菜单如何实现

```tsx
<aside className="flex w-[180px] shrink-0 flex-col gap-1 border-r border-border bg-secondary/30 p-3">
  {NAV_ITEMS.map((item) => (
    <button
      key={item.value}
      type="button"
      onClick={() => setActiveTab(item.value)}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
        active
          ? 'bg-background font-medium text-foreground shadow-soft-sm'
          : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
    </button>
  ))}
</aside>
```

- **宽度**：180px（在 160-200px 范围内）
- **选中态**：`bg-background` + `shadow-soft-sm`，克制清晰，无大面积蓝色
- **点击区域**：`w-full px-3 py-2.5`，足够大
- **深色 / 浅色**：使用语义 token（`bg-background` / `text-muted-foreground` / `border-border`），自动适配
- **切换机制**：`onClick={() => setActiveTab(item.value)}` 直接更新本地 state，即时生效

## 6. 账户中心小菜单如何实现

`AccountWidget.tsx` 已实现，未改动：

- 左下角触发按钮显示「GEO 工作台 / 账户中心」
- 点击展开小菜单（`absolute bottom-full`，宽 180px）
- 菜单项：「设置」→ `openDialog('appearance')`；「关于项目」→ `openDialog('about')`
- 支持 click-outside 关闭、Escape 关闭
- 设置不放在 Sidebar 一级菜单

## 7. 新增模型配置如何从右侧抽屉改为居中弹窗

`ModelFormDialog` 组件（`ModelConfigPanel.tsx` 内）已使用居中弹窗：

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent side="center" className="flex max-h-[80vh] max-w-[600px] flex-col gap-4">
```

- **宽度**：`max-w-[600px]`（在 560-640px 范围内）
- **最大高度**：`max-h-[80vh]`
- **居中**：`side="center"`
- **内部滚动**：表单区 `flex-1 overflow-y-auto`
- **嵌套层级**：ModelFormDialog 通过 Radix Portal 挂载到 `document.body`，渲染顺序在 SettingsDialog 之后，DOM 顺序保证其 overlay 和 content 自然位于 SettingsDialog 之上，无需额外 z-index 调整
- **取消**：`onOpenChange(false)` 关闭模型弹窗，SettingsDialog 保持打开
- **保存**：`onSaved` 回调 + `onOpenChange(false)` 关闭弹窗，列表通过 TanStack Query `invalidateQueries` 自动刷新

## 8. 内容优化页如何复用同一个设置弹窗

`NewRewritePage.tsx` 已正确实现：

```tsx
const { openDialog: openSettings } = useSettingsDialog()
// ...
<Button onClick={() => openSettings('models')}>去配置模型</Button>
```

- 调用 `openDialog('models')` 打开全局唯一的 `SettingsDialog`（挂载于 `App.tsx`）
- `initialTab` 设为 `'models'`，`SettingsDialog` 的 `useEffect` 将本地 `activeTab` 同步为 `'models'`
- 不创建第二套弹窗，不打开右侧抽屉
- 设置弹窗关闭后，`NewRewritePage` 的草稿（localStorage）和表单 state 不受影响（弹窗是独立层，不卸载页面）

## 9. 是否改后端 API

**否。** 本轮仅修改前端组件，未触碰任何后端代码。

## 10. 是否改数据库

**否。** 未修改数据库 schema、migration 或 ORM 模型。

## 11. 深色 / 浅色主题验证结果

所有新增 / 修改的样式均使用语义 CSS 变量 token，通过 `.dark` class 自动切换：

| 元素 | 浅色模式 token | 深色模式 token | 验证 |
|------|---------------|---------------|------|
| 弹窗背景 | `--background: 0 0% 100%` | `--background: 220 14% 10%` | 可读 |
| 侧边栏背景 | `--secondary: 240 12% 95%` | `--secondary: 220 14% 16%` | 可读 |
| 菜单文字 | `--foreground` / `--muted-foreground` | 对应深色值 | 可读 |
| 边框 | `--border: 240 9% 90%` | `--border: 220 14% 20%` | 可见 |
| 选中态 | `bg-background` + `shadow-soft-sm` | 同上 | 清晰不刺眼 |
| 输入框 | `--input` / `--border` | 对应深色值 | 边框可见 |
| 按钮 disabled | `disabled:opacity-40` | 同上 | 清楚 |

**结论：** 深色 / 浅色模式下弹窗、菜单、输入框、按钮均可读。

## 12. 构建验证结果

```
npx tsc --noEmit   →  通过（exit code 0，无错误）
npm run build      →  通过（2886 modules transformed，built in 4.65s）
```

## 13. 仍存在的问题

1. **Bundle 体积警告**：`dist/assets/index-*.js` 为 1.59 MB（gzip 461 KB），超过 Vite 默认 500 KB 警告阈值。这是既有问题，与本次修复无关，可通过 code-splitting 优化。
2. **嵌套弹窗 focus 管理**：Radix Dialog 嵌套时焦点陷阱由内层接管，关闭内层后焦点回到外层。已通过 DOM 顺序保证层级正确，但极端情况下（如快速连续开关）可能存在焦点闪烁，需实际使用中观察。
3. `tabs.tsx` UI 组件不再被 SettingsDialog 引用，但保留为通用组件，未来其他页面仍可使用。

## 14. 下一步建议

1. **Bundle 优化**：对 `react-markdown`、`mammoth`、`recharts` 等大依赖做 dynamic import，降低首屏体积。
2. **响应式适配**：当前设置弹窗在小屏上 `w-[min(820px,92vw)]` 可收缩，但左侧菜单 180px 固定宽度在极窄屏幕上仍偏宽，可考虑 <640px 时折叠为顶部菜单。
3. **键盘导航**：可补充左侧菜单的 `ArrowUp/ArrowDown` 键盘导航支持，提升可访问性。
4. **嵌套弹窗 z-index 显式化**：若后续有更多嵌套弹窗场景，可在 `dialog.tsx` 中为 `side="center"` 增加可选 `zIndex` prop，避免依赖 DOM 顺序的隐式保证。
