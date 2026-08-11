import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Inbox,
  FileText,
  Link2,
  FileStack,
  AlertCircle,
} from 'lucide-react'
import { AppShell, TopBar } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/**
 * InboxPage - 素材库占位页（P0）
 *
 * 定位：多篇素材长期管理与批量生成的未来能力。
 * 当前版本不开放批量导入与解析，单篇文章请在「文章工作台」处理。
 *
 * 路由：/projects/:projectId/inbox
 *
 * 未来规划（不在当前版本实现）：
 *   - 批量上传 Word / PDF / HTML / Markdown / TXT
 *   - 保存普通网页链接
 *   - 保存公众号文章链接
 *   - 管理多篇正文
 *   - 批量生成多类内容资产
 */
export function InboxPage() {
  const { projectId = '' } = useParams()

  return (
    <AppShell
      projectId={projectId}
      topBar={
        <TopBar
          breadcrumb={
            <Link
              to={`/projects/${projectId}`}
              className="flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              工作区
            </Link>
          }
          title={
            <h1 className="truncate text-[var(--tier-title)] font-semibold tracking-tight">
              素材库
            </h1>
          }
        />
      }
    >
      <div className="workspace-stack">
        {/* 副标题 */}
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="text-eyebrow">素材库</div>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            用于后续管理多篇文章、报告和链接。当前版本请先在文章工作台处理单篇文章。
          </p>
        </header>

        {/* 未来能力说明卡 */}
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
              <Inbox className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold tracking-tight">
                未来可在这里管理多篇素材
              </h3>
              <ul className="mt-3 grid grid-cols-1 gap-2.5 text-sm text-muted-foreground md:grid-cols-2">
                <li className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                  <span>批量上传 Word / PDF / HTML / Markdown / TXT</span>
                </li>
                <li className="flex items-start gap-2">
                  <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                  <span>保存普通网页链接</span>
                </li>
                <li className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                  <span>保存公众号文章链接</span>
                </li>
                <li className="flex items-start gap-2">
                  <FileStack className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                  <span>管理多篇正文</span>
                </li>
              </ul>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                并将素材批量优化为多类内容。
              </p>
            </div>
          </div>
        </Card>

        {/* 当前限制提示 */}
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-foreground/80">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="leading-relaxed">
            <strong className="text-foreground">
              当前版本暂未开放批量导入与解析。
            </strong>
            <br />
            如果你只有一篇文章，请前往文章工作台处理。
          </div>
        </div>

        {/* CTA：去文章工作台 */}
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <h3 className="text-base font-semibold tracking-tight">
            现在要处理单篇文章？
          </h3>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            前往文章工作台，可粘贴正文或上传 Word / TXT / HTML，先诊断内容质量，再优化内容。
          </p>
          <Button asChild size="lg" className="mt-2">
            <Link to={`/projects/${projectId}/rewrite/new`}>
              去文章工作台
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </Card>
      </div>
    </AppShell>
  )
}
