import type { AgentChatConfig, ChatStep } from '../types/agentChatConfig';

const commonInitialSteps: ChatStep[] = [
  {
    id: 'referenceUrl',
    type: 'url',
    question: '你是否有参考的对标视频？如果有，请直接粘贴视频链接（点击下方跳过则不填）',
    placeholder: '例如：https://v.douyin.com/...',
    required: false,
  },
  {
    id: 'productAsset',
    type: 'upload',
    question: '如果没有链接，你也可以直接上传参考视频的本地文件，或者是产品的核心主图。',
    hint: '支持图片或视频，这能极大提升成片质量。',
    accept: 'image/*,video/*',
    maxSizeMb: 50,
    required: true,
  }
];

export const VIDEO_AGENT_CHAT_CONFIGS: AgentChatConfig[] = [
  // 1. 新品种草样片 (media-seeding)
  {
    id: 'media-seeding',
    name: '新品种草样片',
    icon: '🛍️',
    description: '把真实使用感做成更容易传播的短视频表达，适合新品首发、小品牌传播。',
    tags: ['种草', '新品首发', '抖音分发'],
    welcomeMessage: '你好！我是负责新品种草的专员。很多客户做视频第一步都是参考别人的好视频，为了让你省心，我们将基于对标来快速启动：',
    steps: [
      ...commonInitialSteps,
      {
        id: 'businessType',
        type: 'select',
        question: '好的，为了让最终生成的成片更符合你的要求，请快速确认以下几个方向：\n\n你的产品所属的行业或品牌类型是什么？',
        options: ['护肤品牌', '咖啡店', '服饰店', '生活方式品牌', '其他'],
        required: true,
      },
      {
        id: 'campaignFocus',
        type: 'select',
        question: '这次种草视频的主打重点是什么？',
        options: ['新品上新', '爆款推荐', '夏日/节日专题', '精美礼盒种草'],
        required: true,
      },
      {
        id: 'messageFocus',
        type: 'select',
        question: '视频里，你最希望让观众记住的核心信息是？',
        options: ['真实使用感', '高颜值包装', '送礼体面', '轻松入门容易上手'],
        required: true,
      },
      {
        id: 'extraNotes',
        type: 'text',
        question: '有没有其他需要补充的风格偏好或者必须露出的口播词？',
        placeholder: '例如：必须出现“闭眼入”的口播...',
        maxLength: 200,
        required: false,
      }
    ],
    canvas: {
      resultType: 'video',
      resultTitle: '新品种草最终成片',
      resultDescription: '结合您提供的对标与参数，我们为您生成的专属短视频。',
      stages: [
        { id: 'analyze', label: '提炼核心种草点', description: '解析您的对标素材与业务参数...', durationMs: 2000 },
        { id: 'script', label: '匹配分发文案结构', description: '基于真实使用感的表达结构构建...', durationMs: 3000 },
        { id: 'render', label: '素材重组与渲染', description: '正在将素材进行影像化渲染处理...', durationMs: 4000 }
      ]
    }
  },

  // 2. 测评讲解样片 (media-review)
  {
    id: 'media-review',
    name: '测评讲解样片',
    icon: '🎤',
    description: '把真实体验讲得更容易被看懂和相信，适合讲效果、讲理由和建立使用信任感。',
    tags: ['测评', '产品体验', '视频号分发'],
    welcomeMessage: '你好！我是测评讲解视频专员。为了帮你制作让人信服的讲解样片，你可以直接提供一个优秀的对标视频给我参考：',
    steps: [
      ...commonInitialSteps,
      {
        id: 'productCategory',
        type: 'select',
        question: '收到素材！为了准确提炼卖点，本次要测评的产品是什么类型？',
        options: ['护肤产品', '家电设备', '办公工具', '食品饮品', '其他'],
        required: true,
      },
      {
        id: 'reviewFocus',
        type: 'select',
        question: '测评视频里主要围绕什么进行讲解？',
        options: ['开箱与使用体验', '核心功能解析', '同类对比优势', '购买建议与避坑'],
        required: true,
      },
      {
        id: 'trustPoint',
        type: 'select',
        question: '你希望向观众建立哪种类型的信任感？',
        options: ['更真实生动', '更专业硬核', '通俗易懂', '纯素人亲测总结'],
        required: true,
      }
    ],
    canvas: {
      resultType: 'video',
      resultTitle: '测评讲解最终成片',
      resultDescription: '基于对标视频结构和您的体验逻辑生成的评测成片。',
      stages: [
        { id: 'structure', label: '建立讲解结构', description: '分析对标品类与讲解切入点...', durationMs: 2000 },
        { id: 'script', label: '设计测评话术', description: '强化信任感与专业背书...', durationMs: 3000 },
        { id: 'render', label: '视听渲染', description: '合成最终画面与解说配音...', durationMs: 4000 }
      ]
    }
  },

  // 3. 带货转化样片 (media-conversion)
  {
    id: 'media-conversion',
    name: '带货转化样片',
    icon: '💰',
    description: '把卖点和行动引导压缩进更短的节奏里，更适合活动转化、限时优惠。',
    tags: ['带货', '直接转化', '抖音电商'],
    welcomeMessage: '你好！我是专注转化和带货的视频专员。想要高转化，直接参考爆款往往是最稳妥的。请提供参考素材：',
    steps: [
      ...commonInitialSteps,
      {
        id: 'productType',
        type: 'select',
        question: '好的，请快速确认一下这波带货的商品类型是？',
        options: ['日用百货', '零食饮品', '护肤彩妆', '服饰配件', '其他'],
        required: true,
      },
      {
        id: 'promotionType',
        type: 'select',
        question: '这波最大的“成交理由”或者利益点是什么？',
        options: ['直接降价/活动价', '新品全网首发', '秒杀/限时优惠', '超值组合套餐'],
        required: true,
      },
      {
        id: 'ctaFocus',
        type: 'select',
        question: '最后更想推动用户完成什么动作 (CTA)？',
        options: ['小黄车立即下单', '先领券再加购', '进直播间咨询', '加购收藏'],
        required: true,
      }
    ],
    canvas: {
      resultType: 'video',
      resultTitle: '转化带货最终成片',
      resultDescription: '融入了爆款节奏与强转化口令的极速带货成片。',
      stages: [
        { id: 'hook', label: '设计黄金三秒', description: '提炼利益点作为对标视频开头...', durationMs: 2500 },
        { id: 'offer', label: '排布成交逻辑', description: '组织 CTA 话术与活动氛围...', durationMs: 2500 },
        { id: 'render', label: '最终合成', description: '带货节奏视听化合成输出中...', durationMs: 3000 }
      ]
    }
  },

  // 4. 品牌宣传样片 (media-showcase)
  {
    id: 'media-showcase',
    name: '品牌宣传样片',
    icon: '🏪',
    description: '把真实门店氛围做成更容易传播的品牌视频，适合空间展示、品牌露出。',
    tags: ['品牌', '氛围感', '门店宣传'],
    welcomeMessage: '你好！我是品牌宣传视频专员。看到别人的质感短片想拥有同款？直接发我看看！',
    steps: [
      ...commonInitialSteps,
      {
        id: 'storeType',
        type: 'select',
        question: '感谢提供素材。为了精准捕捉氛围，您的线下门店或品牌类型是？',
        options: ['独立咖啡店', '手作烘焙店', '独立服饰品牌/买手店', '美甲/美发沙龙', '其他'],
        required: true,
      },
      {
        id: 'campaignStage',
        type: 'select',
        question: '本次宣传片的核心节点是什么？',
        options: ['新店开业预热', '换季/新品上新', '主推爆款氛围展示', '日常调性传播'],
        required: true,
      },
      {
        id: 'brandFocus',
        type: 'select',
        question: '这次更想在视频里向用户强调什么？',
        options: ['空间设计与氛围感', '给用户一个到店理由', '服务/产品特写细节', '整体品牌气质与文化'],
        required: true,
      }
    ],
    canvas: {
      resultType: 'video',
      resultTitle: '品牌宣传最终成片',
      resultDescription: '展现独特门店美学与品牌调性的质感宣传片交付件。',
      stages: [
        { id: 'vibe', label: '调性解析与美学映射', description: '提取对标色彩与您的空间元素...', durationMs: 2500 },
        { id: 'story', label: '镜头语言排版', description: '慢节奏与高级感氛围组合...', durationMs: 2500 },
        { id: 'render', label: '生成宣传样片', description: '画面合成与调色渲染中...', durationMs: 4000 }
      ]
    }
  },

  // 5. 产品演示样片 (media-demo)
  {
    id: 'media-demo',
    name: '产品演示样片',
    icon: '💻',
    description: '把复杂功能压缩成客户更容易理解的演示视频，适合项目沟通、软件演示。',
    tags: ['产品演示', '效率沟通', '功能解析'],
    welcomeMessage: '你好！我是产品演示专员。为了让你更快拿到心仪的演示短片，第一步可以先分享一个你喜欢的演示视频：',
    steps: [
      ...commonInitialSteps,
      {
        id: 'demoType',
        type: 'select',
        question: '好的，基于你的对标，我们再确认下：你演示的对象是什么类型？',
        options: ['硬件：流水线/生产设备', '硬件：家用电器', '软件：SaaS 系统/App', '业务服务流程', '其他'],
        required: true,
      },
      {
        id: 'demoGoal',
        type: 'select',
        question: '本次演示的“核心重点”是什么？',
        options: ['展示完整的核心操作流程', '强调使用后效率的提升', '讲解一个具体界面的操作方式', '展示多场景下的灵活应用'],
        required: true,
      },
      {
        id: 'viewerNeed',
        type: 'select',
        question: '你希望客户看完演示后，最大的感受是？',
        options: ['专业靠谱，值得信赖', '一目了然，通俗易懂', '有理有据，具备极强可行性', '非常适合用来直接去提案'],
        required: true,
      }
    ],
    canvas: {
      resultType: 'video',
      resultTitle: '产品演示最终成片',
      resultDescription: '清晰直观且重点突出的产品操作与功能演示短片。',
      stages: [
        { id: 'logic', label: '梳理演示逻辑', description: '对齐对标逻辑并明确视觉重点...', durationMs: 2000 },
        { id: 'ui', label: '界面与动效排布', description: '组织屏幕画面与光标引导...', durationMs: 3000 },
        { id: 'render', label: '渲染输出', description: '最终演示成片输出中...', durationMs: 3500 }
      ]
    }
  },

  // 6. 提案展示样片 (media-proposal)
  {
    id: 'media-proposal',
    name: '提案展示样片',
    icon: '🤝',
    description: '把方案方向变成客户更容易感知的提案视频，适合方案演示、方向汇报。',
    tags: ['提案方案', '效果预期', '客户沟通'],
    welcomeMessage: '你好！我是专门服务乙方和提案环节的视频专员。为了提升提案胜率，咱们可以先模仿优秀案例。你有对标参考吗？',
    steps: [
      ...commonInitialSteps,
      {
        id: 'proposalClient',
        type: 'select',
        question: '收到！我们接着快速对齐几个提案参数：这次你要向什么类型的客户进行提案？',
        options: ['本地生活/实体门店', '消费品品牌/快消', '大型商业空间/地产', '线上线下活动项目方', '其他'],
        required: true,
      },
      {
        id: 'proposalTheme',
        type: 'select',
        question: '这次提案的核心命题是什么？',
        options: ['空间改造升级', '社媒内容营销方向', '线下活动公关推广', '品牌视觉体系焕新'],
        required: true,
      },
      {
        id: 'proposalValue',
        type: 'select',
        question: '在提案视频中，你更想给客户传递怎样的价值预期？',
        options: ['身临其境的落地效果', '品牌气质的显著拉升', '在社交媒体上的病毒传播力', '稳健扎实的执行可行性'],
        required: true,
      }
    ],
    canvas: {
      resultType: 'video',
      resultTitle: '客户提案最终成片',
      resultDescription: '专为提升提案胜率打造的视觉预期动态呈现，已落地。',
      stages: [
        { id: 'concept', label: '方案概念提取', description: '结合对标分析核心提案观点...', durationMs: 2000 },
        { id: 'board', label: '动态情绪板设计', description: '生成提案过渡页与效果展示...', durationMs: 3000 },
        { id: 'render', label: '提案样片渲染', description: '合成最新提案文件输出中...', durationMs: 4000 }
      ]
    }
  }
];
