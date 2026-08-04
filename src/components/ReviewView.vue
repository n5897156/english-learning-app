<template>
  <div class="review-view">
    <div v-if="!isReviewing && reviewQueue.length === 0 && props.vocabList.length === 0" class="empty-state">
      <div class="empty-icon">{{ iconStyle === 'cute' ? '🎉' : '✅' }}</div>
      <div>暂无单词</div>
      <div style="font-size: 14px; margin-top: 8px;">在词汇页面添加单词</div>
    </div>
    
    <div v-else-if="!isReviewing" class="review-start">
      <div class="review-stats">
        <div class="stat-item">
          <div class="stat-value">{{ reviewQueue.length }}</div>
          <div class="stat-label">待复习</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ masteredCount }}</div>
          <div class="stat-label">已掌握</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ props.vocabList.length }}</div>
          <div class="stat-label">总单词</div>
        </div>
      </div>
      
      <div class="review-info">
        <div>{{ iconStyle === 'cute' ? '📚' : '📖' }} 根据艾宾浩斯遗忘曲线智能安排复习</div>
      </div>
      
      <div class="ebbinghaus-chart">
        <div class="chart-title">{{ iconStyle === 'cute' ? '📈' : '📊' }} 遗忘曲线可视化</div>
        <div class="chart-container">
          <svg viewBox="0 0 300 150" class="curve-svg">
            <defs>
              <linearGradient id="memoryGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#667eea;stop-opacity:0.3" />
                <stop offset="100%" style="stop-color:#667eea;stop-opacity:0.05" />
              </linearGradient>
              <linearGradient id="reviewGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#4caf50;stop-opacity:0.3" />
                <stop offset="100%" style="stop-color:#4caf50;stop-opacity:0.05" />
              </linearGradient>
            </defs>
            <path 
              :d="ebbCurvePath" 
              fill="none" 
              stroke="#667eea" 
              stroke-width="2"
              stroke-dasharray="5,5"
              class="ebb-curve"
            />
            <path 
              :d="reviewCurvePath" 
              fill="none" 
              stroke="#4caf50" 
              stroke-width="2"
              class="review-curve"
            />
            <circle 
              v-for="(point, index) in reviewPoints" 
              :key="index"
              :cx="point.x" 
              :cy="point.y" 
              r="4" 
              fill="#4caf50"
            />
          </svg>
          <div class="chart-legend">
            <div class="legend-item">
              <span class="legend-color" style="background: #667eea;"></span>
              <span>理论遗忘曲线</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" style="background: #4caf50;"></span>
              <span>你的复习进度</span>
            </div>
          </div>
        </div>
        <div class="level-distribution">
          <div class="level-title">复习等级分布</div>
          <div class="level-bars">
            <div 
              v-for="(count, level) in levelDistribution" 
              :key="level"
              class="level-bar-item"
            >
              <div class="level-label">Lv.{{ level }}</div>
              <div class="level-bar-container">
                <div 
                  class="level-bar" 
                  :style="{ width: (count / maxLevelCount * 100) + '%' }"
                  :class="'level-' + level"
                ></div>
              </div>
              <div class="level-count">{{ count }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="review-actions">
        <button class="btn-primary" @click="startReview">
          {{ iconStyle === 'cute' ? '🚀' : '▶️' }} 开始复习
        </button>
        <button class="btn-secondary" @click="showAddReviewModal = true">
          {{ iconStyle === 'cute' ? '➕' : '+' }} 手动添加复习
        </button>
      </div>
    </div>
    
    <div v-if="showAddReviewModal" class="modal-overlay" @click.self="showAddReviewModal = false">
      <div class="modal-content">
        <div class="modal-title">选择要复习的单词</div>
        <div class="vocab-select-list">
          <div 
            v-for="vocab in props.vocabList" 
            :key="vocab.id"
            :class="['vocab-select-item', { selected: selectedVocabIds.includes(vocab.id) }]"
            @click="toggleVocabSelection(vocab.id)"
          >
            <span class="vocab-word">{{ vocab.word }}</span>
            <span class="vocab-meaning">{{ vocab.meaning }}</span>
            <span v-if="selectedVocabIds.includes(vocab.id)" class="selected-mark">✓</span>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showAddReviewModal = false">取消</button>
          <button class="btn-primary" @click="addSelectedToReview">添加到复习</button>
        </div>
      </div>
    </div>
    
    <div v-if="isReviewing" class="review-content">
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: progressPercent + '%' }"
        ></div>
      </div>
      <div class="progress-text">{{ currentIndex + 1 }} / {{ reviewQueue.length }}</div>
      
      <div v-if="!showResult" class="question-card">
        <div class="question-type">
          {{ currentQuestion.type === 'meaning' ? '英译中' : '中译英' }}
        </div>
        
        <div class="question-content">
          <div class="question-word">{{ currentQuestion.question }}</div>
        </div>
        
        <div v-if="currentQuestion.type === 'choice'" class="choices">
          <button 
            v-for="(choice, index) in currentQuestion.choices" 
            :key="index"
            :class="['choice-btn', { selected: selectedChoice === index }]"
            @click="selectChoice(index)"
          >
            {{ ['A', 'B', 'C', 'D'][index] }}. {{ choice }}
          </button>
        </div>
        
        <div v-else class="answer-input-wrapper">
          <input 
            type="text" 
            v-model="userAnswer" 
            placeholder="输入答案..." 
            class="answer-input"
            @keyup.enter="checkAnswer"
          />
        </div>
        
        <button class="btn-primary" @click="checkAnswer">确认答案</button>
      </div>
      
      <div v-else class="result-card" :class="isCorrect ? 'correct' : 'incorrect'">
        <div class="result-icon">{{ isCorrect ? '🎉' : '😅' }}</div>
        <div class="result-text">{{ isCorrect ? '回答正确！' : '回答错误' }}</div>
        
        <div class="result-details">
          <div class="detail-item">
            <span>单词:</span>
            <span>{{ currentVocab.word }}</span>
          </div>
          <div v-if="currentVocab.phonetic" class="detail-item">
            <span>音标:</span>
            <span>{{ currentVocab.phonetic }}</span>
          </div>
          <div class="detail-item">
            <span>释义:</span>
            <span>{{ currentVocab.meaning }}</span>
          </div>
          <div v-if="currentVocab.example" class="detail-item">
            <span>例句:</span>
            <span>{{ currentVocab.example }}</span>
          </div>
        </div>
        
        <button class="btn-primary" @click="nextQuestion">
          {{ currentIndex >= reviewQueue.length - 1 ? '完成复习' : '下一个' }}
        </button>
      </div>
    </div>
    
    <div v-if="showResultSummary" class="result-summary">
      <div class="summary-icon">{{ correctCount === reviewQueue.length ? '🏆' : '📊' }}</div>
      <div class="summary-title">复习完成！</div>
      <div class="summary-score">
        <span class="score-value">{{ correctCount }}</span>
        <span class="score-divider">/</span>
        <span class="score-total">{{ reviewQueue.length }}</span>
      </div>
      <div class="summary-percent">正确率: {{ Math.round((correctCount / reviewQueue.length) * 100) }}%</div>
      
      <button class="btn-primary" @click="restartReview">再复习一次</button>
      <button class="btn-secondary" @click="exitReview">返回</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps({
  vocabList: {
    type: Array,
    default: () => []
  },
  iconStyle: {
    type: String,
    default: 'cute'
  }
})

const emit = defineEmits(['update'])

const isReviewing = ref(false)
const currentIndex = ref(0)
const userAnswer = ref('')
const selectedChoice = ref(null)
const showResult = ref(false)
const isCorrect = ref(false)
const correctCount = ref(0)
const showResultSummary = ref(false)
const reviewQueue = ref([])
const currentVocab = ref(null)
const currentQuestion = ref(null)
const showAddReviewModal = ref(false)
const selectedVocabIds = ref([])

const masteredCount = computed(() => {
  return props.vocabList.filter(v => v.reviewLevel >= 6).length
})

const progressPercent = computed(() => {
  if (reviewQueue.value.length === 0) return 0
  return ((currentIndex.value + 1) / reviewQueue.value.length) * 100
})

const ebbCurvePath = computed(() => {
  const points = []
  for (let i = 0; i <= 10; i++) {
    const x = i * 30
    const forgettingRate = Math.exp(-i * 0.3) * 100
    const y = 150 - (forgettingRate * 1.3)
    points.push(`${x},${y}`)
  }
  return `M ${points.join(' L ')}`
})

const reviewCurvePath = computed(() => {
  const points = []
  const days = [0, 1, 2, 4, 7, 14, 28]
  days.forEach((day, i) => {
    const x = (day / 28) * 280 + 10
    const levelCount = props.vocabList.filter(v => v.reviewLevel === i + 1).length
    const retention = Math.min(100, levelCount * 20 + 30)
    const y = 150 - (retention * 1.3)
    points.push(`${x},${y}`)
  })
  if (points.length === 0) return ''
  return `M ${points.join(' L ')}`
})

const reviewPoints = computed(() => {
  const points = []
  const days = [0, 1, 2, 4, 7, 14, 28]
  days.forEach((day, i) => {
    const x = (day / 28) * 280 + 10
    const levelCount = props.vocabList.filter(v => v.reviewLevel === i + 1).length
    const retention = Math.min(100, levelCount * 20 + 30)
    const y = 150 - (retention * 1.3)
    points.push({ x, y })
  })
  return points
})

const levelDistribution = computed(() => {
  const dist = {}
  for (let i = 1; i <= 6; i++) {
    dist[i] = props.vocabList.filter(v => v.reviewLevel === i).length
  }
  return dist
})

const maxLevelCount = computed(() => {
  return Math.max(...Object.values(levelDistribution.value), 1)
})

function loadReviewQueue() {
  reviewQueue.value = props.vocabList.filter(v => new Date(v.nextReview) <= new Date())
}

function toggleVocabSelection(id) {
  const index = selectedVocabIds.value.indexOf(id)
  if (index > -1) {
    selectedVocabIds.value.splice(index, 1)
  } else {
    selectedVocabIds.value.push(id)
  }
}

function addSelectedToReview() {
  if (selectedVocabIds.value.length === 0) {
    alert('请选择要复习的单词')
    return
  }
  
  let vocab = JSON.parse(localStorage.getItem('vocab') || '[]')
  selectedVocabIds.value.forEach(id => {
    const item = vocab.find(v => v.id === id)
    if (item) {
      item.nextReview = new Date().toISOString()
    }
  })
  localStorage.setItem('vocab', JSON.stringify(vocab))
  emit('update')
  showAddReviewModal.value = false
  selectedVocabIds.value = []
  loadReviewQueue()
  alert('已添加到复习列表')
}

function startReview() {
  loadReviewQueue()
  if (reviewQueue.value.length === 0) {
    alert('暂无待复习单词')
    return
  }
  
  isReviewing.value = true
  currentIndex.value = 0
  correctCount.value = 0
  showResultSummary.value = false
  generateQuestion(reviewQueue.value[0])
}

function generateQuestion(vocab) {
  currentVocab.value = vocab
  userAnswer.value = ''
  selectedChoice.value = null
  showResult.value = false
  
  const types = ['meaning', 'spelling', 'choice']
  const type = types[Math.floor(Math.random() * types.length)]
  
  if (type === 'meaning') {
    currentQuestion.value = {
      type: 'meaning',
      question: vocab.word,
      answer: vocab.meaning
    }
  } else if (type === 'spelling') {
    currentQuestion.value = {
      type: 'spelling',
      question: vocab.meaning,
      answer: vocab.word
    }
  } else {
    const wrongOptions = props.vocabList
      .filter(v => v.id !== vocab.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(v => v.meaning)
    const choices = [...wrongOptions, vocab.meaning].sort(() => Math.random() - 0.5)
    
    currentQuestion.value = {
      type: 'choice',
      question: `单词 "${vocab.word}" 的中文意思是？`,
      choices: choices,
      correctIndex: choices.indexOf(vocab.meaning),
      answer: vocab.meaning
    }
  }
}

function selectChoice(index) {
  selectedChoice.value = index
}

function checkAnswer() {
  let answerCorrect = false
  
  if (currentQuestion.value.type === 'choice') {
    answerCorrect = selectedChoice.value === currentQuestion.value.correctIndex
  } else {
    const expected = currentQuestion.value.answer.toLowerCase().trim()
    const actual = userAnswer.value.toLowerCase().trim()
    answerCorrect = actual === expected
  }
  
  isCorrect.value = answerCorrect
  if (answerCorrect) correctCount.value++
  
  updateReviewLevel(answerCorrect)
  showResult.value = true
}

function updateReviewLevel(isCorrect) {
  const vocabIndex = props.vocabList.findIndex(v => v.id === currentVocab.value.id)
  if (vocabIndex !== -1) {
    const vocab = props.vocabList[vocabIndex]
    
    if (isCorrect) {
      vocab.reviewLevel = Math.min(vocab.reviewLevel + 1, 6)
    } else {
      vocab.reviewLevel = Math.max(vocab.reviewLevel - 1, 1)
    }
    
    const days = getNextReviewDays(vocab.reviewLevel)
    vocab.nextReview = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
    
    localStorage.setItem('vocab', JSON.stringify(props.vocabList))
    emit('update')
  }
}

function getNextReviewDays(level) {
  const days = [1, 2, 4, 7, 14, 28]
  return days[Math.min(level - 1, days.length - 1)] || 28
}

function nextQuestion() {
  if (currentIndex.value >= reviewQueue.value.length - 1) {
    showResultSummary.value = true
    isReviewing.value = false
    return
  }
  
  currentIndex.value++
  generateQuestion(reviewQueue.value[currentIndex.value])
}

function restartReview() {
  showResultSummary.value = false
  startReview()
}

function exitReview() {
  isReviewing.value = false
  showResultSummary.value = false
  loadReviewQueue()
}

onMounted(() => {
  loadReviewQueue()
})

watch(() => props.vocabList, () => {
  loadReviewQueue()
}, { deep: true })
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.empty-icon {
  font-size: 56px;
  margin-bottom: 16px;
}

.review-start {
  padding: 20px;
}

.review-stats {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-bottom: 24px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 36px;
  font-weight: 700;
  color: #667eea;
}

.stat-label {
  font-size: 14px;
  color: #999;
  margin-top: 4px;
}

.review-info {
  text-align: center;
  padding: 16px;
  background: #f3e5f5;
  border-radius: 12px;
  margin-bottom: 24px;
  color: #667eea;
}

.ebbinghaus-chart {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #333;
}

.chart-container {
  margin-bottom: 20px;
}

.curve-svg {
  width: 100%;
  height: 120px;
  background: #fafafa;
  border-radius: 8px;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
}

.legend-color {
  width: 16px;
  height: 3px;
  border-radius: 2px;
}

.level-distribution {
  margin-top: 16px;
}

.level-title {
  font-size: 14px;
  font-weight: 500;
  color: #666;
  margin-bottom: 12px;
}

.level-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.level-bar-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.level-label {
  width: 40px;
  font-size: 13px;
  color: #666;
}

.level-bar-container {
  flex: 1;
  height: 12px;
  background: #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
}

.level-bar {
  height: 100%;
  border-radius: 6px;
  transition: width 0.3s;
}

.level-bar.level-1 {
  background: #ffebee;
}

.level-bar.level-2 {
  background: #ffecb3;
}

.level-bar.level-3 {
  background: #e8f5e9;
}

.level-bar.level-4 {
  background: #c8e6c9;
}

.level-bar.level-5 {
  background: #a5d6a7;
}

.level-bar.level-6 {
  background: #66bb6a;
}

.level-count {
  width: 30px;
  text-align: right;
  font-size: 13px;
  color: #666;
}

.review-actions {
  display: flex;
  gap: 12px;
}

.btn-primary {
  flex: 1;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-secondary {
  flex: 1;
  padding: 16px;
  background: #f8f9fa;
  color: #333;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}

.vocab-select-list {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 16px;
}

.vocab-select-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.vocab-select-item:hover {
  border-color: #667eea;
}

.vocab-select-item.selected {
  border-color: #667eea;
  background: #f5f3ff;
}

.vocab-select-item .vocab-word {
  font-weight: 600;
  font-size: 16px;
}

.vocab-select-item .vocab-meaning {
  font-size: 14px;
  color: #666;
  margin-left: 12px;
}

.vocab-select-item .selected-mark {
  color: #667eea;
  font-weight: bold;
  font-size: 18px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.modal-actions .btn-primary,
.modal-actions .btn-secondary {
  flex: 1;
  margin-top: 0;
}

.review-content {
  padding: 20px;
}

.progress-bar {
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  margin-bottom: 8px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px;
  transition: width 0.3s;
}

.progress-text {
  text-align: center;
  font-size: 14px;
  color: #999;
  margin-bottom: 24px;
}

.question-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
}

.question-type {
  font-size: 14px;
  color: #667eea;
  font-weight: 500;
  margin-bottom: 16px;
}

.question-content {
  text-align: center;
  margin-bottom: 24px;
}

.question-word {
  font-size: 28px;
  font-weight: 600;
  color: #333;
}

.choices {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.choice-btn {
  padding: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 16px;
  text-align: left;
  cursor: pointer;
  background: white;
  transition: all 0.2s;
}

.choice-btn.selected {
  border-color: #667eea;
  background: #f3e5f5;
}

.answer-input-wrapper {
  margin-bottom: 24px;
}

.answer-input {
  width: 100%;
  padding: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 18px;
  text-align: center;
}

.answer-input:focus {
  outline: none;
  border-color: #667eea;
}

.result-card {
  background: #e8f5e9;
  border-radius: 16px;
  padding: 24px;
  text-align: center;
}

.result-card.incorrect {
  background: #ffebee;
}

.result-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.result-text {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
}

.result-card.correct .result-text {
  color: #1b5e20;
}

.result-card.incorrect .result-text {
  color: #c62828;
}

.result-details {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 15px;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-item span:first-child {
  color: #999;
}

.detail-item span:last-child {
  font-weight: 500;
}

.result-summary {
  text-align: center;
  padding: 40px 20px;
}

.summary-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.summary-title {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
}

.summary-score {
  margin-bottom: 8px;
}

.score-value {
  font-size: 56px;
  font-weight: 700;
  color: #667eea;
}

.score-divider {
  font-size: 32px;
  color: #999;
  margin: 0 8px;
}

.score-total {
  font-size: 32px;
  color: #999;
}

.summary-percent {
  font-size: 18px;
  color: #666;
  margin-bottom: 32px;
}
</style>
