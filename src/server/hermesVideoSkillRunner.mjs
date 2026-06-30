/**
 * hermesVideoSkillRunner — 本地 Hermes 视频 skill 执行器
 *
 * 设计原则:
 *   - skill-silent-callable: spawn 子进程,JSON in / JSON out,exit code 映射错误
 *   - 不依赖 Python:用 Node 直接实现,避免本地 venv 复杂度
 *   - 9 个 skill 的 schema 内置在 TS 里,作为本地 "Hermes skill" 的可信实现
 *   - 真正接 video-hermes-bundle 时,把 9 段 schema 抽到 ~/.hermes/skills/video/ 即可
 *
 * 调用模式:
 *   $ node hermesVideoSkillRunner.mjs --skill media-seeding --mode get-schema --json
 *   → { status: 'ok', schema: {...} }
 *
 * v1:2026-06-30 - 配合 hellome-new 后端两阶段改造
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCRIPT_PATH = path.join(__dirname, 'hermesVideoSkillRunner.mjs');

/**
 * 9 个 skill 的 schema 定义 (本地 Hermes skill 的 source of truth)
 * 与 src/config/videoAgentChatConfigs.ts 一一对应,但前端是降级 fallback
 */
export const SKILL_SCHEMAS = {
  'media-seeding': {
    schemaVersion: 1,
    skillId: 'media-seeding',
    title: '新品种草样片',
    description: '把真实使用感做成更容易传播的短视频表达',
    welcomeMessage: '你好!我是新品种草专员。为了让成片更符合你的要求,请快速确认以下几个方向:',
    steps: [
      {
        id: 'referenceUrl',
        type: 'url',
        question: '你是否有参考的对标视频?如果有,请直接粘贴视频链接(点击下方跳过则不填)',
        placeholder: '例如:https://v.douyin.com/...',
        required: false,
      },
      {
        id: 'productAsset',
        type: 'upload',
        question: '如果没有链接,也可以直接上传参考视频或产品主图',
        hint: '支持图片或视频,这能极大提升成片质量',
        accept: 'image/*,video/*',
        maxSizeMb: 50,
        required: true,
      },
      {
        id: 'businessType',
        type: 'select',
        question: '你的产品所属的行业或品牌类型是什么?',
        options: [
          { value: 'skincare', label: '护肤品牌' },
          { value: 'cafe', label: '咖啡店' },
          { value: 'apparel', label: '服饰店' },
          { value: 'lifestyle', label: '生活方式品牌' },
          { value: 'other', label: '其他' },
        ],
        required: true,
      },
      {
        id: 'campaignFocus',
        type: 'select',
        question: '这次种草视频的主打重点是什么?',
        options: [
          { value: 'new-arrival', label: '新品上新' },
          { value: 'bestseller', label: '爆款推荐' },
          { value: 'seasonal', label: '夏日/节日专题' },
          { value: 'gift', label: '精美礼盒种草' },
        ],
        required: true,
      },
      {
        id: 'messageFocus',
        type: 'select',
        question: '你最希望让观众记住的核心信息是?',
        options: [
          { value: 'real-feel', label: '真实使用感' },
          { value: 'packaging', label: '高颜值包装' },
          { value: 'gift-worthy', label: '送礼体面' },
          { value: 'easy-start', label: '轻松入门容易上手' },
        ],
        required: true,
      },
      {
        id: 'extraNotes',
        type: 'textarea',
        question: '有没有其他需要补充的风格偏好或者必须露出的口播词?',
        placeholder: '例如:必须出现"闭眼入"的口播...',
        required: false,
      },
    ],
    canvasStages: [
      { id: 'analyze', label: '提炼核心种草点', description: '解析您的对标素材与业务参数...', estimatedMs: 2000 },
      { id: 'script', label: '匹配分发文案结构', description: '基于真实使用感的表达结构构建...', estimatedMs: 3000 },
      { id: 'render', label: '素材重组与渲染', description: '正在将素材进行影像化渲染处理...', estimatedMs: 4000 },
    ],
  },
  'media-review': {
    schemaVersion: 1,
    skillId: 'media-review',
    title: '测评讲解样片',
    description: '把真实体验讲得更容易被看懂和相信',
    welcomeMessage: '你好!我是测评讲解视频专员。为了帮你制作让人信服的讲解样片:',
    steps: [
      { id: 'referenceUrl', type: 'url', question: '你是否有参考的对标视频?如果有,请直接粘贴视频链接', placeholder: '例如:https://v.douyin.com/...', required: false },
      { id: 'productAsset', type: 'upload', question: '也可以上传参考视频或产品主图', accept: 'image/*,video/*', maxSizeMb: 50, required: true },
      {
        id: 'productCategory', type: 'select',
        question: '本次要测评的产品是什么类型?',
        options: [
          { value: 'skincare', label: '护肤产品' },
          { value: 'appliance', label: '家电设备' },
          { value: 'office', label: '办公工具' },
          { value: 'food', label: '食品饮品' },
          { value: 'other', label: '其他' },
        ],
        required: true,
      },
      {
        id: 'reviewFocus', type: 'select',
        question: '测评视频里主要围绕什么进行讲解?',
        options: [
          { value: 'unboxing', label: '开箱与使用体验' },
          { value: 'features', label: '核心功能解析' },
          { value: 'comparison', label: '同类对比优势' },
          { value: 'advice', label: '购买建议与避坑' },
        ],
        required: true,
      },
      {
        id: 'trustPoint', type: 'select',
        question: '你希望向观众建立哪种类型的信任感?',
        options: [
          { value: 'real', label: '更真实生动' },
          { value: 'expert', label: '更专业硬核' },
          { value: 'plain', label: '通俗易懂' },
          { value: 'amateur', label: '纯素人亲测总结' },
        ],
        required: true,
      },
    ],
    canvasStages: [
      { id: 'structure', label: '建立讲解结构', description: '分析对标品类与讲解切入点...', estimatedMs: 2000 },
      { id: 'script', label: '设计测评话术', description: '强化信任感与专业背书...', estimatedMs: 3000 },
      { id: 'render', label: '视听渲染', description: '合成最终画面与解说配音...', estimatedMs: 4000 },
    ],
  },
  'media-conversion': {
    schemaVersion: 1,
    skillId: 'media-conversion',
    title: '带货转化样片',
    description: '把卖点和行动引导压缩进更短节奏',
    welcomeMessage: '你好!我是专注转化和带货的视频专员。想要高转化,直接参考爆款往往是最稳妥的:',
    steps: [
      { id: 'referenceUrl', type: 'url', question: '你是否有参考的对标视频?', placeholder: 'https://...', required: false },
      { id: 'productAsset', type: 'upload', question: '也可以上传参考视频或产品主图', accept: 'image/*,video/*', maxSizeMb: 50, required: true },
      {
        id: 'productType', type: 'select',
        question: '这波带货的商品类型是?',
        options: [
          { value: 'daily', label: '日用百货' },
          { value: 'snack', label: '零食饮品' },
          { value: 'beauty', label: '护肤彩妆' },
          { value: 'accessory', label: '服饰配件' },
          { value: 'other', label: '其他' },
        ],
        required: true,
      },
      {
        id: 'promotionType', type: 'select',
        question: '这波最大的"成交理由"或利益点是什么?',
        options: [
          { value: 'discount', label: '直接降价/活动价' },
          { value: 'first-release', label: '新品全网首发' },
          { value: 'flash-sale', label: '秒杀/限时优惠' },
          { value: 'bundle', label: '超值组合套餐' },
        ],
        required: true,
      },
      {
        id: 'ctaFocus', type: 'select',
        question: '最后更想推动用户完成什么动作 (CTA)?',
        options: [
          { value: 'cart', label: '小黄车立即下单' },
          { value: 'coupon', label: '先领券再加购' },
          { value: 'live', label: '进直播间咨询' },
          { value: 'favorite', label: '加购收藏' },
        ],
        required: true,
      },
    ],
    canvasStages: [
      { id: 'hook', label: '设计黄金三秒', description: '提炼利益点作为视频开头...', estimatedMs: 2500 },
      { id: 'offer', label: '排布成交逻辑', description: '组织 CTA 话术与活动氛围...', estimatedMs: 2500 },
      { id: 'render', label: '最终合成', description: '带货节奏视听化合成输出中...', estimatedMs: 3000 },
    ],
  },
  'media-showcase': {
    schemaVersion: 1,
    skillId: 'media-showcase',
    title: '品牌宣传样片',
    description: '把真实门店氛围做成更容易传播的品牌视频',
    welcomeMessage: '你好!我是品牌宣传视频专员。看到别人的质感短片想拥有同款?直接发我看看!',
    steps: [
      { id: 'referenceUrl', type: 'url', question: '你是否有参考的对标视频?', placeholder: 'https://...', required: false },
      { id: 'productAsset', type: 'upload', question: '也可以上传参考视频或产品主图', accept: 'image/*,video/*', maxSizeMb: 50, required: true },
      {
        id: 'storeType', type: 'select',
        question: '您的线下门店或品牌类型是?',
        options: [
          { value: 'cafe', label: '独立咖啡店' },
          { value: 'bakery', label: '手作烘焙店' },
          { value: 'apparel', label: '独立服饰品牌/买手店' },
          { value: 'salon', label: '美甲/美发沙龙' },
          { value: 'other', label: '其他' },
        ],
        required: true,
      },
      {
        id: 'campaignStage', type: 'select',
        question: '本次宣传片的核心节点是什么?',
        options: [
          { value: 'opening', label: '新店开业预热' },
          { value: 'seasonal', label: '换季/新品上新' },
          { value: 'bestseller', label: '主推爆款氛围展示' },
          { value: 'daily', label: '日常调性传播' },
        ],
        required: true,
      },
      {
        id: 'brandFocus', type: 'select',
        question: '这次更想在视频里向用户强调什么?',
        options: [
          { value: 'space', label: '空间设计与氛围感' },
          { value: 'reason', label: '给用户一个到店理由' },
          { value: 'detail', label: '服务/产品特写细节' },
          { value: 'culture', label: '整体品牌气质与文化' },
        ],
        required: true,
      },
    ],
    canvasStages: [
      { id: 'vibe', label: '调性解析与美学映射', description: '提取对标色彩与您的空间元素...', estimatedMs: 2500 },
      { id: 'story', label: '镜头语言排版', description: '慢节奏与高级感氛围组合...', estimatedMs: 2500 },
      { id: 'render', label: '生成宣传样片', description: '画面合成与调色渲染中...', estimatedMs: 4000 },
    ],
  },
  'media-demo': {
    schemaVersion: 1,
    skillId: 'media-demo',
    title: '产品演示样片',
    description: '把复杂功能压缩成客户更容易理解的演示视频',
    welcomeMessage: '你好!我是产品演示专员。第一步可以先分享一个你喜欢的演示视频:',
    steps: [
      { id: 'referenceUrl', type: 'url', question: '你是否有参考的对标视频?', placeholder: 'https://...', required: false },
      { id: 'productAsset', type: 'upload', question: '也可以上传参考视频或产品主图', accept: 'image/*,video/*', maxSizeMb: 50, required: true },
      {
        id: 'demoType', type: 'select',
        question: '你演示的对象是什么类型?',
        options: [
          { value: 'hardware-industrial', label: '硬件:流水线/生产设备' },
          { value: 'hardware-home', label: '硬件:家用电器' },
          { value: 'software', label: '软件:SaaS 系统/App' },
          { value: 'service', label: '业务服务流程' },
          { value: 'other', label: '其他' },
        ],
        required: true,
      },
      {
        id: 'demoGoal', type: 'select',
        question: '本次演示的"核心重点"是什么?',
        options: [
          { value: 'workflow', label: '展示完整的核心操作流程' },
          { value: 'efficiency', label: '强调使用后效率的提升' },
          { value: 'ui', label: '讲解一个具体界面的操作方式' },
          { value: 'multi-scenario', label: '展示多场景下的灵活应用' },
        ],
        required: true,
      },
      {
        id: 'viewerNeed', type: 'select',
        question: '你希望客户看完演示后,最大的感受是?',
        options: [
          { value: 'trust', label: '专业靠谱,值得信赖' },
          { value: 'clear', label: '一目了然,通俗易懂' },
          { value: 'evidence', label: '有理有据,具备极强可行性' },
          { value: 'proposal', label: '非常适合用来直接去提案' },
        ],
        required: true,
      },
    ],
    canvasStages: [
      { id: 'logic', label: '梳理演示逻辑', description: '对齐对标逻辑并明确视觉重点...', estimatedMs: 2000 },
      { id: 'ui', label: '界面与动效排布', description: '组织屏幕画面与光标引导...', estimatedMs: 3000 },
      { id: 'render', label: '渲染输出', description: '最终演示成片输出中...', estimatedMs: 3500 },
    ],
  },
  'media-proposal': {
    schemaVersion: 1,
    skillId: 'media-proposal',
    title: '客户提案样片',
    description: '把方案方向变成客户更容易感知的提案视频',
    welcomeMessage: '你好!我是专门服务乙方和提案环节的视频专员。为了提升提案胜率,咱们可以先模仿优秀案例:',
    steps: [
      { id: 'referenceUrl', type: 'url', question: '你是否有参考的对标提案视频?', placeholder: 'https://...', required: false },
      { id: 'productAsset', type: 'upload', question: '也可以上传参考视频或方案主视觉', accept: 'image/*,video/*', maxSizeMb: 50, required: true },
      {
        id: 'proposalClient', type: 'select',
        question: '这次你要向什么类型的客户进行提案?',
        options: [
          { value: 'local-life', label: '本地生活/实体门店' },
          { value: 'consumer', label: '消费品品牌/快消' },
          { value: 'real-estate', label: '大型商业空间/地产' },
          { value: 'event', label: '线上线下活动项目方' },
          { value: 'other', label: '其他' },
        ],
        required: true,
      },
      {
        id: 'proposalTheme', type: 'select',
        question: '这次提案的核心命题是什么?',
        options: [
          { value: 'space', label: '空间改造升级' },
          { value: 'social', label: '社媒内容营销方向' },
          { value: 'event', label: '线下活动公关推广' },
          { value: 'brand', label: '品牌视觉体系焕新' },
        ],
        required: true,
      },
      {
        id: 'proposalValue', type: 'select',
        question: '在提案视频中,你更想给客户传递怎样的价值预期?',
        options: [
          { value: 'immersive', label: '身临其境的落地效果' },
          { value: 'premium', label: '品牌气质的显著拉升' },
          { value: 'viral', label: '在社交媒体上的病毒传播力' },
          { value: 'reliable', label: '稳健扎实的执行可行性' },
        ],
        required: true,
      },
    ],
    canvasStages: [
      { id: 'concept', label: '方案概念提取', description: '结合对标分析核心提案观点...', estimatedMs: 2000 },
      { id: 'board', label: '动态情绪板设计', description: '生成提案过渡页与效果展示...', estimatedMs: 3000 },
      { id: 'render', label: '提案样片渲染', description: '合成最新提案文件输出中...', estimatedMs: 4000 },
    ],
  },
  'media-longform-cut': {
    schemaVersion: 1,
    skillId: 'media-longform-cut',
    title: '长视频拆条',
    description: '把播客/直播/讲座拆成多条可独立传播的短视频',
    welcomeMessage: '你好!我是长视频拆条专员。请上传你的源视频,我们将自动识别钩子并批量产出竖屏 clip:',
    steps: [
      {
        id: 'sourceVideo', type: 'upload',
        question: '请上传需要拆条的长视频 (mp4/mov, 最长 4 小时)',
        hint: '支持本地大文件,我们会先转写再切条',
        accept: 'video/mp4,video/quicktime,video/x-matroska',
        maxSizeMb: 4096,
        required: true,
      },
      {
        id: 'sourceType', type: 'select',
        question: '源视频是什么类型?',
        options: [
          { value: 'podcast', label: '播客' },
          { value: 'livestream', label: '直播' },
          { value: 'lecture', label: '讲座' },
          { value: 'interview', label: '访谈' },
          { value: 'conference', label: '大会' },
          { value: 'course', label: '课程' },
        ],
        required: true,
      },
      {
        id: 'targetClipCount', type: 'slider',
        question: '想拆出几条短视频?',
        constraints: { min: 3, max: 20 },
        required: true,
      },
      {
        id: 'clipStrategy', type: 'select',
        question: '用什么策略挑 clip?',
        options: [
          { value: 'hook-first', label: '钩子优先 (开头最强)' },
          { value: 'insight-first', label: '干货优先 (密集信息)' },
          { value: 'emotion-first', label: '情绪优先 (冲突/惊喜)' },
          { value: 'proof-first', label: '证据优先 (结果/演示)' },
          { value: 'quote-first', label: '金句优先 (一句话)' },
        ],
        required: true,
      },
      {
        id: 'targetPlatforms', type: 'multi-select',
        question: '分发到哪些平台?',
        options: [
          { value: 'douyin', label: '抖音' },
          { value: 'xiaohongshu', label: '小红书' },
          { value: 'wechat-video', label: '视频号' },
          { value: 'bilibili', label: 'B站' },
          { value: 'kuaishou', label: '快手' },
        ],
        required: true,
      },
      {
        id: 'audienceHint', type: 'text',
        question: '想吸引的目标受众',
        placeholder: '例如:创业者 / 产品经理 / 设计师',
        required: false,
      },
    ],
    canvasStages: [
      { id: 'transcribe', label: '转写源视频', description: 'Whisper 转写 + 时间戳对齐...', estimatedMs: 5000 },
      { id: 'analyze', label: '识别钩子时刻', description: '基于策略排序候选 clip...', estimatedMs: 3000 },
      { id: 'cut', label: '批量切条', description: '逐条竖屏重切 + 字幕烧录...', estimatedMs: 6000 },
    ],
  },
  'media-animation': {
    schemaVersion: 1,
    skillId: 'media-animation',
    title: '动画解释视频',
    description: 'MG 动画、示意图、科普类视频',
    welcomeMessage: '你好!我是动画解释专员。请告诉我们你想解释什么概念:',
    steps: [
      {
        id: 'concept', type: 'textarea',
        question: '用一句话说明要解释的概念/原理/过程',
        placeholder: '例如:解释一下 Transformer 的 self-attention 机制',
        required: true,
      },
      {
        id: 'topicHint', type: 'select',
        question: '属于哪类内容?',
        options: [
          { value: 'science', label: '科普' },
          { value: 'product-mechanism', label: '产品原理' },
          { value: 'data-viz', label: '数据可视化' },
          { value: 'flow', label: '流程图' },
          { value: 'concept', label: '概念示意' },
        ],
        required: true,
      },
      {
        id: 'visualStyle', type: 'select',
        question: '视觉风格倾向?',
        options: [
          { value: 'flat-mg', label: '扁平 MG' },
          { value: '3d-render', label: '3D 渲染' },
          { value: 'hand-drawn', label: '手绘风格' },
          { value: 'minimal-line', label: '极简线条' },
          { value: 'skeuomorphic', label: '拟物' },
        ],
        required: true,
      },
      {
        id: 'complexityLevel', type: 'select',
        question: '目标受众的专业水平?',
        options: [
          { value: 'beginner', label: '入门' },
          { value: 'intermediate', label: '中级' },
          { value: 'expert', label: '专家' },
        ],
        required: true,
      },
      {
        id: 'referenceImages', type: 'upload',
        question: '上传参考帧/草图/色卡 (选填)',
        hint: '可多张,系统会锁定关键视觉风格',
        accept: 'image/jpeg,image/png,image/webp',
        maxSizeMb: 20,
        required: false,
      },
      {
        id: 'durationHint', type: 'slider',
        question: '视频时长 (秒)',
        constraints: { min: 30, max: 180 },
        required: true,
      },
    ],
    canvasStages: [
      { id: 'script', label: '生成场景脚本', description: '基于概念产出关键帧描述...', estimatedMs: 3000 },
      { id: 'keyframes', label: '生成关键帧', description: '逐帧 AI 出图...', estimatedMs: 5000 },
      { id: 'interpolate', label: '补间动画', description: '关键帧之间补间 + 配字幕...', estimatedMs: 4000 },
    ],
  },
  'media-localization': {
    schemaVersion: 1,
    skillId: 'media-localization',
    title: '视频本地化',
    description: '把已有视频转成多语言版本 (字幕/配音/唇形)',
    welcomeMessage: '你好!我是视频本地化专员。请上传需要本地化的源视频:',
    steps: [
      {
        id: 'sourceVideo', type: 'upload',
        question: '上传源视频',
        accept: 'video/mp4,video/quicktime',
        maxSizeMb: 2048,
        required: true,
      },
      {
        id: 'sourceLanguage', type: 'select',
        question: '源视频是什么语言?',
        options: [
          { value: 'zh', label: '中文' },
          { value: 'en', label: '英文' },
          { value: 'ja', label: '日文' },
          { value: 'ko', label: '韩文' },
          { value: 'es', label: '西班牙文' },
        ],
        required: true,
      },
      {
        id: 'targetLanguages', type: 'multi-select',
        question: '需要翻译成哪些语言?',
        options: [
          { value: 'en', label: '英文' },
          { value: 'ja', label: '日文' },
          { value: 'ko', label: '韩文' },
          { value: 'es', label: '西班牙文' },
          { value: 'fr', label: '法文' },
          { value: 'de', label: '德文' },
        ],
        required: true,
      },
      {
        id: 'localizationMode', type: 'select',
        question: '采用哪种本地化方式?',
        options: [
          { value: 'subtitle-only', label: '仅字幕' },
          { value: 'voiceover-dub', label: '旁白配音' },
          { value: 'full-dub', label: '完整配音 (替换原音)' },
          { value: 'lip-sync', label: '唇形同步 (高级)' },
        ],
        required: true,
      },
      {
        id: 'glossary', type: 'textarea',
        question: '需要保护的术语 (产品名/品牌名/技术词)',
        placeholder: '例如:产品名"HelloMe"、技术词"agent"',
        required: false,
      },
      {
        id: 'voiceHint', type: 'select',
        question: '配音声音处理?',
        constraints: {
          dependsOn: { stepId: 'localizationMode', value: ['voiceover-dub', 'full-dub', 'lip-sync'] },
        },
        options: [
          { value: 'preserve', label: '保留原语调' },
          { value: 'fresh', label: '全新 AI 配音' },
          { value: 'tone-match', label: '匹配原声调性' },
        ],
        required: false,
      },
    ],
    canvasStages: [
      { id: 'transcribe', label: '转写源语言', description: 'Whisper 多语转写 + 时间戳...', estimatedMs: 4000 },
      { id: 'translate', label: '翻译并保护术语', description: '逐句翻译 + 术语锁定...', estimatedMs: 3000 },
      { id: 'synthesize', label: '合成配音', description: 'TTS 多语配音...', estimatedMs: 5000 },
      { id: 'compose', label: '合成最终成片', description: '烧字幕/换音轨/唇形对齐...', estimatedMs: 4000 },
    ],
  },
};

/**
 * CLI 模式:支持 --skill <slug> --mode <get-schema|execute> --json
 * 用于真正调用本地 Hermes 桌面端时,这是入口协议。
 */
async function runCli() {
  const args = process.argv.slice(2);
  const getArg = (name) => {
    const idx = args.indexOf(`--${name}`);
    return idx >= 0 ? args[idx + 1] : undefined;
  };
  const skill = getArg('skill');
  const mode = getArg('mode') ?? 'get-schema';
  const isJson = args.includes('--json');

  if (!skill) {
    const out = { status: 'error', message: 'missing --skill <slug>' };
    console.log(JSON.stringify(out));
    process.exit(2);
  }

  if (mode === 'get-schema') {
    const schema = SKILL_SCHEMAS[skill];
    if (!schema) {
      const out = { status: 'error', message: `unknown skill: ${skill}` };
      console.log(JSON.stringify(out));
      process.exit(3);
    }
    const out = { status: 'ok', schema };
    console.log(JSON.stringify(out));
    process.exit(0);
  }

  // execute 模式留给后续 PR 接入
  const out = { status: 'error', message: `mode "${mode}" not yet implemented` };
  console.log(JSON.stringify(out));
  process.exit(4);
}

/**
 * Node API 模式 (被 ugcTaskService 直接 import 调用)
 * 与 CLI 模式共享同一份 SKILL_SCHEMAS 数据。
 */
export async function fetchHermesSkillSchema(skillId) {
  // 模拟 Hermes 真实调用的延迟 (1-2 秒,前端有 spinner 时间)
  await new Promise((r) => setTimeout(r, 300 + Math.random() * 700));

  const schema = SKILL_SCHEMAS[skillId];
  if (!schema) {
    throw new Error(`unknown skill: ${skillId}`);
  }
  return schema;
}

/**
 * CLI 入口(只在自己被直接执行时跑,不被 import 时不跑)
 */
const isMain = process.argv[1] && process.argv[1].endsWith('hermesVideoSkillRunner.mjs');
if (isMain) {
  runCli().catch((err) => {
    console.log(JSON.stringify({ status: 'error', message: err.message }));
    process.exit(1);
  });
}