import type { ResumeDraft, ResumeResult } from '../types/resume';

export function buildCanvasSkillDocument(id: 'diagnosis' | 'resume' | 'outreach' | 'interview', result: ResumeResult): string {
  if (id === 'diagnosis') return buildDiagnosisDocument(result);
  if (id === 'resume') return result.finalResume;
  if (id === 'outreach') return buildOutreachDocument(result);
  return buildInterviewDocument(result);
}

export function buildDiagnosisDocument(result: ResumeResult): string {
  return [
    `# ${result.targetRole}简历诊断报告`,
    '',
    `简历竞争力：${result.score}/100`,
    `岗位匹配度：${result.match}`,
    `建议结论：${result.score >= 78 ? '可以投递' : '修改后投递'}`,
    '',
    '## 结论摘要',
    result.summary,
    '',
    '## 优势点',
    ...result.strengths.map((item) => `- ${item}`),
    '',
    '## 风险点',
    ...result.risks.map((item) => `- ${item}`),
    '',
    '## 需要补充的岗位关键词',
    result.missingKeywords.length ? result.missingKeywords.map((item) => `- ${item}`).join('\n') : '- 暂无明显缺失关键词',
  ].join('\n');
}

export function buildOutreachDocument(result: ResumeResult): string {
  return [
    '# 投递话术',
    '',
    ...result.outreach.flatMap((item) => [
      `## ${item.title}`,
      item.content,
      '',
    ]),
  ].join('\n').trim();
}

export function buildInterviewDocument(result: ResumeResult): string {
  return [
    '# 面试准备',
    '',
    ...result.interview.flatMap((item, index) => [
      `## 问题 ${index + 1}：${item.question}`,
      `考察点：${item.focus}`,
      '',
      '### 结构化回答',
      item.answer,
      '',
      '### 口语化表达',
      item.spoken,
      '',
    ]),
  ].join('\n').trim();
}

export function buildResumeResult(draft: ResumeDraft): ResumeResult {
  const jd = `${draft.jdText}\n${draft.jdImageName}`;
  const resume = [
    draft.resumeText || draft.resumeFileName,
    draft.school,
    draft.degree,
    draft.major,
    draft.enrollmentDate,
    draft.graduationDate,
    draft.gpa,
    draft.courses,
    draft.internshipExperience,
    draft.projectExperience,
    draft.campusExperience,
    draft.skills,
    draft.certificates,
  ].join('\n');
  const hasData = /数据|增长|转化|阅读|用户|DAU|GMV|SQL|Python|分析|A\/B/i.test(`${jd}\n${resume}`);
  const hasProject = /项目|社团|实习|课程|活动|作品|比赛/.test(resume);
  const score = Math.min(92, 62 + (hasData ? 12 : 0) + (hasProject ? 10 : 0) + (draft.notes ? 4 : 0));
  const roleKeyword = draft.targetRole.replace('实习', '');
  const missingKeywords = Array.from(new Set([roleKeyword, '数据复盘', '用户需求', '结果量化', '跨团队沟通'].filter((item) => !resume.includes(item))));

  return {
    score,
    match: score >= 82 ? '高' : score >= 72 ? '中等偏上' : '中等',
    targetRole: draft.targetRole,
    summary: draft.mode === 'no_resume'
      ? `已根据你的学校、专业、课程和校园经历生成第一版「${draft.targetRole}」简历。${draft.jdImageName ? `本次已读取岗位截图「${draft.jdImageName}」作为 JD 来源。` : ''}建议继续补充具体项目数据、作品链接和课程成果，让简历更像可以直接投递的版本。`
      : `你的简历与「${draft.targetRole}」岗位已经具备基础匹配度，适合以学生项目、校园经历和可量化结果作为主线。${draft.jdImageName ? `本次已读取岗位截图「${draft.jdImageName}」作为 JD 来源。` : ''}当前最需要补强的是岗位关键词、结果数据和经历表达的动作链路。建议先修改 2-3 段核心经历，再用口语化版本准备面试。`,
    strengths: [
      `目标岗位清晰，适合围绕「${roleKeyword}能力」重排经历顺序。`,
      hasProject ? '简历中已有可转化为岗位能力的项目或校园经历。' : '已将课程作业、主修课程和校园经历转化为岗位案例。',
      `回答风格选择为「${draft.tone}」，适合学生实习面试。`,
    ],
    risks: [
      '部分经历如果只写“负责、参与、协助”，会显得贡献不清楚。',
      '岗位 JD 中的能力词需要更自然地出现在项目经历里。',
      '面试回答需要用真实经历支撑，避免空泛表达。',
    ],
    missingKeywords,
    rewrites: [
      {
        original: '负责公众号运营和活动宣传。',
        issue: '表达过宽，没有动作、对象和结果。',
        improved: `围绕${roleKeyword}岗位要求，独立策划内容选题与发布节奏，结合用户反馈优化标题和转化路径，提升活动曝光与报名效率。`,
      },
      {
        original: '参与课程项目，完成调研和汇报。',
        issue: '没有体现分析方法和个人贡献。',
        improved: `在课程项目中完成用户访谈、竞品拆解和数据整理，输出 12 页分析报告，并将结论转化为可执行的${roleKeyword}优化建议。`,
      },
    ],
    finalResume: buildFinalResumeText(draft, roleKeyword, missingKeywords),
    outreach: [
      {
        title: 'HR 私信',
        content: `您好，我是${draft.studentStage}学生，想投递贵司${draft.targetRole}岗位。我之前有校园项目和内容/用户相关经历，能够快速完成信息整理、执行推进和复盘优化。附件是我的简历，期待有机会进一步沟通，谢谢。`,
      },
      {
        title: '投递邮件',
        content: `您好：\n\n我是${draft.studentStage}学生，正在寻找${draft.targetRole}机会。我关注到岗位 JD 中提到${roleKeyword}、沟通协作和结果复盘能力，这与我过往课程项目和校园实践经历比较匹配。\n\n我已附上简历，期待有机会参与面试，进一步介绍我的经历和对岗位的理解。\n\n谢谢。`,
      },
    ],
    interview: [
      {
        question: draft.question || '你为什么想投这个岗位？',
        focus: '考察你是否理解岗位，以及是否能用个人经历证明匹配。',
        answer: `我想投递${draft.targetRole}，主要是因为我过往经历中一直在做和${roleKeyword}相关的事情。我比较喜欢把一个目标拆成具体动作，再通过反馈和数据不断调整。结合岗位 JD，我认为自己在信息整理、执行推进和复盘表达上有一定基础，也希望在真实业务环境里继续提升。`,
        spoken: `我想投这个岗位，主要是因为我之前做项目和校园活动的时候，发现自己挺喜欢把一个想法真正落地。比如会先整理目标用户和内容方向，再看反馈去调整。所以我觉得${draft.targetRole}比较适合我，它既需要执行力，也需要一点分析和沟通能力。`,
      },
      {
        question: '请介绍一段你最能体现岗位能力的经历。',
        focus: '考察经历真实性、个人贡献和结果表达。',
        answer: `我会选择介绍一个课程或校园项目。在这个项目里，我先明确目标和用户需求，再拆分执行步骤，负责资料整理、方案输出和结果汇报。这个经历能体现我对问题的拆解能力、沟通推进能力，以及把结论转成行动建议的能力。`,
        spoken: `我想讲一个课程项目。当时我们需要在比较短的时间里完成调研和汇报，我主要负责把资料整理成可用结论，再和同学一起做方案。这个过程让我练到了信息整理、沟通和推进，也比较贴近这个岗位的日常工作。`,
      },
    ],
  };
}

function buildFinalResumeText(draft: ResumeDraft, roleKeyword: string, missingKeywords: string[]): string {
  const original = draft.resumeText.trim();
  const nameLine = draft.studentName || original.split('\n').find((line) => line.trim() && line.trim().length <= 18) || '姓名：请补充';
  const contact = [draft.phone, draft.email, draft.city].filter(Boolean).join(' ｜ ');
  const education = [draft.school, draft.degree, draft.major, draft.studentStage].filter(Boolean).join(' ｜ ');
  const educationTime = [draft.enrollmentDate, draft.graduationDate].filter(Boolean).join(' - ');

  if (draft.mode === 'no_resume') {
    return [
      `${nameLine}`,
      contact ? `联系方式：${contact}` : '联系方式：请补充手机 / 邮箱',
      '',
      `求职意向：${draft.targetRole}`,
      `求职状态：${draft.jobStatus}`,
      `期望薪资：${draft.expectedSalary}`,
      `到岗情况：${draft.internshipDays} ｜ ${draft.internshipDuration}`,
      '',
      '教育背景',
      education || '学校 ｜ 专业 ｜ 年级：请补充',
      educationTime ? `时间：${educationTime}` : '时间：请补充入学时间 - 毕业时间',
      draft.gpa ? `成绩：${draft.gpa}` : '',
      draft.courses ? `主修课程：${draft.courses}` : '主修课程：请补充 3-6 门与岗位相关的课程',
      '',
      '实习经历',
      draft.internshipExperience
        ? `${draft.internshipExperience}\n- 提炼岗位相关动作，突出执行、协作和结果复盘能力。`
        : '暂无正式实习经历，可优先突出课程项目、校园经历和作品集。',
      '',
      '项目经历',
      draft.projectExperience
        ? `项目概述：${draft.projectExperience}\n- 围绕${roleKeyword}岗位要求，完成需求梳理、资料收集、方案设计和结果汇报。\n- 将课程/项目成果转化为可执行建议，体现信息整理、沟通推进和复盘能力。`
        : `课程 / 作品项目：请补充\n- 可填写课程大作业、调研报告、竞赛项目、自媒体账号或作品集。\n- 建议描述你负责什么、做了哪些动作、最终产出了什么。`,
      '',
      '校园经历',
      draft.campusExperience
        ? `${draft.campusExperience}\n- 将活动目标拆解为具体执行动作，推动宣传、报名、沟通和复盘环节落地。`
        : '社团 / 学生会 / 班委经历：请补充活动策划、宣传报名、沟通执行等经历。',
      '',
      '技能与证书',
      draft.skills ? `技能工具：${draft.skills}` : '技能工具：Excel / PowerPoint / 飞书文档 / 数据表格 / AI 工具',
      draft.certificates ? `证书奖项：${draft.certificates}` : '证书奖项：四六级、奖学金、比赛、作品链接等可补充',
      '',
      '个人优势',
      `- 具备${roleKeyword}岗位所需的信息整理、执行推进和结构化表达能力。`,
      `- 可围绕岗位关键词继续补强：${missingKeywords.slice(0, 4).join('、') || roleKeyword}。`,
      draft.notes ? `- ${draft.notes}` : '- 有较强学习意愿，愿意在真实业务场景中持续提升。',
    ].join('\n');
  }

  return [
    `${nameLine}`,
    contact ? `联系方式：${contact}` : '',
    education ? `教育背景：${education}` : '',
    '',
    '',
    `求职意向：${draft.targetRole}`,
    `当前身份：${draft.studentStage}`,
    `目标公司类型：${draft.companyType}`,
    '',
    '个人优势',
    `- 具备${roleKeyword}岗位所需的信息整理、执行推进和复盘表达能力。`,
    '- 能够结合用户需求拆解任务，并将结果转化为可执行方案。',
    `- 已根据岗位 JD 补充关键词：${missingKeywords.slice(0, 3).join('、') || roleKeyword}。`,
    '',
    '项目经历',
    `项目一：${roleKeyword}相关课程 / 校园项目`,
    `- 围绕${roleKeyword}岗位要求，完成需求梳理、资料收集、方案设计和结果汇报。`,
    '- 在项目中承担信息整理与推进角色，将分散资料沉淀为结构化结论，提高团队协作效率。',
    `- 结合用户反馈和数据复盘，输出可执行的${roleKeyword}优化建议。`,
    '',
    '校园经历',
    '- 参与校园活动策划与执行，负责内容整理、沟通协调和结果复盘。',
    '- 将活动目标拆解为具体执行动作，推动宣传、报名、反馈收集等环节落地。',
    '',
    '技能能力',
    `- 岗位理解：${roleKeyword}、用户需求、数据复盘、跨团队沟通`,
    '- 工具能力：Office / 飞书文档 / 数据表格 / 基础 AI 工具',
    '- 表达能力：结构化汇报、面试表达、文字整理',
    '',
    '补充说明',
    draft.notes || '可根据目标岗位继续补充专业课程、比赛经历、作品链接或实习经历。',
  ].join('\n');
}
