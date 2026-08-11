import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Building2, Briefcase, Megaphone, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useCreateProject } from '@/hooks/useProjects'
import { brandFactApi } from '@/services/api'
import {
  WORKSPACE_TYPES,
  setWorkspaceType,
  buildKnowledgeSeeds,
  seedToFactPayload,
  type WorkspaceType,
  type WorkspaceFormData,
} from '@/common/workspace'

interface WorkspaceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * WorkspaceFormDialog - 创建工作区分步弹窗
 *
 * 步骤 1：选择工作区类型（brand / professional / media / agency）
 * 步骤 2：根据类型展示对应动态表单
 *
 * 创建工作区成功后：
 *   1. 写入 workspace_type 到 localStorage
 *   2. 调用 brandFactApi.create 批量初始化知识条目
 *   3. 跳转到工作区概览页 /projects/:projectId
 *
 * 知识条目初始化失败不会阻断工作区创建。
 */
export function WorkspaceFormDialog({ open, onOpenChange }: WorkspaceFormDialogProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [wsType, setWsType] = useState<WorkspaceType | null>(null)
  const [form, setForm] = useState<WorkspaceFormData>({})
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [seedingHint, setSeedingHint] = useState<string | null>(null)

  const createMut = useCreateProject()
  const navigate = useNavigate()

  const reset = () => {
    setStep(1)
    setWsType(null)
    setForm({})
    setErrorMsg(null)
    setSeedingHint(null)
  }

  const handleClose = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const pickType = (t: WorkspaceType) => {
    setWsType(t)
    setStep(2)
    setErrorMsg(null)
  }

  const setField = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const handleCreate = () => {
    if (!wsType) return
    setErrorMsg(null)
    setSeedingHint(null)

    const meta = WORKSPACE_TYPES.find((t) => t.value === wsType)!
    // 工作区名称必填，作为 project.name
    const name = (form.name ?? '').trim()
    if (!name) {
      setErrorMsg('请填写工作区名称')
      return
    }

    // 把表单拼接为 description（轻量归档，便于后续展示）
    const descParts: string[] = []
    Object.entries(form).forEach(([k, v]) => {
      if (k === 'name') return
      if (v && v.trim()) descParts.push(`${k}: ${v.trim()}`)
    })
    const description = descParts.join('\n')

    createMut.mutate(
      {
        name,
        brand_name: (form.brand_name ?? form.account_name ?? form.org_name ?? form.client_name ?? '').trim() || undefined,
        description: description || undefined,
        default_perspective: meta.defaultPerspective,
        default_platform: meta.defaultPlatform,
        workspace_type: wsType,
      },
      {
        onSuccess: async (project) => {
          // 1. 写入 workspace_type（localStorage 作为兼容缓存，后端已持久化）
          setWorkspaceType(project.id, wsType)

          // 2. 批量初始化知识条目（不阻塞导航，失败仅提示）
          setSeedingHint('正在初始化知识条目…')
          const seeds = buildKnowledgeSeeds(wsType, form)
          let failed = 0
          // 直接走 brandFactApi.create，避免 useCreateBrandFact hook 闭包 projectId 问题
          for (const seed of seeds) {
            try {
              await brandFactApi.create(project.id, seedToFactPayload(seed))
            } catch {
              failed++
            }
          }

          // 3. 关闭弹窗 + 跳转
          handleClose(false)
          navigate(`/projects/${project.id}`)

          if (failed > 0) {
            // 跳转后再提示（不阻塞）
            setTimeout(() => {
              alert(
                `工作区已创建，${failed} 条知识条目初始化失败，你可以稍后在知识库中补充。`,
              )
            }, 200)
          }
        },
        onError: (err) => {
          setErrorMsg(err instanceof Error ? err.message : '创建失败，请稍后重试')
        },
      },
    )
  }

  const saving = createMut.isPending

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent side="right" className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{step === 1 ? '创建工作区' : '填写工作区信息'}</DialogTitle>
          <DialogDescription>
            {step === 1
              ? '为不同对象创建独立知识库，并优化内容。'
              : '填写后系统会自动初始化对应知识库条目。'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <TypeSelectionPanel onPick={pickType} />
        ) : (
          wsType && (
            <DynamicFormPanel
              type={wsType}
              form={form}
              onField={setField}
              onBack={() => setStep(1)}
            />
          )
        )}

        {seedingHint && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-xs text-primary">
            {seedingHint}
          </div>
        )}

        {errorMsg && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
            {errorMsg}
          </div>
        )}

        {step === 2 && wsType && (
          <DialogFooter>
            <Button variant="ghost" onClick={() => setStep(1)} disabled={saving}>
              <ArrowLeft className="h-3.5 w-3.5" />
              上一步
            </Button>
            <Button onClick={handleCreate} disabled={saving || !(form.name ?? '').trim()}>
              {saving ? '创建中…' : '创建工作区'}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ===== 步骤 1：类型选择 =====
function TypeSelectionPanel({ onPick }: { onPick: (t: WorkspaceType) => void }) {
  const iconFor = (t: WorkspaceType) => {
    if (t === 'brand') return <Building2 className="h-5 w-5" />
    if (t === 'professional') return <Briefcase className="h-5 w-5" />
    if (t === 'media') return <Megaphone className="h-5 w-5" />
    return <Users className="h-5 w-5" />
  }
  return (
    <div className="flex-1 space-y-3 overflow-y-auto pr-1">
      <Label>你主要为谁生成内容？</Label>
      <div className="grid grid-cols-1 gap-2.5">
        {WORKSPACE_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => onPick(t.value)}
            className="group flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-soft-sm"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground [&>svg]:h-4 [&>svg]:w-4">
              {iconFor(t.value)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium tracking-tight">{t.label}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ===== 步骤 2：动态表单 =====
interface DynamicFormPanelProps {
  type: WorkspaceType
  form: WorkspaceFormData
  onField: (k: string, v: string) => void
  onBack: () => void
}

function DynamicFormPanel({ type, form, onField }: DynamicFormPanelProps) {
  // 根据类型展示对应字段
  if (type === 'brand') return <BrandForm form={form} onField={onField} />
  if (type === 'professional') return <ProfessionalForm form={form} onField={onField} />
  if (type === 'media') return <MediaForm form={form} onField={onField} />
  return <AgencyForm form={form} onField={onField} />
}

// ===== 通用字段组件 =====
function Field({
  label,
  fieldKey,
  form,
  onField,
  placeholder,
  textarea,
  required,
}: {
  label: string
  fieldKey: string
  form: WorkspaceFormData
  onField: (k: string, v: string) => void
  placeholder?: string
  textarea?: boolean
  required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {textarea ? (
        <Textarea
          value={form[fieldKey] ?? ''}
          onChange={(e) => onField(fieldKey, e.target.value)}
          placeholder={placeholder}
          className="min-h-[72px]"
        />
      ) : (
        <Input
          value={form[fieldKey] ?? ''}
          onChange={(e) => onField(fieldKey, e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  )
}

// ===== brand 表单 =====
function BrandForm({ form, onField }: { form: WorkspaceFormData; onField: (k: string, v: string) => void }) {
  return (
    <div className="flex-1 space-y-4 overflow-y-auto pr-1">
      <Field label="工作区名称" fieldKey="name" form={form} onField={onField} placeholder="例如：Acme 企业服务" required />
      <Field label="品牌 / 公司名称" fieldKey="brand_name" form={form} onField={onField} placeholder="例如：Acme" />
      <Field label="品牌 / 公司简介" fieldKey="brand_intro" form={form} onField={onField} textarea placeholder="一句话或一段话介绍品牌定位" />
      <Field label="行业" fieldKey="industry" form={form} onField={onField} placeholder="例如：企业服务 / SaaS" />
      <Field label="官网" fieldKey="website" form={form} onField={onField} placeholder="https://" />
      <Field label="目标客户" fieldKey="target_customer" form={form} onField={onField} textarea placeholder="客户画像、典型角色、决策路径" />
      <Field label="核心产品 / 服务" fieldKey="product_service" form={form} onField={onField} textarea placeholder="主要产品、核心功能、差异化优势" />
      <Field label="内容目标" fieldKey="content_goal" form={form} onField={onField} textarea placeholder="例如：官网品牌词 SEO、产品页转化、案例传播" />
      <Field label="可信来源 / 参考链接" fieldKey="trusted_sources" form={form} onField={onField} textarea placeholder="研究报告、官方公告、白皮书等可引用来源" />
    </div>
  )
}

// ===== professional 表单 =====
function ProfessionalForm({ form, onField }: { form: WorkspaceFormData; onField: (k: string, v: string) => void }) {
  return (
    <div className="flex-1 space-y-4 overflow-y-auto pr-1">
      <Field label="工作区名称" fieldKey="name" form={form} onField={onField} placeholder="例如：方达律所内容工作区" required />
      <Field label="机构名称" fieldKey="org_name" form={form} onField={onField} placeholder="例如：方达律师事务所" />
      <Field label="机构介绍" fieldKey="org_intro" form={form} onField={onField} textarea placeholder="机构历史、定位、专业领域" />
      <Field label="服务领域" fieldKey="service_fields" form={form} onField={onField} textarea placeholder="例如：并购、合规、知识产权、争议解决" />
      <Field label="专家 / 团队介绍" fieldKey="experts" form={form} onField={onField} textarea placeholder="核心合伙人、专业背景、资质" />
      <Field label="典型案例" fieldKey="cases" form={form} onField={onField} textarea placeholder="代表案件、客户案例（脱敏）" />
      <Field label="服务流程" fieldKey="service_process" form={form} onField={onField} textarea placeholder="咨询 → 评估 → 方案 → 执行" />
      <Field label="目标客户" fieldKey="target_customer" form={form} onField={onField} textarea placeholder="目标客户类型与典型场景" />
      <Field label="合规边界" fieldKey="compliance" form={form} onField={onField} textarea placeholder="承诺边界、广告法限制、行业禁用表达" />
      <Field label="常见问题" fieldKey="faq" form={form} onField={onField} textarea placeholder="客户常问的合规/服务问题" />
      <Field label="可引用法律 / 政策 / 行业依据" fieldKey="legal_refs" form={form} onField={onField} textarea placeholder="相关法条、政策文件、行业规范" />
    </div>
  )
}

// ===== media 表单 =====
function MediaForm({ form, onField }: { form: WorkspaceFormData; onField: (k: string, v: string) => void }) {
  return (
    <div className="flex-1 space-y-4 overflow-y-auto pr-1">
      <Field label="工作区名称" fieldKey="name" form={form} onField={onField} placeholder="例如：AI 前线观察内容工作区" required />
      <Field label="账号名称" fieldKey="account_name" form={form} onField={onField} placeholder="例如：AI 前线观察" />
      <Field label="主要平台" fieldKey="main_platform" form={form} onField={onField} placeholder="公众号 / 知乎 / 多平台" />
      <Field label="账号定位" fieldKey="account_positioning" form={form} onField={onField} textarea placeholder="面向谁、解决什么问题、差异化定位" />
      <Field label="目标读者" fieldKey="target_audience" form={form} onField={onField} textarea placeholder="读者画像：角色、行业、关注点" />
      <Field label="内容领域" fieldKey="content_fields" form={form} onField={onField} textarea placeholder="主要内容方向、覆盖行业" />
      <Field label="常用栏目" fieldKey="columns" form={form} onField={onField} textarea placeholder="例如：行业报告解读、工具测评、政策合规" />
      <Field label="写作风格" fieldKey="writing_style" form={form} onField={onField} textarea placeholder="专业克制 / 结论先行 / 深度长文" />
      <Field label="标题偏好" fieldKey="title_preference" form={form} onField={onField} textarea placeholder="标题公式、长度、是否使用数字/情绪" />
      <Field label="常用信源" fieldKey="trusted_sources" form={form} onField={onField} textarea placeholder="官方报告、财报、学术论文、行业白皮书" />
      <Field label="表达禁忌" fieldKey="taboos" form={form} onField={onField} textarea placeholder="不夸大、不承诺效果、不使用未验证数据" />
      <Field label="转化目标" fieldKey="conversion_goal" form={form} onField={onField} textarea placeholder="关注、收藏、咨询合作等" />
    </div>
  )
}

// ===== agency 表单 =====
function AgencyForm({ form, onField }: { form: WorkspaceFormData; onField: (k: string, v: string) => void }) {
  return (
    <div className="flex-1 space-y-4 overflow-y-auto pr-1">
      <Field label="工作区名称" fieldKey="name" form={form} onField={onField} placeholder="例如：客户 A 内容交付工作区" required />
      <Field label="客户名称" fieldKey="client_name" form={form} onField={onField} placeholder="例如：客户 A" />
      <Field label="客户背景" fieldKey="client_background" form={form} onField={onField} textarea placeholder="公司、业务、规模、阶段" />
      <Field label="客户行业" fieldKey="client_industry" form={form} onField={onField} placeholder="例如：金融科技" />
      <Field label="服务目标" fieldKey="service_goal" form={form} onField={onField} textarea placeholder="内容目标、KPI、阶段性目标" />
      <Field label="内容平台" fieldKey="content_platforms" form={form} onField={onField} textarea placeholder="公众号 / 知乎 / 官网" />
      <Field label="客户资料摘要" fieldKey="client_summary" form={form} onField={onField} textarea placeholder="客户提供的资料摘要" />
      <Field label="审核偏好" fieldKey="review_preference" form={form} onField={onField} textarea placeholder="审核流程、风格偏好、修改频率" />
      <Field label="风险边界" fieldKey="risk_boundary" form={form} onField={onField} textarea placeholder="不可提及的内容、敏感词、合规边界" />
      <Field label="项目备注" fieldKey="project_notes" form={form} onField={onField} textarea placeholder="其他交付备注" />
    </div>
  )
}
