import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Plus, Search, X, FolderOpen } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { AppShell, TopBar } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BrandFactCard } from '@/components/facts'
import { EnterpriseUpgradeButton } from '@/components/layout/EnterpriseUpgradeButton'
import { FACT_TYPES, EVIDENCE_LEVELS, SOURCE_TYPES } from '@/common/constants'
import {
  useBrandFacts,
  useCreateBrandFact,
  useToggleBrandFact,
  useUpdateBrandFact,
} from '@/hooks/useBrandFacts'
import { useProject } from '@/hooks/useProjects'
import { useWorkspaceType } from '@/hooks/useWorkspaceType'
import { mockBrandFacts, mockProjects } from '@/mock/data'
import type { BrandFact, FactType } from '@/types'
import { cn } from '@/lib/utils'

type FilterType = 'all' | FactType

/** 各工作区类型的知识库描述与空状态文案 */
const KB_COPY = {
  brand: {
    description: '维护品牌事实、产品服务、案例、资质和可信来源。',
    emptyTitle: '还没有品牌资料',
    emptyDesc: '你可以先添加品牌简介、产品服务、客户案例或可信来源。',
  },
  professional: {
    description: '维护机构介绍、服务领域、专家观点、典型案例、合规边界和专业依据。',
    emptyTitle: '还没有专业资料',
    emptyDesc: '你可以先添加服务领域、专家介绍、典型案例、常见问题或政策依据。',
  },
  media: {
    description: '维护账号定位、读者画像、内容风格、栏目方向和可信信源。',
    emptyTitle: '还没有账号资料',
    emptyDesc: '你可以先添加账号定位、目标读者、内容领域、写作风格或常用信源。',
  },
  agency: {
    description: '维护客户资料、交付目标、审核偏好、行业事实和风险边界。',
    emptyTitle: '还没有客户资料',
    emptyDesc: '你可以先添加客户背景、服务目标、内容平台、审核偏好和风险边界。',
  },
  unknown: {
    description: '维护可被 AI 引用的可信事实、案例与来源。',
    emptyTitle: '还没有知识条目',
    emptyDesc: '你可以先添加一条事实、案例或可信来源。',
  },
} as const

/**
 * BrandFactsPage - 知识库（动态命名）
 *
 * 底层仍调用 brand-facts API；UI 文案根据 workspace_type 动态调整：
 *   brand        → 品牌知识库
 *   professional → 专业知识库
 *   media        → 账号知识库
 *   agency       → 客户知识库
 *   unknown      → 知识库
 *
 * 数据源：useBrandFacts（真实 API /projects/:id/brand-facts）；失败 fallback mock
 * 写操作：useCreateBrandFact / useUpdateBrandFact / useToggleBrandFact
 */
export function BrandFactsPage() {
  const { projectId = '' } = useParams()
  const { data: projectData, isError: projectErr } = useProject(projectId)
  const project = projectData ?? (projectErr ? mockProjects.find((p) => p.id === projectId) : undefined)
  const { type: wsType, meta: wsMeta } = useWorkspaceType(projectId)

  const { data, isLoading, isError } = useBrandFacts(projectId)
  const createMut = useCreateBrandFact(projectId)
  const updateMut = useUpdateBrandFact(projectId)
  const toggleMut = useToggleBrandFact(projectId)

  // API 失败 fallback mock，保证 P0 演示
  const facts = useMemo(() => {
    if (data) return data
    if (isError) return mockBrandFacts.filter((f) => f.project_id === projectId)
    return []
  }, [data, isError, projectId])

  const [filter, setFilter] = useState<FilterType>('all')
  const [keyword, setKeyword] = useState('')
  const [editing, setEditing] = useState<BrandFact | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return facts.filter((f) => {
      if (filter !== 'all' && f.fact_type !== filter) return false
      if (
        kw &&
        !f.title.toLowerCase().includes(kw) &&
        !f.content.toLowerCase().includes(kw) &&
        !f.tags.some((t) => t.toLowerCase().includes(kw))
      )
        return false
      return true
    })
  }, [facts, filter, keyword])

  const filterItems: { value: FilterType; label: string }[] = [
    { value: 'all', label: '全部' },
    ...FACT_TYPES.map((t) => ({ value: t.value as FilterType, label: t.label })),
  ]

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }
  const openEdit = (fact: BrandFact) => {
    setEditing(fact)
    setDialogOpen(true)
  }

  const copy = wsType ? KB_COPY[wsType] : KB_COPY.unknown
  const kbName = wsMeta.knowledgeBaseName

  return (
    <AppShell
      projectId={projectId}
      variant="full"
      topBar={
        <TopBar
          breadcrumb={
            <Link
              to={`/projects/${projectId}`}
              className="flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {project?.name ?? '工作区'}
            </Link>
          }
          title={
            <>
              <h1 className="truncate text-[var(--tier-title)] font-semibold tracking-tight">
                {kbName}
              </h1>
              <Badge variant="muted" className="shrink-0">
                {facts.length} 条知识
              </Badge>
            </>
          }
          actions={
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              新增知识
            </Button>
          }
        />
      }
    >
      <div className="flex gap-6">
        {/* 左侧筛选 - sticky，与正文顶部对齐 */}
        <aside className="workspace-sticky hidden w-48 shrink-0 sm:block">
          <div className="text-eyebrow mb-2 px-3">知识分类</div>
          <nav className="flex flex-col gap-0.5">
            {filterItems.map((item) => {
              const active = filter === item.value
              const count =
                item.value === 'all'
                  ? facts.length
                  : facts.filter((f) => f.fact_type === item.value).length
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={cn(
                    'flex items-center justify-between rounded-full px-3 py-1.5 text-sm transition-colors',
                    active
                      ? 'bg-secondary font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                  )}
                >
                  {item.label}
                  <span className="text-xs text-muted-foreground/70 nums">{count}</span>
                </button>
              )
            })}
          </nav>

          <div className="mt-6 border-t border-border pt-4">
            <EnterpriseUpgradeButton />
          </div>
        </aside>

        {/* 右侧主体 */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* 搜索栏 */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索事实标题、内容、标签"
              className="pl-9 pr-8"
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-secondary"
                aria-label="清空"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* 知识条目卡片网格 */}
          {filtered.length === 0 ? (
            <EmptyState
              icon={<FolderOpen />}
              title={keyword ? '未找到匹配的知识' : copy.emptyTitle}
              description={
                keyword
                  ? '尝试调整搜索关键词或切换类型筛选'
                  : copy.emptyDesc
              }
              action={
                !keyword && (
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="h-3.5 w-3.5" />
                    新增知识
                  </Button>
                )
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filtered.map((fact) => (
                <BrandFactCard
                  key={fact.id}
                  fact={fact}
                  onEdit={openEdit}
                  onToggleActive={(f, next) => {
                    toggleMut.mutate({ fact: f, next })
                  }}
                />
              ))}
            </div>
          )}

          {/* media 工作区空状态：科技公众号示例 */}
          {wsType === 'media' && filtered.length === 0 && !keyword && (
            <Card className="mt-4 border-dashed bg-secondary/20 p-5 text-xs leading-relaxed text-muted-foreground">
              <div className="mb-2 text-eyebrow">参考示例：科技公众号账号知识库</div>
              <div className="space-y-1.5">
                <div><strong className="text-foreground">账号名称：</strong>AI 前线观察</div>
                <div><strong className="text-foreground">账号定位：</strong>面向企业管理者、产品经理、技术负责人，解释 AI 落地、产业变化和商业案例。</div>
                <div><strong className="text-foreground">目标读者：</strong>企业老板、CTO、产品经理、AI 创业者、数字化负责人。</div>
                <div><strong className="text-foreground">内容领域：</strong>企业 AI 落地、AI 工具、行业报告、数字化转型、AI 合规。</div>
                <div><strong className="text-foreground">常用栏目：</strong>AI 落地案例、行业报告解读、工具测评、政策与合规、企业访谈。</div>
                <div><strong className="text-foreground">写作风格：</strong>专业、克制、结论先行，适合微信深度阅读，不使用过度夸张标题。</div>
                <div><strong className="text-foreground">常用信源：</strong>官方报告、上市公司财报、企业官网、学术论文、行业白皮书、公开采访。</div>
                <div><strong className="text-foreground">表达禁忌：</strong>不夸大收益，不承诺效果，不使用未经验证的数据，不制造焦虑。</div>
                <div><strong className="text-foreground">转化目标：</strong>引导读者关注公众号、收藏文章、咨询企业 AI 落地服务。</div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* 新增/编辑抽屉 */}
      <FactFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        fact={editing}
        projectId={projectId}
        createMut={createMut}
        updateMut={updateMut}
      />
    </AppShell>
  )
}

// ===== 表单弹窗 =====
interface FactFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fact: BrandFact | null
  projectId: string
  createMut: ReturnType<typeof useCreateBrandFact>
  updateMut: ReturnType<typeof useUpdateBrandFact>
}

function FactFormDialog({
  open,
  onOpenChange,
  fact,
  projectId,
  createMut,
  updateMut,
}: FactFormDialogProps) {
  const isEdit = !!fact
  const [title, setTitle] = useState(fact?.title ?? '')
  const [content, setContent] = useState(fact?.content ?? '')
  const [factType, setFactType] = useState<FactType>(fact?.fact_type ?? 'brand')
  const [sourceType, setSourceType] = useState(fact?.source_type ?? 'official')
  const [evidenceLevel, setEvidenceLevel] = useState(fact?.evidence_level ?? 'moderate')
  const [sourceUrl, setSourceUrl] = useState(fact?.source_url ?? '')
  const [tagsText, setTagsText] = useState((fact?.tags ?? []).join(', '))

  useEffect(() => {
    setTitle(fact?.title ?? '')
    setContent(fact?.content ?? '')
    setFactType(fact?.fact_type ?? 'brand')
    setSourceType(fact?.source_type ?? 'official')
    setEvidenceLevel(fact?.evidence_level ?? 'moderate')
    setSourceUrl(fact?.source_url ?? '')
    setTagsText((fact?.tags ?? []).join(', '))
  }, [fact])

  const handleSave = () => {
    const tags = tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    const payload = {
      fact_type: factType,
      title: title.trim(),
      content: content.trim(),
      source_type: sourceType,
      source_url: sourceUrl.trim() || undefined,
      evidence_level: evidenceLevel,
      tags,
    }
    if (isEdit && fact) {
      updateMut.mutate(
        { id: fact.id, payload },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      createMut.mutate(
        { ...payload, is_active: true },
        { onSuccess: () => onOpenChange(false) },
      )
    }
  }

  const saving = createMut.isPending || updateMut.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side="right" className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑事实' : '新增事实'}</DialogTitle>
          <DialogDescription>
            品牌事实将作为 GEO 改写的可信资料底座，确保 AI 引用的内容可验证。
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label>标题</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：Acme 公司定位" />
          </div>

          <div className="space-y-1.5">
            <Label>内容摘要</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="事实的具体内容，建议包含可验证的数据、时间、来源"
              className="min-h-[120px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>类型</Label>
              <Select value={factType} onValueChange={(v) => setFactType(v as FactType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FACT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>证据等级</Label>
              <Select value={evidenceLevel} onValueChange={(v) => setEvidenceLevel(v as BrandFact['evidence_level'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVIDENCE_LEVELS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>来源类型</Label>
              <Select value={sourceType} onValueChange={(v) => setSourceType(v as BrandFact['source_type'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>来源链接</Label>
              <Input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://"
                type="url"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>标签</Label>
            <Input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="用英文逗号分隔，例如：公司介绍, 官方"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || !content.trim() || saving}>
            {saving ? '保存中…' : isEdit ? '保存修改' : '新增事实'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
