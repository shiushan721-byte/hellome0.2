import { VIDEO_AGENT_IDS } from '../config/videoAgentProfiles';

/** 已上线完整工作台的智能体 */
const READY_WORKBENCH_AGENT_IDS = new Set<string>([
  'geo',
  'internship-resume',
  'internship-job-match',
  'computer-speed',
  ...VIDEO_AGENT_IDS,
]);

export function isAgentWorkbenchReady(agentId: string): boolean {
  return READY_WORKBENCH_AGENT_IDS.has(agentId);
}

export function getAgentWorkbenchPath(agentId: string): string {
  return `/app/agents/${agentId}`;
}
