/**
 * ModelConfigPanel - 模型供应商配置面板
 *
 * 功能：
 *  1. 列表区：展示所有模型配置，支持启用/禁用、设为默认、测试连接、编辑、删除
 *  2. 新增/编辑表单（右侧抽屉）：Provider 选择后预填 base_url 与推荐 model_id
 *  3. 测试连接：调用 POST /settings/models/:id/test，显示成功/失败消息
 *  4. 空列表时显示「暂未配置模型，点击右上角新增」
 *
 * 数据源：useModelConfigs（GET /settings/models）
 * 写操作：useCreateModelConfig / useUpdateModelConfig / useDeleteModelConfig /
 *        useTestModelConfig / useSetDefaultModelConfig
 *
 * 该组件不接收 props，内部自行管理状态；供 SettingsDialog 直接渲染。
 */
import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useCreateModelConfig,
  useDeleteModelConfig,
  useModelConfigs,
  useSetDefaultModelConfig,
  useTestModelConfig,
  useUpdateModelConfig,
} from '@/hooks/useModelConfigs'
import { MODEL_PROVIDERS, getProviderPreset } from '@/common/modelProviders'
import type { ModelConfig, ModelConfigCreateInput, ModelConfigUpdateInput, ModelDiscoverItem } from '@/types'
import { modelConfigApi } from '@/services/api'
import { cn } from '@/lib/utils'

/** 单条模型测试结果（按 id 索引） */
interface TestState {
  loading: boolean
  success?: boolean
  message?: string
}

export function ModelConfigPanel() {
  const { data, isLoading, isError, error } = useModelConfigs()
  const createMut = useCreateModelConfig()
  const updateMut = useUpdateModelConfig()
  const deleteMut = useDeleteModelConfig()
  const testMut = useTestModelConfig()
  const setDefaultMut = useSetDefaultModelConfig()

  const [editing, setEditing] = useState<ModelConfig | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [testStates, setTestStates] = useState<Record<string, TestState>>({})
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const models = useMemo(() => data ?? [], [data])

  // 短暂提示自动消失
  useEffect(() => {
    if (!toastMsg) return
    const t = setTimeout(() => setToastMsg(null), 3500)
    return () => clearTimeout(t)
  }, [toastMsg])

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }
  const openEdit = (m: ModelConfig) => {
    setEditing(m)
    setDialogOpen(true)
  }

  const handleToggleEnabled = (m: ModelConfig, next: boolean) => {
    updateMut.mutate(
      { id: m.id, input: { enabled: next } },
      {
        onSuccess: () => setToastMsg({ kind: 'success', text: `${m.display_name} 已${next ? '启用' : '停用'}` }),
        onError: (err) => setToastMsg({ kind: 'error', text: err instanceof Error ? err.message : '操作失败' }),
      },
    )
  }

  const handleSetDefault = (m: ModelConfig) => {
    setDefaultMut.mutate(m.id, {
      onSuccess: () => setToastMsg({ kind: 'success', text: `已将「${m.display_name}」设为默认模型` }),
      onError: (err) => setToastMsg({ kind: 'error', text: err instanceof Error ? err.message : '设为默认失败' }),
    })
  }

  const handleTest = (m: ModelConfig) => {
    setTestStates((p) => ({ ...p, [m.id]: { loading: true } }))
    testMut.mutate(m.id, {
      onSuccess: (res) => {
        setTestStates((p) => ({
          ...p,
          [m.id]: { loading: false, success: res.success, message: res.message },
        }))
      },
      onError: (err) => {
        setTestStates((p) => ({
          ...p,
          [m.id]: {
            loading: false,
            success: false,
            message: err instanceof Error ? err.message : '测试失败',
          },
        }))
      },
    })
  }

  const handleDelete = (m: ModelConfig) => {
    deleteMut.mutate(m.id, {
      onSuccess: () => {
        setConfirmingDeleteId(null)
        setToastMsg({ kind: 'success', text: `已删除「${m.display_name}」` })
      },
      onError: (err) => setToastMsg({ kind: 'error', text: err instanceof Error ? err.message : '删除失败' }),
    })
  }

  // 列表为空时，顶部不再显示强按钮，仅在空状态中保留一个主按钮，避免重复 CTA。
  const isEmpty = !isLoading && !isError && models.length === 0

  return (
    <div className="flex flex-col gap-4">
      {/* 顶部操作条：空状态时隐藏新增按钮，避免与空状态 CTA 重复 */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-eyebrow">模型供应商</div>
          <p className="mt-1 text-sm text-muted-foreground">
            配置 OpenAI-Compatible 模型源，可设置一个默认模型用于 GEO 改写。
          </p>
        </div>
        {!isEmpty && (
          <Button size="sm" onClick={openCreate} className="shrink-0">
            <Plus className="h-3.5 w-3.5" />
            新增模型
          </Button>
        )}
      </div>

      {/* 全局提示 */}
      {toastMsg && (
        <div
          className={cn(
            'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
            toastMsg.kind === 'success'
              ? 'border-success/30 bg-success/5 text-success'
              : 'border-destructive/30 bg-destructive/5 text-destructive',
          )}
        >
          {toastMsg.kind === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <span className="break-words">{toastMsg.text}</span>
            {toastMsg.kind === 'error' && toastMsg.text.includes('MODEL_CONFIG_SECRET_KEY') && (
              <div className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                请在 backend/.env 中配置 MODEL_CONFIG_SECRET_KEY 并重启后端。
              </div>
            )}
          </div>
        </div>
      )}

      {/* 加载 / 错误 / 空状态 */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载中…
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : '加载模型配置失败'}
        </div>
      ) : models.length === 0 ? (
        <EmptyState
          icon={<Bot />}
          title="暂未配置模型"
          description="添加一个 OpenAI-Compatible 模型源后，即可在内容优化中选择模型运行。"
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              新增模型
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {models.map((m) => (
            <ModelRow
              key={m.id}
              model={m}
              testState={testStates[m.id]}
              confirmingDelete={confirmingDeleteId === m.id}
              onToggleEnabled={(next) => handleToggleEnabled(m, next)}
              onTest={() => handleTest(m)}
              onSetDefault={() => handleSetDefault(m)}
              onEdit={() => openEdit(m)}
              onDelete={() => setConfirmingDeleteId(m.id)}
              onDeleteCancel={() => setConfirmingDeleteId(null)}
              onDeleteConfirm={() => handleDelete(m)}
              updating={updateMut.isPending || setDefaultMut.isPending}
              deleting={deleteMut.isPending}
            />
          ))}
        </div>
      )}

      {/* 新增 / 编辑弹窗（居中，嵌套于设置中心之上） */}
      <ModelFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        model={editing}
        createMut={createMut}
        updateMut={updateMut}
        onSaved={(text) => setToastMsg({ kind: 'success', text })}
      />
    </div>
  )
}

// ===== 列表项 =====
interface ModelRowProps {
  model: ModelConfig
  testState: TestState | undefined
  confirmingDelete: boolean
  updating: boolean
  deleting: boolean
  onToggleEnabled: (next: boolean) => void
  onTest: () => void
  onSetDefault: () => void
  onEdit: () => void
  onDelete: () => void
  onDeleteCancel: () => void
  onDeleteConfirm: () => void
}

function ModelRow({
  model,
  testState,
  confirmingDelete,
  updating,
  deleting,
  onToggleEnabled,
  onTest,
  onSetDefault,
  onEdit,
  onDelete,
  onDeleteCancel,
  onDeleteConfirm,
}: ModelRowProps) {
  const preset = getProviderPreset(model.provider)
  const testing = testState?.loading ?? false
  const maskedKey = model.masked_api_key || '—'

  return (
    <Card className={cn('flex flex-col gap-2.5 p-4', !model.enabled && 'opacity-60')}>
      {/* Row 1：模型名称 + 默认标签 + 启用开关 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-semibold leading-snug tracking-tight">
            {model.display_name || model.model_id || '未命名模型'}
          </span>
          {model.is_default && (
            <Badge variant="primary" className="shrink-0 text-[10px]">
              <Star className="mr-0.5 h-2.5 w-2.5" />
              默认
            </Badge>
          )}
          {!model.enabled && (
            <Badge variant="muted" className="shrink-0 text-[10px]">
              已停用
            </Badge>
          )}
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={model.enabled} onCheckedChange={onToggleEnabled} disabled={updating} />
        </label>
      </div>

      {/* Row 2：Provider + Model ID */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="shrink-0 font-medium text-foreground/80">
          {model.provider_label || preset?.label || model.provider}
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span className="truncate font-mono">{model.model_id || '—'}</span>
      </div>

      {/* Row 3：Base URL + API Key */}
      <div className="grid grid-cols-1 gap-1 text-[11px] text-muted-foreground">
        <div className="flex min-w-0 gap-1">
          <span className="shrink-0 text-muted-foreground/60">Base URL</span>
          <span className="truncate font-mono">{model.base_url || '—'}</span>
        </div>
        <div className="flex min-w-0 gap-1">
          <span className="shrink-0 text-muted-foreground/60">API Key</span>
          <span className="truncate font-mono">{maskedKey}</span>
        </div>
      </div>

      {/* Row 4：参数标签 + 流式标签 */}
      {(model.temperature !== null || model.max_tokens !== null || model.supports_streaming) && (
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          {model.temperature !== null && (
            <span className="rounded-md border border-border bg-secondary/50 px-1.5 py-0.5 font-mono">
              temp={model.temperature}
            </span>
          )}
          {model.max_tokens !== null && (
            <span className="rounded-md border border-border bg-secondary/50 px-1.5 py-0.5 font-mono">
              max_tokens={model.max_tokens}
            </span>
          )}
          {model.supports_streaming && (
            <Badge variant="info" className="text-[10px]">流式</Badge>
          )}
        </div>
      )}

      {/* 测试结果 */}
      {testState && !testing && testState.message && (
        <div
          className={cn(
            'flex items-start gap-1.5 rounded-md border px-2 py-1.5 text-xs',
            testState.success
              ? 'border-success/30 bg-success/5 text-success'
              : 'border-destructive/30 bg-destructive/5 text-destructive',
          )}
        >
          {testState.success ? (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          <span className="min-w-0 break-words">{testState.message}</span>
        </div>
      )}

      {/* Row 5：操作按钮 */}
      {!confirmingDelete ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-2.5">
          <Button size="sm" variant="outline" onClick={onTest} disabled={testing || !model.enabled}>
            {testing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                测试中…
              </>
            ) : (
              <>
                <Zap className="h-3.5 w-3.5" />
                测试连接
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onSetDefault}
            disabled={updating || model.is_default}
          >
            <Star className="h-3.5 w-3.5" />
            默认
          </Button>
          <div className="ml-auto flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
              编辑
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              删除
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs">
          <span className="text-destructive">确认删除「{model.display_name || model.model_id}」？</span>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="ghost" onClick={onDeleteCancel} disabled={deleting}>
              取消
            </Button>
            <Button size="sm" variant="destructive" onClick={onDeleteConfirm} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  删除中…
                </>
              ) : (
                '确认删除'
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

// ===== 表单弹窗 =====
interface ModelFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  model: ModelConfig | null
  createMut: ReturnType<typeof useCreateModelConfig>
  updateMut: ReturnType<typeof useUpdateModelConfig>
  onSaved: (text: string) => void
}

interface FormState {
  provider: string
  providerLabel: string
  displayName: string
  apiKey: string
  baseUrl: string
  modelId: string
  temperature: string
  maxTokens: string
  supportsStreaming: boolean
}

function ModelFormDialog({
  open,
  onOpenChange,
  model,
  createMut,
  updateMut,
  onSaved,
}: ModelFormDialogProps) {
  const isEdit = !!model
  const [form, setForm] = useState<FormState>(emptyForm())
  const [showApiKey, setShowApiKey] = useState(false)
  const [resetKey, setResetKey] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // 模型发现
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [discoveredModels, setDiscoveredModels] = useState<ModelDiscoverItem[]>([])
  const [discoverError, setDiscoverError] = useState<string | null>(null)

  // 每次打开时根据 model 重置表单
  useEffect(() => {
    if (!open) return
    setErrorMsg(null)
    setShowApiKey(false)
    setResetKey(false)
    setDiscoveredModels([])
    setDiscoverError(null)
    if (model) {
      setForm({
        provider: model.provider,
        providerLabel: model.provider_label,
        displayName: model.display_name,
        apiKey: '',
        baseUrl: model.base_url,
        modelId: model.model_id,
        temperature: model.temperature !== null ? String(model.temperature) : '',
        maxTokens: model.max_tokens !== null ? String(model.max_tokens) : '',
        supportsStreaming: model.supports_streaming,
      })
    } else {
      setForm(emptyForm())
    }
  }, [open, model])

  // 切换 provider 时预填默认值
  const handleProviderChange = (provider: string) => {
    const preset = getProviderPreset(provider)
    setForm((p) => ({
      ...p,
      provider,
      providerLabel: preset?.label ?? provider,
      baseUrl: preset?.defaultBaseUrl ?? '',
      modelId: p.modelId && p.provider === provider ? p.modelId : (preset?.defaultModelId ?? ''),
    }))
  }

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }))

  const handleDiscover = async () => {
    setDiscoverLoading(true)
    setDiscoverError(null)
    setDiscoveredModels([])
    try {
      const res = await modelConfigApi.discover({
        provider: form.provider,
        api_key: form.apiKey,
        base_url: form.baseUrl,
      })
      if (res.success) {
        setDiscoveredModels(res.models)
        if (res.models.length === 0) {
          setDiscoverError('该服务商没有可用的模型')
        }
      } else {
        setDiscoverError(res.message || '获取模型列表失败')
      }
    } catch (e) {
      setDiscoverError(e instanceof Error ? e.message : '请求失败')
    } finally {
      setDiscoverLoading(false)
    }
  }

  const handleSelectDiscoveredModel = (modelId: string) => {
    set('modelId', modelId)
    // 自动填充 display_name（用户可修改）
    if (!form.displayName.trim()) {
      set('displayName', modelId)
    }
  }

  const handleSave = () => {
    setErrorMsg(null)

    if (!form.displayName.trim()) {
      setErrorMsg('请填写显示名称')
      return
    }
    if (!form.baseUrl.trim()) {
      setErrorMsg('请填写 Base URL')
      return
    }
    if (!form.modelId.trim()) {
      setErrorMsg('请填写 Model ID')
      return
    }

    const preset = getProviderPreset(form.provider)
    if (preset?.apiKeyRequired && !isEdit && !form.apiKey.trim()) {
      setErrorMsg(`请填写 ${preset.label} 的 API Key`)
      return
    }

    const temperature = form.temperature.trim() === '' ? null : Number(form.temperature)
    const maxTokens = form.maxTokens.trim() === '' ? null : Number(form.maxTokens)
    if (temperature !== null && (Number.isNaN(temperature) || temperature < 0 || temperature > 2)) {
      setErrorMsg('Temperature 应为 0 ~ 2 之间的数字')
      return
    }
    if (maxTokens !== null && (Number.isNaN(maxTokens) || maxTokens <= 0 || !Number.isInteger(maxTokens))) {
      setErrorMsg('Max Tokens 应为正整数')
      return
    }

    if (isEdit && model) {
      const input: ModelConfigUpdateInput = {
        provider: form.provider,
        provider_label: form.providerLabel,
        display_name: form.displayName.trim(),
        base_url: form.baseUrl.trim(),
        model_id: form.modelId.trim(),
        temperature,
        max_tokens: maxTokens,
        supports_streaming: form.supportsStreaming,
      }
      // 仅当用户主动输入新 key 时才传 api_key
      if (resetKey && form.apiKey.trim()) {
        input.api_key = form.apiKey.trim()
      }
      updateMut.mutate(
        { id: model.id, input },
        {
          onSuccess: () => {
            onSaved('模型配置已更新')
            onOpenChange(false)
          },
          onError: (err) => setErrorMsg(err instanceof Error ? err.message : '保存失败'),
        },
      )
    } else {
      const input: ModelConfigCreateInput = {
        provider: form.provider,
        provider_label: form.providerLabel,
        display_name: form.displayName.trim(),
        api_key: form.apiKey.trim(),
        base_url: form.baseUrl.trim(),
        model_id: form.modelId.trim(),
        temperature,
        max_tokens: maxTokens,
        supports_streaming: form.supportsStreaming,
      }
      createMut.mutate(input, {
        onSuccess: () => {
          onSaved('模型已新增')
          onOpenChange(false)
        },
        onError: (err) => setErrorMsg(err instanceof Error ? err.message : '创建失败'),
      })
    }
  }

  const saving = createMut.isPending || updateMut.isPending
  const preset = getProviderPreset(form.provider)
  const apiKeyPlaceholder = preset?.apiKeyPlaceholder ?? 'API Key'
  const apiKeyRequired = preset?.apiKeyRequired ?? true

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side="center" className="flex max-h-[80vh] max-w-[600px] flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑模型配置' : '新增模型配置'}</DialogTitle>
          <DialogDescription>
            配置 OpenAI-Compatible 服务商，所有字段保存后立即生效。
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {/* Provider */}
          <div className="space-y-1.5">
            <Label>Provider</Label>
            <Select
              value={form.provider}
              onValueChange={handleProviderChange}
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_PROVIDERS.map((p) => (
                  <SelectItem key={p.provider} value={p.provider}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isEdit && (
              <p className="text-[11px] text-muted-foreground">编辑模式下不可修改 Provider。</p>
            )}
            {preset?.docsUrl && (
              <a
                href={preset.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-[11px] text-primary hover:underline"
              >
                获取 API Key 文档
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {/* 显示名称 */}
          <div className="space-y-1.5">
            <Label>
              显示名称
              <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              value={form.displayName}
              onChange={(e) => set('displayName', e.target.value)}
              placeholder="例如：默认改写模型 / 客服 GPT"
            />
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <Label>
              API Key
              {apiKeyRequired && !isEdit && <span className="ml-0.5 text-destructive">*</span>}
            </Label>
            {isEdit ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 truncate rounded-lg border border-input bg-muted/30 px-3.5 py-2 text-xs font-mono text-muted-foreground">
                    {model?.masked_api_key || '—'}
                  </div>
                  {!resetKey ? (
                    <Button size="sm" variant="outline" onClick={() => setResetKey(true)}>
                      重新输入
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setResetKey(false)
                        set('apiKey', '')
                      }}
                    >
                      取消
                    </Button>
                  )}
                </div>
                {resetKey && (
                  <div className="relative">
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      value={form.apiKey}
                      onChange={(e) => set('apiKey', e.target.value)}
                      placeholder={apiKeyPlaceholder}
                      className="pr-9 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-secondary"
                      aria-label={showApiKey ? '隐藏' : '显示'}
                    >
                      {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">
                  不重新输入则保留原 API Key 不变。
                </p>
              </div>
            ) : (
              <div className="relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={form.apiKey}
                  onChange={(e) => set('apiKey', e.target.value)}
                  placeholder={apiKeyPlaceholder}
                  className="pr-9 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-secondary"
                  aria-label={showApiKey ? '隐藏' : '显示'}
                >
                  {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Base URL */}
          <div className="space-y-1.5">
            <Label>
              Base URL
              <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              value={form.baseUrl}
              onChange={(e) => set('baseUrl', e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="font-mono"
            />
          </div>

          {/* Model ID — 支持从服务商拉取 */}
          <div className="space-y-1.5">
            <Label>
              Model ID
              <span className="ml-0.5 text-destructive">*</span>
            </Label>

            {/* 模型列表选择框 + 获取模型按钮 */}
            <div className="flex items-center gap-2">
              <Select
                value={form.modelId}
                onValueChange={handleSelectDiscoveredModel}
                disabled={discoveredModels.length === 0}
              >
                <SelectTrigger className="flex-1 font-mono">
                  <SelectValue placeholder="请先获取模型列表，或手动填写下方输入框" />
                </SelectTrigger>
                <SelectContent>
                  {discoveredModels.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="font-mono">
                      {m.id}
                      {m.owned_by && (
                        <span className="ml-2 text-muted-foreground/60 text-[11px]">
                          ({m.owned_by})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                size="sm"
                variant="outline"
                onClick={handleDiscover}
                disabled={discoverLoading || !form.baseUrl.trim() || (apiKeyRequired && !form.apiKey.trim())}
                className="shrink-0 gap-1"
              >
                {discoverLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    获取中…
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" />
                    获取模型
                  </>
                )}
              </Button>
            </div>

            {/* 手动填写入框（始终可用） */}
            <Input
              value={form.modelId}
              onChange={(e) => set('modelId', e.target.value)}
              placeholder="或手动填写 Model ID，例如：gpt-4o-mini"
              list="model-id-examples"
              className="font-mono"
            />
            {preset && preset.modelIdExamples.length > 0 && (
              <datalist id="model-id-examples">
                {preset.modelIdExamples.map((id) => (
                  <option key={id} value={id} />
                ))}
              </datalist>
            )}

            {/* 模型推荐 chips（未获取列表时显示） */}
            {discoveredModels.length === 0 && preset && preset.modelIdExamples.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {preset.modelIdExamples.slice(0, 5).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => set('modelId', id)}
                    className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
                  >
                    {id}
                  </button>
                ))}
              </div>
            )}

            {/* 获取结果提示 */}
            {discoverError && (
              <p className="text-[11px] text-destructive">{discoverError}</p>
            )}
            {discoveredModels.length > 0 && !discoverError && (
              <p className="text-[11px] text-muted-foreground">
                已加载 {discoveredModels.length} 个可用模型。可从下拉选择或手动修改上方 Model ID。
              </p>
            )}
          </div>

          {/* Temperature / Max Tokens */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Temperature</Label>
              <Input
                type="number"
                step="0.1"
                min={0}
                max={2}
                value={form.temperature}
                onChange={(e) => set('temperature', e.target.value)}
                placeholder="留空 = 服务商默认"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Max Tokens</Label>
              <Input
                type="number"
                step="1"
                min={1}
                value={form.maxTokens}
                onChange={(e) => set('maxTokens', e.target.value)}
                placeholder="留空 = 服务商默认"
              />
            </div>
          </div>

          {/* 流式 */}
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Switch
              checked={form.supportsStreaming}
              onCheckedChange={(v) => set('supportsStreaming', v)}
            />
            <span>支持流式输出（supports_streaming）</span>
          </label>
        </div>

        {errorMsg && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-0 break-words">{errorMsg}</span>
            </div>
            {errorMsg.includes('MODEL_CONFIG_SECRET_KEY') && (
              <div className="rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                <div className="font-semibold">修复方法</div>
                <p className="mt-1 leading-relaxed">
                  后端缺少加密密钥，无法保存模型 API Key。请在 <code className="rounded bg-amber-100 px-1 py-0.5 font-mono dark:bg-amber-900/40">backend/.env</code> 中配置 <code className="rounded bg-amber-100 px-1 py-0.5 font-mono dark:bg-amber-900/40">MODEL_CONFIG_SECRET_KEY</code> 并重启后端服务。
                </p>
                <p className="mt-1.5 leading-relaxed">
                  生成密钥命令：
                </p>
                <pre className="mt-1 overflow-x-auto rounded bg-amber-100/70 px-2 py-1 font-mono text-[11px] dark:bg-amber-900/40">python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"</pre>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || (!isEdit && apiKeyRequired && !form.apiKey.trim())}
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                保存中…
              </>
            ) : isEdit ? (
              '保存修改'
            ) : (
              '新增模型'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function emptyForm(): FormState {
  return {
    provider: 'openai',
    providerLabel: 'OpenAI',
    displayName: '',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    modelId: 'gpt-4o-mini',
    temperature: '',
    maxTokens: '',
    supportsStreaming: true,
  }
}
