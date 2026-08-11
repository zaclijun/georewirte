import { Navigate, Route, Routes } from 'react-router-dom'
import {
  ProjectListPage,
  ProjectOverviewPage,
  BrandFactsPage,
  NewRewritePage,
  RewriteResultPage,
  MultiPlatformResultPage,
  HistoryPage,
  EnterprisePage,
  InboxPage,
} from '@/pages'
import { getLastActiveProjectId } from '@/lib/projectContext'
import { ThemeProvider } from '@/context/ThemeProvider'
import { SettingsDialogProvider } from '@/context/SettingsDialogContext'
import { SettingsDialog } from '@/components/settings/SettingsDialog'

/**
 * LandingRedirect - 应用入口的智能跳转
 *
 * - 若 localStorage 中存在 lastActiveProjectId，自动跳到上一次工作的项目概览页
 * - 否则跳到项目列表（工作台）
 */
function LandingRedirect() {
  const lastId = getLastActiveProjectId()
  if (lastId) return <Navigate to={`/projects/${lastId}`} replace />
  return <Navigate to="/projects" replace />
}

/**
 * 路由表 - Workspace Launcher + Workspace Mode
 *
 * - /                                      智能跳转（记忆 lastActiveProjectId）
 * - /projects                              工作台（Workspace Launcher）
 * - /projects/:projectId                   工作区首页（Workspace Home）
 * - /projects/:projectId/facts             知识库（动态命名）
 * - /projects/:projectId/inbox             素材库（P0 占位页）
 * - /projects/:projectId/rewrite/new       内容优化（生成多平台内容包）
 * - /tasks/:taskId/result                  改写结果页
 * - /multi-platform-result                 多平台内容包结果页
 * - /history                               历史任务页
 * - /enterprise                            Enterprise 静态销售页
 */
export function App() {
  return (
    <ThemeProvider>
      <SettingsDialogProvider>
        <Routes>
          <Route path="/" element={<LandingRedirect />} />
          <Route path="/projects" element={<ProjectListPage />} />
          <Route path="/projects/:projectId" element={<ProjectOverviewPage />} />
          <Route path="/projects/:projectId/facts" element={<BrandFactsPage />} />
          <Route path="/projects/:projectId/inbox" element={<InboxPage />} />
          <Route path="/projects/:projectId/rewrite/new" element={<NewRewritePage />} />
          <Route path="/tasks/:taskId/result" element={<RewriteResultPage />} />
          <Route path="/multi-platform-result" element={<MultiPlatformResultPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/enterprise" element={<EnterprisePage />} />
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
        {/* 设置中心弹窗（占位：外观 / 模型 / 关于项目 Tab 由其他 Agent 实现） */}
        <SettingsDialog />
      </SettingsDialogProvider>
    </ThemeProvider>
  )
}
