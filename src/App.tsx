import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginModalProvider } from './context/LoginModalProvider';
import HomeRedirect from './pages/HomeRedirect';
import PublicAgentsPage from './pages/PublicAgentsPage';
import PublicAgentDetailPage from './pages/PublicAgentDetailPage';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/app/AppShell';
import AppHomePage from './pages/app/AppHomePage';
import AgentsPage from './pages/app/AgentsPage';
import AgentsLegacyRedirect from './pages/app/AgentsLegacyRedirect';
import GeoAgentPage from './pages/app/GeoAgentPage';
import AgentComingSoonPage from './pages/app/AgentComingSoonPage';
import AgentLauncherPage from './pages/app/AgentLauncherPage';
import UgcVideoAgentPage from './pages/app/UgcVideoAgentPage';
import AgentChatCanvasPage from './pages/app/AgentChatCanvasPage';
import ProjectsPage from './pages/app/ProjectsPage';
import TasksPage from './pages/app/TasksPage';
import TaskRunPage from './pages/app/TaskRunPage';
import UsagePage from './pages/app/UsagePage';
import UsageRechargePage from './pages/app/UsageRechargePage';
import SettingsPage from './pages/app/SettingsPage';
import SettingsAuthPage from './pages/app/SettingsAuthPage';
import ResultsPage from './pages/app/ResultsPage';
import ConnectHermesPage from './pages/ConnectHermesPage';
import AdminProtectedRoute from './components/admin/AdminProtectedRoute';
import AdminShell from './components/admin/AdminShell';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminTasksPage from './pages/admin/AdminTasksPage';
import AdminResultsPage from './pages/admin/AdminResultsPage';
import AdminFrontendPage from './pages/admin/AdminFrontendPage';
import AdminHomeConfigPage from './pages/admin/AdminHomeConfigPage';
import AdminWorkflowsPage from './pages/admin/AdminWorkflowsPage';
import AdminIntegrationsPage from './pages/admin/AdminIntegrationsPage';
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage';
import AdminSkillsPage from './pages/admin/AdminSkillsPage';
import MarketingPage from './pages/MarketingPage';
import RouteSeo from './components/RouteSeo';

export default function App() {
  return (
    <LoginModalProvider>
      <RouteSeo />
      <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={null} />
      <Route path="/welcome" element={<MarketingPage />} />
      <Route path="/agents" element={<PublicAgentsPage />} />
      <Route path="/agents/:agentId" element={<PublicAgentDetailPage />} />
      <Route
        path="/connect-hermes"
        element={
          <ProtectedRoute>
            <ConnectHermesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<AppHomePage />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="agents/market" element={<Navigate to="/app/agents" replace />} />
        <Route path="agents/mine" element={<Navigate to="/app/agents" replace />} />
        <Route path="agents/geo" element={<GeoAgentPage />} />
        <Route path="agents/media" element={<AgentChatCanvasPage />} />
        <Route path="agents/media-seeding" element={<AgentChatCanvasPage />} />
        <Route path="agents/media-review" element={<AgentChatCanvasPage />} />
        <Route path="agents/media-conversion" element={<AgentChatCanvasPage />} />
        <Route path="agents/media-showcase" element={<AgentChatCanvasPage />} />
        <Route path="agents/media-demo" element={<AgentChatCanvasPage />} />
        <Route path="agents/media-proposal" element={<AgentChatCanvasPage />} />
        
        {/* 保留老版交互入口 */}
        <Route path="agents/media-legacy" element={<UgcVideoAgentPage />} />
        
        <Route path="agents/sales" element={<AgentComingSoonPage agentId="sales" />} />
        <Route path="agents/:agentId" element={<AgentLauncherPage />} />
        <Route path="agents-legacy" element={<AgentsLegacyRedirect />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="tasks/:id" element={<TaskRunPage />} />
        <Route path="results" element={<ResultsPage />} />
        <Route path="usage" element={<UsagePage />} />
        <Route path="usage/recharge" element={<UsageRechargePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/profile" element={<Navigate to="/app/settings" replace />} />
        <Route path="settings/auth" element={<SettingsAuthPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <AdminProtectedRoute>
            <AdminShell />
          </AdminProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="users/:id" element={<AdminUserDetailPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="tasks" element={<AdminTasksPage />} />
        <Route path="results" element={<AdminResultsPage />} />
        <Route path="frontend" element={<Navigate to="/admin/frontend/home" replace />} />
        <Route path="frontend/home" element={<AdminHomeConfigPage />} />
        <Route path="frontend/generic" element={<AdminFrontendPage />} />
        <Route path="workflows" element={<AdminWorkflowsPage />} />
        <Route path="integrations" element={<AdminIntegrationsPage />} />
        <Route path="audit-logs" element={<AdminAuditLogsPage />} />
        <Route path="skills" element={<AdminSkillsPage />} />
        <Route path="skills/new" element={<AdminSkillsPage initialDrawer="create" />} />
        <Route path="skills/:skillId" element={<AdminSkillsPage initialDrawer="detail" />} />
      </Route>

      <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </LoginModalProvider>
  );
}
