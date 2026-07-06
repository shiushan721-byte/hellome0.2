export type ResumeGoal = 'full' | 'diagnosis' | 'rewrite' | 'outreach' | 'interview';
export type ResumeMode = 'has_resume' | 'no_resume';

export type ResumeDraft = {
  mode: ResumeMode;
  resumeText: string;
  resumeFileName: string;
  studentName: string;
  phone: string;
  email: string;
  school: string;
  degree: string;
  major: string;
  enrollmentDate: string;
  graduationDate: string;
  gpa: string;
  city: string;
  jobStatus: string;
  expectedSalary: string;
  internshipDays: string;
  internshipDuration: string;
  courses: string;
  skills: string;
  internshipExperience: string;
  projectExperience: string;
  campusExperience: string;
  certificates: string;
  jdText: string;
  jdImageName: string;
  targetRole: string;
  studentStage: string;
  companyType: string;
  goal: ResumeGoal;
  tone: string;
  question: string;
  notes: string;
};

export type ResumeResult = {
  score: number;
  match: string;
  targetRole: string;
  summary: string;
  strengths: string[];
  risks: string[];
  missingKeywords: string[];
  rewrites: Array<{ original: string; issue: string; improved: string }>;
  finalResume: string;
  outreach: Array<{ title: string; content: string }>;
  interview: Array<{ question: string; focus: string; answer: string; spoken: string }>;
};

export type ResumeDiagnosisResponse = {
  taskId: string;
  skillId: 'resume.diagnosis';
  result: ResumeResult;
  reportDocument: string;
  hermesPayload: {
    skillId: 'resume.diagnosis';
    version: 1;
    input: ResumeDraft;
    requestedOutputs: string[];
  };
};
