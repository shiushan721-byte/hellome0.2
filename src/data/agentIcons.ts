import geoIcon from '../../assets/generated/agents/geo.png';
import mediaIcon from '../../assets/generated/agents/media.png';
import salesIcon from '../../assets/generated/agents/sales.png';
import schemaOptimizerIcon from '../../assets/generated/agents/schema-optimizer.png';
import competitorScanIcon from '../../assets/generated/agents/competitor-scan.png';
import hermesReportIcon from '../../assets/generated/agents/hermes-report.png';
import faqGeneratorIcon from '../../assets/generated/agents/faq-generator.png';
import pptOutlineIcon from '../../assets/generated/agents/ppt-outline.png';
import outreachMailIcon from '../../assets/generated/agents/outreach-mail.png';
import copyAuditIcon from '../../assets/generated/agents/copy-audit.png';
import sovTrackerIcon from '../../assets/generated/agents/sov-tracker.png';
import promptLabIcon from '../../assets/generated/agents/prompt-lab.png';

export const AGENT_ICONS: Record<string, string> = {
  geo: geoIcon,
  media: mediaIcon,
  'media-seeding': mediaIcon,
  'media-review': mediaIcon,
  'media-conversion': mediaIcon,
  'media-showcase': mediaIcon,
  'media-demo': mediaIcon,
  'media-proposal': mediaIcon,
  sales: salesIcon,
  'schema-optimizer': schemaOptimizerIcon,
  'competitor-scan': competitorScanIcon,
  'hermes-report': hermesReportIcon,
  'faq-generator': faqGeneratorIcon,
  'ppt-outline': pptOutlineIcon,
  'outreach-mail': outreachMailIcon,
  'internship-resume': outreachMailIcon,
  'internship-job-match': outreachMailIcon,
  'computer-speed': promptLabIcon,
  'copy-audit': copyAuditIcon,
  'sov-tracker': sovTrackerIcon,
  'prompt-lab': promptLabIcon,
};

export function getAgentIconSrc(id: string): string | undefined {
  return AGENT_ICONS[id];
}
