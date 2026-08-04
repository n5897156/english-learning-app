<template>
  <div class="ai-training-view">
    <!-- 顶部 Tab 切换 -->
    <div class="tab-switcher">
      <div
        :class="['tab-item', { active: activeTab === 'dialogue' }]"
        @click="activeTab = 'dialogue'"
      >
        {{ iconStyle === 'cute' ? '💬' : '🗣️' }} 对话
      </div>
      <div
        :class="['tab-item', { active: activeTab === 'text' }]"
        @click="activeTab = 'text'"
      >
        {{ iconStyle === 'cute' ? '📄' : '📑' }} 文本
      </div>
      <div
        :class="['tab-item', { active: activeTab === 'sentence' }]"
        @click="activeTab = 'sentence'"
      >
        {{ iconStyle === 'cute' ? '🧩' : '🔤' }} 造句
      </div>
      <div
        :class="['tab-item', { active: activeTab === 'grammar' }]"
        @click="activeTab = 'grammar'"
      >
        {{ iconStyle === 'cute' ? '✏️' : '📝' }} 语法
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

    <!-- 文本训练 -->
    <div v-if="activeTab === 'text'" class="text-section">
      <!-- 输入区 -->
      <div v-if="!textAnalysis" class="text-input-area">
        <div class="section-title">{{ iconStyle === 'cute' ? '📄' : '📑' }} 粘贴英文文章</div>
        <div class="text-desc">复制一段英文文章、新闻、邮件或任何想学的文本，AI 会提取关键句子生成中英对照训练</div>

        <textarea
          v-model="rawText"
          class="text-textarea"
          placeholder="在这里粘贴英文文章...&#10;&#10;例如：&#10;The best way to learn English is to practice every day. Reading, writing, listening, and speaking are all important skills..."
          rows="8"
        ></textarea>

        <div class="text-options">
          <label class="option-label">
            提取句数：
            <select v-model="extractCount" class="option-select">
              <option :value="5">5 句</option>
              <option :value="8">8 句</option>
              <option :value="10">10 句</option>
              <option :value="15">15 句</option>
            </select>
          </label>
        </div>

        <button
          class="btn-primary"
          @click="analyzeText"
          :disabled="!rawText.trim() || isAnalyzingText"
        >
          {{ isAnalyzingText ? 'AI 分析中...' : (iconStyle === 'cute' ? '🚀 开始分析提取' : '开始分析') }}
        </button>
      </div>

      <!-- 分析中 -->
      <div v-if="isAnalyzingText" class="loading-state">
        <div class="loading-spinner"></div>
        <div>AI 正在阅读文章并提取关键句子...</div>
      </div>

      <!-- 分析结果 -->
      <div v-if="textAnalysis && !isAnalyzingText" class="text-result">
        <div class="text-header">
          <button class="back-btn" @click="resetTextAnalysis">
            {{ iconStyle === 'cute' ? '← 换一篇' : '←' }}
          </button>
          <div class="text-title">
            {{ textAnalysis.title || '文章训练' }}
            <span :class="['difficulty-tag', textAnalysis.difficulty]">{{ textAnalysis.difficulty }}</span>
          </div>
        </div>

        <!-- 模式切换 -->
        <div class="mode-switcher">
          <div :class="['mode-item', { active: textMode === 'browse' }]" @click="textMode = 'browse'">
            📖 对照浏览
          </div>
          <div :class="['mode-item', { active: textMode === 'translate' }]" @click="textMode = 'translate'">
            ✍️ 看中写英
          </div>
          <div :class="['mode-item', { active: textMode === 'dictation' }]" @click="textMode = 'dictation'">
            🎧 听写训练
          </div>
          <div :class="['mode-item', { active: textMode === 'cloze' }]" @click="startClozeMode">
            🔲 填空测试
          </div>
        </div>

        <!-- 朗读整篇 -->
        <div class="read-all-bar">
          <button class="btn-secondary small" @click="speakAllSentences" :disabled="isSpeakingAll">
            {{ isSpeakingAll ? '⏹️ 停止朗读' : '🔊 朗读全部句子' }}
          </button>
          <span class="read-progress" v-if="isSpeakingAll">{{ currentSpeakIndex + 1 }} / {{ textAnalysis.sentences.length }}</span>
        </div>

        <!-- 对照浏览模式 -->
        <div v-if="textMode === 'browse'" class="browse-mode">
          <div
            v-for="sentence in textAnalysis.sentences"
            :key="sentence.id"
            class="sentence-card"
          >
            <div class="sentence-top">
              <span class="sentence-num">#{{ sentence.id }}</span>
              <button class="speak-btn small" @click="speak(sentence.english)" :disabled="isSpeakingAll">
                🔊
              </button>
            </div>
            <div class="sentence-en">{{ sentence.english }}</div>
            <div class="sentence-zh">{{ sentence.chinese }}</div>
            <div v-if="sentence.keyWords && sentence.keyWords.length" class="sentence-keywords">
              <span v-for="kw in sentence.keyWords" :key="kw" class="keyword-tag">{{ kw }}</span>
            </div>
            <div v-if="sentence.note" class="sentence-note">💡 {{ sentence.note }}</div>
          </div>
        </div>

        <!-- 看中写英模式 -->
        <div v-if="textMode === 'translate'" class="translate-mode">
          <div v-if="currentTranslateIdx < textAnalysis.sentences.length" class="translate-card">
            <div class="translate-progress">
              第 {{ currentTranslateIdx + 1 }} / {{ textAnalysis.sentences.length }} 句
            </div>
            <div class="translate-chinese">{{ textAnalysis.sentences[currentTranslateIdx].chinese }}</div>
            <div v-if="textAnalysis.sentences[currentTranslateIdx].keyWords?.length" class="translate-hint">
              提示词：{{ textAnalysis.sentences[currentTranslateIdx].keyWords.join(', ') }}
            </div>
            <textarea
              v-model="translateAnswer"
              class="translate-input"
              placeholder="根据中文翻译写出英文..."
              rows="3"
              :disabled="translateResult"
            ></textarea>
            <div v-if="!translateResult" class="translate-actions">
              <button class="btn-primary" @click="checkTranslate" :disabled="!translateAnswer.trim() || isCheckingTranslate">
                {{ isCheckingTranslate ? 'AI 评估中...' : '检查答案' }}
              </button>
              <button class="btn-secondary" @click="skipTranslate">跳过 →</button>
            </div>
            <div v-if="translateResult" :class="['translate-result', translateResult.correct ? 'correct' : 'incorrect']">
              <div class="result-icon">{{ translateResult.correct ? '🎉' : '😅' }}</div>
              <div class="result-text">{{ translateResult.correct ? '翻译正确！' : '有些小问题' }}</div>
              <div class="result-detail">
                <div><strong>原句：</strong>{{ textAnalysis.sentences[currentTranslateIdx].english }}</div>
                <div><strong>你的：</strong>{{ translateAnswer }}</div>
                <div class="feedback">{{ translateResult.feedback }}</div>
                <div v-if="translateResult.errors?.length" class="error-list">
                  <div v-for="(err, i) in translateResult.errors" :key="i" class="error-row">
                    <span class="wrong">{{ err.userText }}</span> → <span class="right">{{ err.correctText }}</span>
                    <div class="reason">{{ err.reason }}</div>
                  </div>
                </div>
              </div>
              <button class="btn-primary" @click="nextTranslate">下一句 →</button>
            </div>
          </div>
          <div v-else class="all-done">
            <div class="done-icon">🎊</div>
            <div>全部句子训练完成！</div>
            <button class="btn-primary" @click="restartTranslate">重新训练</button>
          </div>
        </div>

        <!-- 听写模式 -->
        <div v-if="textMode === 'dictation'" class="dictation-mode">
          <div v-if="currentDictationIdx < textAnalysis.sentences.length" class="dictation-card">
            <div class="translate-progress">
              第 {{ currentDictationIdx + 1 }} / {{ textAnalysis.sentences.length }} 句
            </div>
            <div class="dictation-hint">点击播放按钮听句子，然后写下你听到的英文</div>
            <div class="dictation-play">
              <button class="play-btn" @click="speak(textAnalysis.sentences[currentDictationIdx].english)" :disabled="isCheckingDictation">
                🔊 播放
              </button>
              <button class="play-btn secondary" @click="speakSlow(textAnalysis.sentences[currentDictationIdx].english)">
                🐢 慢速
              </button>
            </div>
            <textarea
              v-model="dictationAnswer"
              class="translate-input"
              placeholder="写下你听到的英文..."
              rows="3"
              :disabled="dictationResult"
            ></textarea>
            <div v-if="!dictationResult" class="translate-actions">
              <button class="btn-primary" @click="checkDictation" :disabled="!dictationAnswer.trim() || isCheckingDictation">
                {{ isCheckingDictation ? 'AI 评估中...' : '检查答案' }}
              </button>
              <button class="btn-secondary" @click="showDictationHint = !showDictationHint">
                {{ showDictationHint ? '隐藏提示' : '看中文提示' }}
              </button>
            </div>
            <div v-if="showDictationHint && !dictationResult" class="translate-chinese hint">
              {{ textAnalysis.sentences[currentDictationIdx].chinese }}
            </div>
            <div v-if="dictationResult" :class="['translate-result', dictationResult.correct ? 'correct' : 'incorrect']">
              <div class="result-icon">{{ dictationResult.correct ? '🎉' : '😅' }}</div>
              <div class="result-text">{{ dictationResult.correct ? '听写正确！' : '有些小问题' }}</div>
              <div class="result-detail">
                <div><strong>原句：</strong>{{ textAnalysis.sentences[currentDictationIdx].english }}</div>
                <div><strong>你的：</strong>{{ dictationAnswer }}</div>
                <div class="feedback">{{ dictationResult.feedback }}</div>
              </div>
              <button class="btn-primary" @click="nextDictation">下一句 →</button>
            </div>
          </div>
          <div v-else class="all-done">
            <div class="done-icon">🎧</div>
            <div>听写训练完成！</div>
            <button class="btn-primary" @click="restartDictation">重新训练</button>
          </div>
        </div>

        <!-- 填空测试模式 -->
        <div v-if="textMode === 'cloze'" class="cloze-mode">
          <div v-if="clozeLoading" class="loading-state">
            <div class="loading-spinner"></div>
            <div>AI 正在生成填空题...</div>
          </div>
          <div v-else-if="currentCloze" class="cloze-card">
            <div class="translate-progress">
              第 {{ currentClozeIdx + 1 }} / {{ textAnalysis.sentences.length }} 句
            </div>
            <div class="cloze-question">{{ currentCloze.question }}</div>
            <div v-if="currentCloze.hint" class="cloze-hint">💡 {{ currentCloze.hint }}</div>
            <div class="cloze-options">
              <button
                v-for="(opt, i) in currentCloze.blanks[0].options"
                :key="i"
                :class="['cloze-option', {
                  selected: clozeSelected === i,
                  correct: clozeResult && i === currentCloze.blanks[0].correctIdx,
                  wrong: clozeResult && clozeSelected === i && i !== currentCloze.blanks[0].correctIdx
                }]"
                @click="selectCloze(i)"
                :disabled="clozeResult"
              >
                {{ opt }}
              </button>
            </div>
            <div v-if="clozeResult" :class="['translate-result', clozeResult.correct ? 'correct' : 'incorrect']">
              <div class="result-icon">{{ clozeResult.correct ? '🎉' : '😅' }}</div>
              <div class="result-text">{{ clozeResult.correct ? '选对了！' : '答错了' }}</div>
              <div class="result-detail">
                <div><strong>答案：</strong>{{ currentCloze.blanks[0].answer }}</div>
                <div><strong>原句：</strong>{{ currentCloze.originalSentence }}</div>
              </div>
              <button class="btn-primary" @click="nextCloze">下一题 →</button>
            </div>
          </div>
          <div v-else class="all-done">
            <div class="done-icon">🎓</div>
            <div>填空测试完成！</div>
            <button class="btn-primary" @click="restartCloze">重新开始</button>
          </div>
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
  getAdaptiveLevel,
  extractSentencesForTraining,
  checkTranslationAnswer,
  generateClozeExercise
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

// 文本训练状态
const rawText = ref('')
const extractCount = ref(8)
const textAnalysis = ref(null)
const isAnalyzingText = ref(false)
const textMode = ref('browse') // browse | translate | dictation | cloze

// 朗读全部句子
const isSpeakingAll = ref(false)
const currentSpeakIndex = ref(-1)
let speakAllAbort = false

// 看中写英
const currentTranslateIdx = ref(0)
const translateAnswer = ref('')
const translateResult = ref(null)
const isCheckingTranslate = ref(false)

// 听写
const currentDictationIdx = ref(0)
const dictationAnswer = ref('')
const dictationResult = ref(null)
const isCheckingDictation = ref(false)
const showDictationHint = ref(false)

// 填空
const currentClozeIdx = ref(0)
const currentCloze = ref(null)
const clozeLoading = ref(false)
const clozeSelected = ref(-1)
const clozeResult = ref(null)

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

// ========== 文本训练方法 ==========

// 分析文章提取句子
async function analyzeText() {
  const text = rawText.value.trim()
  if (!text || isAnalyzingText.value) return

  isAnalyzingText.value = true
  textAnalysis.value = null

  try {
    const result = await extractSentencesForTraining(text, { count: extractCount.value })
    if (!result.sentences || result.sentences.length === 0) {
      showError('未能提取句子，请换一段文本试试')
      return
    }
    textAnalysis.value = result
    textMode.value = 'browse'
    resetTextTrainingState()
  } catch (err) {
    showError(err.message || '分析文章失败，请稍后重试')
  } finally {
    isAnalyzingText.value = false
  }
}

// 重置文本训练状态
function resetTextTrainingState() {
  currentTranslateIdx.value = 0
  translateAnswer.value = ''
  translateResult.value = null
  currentDictationIdx.value = 0
  dictationAnswer.value = ''
  dictationResult.value = null
  showDictationHint.value = false
  currentClozeIdx.value = 0
  currentCloze.value = null
  clozeSelected.value = -1
  clozeResult.value = null
}

// 重置分析（换一篇）
function resetTextAnalysis() {
  stopSpeakAll()
  textAnalysis.value = null
  rawText.value = ''
  resetTextTrainingState()
}

// 慢速朗读
function speakSlow(text) {
  if (!('speechSynthesis' in window)) {
    showError('当前浏览器不支持语音朗读')
    return
  }
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = 0.6
  utterance.pitch = 1
  window.speechSynthesis.speak(utterance)
}

// 朗读全部句子
async function speakAllSentences() {
  if (isSpeakingAll.value) {
    stopSpeakAll()
    return
  }
  if (!textAnalysis.value?.sentences?.length) return
  if (!('speechSynthesis' in window)) {
    showError('当前浏览器不支持语音朗读')
    return
  }

  isSpeakingAll.value = true
  speakAllAbort = false

  for (let i = 0; i < textAnalysis.value.sentences.length; i++) {
    if (speakAllAbort) break
    currentSpeakIndex.value = i
    const sentence = textAnalysis.value.sentences[i].english
    await new Promise(resolve => {
      const utterance = new SpeechSynthesisUtterance(sentence)
      utterance.lang = 'en-US'
      utterance.rate = 0.9
      utterance.onend = resolve
      utterance.onerror = resolve
      window.speechSynthesis.speak(utterance)
    })
    // 句子之间小停顿
    if (!speakAllAbort) await new Promise(r => setTimeout(r, 500))
  }

  isSpeakingAll.value = false
  currentSpeakIndex.value = -1
}

function stopSpeakAll() {
  if (!isSpeakingAll.value) return
  speakAllAbort = true
  window.speechSynthesis.cancel()
  isSpeakingAll.value = false
  currentSpeakIndex.value = -1
}

// --- 看中写英 ---
async function checkTranslate() {
  const answer = translateAnswer.value.trim()
  if (!answer || isCheckingTranslate.value) return
  isCheckingTranslate.value = true
  translateResult.value = null
  try {
    const sentence = textAnalysis.value.sentences[currentTranslateIdx.value]
    const result = await checkTranslationAnswer(sentence.english, answer)
    translateResult.value = result
    recordExerciseResult('grammar', result.correct)
    currentLevel.value = getAdaptiveStats().level
  } catch (err) {
    showError(err.message || '评估失败，请重试')
  } finally {
    isCheckingTranslate.value = false
  }
}

function nextTranslate() {
  currentTranslateIdx.value++
  translateAnswer.value = ''
  translateResult.value = null
}

function skipTranslate() {
  // 记录为错误
  recordExerciseResult('grammar', false)
  currentLevel.value = getAdaptiveStats().level
  nextTranslate()
}

function restartTranslate() {
  currentTranslateIdx.value = 0
  translateAnswer.value = ''
  translateResult.value = null
}

// --- 听写 ---
async function checkDictation() {
  const answer = dictationAnswer.value.trim()
  if (!answer || isCheckingDictation.value) return
  isCheckingDictation.value = true
  dictationResult.value = null
  try {
    const sentence = textAnalysis.value.sentences[currentDictationIdx.value]
    const result = await checkTranslationAnswer(sentence.english, answer)
    dictationResult.value = result
    recordExerciseResult('listening', result.correct)
    currentLevel.value = getAdaptiveStats().level
  } catch (err) {
    showError(err.message || '评估失败，请重试')
  } finally {
    isCheckingDictation.value = false
  }
}

function nextDictation() {
  currentDictationIdx.value++
  dictationAnswer.value = ''
  dictationResult.value = null
  showDictationHint.value = false
}

function restartDictation() {
  currentDictationIdx.value = 0
  dictationAnswer.value = ''
  dictationResult.value = null
  showDictationHint.value = false
}

// --- 填空 ---
async function startClozeMode() {
  textMode.value = 'cloze'
  currentClozeIdx.value = 0
  clozeSelected.value = -1
  clozeResult.value = null
  await loadClozeExercise()
}

async function loadClozeExercise() {
  if (currentClozeIdx.value >= textAnalysis.value.sentences.length) return
  clozeLoading.value = true
  currentCloze.value = null
  clozeSelected.value = -1
  clozeResult.value = null
  try {
    const sentence = textAnalysis.value.sentences[currentClozeIdx.value]
    const result = await generateClozeExercise(sentence.english, sentence.keyWords || [])
    // 补充正确答案索引和原句
    const correctAnswer = result.blanks[0].answer
    result.blanks[0].correctIdx = result.blanks[0].options.indexOf(correctAnswer)
    // 选项顺序打乱（API 返回的可能是 [答案, 干扰项...]，打乱更公平）
    if (result.blanks[0].correctIdx === 0) {
      const shuffled = [...result.blanks[0].options].sort(() => Math.random() - 0.5)
      result.blanks[0].options = shuffled
      result.blanks[0].correctIdx = shuffled.indexOf(correctAnswer)
    }
    result.originalSentence = sentence.english
    currentCloze.value = result
  } catch (err) {
    showError(err.message || '生成填空题失败')
    // 跳到下一句
    nextCloze()
  } finally {
    clozeLoading.value = false
  }
}

function selectCloze(idx) {
  if (clozeResult.value) return
  clozeSelected.value = idx
  const correct = idx === currentCloze.value.blanks[0].correctIdx
  clozeResult.value = { correct }
  recordExerciseResult('vocabulary', correct)
  currentLevel.value = getAdaptiveStats().level
}

async function nextCloze() {
  currentClozeIdx.value++
  clozeSelected.value = -1
  clozeResult.value = null
  if (currentClozeIdx.value < textAnalysis.value.sentences.length) {
    await loadClozeExercise()
  } else {
    currentCloze.value = null
  }
}

async function restartCloze() {
  currentClozeIdx.value = 0
  clozeSelected.value = -1
  clozeResult.value = null
  await loadClozeExercise()
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

/* ========== 文本训练 ========== */
.text-section {
  padding: 8px 0;
}

.text-input-area {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.text-desc {
  font-size: 13px;
  color: #888;
  margin-bottom: 14px;
  line-height: 1.6;
}

.text-textarea {
  width: 100%;
  padding: 14px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  font-size: 15px;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 14px;
  background: #fafafa;
  line-height: 1.7;
  box-sizing: border-box;
}

.text-textarea:focus {
  outline: none;
  border-color: #667eea;
  background: white;
}

.text-options {
  margin-bottom: 16px;
}

.option-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #555;
}

.option-select {
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  outline: none;
}

.text-result {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.text-header {
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  padding: 14px 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.text-title {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.difficulty-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.difficulty-tag.初级 {
  background: #e8f5e9;
  color: #2e7d32;
}

.difficulty-tag.中级 {
  background: #fff3e0;
  color: #ef6c00;
}

.difficulty-tag.高级 {
  background: #ffebee;
  color: #c62828;
}

.mode-switcher {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  background: white;
  padding: 8px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.mode-item {
  text-align: center;
  padding: 12px 8px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  font-weight: 500;
}

.mode-item.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.read-all-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  padding: 10px 14px;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.read-progress {
  font-size: 13px;
  color: #667eea;
  font-weight: 500;
}

/* 对照浏览 */
.browse-mode {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sentence-card {
  background: white;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.sentence-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.sentence-num {
  font-size: 12px;
  color: #999;
  font-weight: 600;
  background: #f5f3ff;
  padding: 2px 8px;
  border-radius: 10px;
}

.sentence-en {
  font-size: 15px;
  color: #333;
  line-height: 1.6;
  margin-bottom: 6px;
  font-weight: 500;
}

.sentence-zh {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  margin-bottom: 8px;
}

.sentence-keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.keyword-tag {
  font-size: 11px;
  background: #e3f2fd;
  color: #1565c0;
  padding: 3px 8px;
  border-radius: 10px;
}

.sentence-note {
  font-size: 12px;
  color: #7c4dff;
  background: #f3e5f5;
  padding: 8px 10px;
  border-radius: 8px;
  line-height: 1.5;
}

.speak-btn.small {
  padding: 4px 8px;
  font-size: 13px;
  border-radius: 8px;
}

/* 翻译/听写/填空 共用 */
.translate-card,
.dictation-card,
.cloze-card {
  background: white;
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.translate-progress {
  font-size: 13px;
  color: #667eea;
  font-weight: 600;
  margin-bottom: 14px;
}

.translate-chinese {
  font-size: 17px;
  color: #333;
  line-height: 1.6;
  padding: 14px 16px;
  background: #f5f3ff;
  border-radius: 10px;
  margin-bottom: 12px;
  font-weight: 500;
}

.translate-chinese.hint {
  font-size: 14px;
  color: #666;
  background: #fff8e1;
  font-weight: 400;
}

.translate-hint {
  font-size: 13px;
  color: #7c4dff;
  margin-bottom: 12px;
}

.translate-input {
  width: 100%;
  padding: 14px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-size: 15px;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 14px;
  background: white;
  line-height: 1.6;
  box-sizing: border-box;
}

.translate-input:focus {
  outline: none;
  border-color: #667eea;
}

.translate-input:disabled {
  background: #fafafa;
}

.translate-actions {
  display: flex;
  gap: 10px;
}

.translate-actions .btn-primary,
.translate-actions .btn-secondary {
  flex: 1;
}

.dictation-hint {
  font-size: 13px;
  color: #666;
  margin-bottom: 12px;
  text-align: center;
}

.dictation-play {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 14px;
}

.play-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.play-btn.secondary {
  background: white;
  color: #667eea;
  border: 1px solid #667eea;
  box-shadow: none;
}

.play-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.translate-result {
  margin-top: 16px;
  padding: 16px;
  border-radius: 12px;
  text-align: center;
}

.translate-result.correct {
  background: #e8f5e9;
}

.translate-result.incorrect {
  background: #ffebee;
}

.result-detail {
  text-align: left;
  font-size: 14px;
  color: #333;
  line-height: 1.8;
  background: rgba(255, 255, 255, 0.6);
  padding: 12px;
  border-radius: 8px;
  margin: 12px 0;
}

.result-detail .feedback {
  color: #667eea;
  margin-top: 6px;
  font-style: italic;
}

.error-list {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.error-row {
  font-size: 13px;
  margin-bottom: 6px;
  line-height: 1.6;
}

.error-row .wrong {
  color: #c62828;
  text-decoration: line-through;
}

.error-row .right {
  color: #1b5e20;
  font-weight: 500;
}

.error-row .reason {
  color: #888;
  font-size: 12px;
  margin-top: 2px;
}

/* 填空 */
.cloze-question {
  font-size: 17px;
  color: #333;
  line-height: 1.8;
  padding: 16px;
  background: #f5f3ff;
  border-radius: 10px;
  margin-bottom: 14px;
  text-align: center;
}

.cloze-question ::deep(.blank) {
  color: #667eea;
  font-weight: 700;
}

.cloze-hint {
  font-size: 13px;
  color: #7c4dff;
  text-align: center;
  margin-bottom: 14px;
}

.cloze-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.cloze-option {
  padding: 14px 12px;
  border: 2px solid #e0e0e0;
  background: white;
  border-radius: 10px;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
  color: #333;
}

.cloze-option:hover:not(:disabled) {
  border-color: #667eea;
  background: #f5f3ff;
}

.cloze-option.selected {
  border-color: #667eea;
  background: #ede9fe;
}

.cloze-option.correct {
  border-color: #1b5e20;
  background: #e8f5e9;
  color: #1b5e20;
}

.cloze-option.wrong {
  border-color: #c62828;
  background: #ffebee;
  color: #c62828;
}

.cloze-option:disabled {
  cursor: not-allowed;
}

.all-done {
  background: white;
  border-radius: 14px;
  padding: 40px 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.done-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.all-done > div:nth-child(2) {
  font-size: 17px;
  color: #333;
  font-weight: 500;
  margin-bottom: 20px;
}
</style>
