<template>
  <div class="ai-training-view">
    <!-- 顶部 Tab 切换 -->
    <div class="tab-switcher">
      <div
        :class="['tab-item', { active: activeTab === 'dialogue' }]"
        @click="activeTab = 'dialogue'"
      >
        {{ iconStyle === 'cute' ? '💬' : '🗣️' }} 对话练习
      </div>
      <div
        :class="['tab-item', { active: activeTab === 'sentence' }]"
        @click="activeTab = 'sentence'"
      >
        {{ iconStyle === 'cute' ? '🧩' : '🔤' }} 造句训练
      </div>
      <div
        :class="['tab-item', { active: activeTab === 'grammar' }]"
        @click="activeTab = 'grammar'"
      >
        {{ iconStyle === 'cute' ? '✏️' : '📝' }} 语法检查
      </div>
    </div>

    <!-- 对话练习 -->
    <div v-if="activeTab === 'dialogue'" class="dialogue-section">
      <!-- 场景选择 -->
      <div v-if="!currentScene" class="scene-selection">
        <div class="section-title">{{ iconStyle === 'cute' ? '🎭' : '🎬' }} 选择对话场景</div>
        <div class="scene-grid">
          <div
            v-for="scene in scenes"
            :key="scene.id"
            class="scene-card"
            @click="selectScene(scene.id)"
          >
            <div class="scene-icon">{{ scene.icon }}</div>
            <div class="scene-name">{{ scene.name }}</div>
            <div class="scene-desc">{{ scene.desc }}</div>
          </div>
        </div>
      </div>

      <!-- 聊天界面 -->
      <div v-else class="chat-container">
        <div class="chat-header">
          <button class="back-btn" @click="currentScene = ''">
            {{ iconStyle === 'cute' ? '← 返回' : '←' }}
          </button>
          <div class="chat-title">
            {{ getSceneName(currentScene) }} {{ iconStyle === 'cute' ? '💬' : '' }}
          </div>
          <div class="level-badge">Lv. {{ currentLevel }}</div>
        </div>

        <div class="messages" ref="messagesContainer">
          <div v-if="messages.length === 0" class="empty-chat">
            <div class="empty-icon">{{ iconStyle === 'cute' ? '👋' : '💬' }}</div>
            <div>开始用英语对话吧！</div>
            <div class="empty-hint">可以打字或点击麦克风说话</div>
          </div>

          <div
            v-for="(msg, index) in messages"
            :key="index"
            :class="['message', msg.role === 'user' ? 'user-msg' : 'ai-msg']"
          >
            <div class="msg-avatar">
              {{ msg.role === 'user' ? (iconStyle === 'cute' ? '🧑' : '👤') : (iconStyle === 'cute' ? '🤖' : 'AI') }}
            </div>
            <div class="msg-content">
              <div class="msg-text">{{ msg.content }}</div>
              <div v-if="msg.role === 'ai'" class="msg-actions">
                <button class="speak-btn" @click="speak(msg.content)" :title="'朗读'">
                  {{ iconStyle === 'cute' ? '🔊 朗读' : '🔊' }}
                </button>
              </div>
              <div v-if="msg.correction" class="grammar-correction">
                <div class="correction-label">{{ iconStyle === 'cute' ? '💡 语法提示' : '提示' }}</div>
                <div class="correction-text">{{ msg.correction }}</div>
              </div>
            </div>
          </div>

          <div v-if="isAiResponding" class="message ai-msg">
            <div class="msg-avatar">{{ iconStyle === 'cute' ? '🤖' : 'AI' }}</div>
            <div class="msg-content">
              <div class="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        </div>

        <div class="chat-input-area">
          <button
            :class="['voice-btn', { listening: isListening }]"
            @click="startListening"
            :disabled="isAiResponding"
            :title="isListening ? '正在聆听...' : '语音输入'"
          >
            {{ isListening ? '🎙️' : '🎤' }}
          </button>
          <input
            type="text"
            v-model="userInput"
            placeholder="输入英语..."
            class="chat-input"
            @keyup.enter="sendMessage"
            :disabled="isAiResponding"
          />
          <button
            class="send-btn"
            @click="sendMessage"
            :disabled="!userInput.trim() || isAiResponding"
          >
            {{ iconStyle === 'cute' ? '发送 🚀' : '发送' }}
          </button>
        </div>
        <div v-if="!speechSupported" class="speech-unsupported">
          当前浏览器不支持语音识别，请使用 Chrome 浏览器
        </div>
      </div>
    </div>

    <!-- 造句训练 -->
    <div v-if="activeTab === 'sentence'" class="sentence-section">
      <div class="section-header">
        <div class="section-title">{{ iconStyle === 'cute' ? '🧩' : '🔤' }} 造句训练</div>
        <button class="btn-secondary small" @click="loadSentenceExercise" :disabled="isLoadingExercise">
          {{ isLoadingExercise ? '加载中...' : '换一题' }}
        </button>
      </div>

      <div v-if="!currentExercise && !isLoadingExercise" class="empty-state">
        <div class="empty-icon">{{ iconStyle === 'cute' ? '🎯' : '📝' }}</div>
        <div>点击下方按钮开始造句</div>
        <button class="btn-primary" @click="loadSentenceExercise">
          {{ iconStyle === 'cute' ? '🚀 开始练习' : '开始练习' }}
        </button>
      </div>

      <div v-if="isLoadingExercise" class="loading-state">
        <div class="loading-spinner"></div>
        <div>AI 正在生成练习...</div>
      </div>

      <div v-if="currentExercise" class="exercise-card">
        <div class="exercise-hint">
          <span class="hint-label">提示：</span>{{ currentExercise.hint }}
        </div>
        <div v-if="currentExercise.word" class="target-word">
          目标单词：<strong>{{ currentExercise.word }}</strong>
        </div>

        <!-- 已排列的单词区 -->
        <div class="arranged-area">
          <div class="area-label">你的句子：</div>
          <div class="words-container arranged">
            <button
              v-for="(word, index) in arrangedWords"
              :key="'arranged-' + index"
              class="word-btn arranged"
              @click="removeWord(index)"
            >
              {{ word }}
            </button>
            <span v-if="arrangedWords.length === 0" class="placeholder">点击下方单词造句</span>
          </div>
        </div>

        <!-- 可选单词区 -->
        <div class="jumbled-area">
          <div class="area-label">可选单词：</div>
          <div class="words-container jumbled">
            <button
              v-for="(word, index) in jumbledWords"
              :key="'jumbled-' + index"
              class="word-btn jumbled"
              @click="addWord(index)"
            >
              {{ word }}
            </button>
            <span v-if="jumbledWords.length === 0" class="placeholder">单词已全部使用</span>
          </div>
        </div>

        <div v-if="sentenceResult" :class="['sentence-result', sentenceResult.correct ? 'correct' : 'incorrect']">
          <div class="result-icon">{{ sentenceResult.correct ? '🎉' : '😅' }}</div>
          <div class="result-text">
            {{ sentenceResult.correct ? '回答正确！' : '回答错误' }}
          </div>
          <div class="result-detail">
            <div><strong>你的答案：</strong>{{ sentenceResult.userAnswer }}</div>
            <div v-if="!sentenceResult.correct"><strong>正确答案：</strong>{{ sentenceResult.correctAnswer }}</div>
            <div v-if="currentExercise.sentenceTranslation" class="translation">
              {{ currentExercise.sentenceTranslation }}
            </div>
          </div>
        </div>

        <div class="exercise-actions">
          <button
            v-if="!sentenceResult"
            class="btn-primary"
            @click="checkSentence"
            :disabled="arrangedWords.length === 0"
          >
            {{ iconStyle === 'cute' ? '✓ 检查答案' : '检查答案' }}
          </button>
          <button v-else class="btn-primary" @click="resetExercise">
            {{ iconStyle === 'cute' ? '🔄 下一题' : '下一题' }}
          </button>
          <button class="btn-secondary" @click="resetExercise">
            {{ iconStyle === 'cute' ? '🔁 重置' : '重置' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 语法检查 -->
    <div v-if="activeTab === 'grammar'" class="grammar-section">
      <div class="section-title">{{ iconStyle === 'cute' ? '✏️' : '📝' }} 语法检查</div>
      <div class="grammar-desc">输入一段英文，AI 会帮你检查语法错误并给出修改建议</div>

      <textarea
        v-model="grammarInput"
        class="grammar-textarea"
        placeholder="请输入英文，例如：Yesterday I goes to school..."
        rows="6"
      ></textarea>

      <button
        class="btn-primary"
        @click="checkGrammar"
        :disabled="!grammarInput.trim() || isCheckingGrammar"
      >
        {{ isCheckingGrammar ? '检查中...' : (iconStyle === 'cute' ? '🔍 检查语法' : '检查语法') }}
      </button>

      <div v-if="grammarResult" class="grammar-result">
        <div class="result-summary-box">
          <div class="score-display">
            <div class="score-label">语法评分</div>
            <div class="score-number">{{ grammarResult.overallScore }}/10</div>
          </div>
          <div class="feedback-text">{{ grammarResult.feedback }}</div>
        </div>

        <div v-if="grammarResult.errors && grammarResult.errors.length > 0" class="errors-list">
          <div class="errors-title">
            {{ iconStyle === 'cute' ? '⚠️' : '!' }} 发现 {{ grammarResult.errors.length }} 处错误
          </div>
          <div
            v-for="(err, index) in grammarResult.errors"
            :key="index"
            class="error-item"
          >
            <div class="error-original">
              <span class="error-tag">原文</span>
              <span class="error-text wrong">{{ err.original }}</span>
            </div>
            <div class="error-arrow">↓</div>
            <div class="error-correction">
              <span class="error-tag">修改</span>
              <span class="error-text right">{{ err.correction }}</span>
            </div>
            <div class="error-explanation">{{ err.explanation }}</div>
          </div>
        </div>

        <div v-else class="no-errors">
          <div class="no-errors-icon">{{ iconStyle === 'cute' ? '🎉' : '✓' }}</div>
          <div>没有发现语法错误，写得很好！</div>
        </div>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMessage" class="error-toast" @click="errorMessage = ''">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import {
  chatPractice,
  sentencePractice,
  grammarCheck,
  getAdaptiveStats,
  recordExerciseResult,
  getAdaptiveLevel
} from '../ai.js'

const props = defineProps({
  iconStyle: {
    type: String,
    default: 'cute'
  }
})

// 场景列表
const scenes = [
  { id: 'daily', name: '日常生活', desc: '生活琐事', icon: '🏠' },
  { id: 'work', name: '工作', desc: '职场交流', icon: '💼' },
  { id: 'travel', name: '旅行', desc: '出行场景', icon: '✈️' },
  { id: 'restaurant', name: '餐厅', desc: '点餐对话', icon: '🍽️' },
  { id: 'shopping', name: '购物', desc: '买卖交流', icon: '🛍️' },
  { id: 'interview', name: '面试', desc: '求职场景', icon: '👔' },
  { id: 'free', name: '自由对话', desc: '任意话题', icon: '🌈' }
]

// 状态
const activeTab = ref('dialogue')
const currentScene = ref('')
const messages = ref([])
const userInput = ref('')
const isListening = ref(false)
const isAiResponding = ref(false)
const speechSupported = ref(false)

// 造句训练状态
const currentExercise = ref(null)
const jumbledWords = ref([])
const arrangedWords = ref([])
const sentenceResult = ref(null)
const isLoadingExercise = ref(false)

// 语法检查状态
const grammarInput = ref('')
const grammarResult = ref(null)
const isCheckingGrammar = ref(false)

// 错误提示
const errorMessage = ref('')

// 当前水平
const currentLevel = ref(getAdaptiveStats().level)

// 语音识别实例
let recognition = null

// 检测语音识别支持
const SpeechRecognitionClass = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null
speechSupported.value = !!SpeechRecognitionClass

// 获取场景名称
function getSceneName(id) {
  const scene = scenes.find(s => s.id === id)
  return scene ? scene.name : '对话'
}

// 显示错误提示
function showError(msg) {
  errorMessage.value = msg
  setTimeout(() => {
    errorMessage.value = ''
  }, 4000)
}

// 选择场景并开始对话
function selectScene(scene) {
  currentScene.value = scene
  messages.value = []
  const sceneName = getSceneName(scene)
  const greeting = scene === 'free'
    ? `Hi there! I'm your conversation partner. What would you like to talk about today?`
    : `Hello! Let's practice ${sceneName} English. I'll play a role in this scene. Shall we begin?`
  messages.value.push({
    role: 'ai',
    content: greeting
  })
  // 自动朗读欢迎语
  speak(greeting)
}

// 发送消息
async function sendMessage() {
  const text = userInput.value.trim()
  if (!text || isAiResponding.value) return

  // 添加用户消息
  messages.value.push({
    role: 'user',
    content: text
  })
  userInput.value = ''
  isAiResponding.value = true

  // 滚动到底部
  await scrollToBottom()

  try {
    // 构造对话历史
    const history = messages.value.slice(-10).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    }))
    // 移除最后一条（刚添加的用户消息），因为 chatPractice 会自动加上
    history.pop()

    const response = await chatPractice(currentScene.value, text, history)

    // 尝试从回复中提取语法纠正（简单实现）
    let correction = null
    // 检查回复中是否包含纠正信息
    const correctionMatch = response.match(/\[correction\]([\s\S]*?)\[\/correction\]/i)
    if (correctionMatch) {
      correction = correctionMatch[1].trim()
    }

    messages.value.push({
      role: 'ai',
      content: response.replace(/\[correction\][\s\S]*?\[\/correction\]/i, '').trim(),
      correction: correction
    })

    // 记录口语练习结果（认为完成一次对话即为练习）
    recordExerciseResult('speaking', true)

    // 自动朗读 AI 回复
    speak(response.replace(/\[correction\][\s\S]*?\[\/correction\]/i, '').trim())
  } catch (err) {
    showError(err.message || 'AI 回复失败，请稍后重试')
    messages.value.push({
      role: 'ai',
      content: '抱歉，我暂时无法回复，请稍后再试。'
    })
  } finally {
    isAiResponding.value = false
    await scrollToBottom()
  }
}

// 开始语音识别
function startListening() {
  if (!speechSupported.value) {
    showError('当前浏览器不支持语音识别，请使用 Chrome 浏览器')
    return
  }

  if (isListening.value) {
    recognition && recognition.stop()
    return
  }

  recognition = new SpeechRecognitionClass()
  recognition.lang = 'en-US'
  recognition.interimResults = false
  recognition.maxAlternatives = 1

  recognition.onstart = () => {
    isListening.value = true
  }

  recognition.onresult = (event) => {
    const result = event.results[0][0].transcript
    userInput.value = result
  }

  recognition.onerror = (event) => {
    isListening.value = false
    if (event.error === 'not-allowed') {
      showError('请允许使用麦克风权限')
    } else if (event.error === 'no-speech') {
      showError('未检测到语音，请重试')
    } else {
      showError('语音识别失败：' + event.error)
    }
  }

  recognition.onend = () => {
    isListening.value = false
  }

  try {
    recognition.start()
  } catch (err) {
    showError('启动语音识别失败')
    isListening.value = false
  }
}

// 语音合成
function speak(text) {
  if (!('speechSynthesis' in window)) {
    showError('当前浏览器不支持语音朗读')
    return
  }

  // 取消正在进行的朗读
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = 0.9
  utterance.pitch = 1

  window.speechSynthesis.speak(utterance)
}

// 加载造句练习
async function loadSentenceExercise() {
  isLoadingExercise.value = true
  currentExercise.value = null
  arrangedWords.value = []
  jumbledWords.value = []
  sentenceResult.value = null

  try {
    // 从 localStorage 读取词汇
    const vocab = JSON.parse(localStorage.getItem('vocab') || '[]')
    let words = []

    if (vocab.length > 0) {
      // 随机选取 3-5 个单词
      const shuffled = [...vocab].sort(() => Math.random() - 0.5)
      const count = Math.min(Math.floor(Math.random() * 3) + 3, shuffled.length)
      words = shuffled.slice(0, count).map(v => v.word)
    } else {
      // 没有词汇时使用默认词
      const defaultWords = ['happy', 'morning', 'friend', 'school', 'family', 'weather', 'travel', 'book']
      const shuffled = [...defaultWords].sort(() => Math.random() - 0.5)
      words = shuffled.slice(0, 4)
    }

    const result = await sentencePractice(words)
    if (result.exercises && result.exercises.length > 0) {
      const exercise = result.exercises[0]
      currentExercise.value = exercise
      jumbledWords.value = [...(exercise.jumbled || exercise.sentence.split(' '))]
    } else {
      showError('未能生成练习，请重试')
    }
  } catch (err) {
    showError(err.message || '加载练习失败，请稍后重试')
  } finally {
    isLoadingExercise.value = false
  }
}

// 添加单词到已排列区
function addWord(index) {
  if (sentenceResult.value) return
  const word = jumbledWords.value[index]
  arrangedWords.value.push(word)
  jumbledWords.value.splice(index, 1)
}

// 从已排列区移除单词
function removeWord(index) {
  if (sentenceResult.value) return
  const word = arrangedWords.value[index]
  jumbledWords.value.push(word)
  arrangedWords.value.splice(index, 1)
}

// 检查句子
function checkSentence() {
  if (arrangedWords.value.length === 0) return

  const userAnswer = arrangedWords.value.join(' ').trim()
  const correctAnswer = (currentExercise.value.sentence || '').trim()

  // 标准化比较：去除标点和大小写差异
  const normalize = (s) => s.replace(/[.,!?;:'"]/g, '').replace(/\s+/g, ' ').toLowerCase().trim()
  const isCorrect = normalize(userAnswer) === normalize(correctAnswer)

  sentenceResult.value = {
    correct: isCorrect,
    userAnswer: userAnswer,
    correctAnswer: correctAnswer
  }

  // 记录练习结果
  recordExerciseResult('grammar', isCorrect)

  // 更新当前水平
  currentLevel.value = getAdaptiveStats().level
}

// 重置练习
function resetExercise() {
  currentExercise.value = null
  arrangedWords.value = []
  jumbledWords.value = []
  sentenceResult.value = null
  loadSentenceExercise()
}

// 检查语法
async function checkGrammar() {
  const text = grammarInput.value.trim()
  if (!text || isCheckingGrammar.value) return

  isCheckingGrammar.value = true
  grammarResult.value = null

  try {
    const result = await grammarCheck(text)
    grammarResult.value = result

    // 记录语法练习结果
    const hasErrors = result.errors && result.errors.length > 0
    recordExerciseResult('grammar', !hasErrors)

    // 更新当前水平
    currentLevel.value = getAdaptiveStats().level
  } catch (err) {
    showError(err.message || '语法检查失败，请稍后重试')
  } finally {
    isCheckingGrammar.value = false
  }
}

// 滚动到消息底部
async function scrollToBottom() {
  await nextTick()
  const container = document.querySelector('.messages')
  if (container) {
    container.scrollTop = container.scrollHeight
  }
}
</script>

<style scoped>
.ai-training-view {
  padding: 16px;
  max-width: 480px;
  margin: 0 auto;
  position: relative;
}

/* Tab 切换器 */
.tab-switcher {
  display: flex;
  background: white;
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 12px 8px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  font-weight: 500;
}

.tab-item.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

/* 通用标题 */
.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header .section-title {
  margin-bottom: 0;
}

/* 场景选择 */
.scene-selection {
  padding: 8px 0;
}

.scene-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.scene-card {
  background: white;
  border-radius: 14px;
  padding: 20px 16px;
  text-align: center;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.25s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.scene-card:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.2);
}

.scene-icon {
  font-size: 36px;
  margin-bottom: 8px;
}

.scene-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.scene-desc {
  font-size: 12px;
  color: #999;
}

/* 聊天容器 */
.chat-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 180px);
  min-height: 500px;
  background: #f7f8fc;
  border-radius: 16px;
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: white;
  border-bottom: 1px solid #f0f0f0;
}

.back-btn {
  background: none;
  border: none;
  color: #667eea;
  font-size: 14px;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 8px;
}

.back-btn:hover {
  background: #f5f3ff;
}

.chat-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.level-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 500;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-chat {
  text-align: center;
  color: #999;
  padding: 40px 20px;
  margin: auto;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-hint {
  font-size: 13px;
  margin-top: 6px;
  color: #bbb;
}

.message {
  display: flex;
  gap: 10px;
  max-width: 85%;
}

.user-msg {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.ai-msg {
  align-self: flex-start;
}

.msg-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.user-msg .msg-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.ai-msg .msg-avatar {
  background: #e8eaf6;
}

.msg-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.msg-text {
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 15px;
  line-height: 1.5;
  word-break: break-word;
}

.user-msg .msg-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom-right-radius: 4px;
}

.ai-msg .msg-text {
  background: white;
  color: #333;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.msg-actions {
  display: flex;
  gap: 8px;
}

.speak-btn {
  background: #f5f3ff;
  border: none;
  color: #667eea;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  cursor: pointer;
  align-self: flex-start;
}

.speak-btn:hover {
  background: #ede9fe;
}

.grammar-correction {
  background: #fff8e1;
  border-left: 3px solid #ffa000;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
}

.correction-label {
  color: #ffa000;
  font-weight: 600;
  margin-bottom: 4px;
  font-size: 12px;
}

.correction-text {
  color: #5d4037;
  line-height: 1.4;
}

/* 输入指示器 */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 14px 16px;
  background: white;
  border-radius: 16px;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #ccc;
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-6px);
    opacity: 1;
  }
}

/* 聊天输入区 */
.chat-input-area {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: white;
  border-top: 1px solid #f0f0f0;
  align-items: center;
}

.voice-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: #f5f3ff;
  font-size: 20px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.voice-btn:hover {
  background: #ede9fe;
}

.voice-btn.listening {
  background: #ffebee;
  animation: pulse 1.2s infinite;
}

.voice-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.5);
  }
  70% {
    box-shadow: 0 0 0 12px rgba(244, 67, 54, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(244, 67, 54, 0);
  }
}

.chat-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 22px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
}

.chat-input:focus {
  border-color: #667eea;
}

.chat-input:disabled {
  background: #f5f5f5;
}

.send-btn {
  padding: 10px 18px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 22px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.speech-unsupported {
  text-align: center;
  font-size: 12px;
  color: #999;
  padding: 6px;
  background: #fff3e0;
}

/* 造句训练 */
.sentence-section {
  padding: 8px 0;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.empty-state .empty-icon {
  font-size: 56px;
}

.loading-state {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #f0f0f0;
  border-top-color: #667eea;
  border-radius: 50%;
  margin: 0 auto 12px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.exercise-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.exercise-hint {
  background: #f3e5f5;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 14px;
  color: #6a1b9a;
  margin-bottom: 12px;
  line-height: 1.5;
}

.hint-label {
  font-weight: 600;
}

.target-word {
  font-size: 14px;
  color: #666;
  margin-bottom: 16px;
}

.target-word strong {
  color: #667eea;
  font-size: 16px;
}

.arranged-area, .jumbled-area {
  margin-bottom: 16px;
}

.area-label {
  font-size: 13px;
  color: #999;
  margin-bottom: 8px;
  font-weight: 500;
}

.words-container {
  min-height: 56px;
  padding: 12px;
  border-radius: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.words-container.arranged {
  background: #f5f3ff;
  border: 2px dashed #667eea;
}

.words-container.jumbled {
  background: #fafafa;
  border: 2px solid #f0f0f0;
}

.placeholder {
  color: #ccc;
  font-size: 14px;
  width: 100%;
  text-align: center;
}

.word-btn {
  padding: 8px 14px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.word-btn.jumbled {
  background: white;
  color: #333;
  border: 1px solid #e0e0e0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.word-btn.jumbled:hover {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.word-btn.arranged {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
}

.word-btn.arranged:hover {
  opacity: 0.85;
}

.sentence-result {
  margin-top: 16px;
  padding: 16px;
  border-radius: 12px;
  text-align: center;
}

.sentence-result.correct {
  background: #e8f5e9;
}

.sentence-result.incorrect {
  background: #ffebee;
}

.result-icon {
  font-size: 36px;
  margin-bottom: 8px;
}

.result-text {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
}

.sentence-result.correct .result-text {
  color: #1b5e20;
}

.sentence-result.incorrect .result-text {
  color: #c62828;
}

.result-detail {
  text-align: left;
  font-size: 14px;
  color: #333;
  line-height: 1.8;
  background: rgba(255, 255, 255, 0.6);
  padding: 10px 12px;
  border-radius: 8px;
}

.result-detail .translation {
  color: #666;
  font-style: italic;
  margin-top: 4px;
}

.exercise-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

/* 语法检查 */
.grammar-section {
  padding: 8px 0;
}

.grammar-desc {
  font-size: 14px;
  color: #666;
  margin-bottom: 16px;
  line-height: 1.5;
}

.grammar-textarea {
  width: 100%;
  padding: 14px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  font-size: 15px;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 16px;
  background: white;
  line-height: 1.6;
}

.grammar-textarea:focus {
  outline: none;
  border-color: #667eea;
}

.grammar-result {
  margin-top: 20px;
}

.result-summary-box {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
  gap: 16px;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.score-display {
  text-align: center;
  flex-shrink: 0;
}

.score-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.score-number {
  font-size: 28px;
  font-weight: 700;
  color: #667eea;
}

.feedback-text {
  flex: 1;
  font-size: 14px;
  color: #333;
  line-height: 1.5;
}

.errors-list {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.errors-title {
  font-size: 15px;
  font-weight: 600;
  color: #c62828;
  margin-bottom: 12px;
}

.error-item {
  background: #fafafa;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 12px;
}

.error-item:last-child {
  margin-bottom: 0;
}

.error-original, .error-correction {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.error-tag {
  background: #f0f0f0;
  color: #666;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.error-text.wrong {
  color: #c62828;
  text-decoration: line-through;
}

.error-text.right {
  color: #1b5e20;
  font-weight: 500;
}

.error-arrow {
  text-align: center;
  color: #999;
  margin: 4px 0;
  font-size: 14px;
}

.error-explanation {
  margin-top: 8px;
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.no-errors {
  background: #e8f5e9;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  color: #1b5e20;
}

.no-errors-icon {
  font-size: 40px;
  margin-bottom: 8px;
}

/* 通用按钮 */
.btn-primary {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  transition: all 0.2s;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-secondary {
  padding: 14px;
  background: #f8f9fa;
  color: #333;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  flex: 1;
}

.btn-secondary.small {
  padding: 8px 14px;
  font-size: 13px;
  flex: none;
  border-radius: 8px;
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.exercise-actions .btn-primary,
.exercise-actions .btn-secondary {
  flex: 1;
}

/* 错误提示 */
.error-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(51, 51, 51, 0.95);
  color: white;
  padding: 12px 20px;
  border-radius: 24px;
  font-size: 14px;
  z-index: 1000;
  max-width: 90%;
  text-align: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>
