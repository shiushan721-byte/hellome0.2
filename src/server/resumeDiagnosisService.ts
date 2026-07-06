import { buildDiagnosisDocument, buildResumeResult } from '../lib/resumeReport';
import type { ResumeDiagnosisResponse, ResumeDraft } from '../types/resume';

function validateResumeDraft(draft: ResumeDraft): string | null {
  if (draft.mode === 'has_resume' && !draft.resumeText.trim() && !draft.resumeFileName.trim()) {
    return '请先上传简历，或粘贴简历内容。';
  }

  if (
    draft.mode === 'no_resume' &&
    !draft.school.trim() &&
    !draft.major.trim() &&
    !draft.enrollmentDate.trim() &&
    !draft.graduationDate.trim() &&
    !draft.courses.trim() &&
    !draft.internshipExperience.trim() &&
    !draft.projectExperience.trim() &&
    !draft.campusExperience.trim()
  ) {
    return '还没有简历时，请至少填写学校、专业、课程、项目或校园经历中的一项。';
  }

  if (!draft.jdText.trim() && !draft.jdImageName.trim()) {
    return '请粘贴岗位 JD，或上传岗位截图。';
  }

  return null;
}

export function createResumeDiagnosisTask(input: ResumeDraft): ResumeDiagnosisResponse {
  const validationError = validateResumeDraft(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const result = buildResumeResult(input);
  return {
    taskId: `resume-${Date.now()}`,
    skillId: 'resume.diagnosis',
    result,
    reportDocument: buildDiagnosisDocument(result),
    hermesPayload: {
      skillId: 'resume.diagnosis',
      version: 1,
      input,
      requestedOutputs: [
        'resume_competitiveness_score',
        'job_match_level',
        'strengths',
        'risks',
        'missing_keywords',
        'next_step_rewrite_brief',
      ],
    },
  };
}
