/**
 * AI 服务模块 - 基于 NVIDIA API 的智能英语学习助手
 * 支持：文章拆解、智能出题、对话练习、水平评估、学习路线生成
 */

const DEFAULT_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const DEFAULT_MODEL = 'deepseek-ai/deepseek-v4-pro'
const DEFAULT_PROXY = 'https://corsproxy.io/?'

function getApiKey() {
  return localStorage.getItem('ai_api_key') || ''
}

function getModel() {
  return localStorage.getItem('ai_model') || DEFAULT_MODEL
}

function getProxy() {
  return localStorage.getItem('ai_proxy') || DEFAULT_PROXY
}

/**
 * 构建带 CORS 代理的请求 URL
 */
function buildUrl(url) {
  const proxy = getProxy()
  if (!proxy || proxy === 'direct') return url
  if (proxy === DEFAULT_PROXY) return proxy + encodeURIComponent(url)
  // Cloudflare Worker 或自定义代理：直接附加路径
  return proxy.replace(/\/$/, '') + '/v1/chat/completions'
}

/**
 * 调用 LLM API
 */
async function callAI(messages, options = {}) {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('请先在设置中配置 API Key')
  }

  const response = await fetch(buildUrl(DEFAULT_API_URL), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: getModel(),
      messages,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 0.9,
      stream: false
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API 调用失败 (${response.status}): ${error}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

/**
 * 安全解析 JSON 响应（AI 返回的 JSON 可能包含 markdown 代码块）
 */
function parseJSON(text) {
  // 移除可能的 markdown 代码块标记
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
  }
  return JSON.parse(cleaned)
}

// ========== 文章 AI 拆解 ==========

/**
 * AI 拆解文章：关键词、语法点、难度评估、摘要、翻译
 */
export async function analyzeArticle(title, content) {
  const prompt = `你是一位专业的英语教学专家。请分析以下英文文章，返回 JSON 格式的分析结果。

文章标题：${title}
文章内容：${content}

请返回以下格式的 JSON（不要包含其他文字）：
{
  "difficulty": "初级|中级|高级",
  "difficultyScore": 1-10,
  "summary": "中文摘要（2-3句话）",
  "translation": "全文中文翻译",
  "keyVocabulary": [
    {"word": "英文单词", "phonetic": "音标", "meaning": "中文释义", "context": "在文中的用法说明"}
  ],
  "grammarPoints": [
    {"point": "语法点名称", "explanation": "中文解释", "example": "文中的例句"}
  ],
  "keySentences": [
    {"sentence": "重要句子", "translation": "中文翻译", "note": "为什么重要"}
  ],
  "culturalNotes": "文化背景说明（如有）"
}`

  const result = await callAI([
    { role: 'system', content: '你是英语教学专家，擅长分析英文文章并帮助中国学生理解。始终返回纯 JSON，不要包含 markdown 代码块标记。' },
    { role: 'user', content: prompt }
  ], { temperature: 0.3, maxTokens: 4096 })

  return parseJSON(result)
}

/**
 * AI 生成理解题
 */
export async function generateComprehensionQuestions(title, content, difficulty = 'auto') {
  const userLevel = getAdaptiveLevel()
  const levelHint = difficulty === 'auto' ? `根据学习者当前水平（${userLevel}）` : difficulty

  const prompt = `基于以下英文文章，生成 5 道理解题。${levelHint}调整难度。

文章标题：${title}
文章内容：${content}

返回 JSON 格式（不要包含其他文字）：
{
  "questions": [
    {
      "type": "choice|fill|short_answer",
      "question": "题目（中文）",
      "choices": ["A选项", "B选项", "C选项", "D选项"],
      "correctIndex": 0,
      "explanation": "答案解析（中文）",
      "difficulty": 1-5
    }
  ]
}`

  const result = await callAI([
    { role: 'system', content: '你是英语测试专家，擅长根据学习者水平生成合适的理解题。始终返回纯 JSON。' },
    { role: 'user', content: prompt }
  ], { temperature: 0.5, maxTokens: 2048 })

  return parseJSON(result)
}

// ========== 交互式训练 ==========

/**
 * AI 对话练习 - 场景式英语对话
 */
export async function chatPractice(scene, userMessage, conversationHistory = []) {
  const scenes = {
    daily: '日常生活对话',
    work: '工作场景对话',
    travel: '旅行场景对话',
    restaurant: '餐厅点餐对话',
    shopping: '购物对话',
    interview: '面试对话',
    free: '自由对话'
  }

  const sceneDesc = scenes[scene] || '自由对话'
  const level = getAdaptiveLevel()

  const messages = [
    {
      role: 'system',
      content: `你是一位友好的英语对话伙伴。当前场景：${sceneDesc}。学习者水平：${level}。
请用适合该水平的英语回复，不要太难也不要太简单。
每次回复控制在 2-4 句话。如果学习者犯错，温和地纠正。
如果学习者用中文，鼓励他们用英语。`
    },
    ...conversationHistory.map(m => ({
      role: m.role,
      content: m.content
    })),
    { role: 'user', content: userMessage }
  ]

  return await callAI(messages, { temperature: 0.8, maxTokens: 512 })
}

/**
 * AI 造句练习
 */
export async function sentencePractice(words, level = 'auto') {
  const userLevel = level === 'auto' ? getAdaptiveLevel() : level
  const prompt = `请用以下单词生成造句练习，适合${userLevel}水平的学习者。

单词：${words.join(', ')}

返回 JSON 格式（不要包含其他文字）：
{
  "exercises": [
    {
      "word": "目标单词",
      "sentence": "例句（包含该单词）",
      "sentenceTranslation": "例句中文翻译",
      "jumbled": ["打乱顺序的单词数组"],
      "hint": "中文提示"
    }
  ]
}`

  const result = await callAI([
    { role: 'system', content: '你是英语教学专家。始终返回纯 JSON。' },
    { role: 'user', content: prompt }
  ], { temperature: 0.6, maxTokens: 2048 })

  return parseJSON(result)
}

/**
 * AI 语法纠错
 */
export async function grammarCheck(text) {
  const prompt = `请检查以下英文文本的语法错误，并给出纠正建议。

文本：${text}

返回 JSON 格式（不要包含其他文字）：
{
  "errors": [
    {
      "original": "原文中的错误",
      "correction": "正确写法",
      "explanation": "错误原因（中文）"
    }
  ],
  "overallScore": 1-10,
  "feedback": "总体评价（中文）"
}`

  const result = await callAI([
    { role: 'system', content: '你是英语语法专家。始终返回纯 JSON。' },
    { role: 'user', content: prompt }
  ], { temperature: 0.3, maxTokens: 1024 })

  return parseJSON(result)
}

// ========== 水平自适应 ==========

const ADAPTIVE_KEY = 'adaptive_stats'

/**
 * 获取自适应学习数据
 */
export function getAdaptiveStats() {
  return JSON.parse(localStorage.getItem(ADAPTIVE_KEY) || JSON.stringify({
    level: 3, // 1-5: 初级到高级
    totalExercises: 0,
    correctCount: 0,
    streakDays: 0,
    lastStudyDate: null,
    history: [], // 最近 50 次练习记录
    skillScores: {
      vocabulary: 3,
      grammar: 3,
      reading: 3,
      listening: 3,
      speaking: 3
    }
  }))
}

/**
 * 获取当前自适应水平（文字描述）
 */
export function getAdaptiveLevel() {
  const stats = getAdaptiveStats()
  const levels = ['零基础', '初级', '初中级', '中级', '中高级', '高级']
  return levels[stats.level] || '中级'
}

/**
 * 记录练习结果，自动调整难度
 */
export function recordExerciseResult(skill, isCorrect, difficulty = 3) {
  const stats = getAdaptiveStats()

  stats.totalExercises++
  if (isCorrect) stats.correctCount++

  // 记录历史
  stats.history.push({
    skill,
    isCorrect,
    difficulty,
    timestamp: Date.now()
  })
  if (stats.history.length > 50) stats.history.shift()

  // 更新技能分数
  const skillKey = skill in stats.skillScores ? skill : 'vocabulary'
  const currentScore = stats.skillScores[skillKey]
  const adjust = isCorrect ? 0.1 : -0.15
  stats.skillScores[skillKey] = Math.max(1, Math.min(5, currentScore + adjust))

  // 综合水平调整
  const avgScore = Object.values(stats.skillScores).reduce((a, b) => a + b, 0) / 5
  stats.level = Math.round(avgScore)

  // 连续学习天数
  const today = new Date().toDateString()
  if (stats.lastStudyDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString()
    if (stats.lastStudyDate === yesterday) {
      stats.streakDays++
    } else {
      stats.streakDays = 1
    }
    stats.lastStudyDate = today
  }

  localStorage.setItem(ADAPTIVE_KEY, JSON.stringify(stats))
  return stats
}

/**
 * 获取推荐的练习难度（1-5）
 */
export function getRecommendedDifficulty() {
  const stats = getAdaptiveStats()
  return Math.max(1, Math.min(5, stats.level))
}

// ========== 学习路线 ==========

/**
 * AI 生成个性化学习路线
 */
export async function generateLearningPath() {
  const stats = getAdaptiveStats()
  const vocab = JSON.parse(localStorage.getItem('vocab') || '[]')
  const materials = JSON.parse(localStorage.getItem('materials') || '[]')

  const prompt = `作为英语学习规划师，基于以下学习者数据生成个性化学习路线。

学习者数据：
- 当前水平：${getAdaptiveLevel()}（${stats.level}/5）
- 总练习数：${stats.totalExercises}
- 正确率：${stats.totalExercises > 0 ? Math.round(stats.correctCount / stats.totalExercises * 100) : 0}%
- 连续学习天数：${stats.streakDays}
- 词汇量：${vocab.length}
- 文章数：${materials.length}
- 技能分数：词汇${stats.skillScores.vocabulary.toFixed(1)}、语法${stats.skillScores.grammar.toFixed(1)}、阅读${stats.skillScores.reading.toFixed(1)}、听力${stats.skillScores.listening.toFixed(1)}、口语${stats.skillScores.speaking.toFixed(1)}

返回 JSON 格式（不要包含其他文字）：
{
  "currentLevel": "当前水平描述",
  "goal": "阶段性目标",
  "milestones": [
    {
      "title": "里程碑名称",
      "description": "具体描述",
      "tasks": ["任务1", "任务2", "任务3"],
      "estimatedDays": 7,
      "skills": ["vocabulary", "reading"]
    }
  ],
  "weakAreas": ["薄弱环节1", "薄弱环节2"],
  "recommendations": ["建议1", "建议2", "建议3"]
}`

  const result = await callAI([
    { role: 'system', content: '你是专业的英语学习规划师。始终返回纯 JSON。' },
    { role: 'user', content: prompt }
  ], { temperature: 0.5, maxTokens: 2048 })

  return parseJSON(result)
}

/**
 * AI 评估英语水平
 */
export async function assessLevel() {
  const prompt = `生成一套英语水平测试题（10题），从初级到高级递进。包含词汇、语法、阅读理解。

返回 JSON 格式（不要包含其他文字）：
{
  "questions": [
    {
      "type": "choice",
      "question": "题目",
      "choices": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "level": 1-5,
      "skill": "vocabulary|grammar|reading"
    }
  ]
}`

  const result = await callAI([
    { role: 'system', content: '你是英语水平测试专家。生成 10 道从初级到高级的选择题。始终返回纯 JSON。' },
    { role: 'user', content: prompt }
  ], { temperature: 0.4, maxTokens: 2048 })

  return parseJSON(result)
}

// ========== 文本训练（粘贴文章→朗读→中英对照→考核）==========

/**
 * AI 从文章中提取关键句子，生成中英对照训练数据
 * @param {string} content 英文文章内容
 * @param {object} options { count: 提取句子数, level: 学习者水平 }
 */
export async function extractSentencesForTraining(content, options = {}) {
  const count = options.count || 8
  const level = options.level || getAdaptiveLevel()

  const prompt = `你是一位专业的英语教学专家。请从以下英文文章中提取 ${count} 个最有学习价值的关键句子（不要整篇翻译，只挑重点），并给出中文翻译和考核数据。

文章内容：
${content}

学习者当前水平：${level}

返回 JSON 格式（不要包含其他文字）：
{
  "title": "文章主题简述（中文，10字内）",
  "difficulty": "初级|中级|高级",
  "sentences": [
    {
      "id": 1,
      "english": "英文原句（保持原文，不修改）",
      "chinese": "准确的中文翻译",
      "keyWords": ["关键单词1", "关键单词2"],
      "note": "这句话的语法点或用法说明（中文，简短）"
    }
  ]
}`

  const result = await callAI([
    { role: 'system', content: '你是英语教学专家，擅长从文章中提取高价值句子用于学习者训练。始终返回纯 JSON。' },
    { role: 'user', content: prompt }
  ], { temperature: 0.3, maxTokens: 3072 })

  return parseJSON(result)
}

/**
 * AI 评估用户的英译（看中文写英文）或听写答案
 * @param {string} originalEnglish 原英文句子
 * @param {string} userAnswer 用户输入的英文
 */
export async function checkTranslationAnswer(originalEnglish, userAnswer) {
  const prompt = `请评估用户的英文翻译/听写答案是否正确。

原英文句子：${originalEnglish}
用户答案：${userAnswer}

要求宽松一些：拼写小错、标点、大小写差异不算错，但语法错误、漏词、词序错误要算错。

返回 JSON 格式（不要包含其他文字）：
{
  "correct": true|false,
  "score": 1-10,
  "feedback": "简短中文反馈（指出错误或表扬）",
  "errors": [
    {
      "userText": "用户写错的部分",
      "correctText": "正确的写法",
      "reason": "错误原因（中文）"
    }
  ]
}`

  const result = await callAI([
    { role: 'system', content: '你是英语教学评估专家。评估要宽容但准确。始终返回纯 JSON。' },
    { role: 'user', content: prompt }
  ], { temperature: 0.2, maxTokens: 1024 })

  return parseJSON(result)
}

/**
 * 为句子生成填空题（挖掉关键单词）
 * @param {string} english 英文句子
 * @param {string[]} keyWords 关键词列表
 */
export async function generateClozeExercise(english, keyWords = []) {
  const prompt = `请为以下英文句子生成一道填空题，挖掉 1-2 个关键单词。

英文句子：${english}
候选关键词：${keyWords.join(', ') || '无'}

返回 JSON 格式（不要包含其他文字）：
{
  "question": "带空格的句子（用 ____ 表示空格）",
  "blanks": [
    {
      "answer": "正确答案",
      "options": ["正确答案", "干扰项1", "干扰项2", "干扰项3"]
    }
  ],
  "hint": "中文提示"
}`

  const result = await callAI([
    { role: 'system', content: '你是英语出题专家。始终返回纯 JSON。' },
    { role: 'user', content: prompt }
  ], { temperature: 0.4, maxTokens: 768 })

  return parseJSON(result)
}
