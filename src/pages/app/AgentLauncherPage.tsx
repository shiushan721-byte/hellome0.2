import { Navigate, useLocation, useParams } from 'react-router-dom';
import { getAgentById } from '../../data/agentsCatalog';
import { getAgentWorkbenchPath, isAgentWorkbenchReady } from '../../lib/agentWorkbench';
import AgentComingSoonPage from './AgentComingSoonPage';

/** /app/agents/:agentId — 从市场或工作台标签进入智能体 */
export default function AgentLauncherPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const location = useLocation();
  if (!agentId) return <Navigate to="/app/agents" replace />;

  const agent = getAgentById(agentId);
  if (!agent?.available) return <Navigate to="/app/agents" replace />;

  if (isAgentWorkbenchReady(agentId)) {
    return <Navigate to={getAgentWorkbenchPath(agentId)} replace state={{ ...location.state, agentId }} />;
  }

  return <AgentComingSoonPage agentId={agentId} />;
}
