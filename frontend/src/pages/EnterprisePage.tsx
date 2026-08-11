import { Link } from 'react-router-dom'
import { ArrowLeft, Check, Sparkles, Shield, Users, Database, Zap } from 'lucide-react'
import { AppShell } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/**
 * EnterprisePage - 静态销售页
 * 不接后端，不做 CRM，不做向量库
 */
export function EnterprisePage() {
  const features = [
    {
      icon: Database,
      title: '私有品牌知识库',
      desc: '多品牌隔离、版本化事实管理、自定义审核流程。所有事实保留可追溯的来源与证据等级。',
    },
    {
      icon: Users,
      title: '团队协作',
      desc: '多人协同编辑、角色权限、任务指派与评论。支持按项目/品牌划分工作空间。',
    },
    {
      icon: Shield,
      title: '私有化部署',
      desc: '支持本地化部署与数据驻留，满足金融、政企等行业的合规要求。提供 SLA 保障。',
    },
    {
      icon: Zap,
      title: 'API 与集成',
      desc: '开放 REST API，可接入企业 CMS、知识库、工单系统。支持 Webhook 任务回调。',
    },
  ]

  const plans = [
    {
      name: 'Team',
      price: '按席位计费',
      desc: '适合中小团队',
      features: ['多品牌项目', '团队协作', '基础审核流程', '社区支持'],
      cta: '联系销售',
      highlight: false,
    },
    {
      name: 'Enterprise',
      price: '定制报价',
      desc: '适合中大型企业',
      features: [
        '私有化部署',
        'SSO / SAML',
        'SLA 99.9%',
        '专属客户成功经理',
        'API 集成支持',
        '合规审计',
      ],
      cta: '预约演示',
      highlight: true,
    },
  ]

  return (
    <AppShell
      topBar={
        <div className="flex w-full items-center gap-3">
          <Link
            to="/projects"
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回工作台
          </Link>
          <span className="text-border">/</span>
          <h1 className="text-base font-semibold tracking-tight">Enterprise</h1>
        </div>
      }
    >
      <div className="mx-auto max-w-5xl px-8 py-12">
        {/* Hero */}
        <header className="mb-12 text-center">
          <Badge variant="info" className="mb-4">
            Enterprise Solution
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight">
            为团队打造私有 GEO 内容治理平台
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            在标准 GEO 工作台基础上，Enterprise 提供私有品牌知识库、团队协作、私有化部署与 SLA 保障，
            帮助中大型企业将生成式 AI 引用率纳入可控的内容治理流程。
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button size="lg">预约演示</Button>
            <Button size="lg" variant="outline">
              查看技术方案
            </Button>
          </div>
        </header>

        {/* 功能特性 */}
        <section className="mb-12">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <Card key={f.title} className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold tracking-tight">{f.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </section>

        {/* 套餐 */}
        <section className="mb-12">
          <h2 className="mb-6 text-center text-2xl font-semibold tracking-tight">选择方案</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={
                  plan.highlight
                    ? 'border-primary/40 p-6 shadow-soft-md'
                    : 'p-6'
                }
              >
                {plan.highlight && (
                  <Badge variant="primary" className="mb-3">
                    <Sparkles className="h-3 w-3" />
                    推荐
                  </Badge>
                )}
                <h3 className="text-xl font-semibold tracking-tight">{plan.name}</h3>
                <div className="mt-1 text-sm text-muted-foreground">{plan.desc}</div>
                <div className="mt-4 text-2xl font-semibold tracking-tight">{plan.price}</div>
                <ul className="mt-5 space-y-2.5">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-success" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6 w-full"
                  variant={plan.highlight ? 'primary' : 'outline'}
                >
                  {plan.cta}
                </Button>
              </Card>
            ))}
          </div>
        </section>

        {/* 底部说明 */}
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Enterprise 方案当前为静态展示，未接入后端销售流程。
            如需了解更多，请通过工作台反馈渠道联系团队。
          </p>
        </Card>
      </div>
    </AppShell>
  )
}
