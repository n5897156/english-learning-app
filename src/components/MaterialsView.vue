<template>
  <div class="materials-view">
    <div class="toolbar">
      <button class="btn-secondary" @click="showAddModal = true">
        {{ iconStyle === 'cute' ? '➕' : '+' }} 添加新资料
      </button>
      <button class="btn-primary" @click="syncMaterials">
        {{ iconStyle === 'cute' ? '🔄' : '🔃' }} 同步资料
      </button>
    </div>
    
    <div class="search-bar">
      <input 
        type="text" 
        v-model="searchQuery" 
        placeholder="搜索资料..." 
        class="search-input"
      />
    </div>
    
    <div class="materials-list">
      <div v-if="filteredMaterials.length === 0" class="empty-state">
        <div class="empty-icon">{{ iconStyle === 'cute' ? '📝' : '📄' }}</div>
        <div>暂无学习资料</div>
        <div style="font-size: 14px; margin-top: 8px;">点击上方按钮添加</div>
      </div>
      
      <div 
        v-for="material in filteredMaterials" 
        :key="material.id"
        class="material-item"
      >
        <div class="material-header">
          <div class="material-title" @click="showDetail(material)">{{ material.title }}</div>
          <div class="material-actions">
            <span class="material-category">{{ material.category }}</span>
            <button class="delete-btn" @click.stop="deleteMaterial(material)">🗑️</button>
          </div>
        </div>
        <div class="material-preview" @click="showDetail(material)">{{ material.content.slice(0, 80) }}...</div>
        <div class="material-meta">
          {{ formatDate(material.createdAt) }}
        </div>
      </div>
    </div>
    
    <div v-if="showDetailModal" class="modal-overlay" @click.self="closeDetail">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ selectedMaterial?.title }}</h3>
          <span class="material-category">{{ selectedMaterial?.category }}</span>
        </div>
        
        <div class="audio-controls">
          <button class="audio-btn" @click="toggleAudio">
            {{ isPlaying ? '⏸️' : '🔊' }} {{ isPlaying ? '暂停' : '播放' }}
          </button>
          <div class="speed-control">
            <span>速度:</span>
            <select v-model="speechRate" class="speed-select">
              <option :value="0.5">0.5x</option>
              <option :value="0.75">0.75x</option>
              <option :value="1">1x</option>
              <option :value="1.25">1.25x</option>
              <option :value="1.5">1.5x</option>
            </select>
          </div>
        </div>
        
        <div class="material-full-content">
          {{ selectedMaterial?.content }}
        </div>

        <div class="ai-analysis-section">
          <button v-if="!aiAnalysis && !isAnalyzing" class="btn-ai" @click="runAiAnalysis">
            {{ iconStyle === 'cute' ? '🤖' : '🤖' }} AI 智能拆解文章
          </button>

          <div v-if="isAnalyzing" class="ai-loading">
            <div class="ai-spinner"></div>
            <span>AI 正在分析文章...</span>
          </div>

          <div v-if="aiAnalysis" class="ai-result">
            <div class="ai-result-header">
              <span>{{ iconStyle === 'cute' ? '🤖' : '🤖' }} AI 分析结果</span>
              <button class="btn-close-ai" @click="aiAnalysis = null">✕</button>
            </div>

            <div class="ai-difficulty-badge" :class="'diff-' + aiAnalysis.difficultyScore">
              {{ aiAnalysis.difficulty }} · 难度 {{ aiAnalysis.difficultyScore }}/10
            </div>

            <div class="ai-section">
              <div class="ai-section-title">📋 摘要</div>
              <div class="ai-section-content">{{ aiAnalysis.summary }}</div>
            </div>

            <div class="ai-section">
              <div class="ai-section-title">🔑 核心词汇</div>
              <div v-for="(v, i) in aiAnalysis.keyVocabulary" :key="i" class="ai-vocab-item">
                <div class="ai-vocab-word">{{ v.word }} <span class="ai-vocab-phonetic">{{ v.phonetic }}</span></div>
                <div class="ai-vocab-meaning">{{ v.meaning }}</div>
                <div class="ai-vocab-context">{{ v.context }}</div>
              </div>
            </div>

            <div class="ai-section">
              <div class="ai-section-title">📖 语法要点</div>
              <div v-for="(g, i) in aiAnalysis.grammarPoints" :key="i" class="ai-grammar-item">
                <div class="ai-grammar-point">{{ g.point }}</div>
                <div class="ai-grammar-explain">{{ g.explanation }}</div>
                <div class="ai-grammar-example">"{{ g.example }}"</div>
              </div>
            </div>

            <div class="ai-section">
              <div class="ai-section-title">💡 关键句型</div>
              <div v-for="(s, i) in aiAnalysis.keySentences" :key="i" class="ai-sentence-item">
                <div class="ai-sentence-en">{{ s.sentence }}</div>
                <div class="ai-sentence-cn">{{ s.translation }}</div>
                <div class="ai-sentence-note">{{ s.note }}</div>
              </div>
            </div>

            <div v-if="aiAnalysis.culturalNotes" class="ai-section">
              <div class="ai-section-title">🌍 文化背景</div>
              <div class="ai-section-content">{{ aiAnalysis.culturalNotes }}</div>
            </div>

            <div class="ai-section">
              <div class="ai-section-title">🌐 中文翻译</div>
              <div class="ai-section-content ai-translation">{{ aiAnalysis.translation }}</div>
            </div>

            <button class="btn-ai-secondary" @click="runAiQuestions">
              {{ iconStyle === 'cute' ? '📝' : '✏️' }} 生成 AI 理解题
            </button>
          </div>

          <div v-if="aiQuestions" class="ai-questions">
            <div class="ai-questions-header">
              <span>📝 AI 理解题</span>
              <button class="btn-close-ai" @click="aiQuestions = null">✕</button>
            </div>
            <div v-for="(q, qi) in aiQuestions.questions" :key="qi" class="ai-question-card">
              <div class="ai-question-text">Q{{ qi + 1 }}. {{ q.question }}</div>
              <div v-if="q.type === 'choice'" class="ai-question-choices">
                <button
                  v-for="(c, ci) in q.choices"
                  :key="ci"
                  :class="['ai-choice-btn', {
                    selected: aiUserAnswers[qi] === ci,
                    correct: aiQuestionResults[qi] && ci === q.correctIndex,
                    wrong: aiQuestionResults[qi] === ci && ci !== q.correctIndex
                  }]"
                  @click="selectAiAnswer(qi, ci)"
                  :disabled="aiQuestionResults[qi] !== undefined"
                >
                  {{ ['A','B','C','D'][ci] }}. {{ c }}
                </button>
              </div>
              <div v-if="aiQuestionResults[qi] !== undefined" class="ai-question-explain">
                {{ q.explanation }}
              </div>
            </div>
            <button class="btn-ai-secondary" @click="aiQuestions = null; aiUserAnswers = {}; aiQuestionResults = {}">
              完成
            </button>
          </div>
        </div>

        <div class="detail-actions">
          <button class="btn-primary" @click="showExerciseTypeModal = true">
            {{ iconStyle === 'cute' ? '📝' : '✏️' }} 开始练习
          </button>
          <button class="btn-secondary" @click="closeDetail">返回</button>
        </div>
        
        <div v-if="showExerciseTypeModal" class="modal-overlay" @click.self="showExerciseTypeModal = false">
          <div class="modal-content exercise-type-modal">
            <div class="modal-title">选择练习类型</div>
            <div class="exercise-types">
              <button class="exercise-type-btn" @click="startExerciseType('fill')">
                <span class="type-icon">✏️</span>
                <span class="type-name">词汇填空</span>
                <span class="type-desc">填写句子中的缺失单词</span>
              </button>
              <button class="exercise-type-btn" @click="startExerciseType('listen_fill')">
                <span class="type-icon">🔊✏️</span>
                <span class="type-name">听音填空</span>
                <span class="type-desc">听句子填写缺失单词</span>
              </button>
              <button class="exercise-type-btn" @click="startExerciseType('paragraph_fill')">
                <span class="type-icon">📄✏️</span>
                <span class="type-name">段落填空</span>
                <span class="type-desc">填写段落中的多个单词</span>
              </button>
              <button class="exercise-type-btn" @click="startExerciseType('listen_paragraph')">
                <span class="type-icon">🔊📄</span>
                <span class="type-name">听音段落</span>
                <span class="type-desc">听段落填写多个单词</span>
              </button>
            </div>
          </div>
        </div>
        
        <div v-if="showExercise" class="exercise-section">
          <div class="exercise-header">
            <h3>{{ getExerciseTitle() }}</h3>
            <span class="exercise-progress">{{ currentIndex + 1 }} / {{ questions.length }}</span>
          </div>
          
          <div v-if="exerciseType === 'fill'" class="fill-exercise">
            <div class="question-text">{{ currentQuestion?.sentence }}</div>
            <input 
              type="text" 
              v-model="userAnswer" 
              placeholder="输入答案..." 
              class="answer-input"
              @keyup.enter="checkAnswer"
              :disabled="showResult"
            />
          </div>
          
          <div v-else-if="exerciseType === 'listen_fill'" class="fill-exercise">
            <button class="audio-btn small" @click="playSentence(currentQuestion?.original)">
              🔊 播放句子
            </button>
            <div class="question-text">{{ currentQuestion?.sentence }}</div>
            <input 
              type="text" 
              v-model="userAnswer" 
              placeholder="输入听到的单词..." 
              class="answer-input"
              @keyup.enter="checkAnswer"
              :disabled="showResult"
            />
          </div>
          
          <div v-else-if="exerciseType === 'paragraph_fill'" class="paragraph-exercise">
            <div class="question-text paragraph-text">{{ currentQuestion?.paragraph }}</div>
            <div class="multi-blanks">
              <div 
                v-for="(blank, index) in currentQuestion?.blanks" 
                :key="index"
                class="blank-item"
              >
                <span>空格 {{ index + 1 }}:</span>
                <input 
                  type="text" 
                  :value="userAnswers[index]"
                  @input="updateUserAnswer(index, $event)"
                  placeholder="输入答案..." 
                  class="answer-input small"
                  :disabled="showResult"
                />
                <span v-if="showResult" :class="isBlankCorrect(index) ? 'correct' : 'incorrect'">
                  {{ isBlankCorrect(index) ? '✓' : '✗ ' + currentQuestion?.answers[index] }}
                </span>
              </div>
            </div>
          </div>
          
          <div v-else-if="exerciseType === 'listen_paragraph'" class="paragraph-exercise">
            <button class="audio-btn small" @click="playSentence(currentQuestion?.originalParagraph)">
              🔊 播放段落
            </button>
            <div class="question-text paragraph-text">{{ currentQuestion?.paragraph }}</div>
            <div class="multi-blanks">
              <div 
                v-for="(blank, index) in currentQuestion?.blanks" 
                :key="index"
                class="blank-item"
              >
                <span>空格 {{ index + 1 }}:</span>
                <input 
                  type="text" 
                  :value="userAnswers[index]"
                  @input="updateUserAnswer(index, $event)"
                  placeholder="输入听到的单词..." 
                  class="answer-input small"
                  :disabled="showResult"
                />
                <span v-if="showResult" :class="isBlankCorrect(index) ? 'correct' : 'incorrect'">
                  {{ isBlankCorrect(index) ? '✓' : '✗ ' + currentQuestion?.answers[index] }}
                </span>
              </div>
            </div>
          </div>
          
          <div v-else class="choice-exercise">
            <div class="question-text">{{ currentQuestion?.question }}</div>
            <div class="choices">
              <button 
                v-for="(choice, index) in currentQuestion?.choices" 
                :key="index"
                :class="['choice-btn', { selected: selectedChoice === index, correct: showResult && index === currentQuestion?.correct, disabled: showResult }]"
                @click="selectChoice(index)"
                :disabled="showResult"
              >
                {{ ['A', 'B', 'C', 'D'][index] }}. {{ choice }}
              </button>
            </div>
          </div>
          
          <div v-if="showResult" class="result-display" :class="allCorrect ? 'correct' : 'incorrect'">
            {{ allCorrect ? '🎉 全部正确！' : '😅 部分错误' }}
            <div v-if="!allCorrect && currentQuestion?.answers" class="correct-answer">
              正确答案: {{ currentQuestion?.answers.join(', ') }}
            </div>
          </div>
          
          <div class="exercise-actions">
            <button 
              v-if="!showResult" 
              class="btn-primary" 
              @click="checkAnswer"
            >
              确认答案
            </button>
            <button v-else class="btn-primary" @click="nextQuestion">
              {{ currentIndex >= questions.length - 1 ? '完成练习' : '下一题' }}
            </button>
            <button class="btn-secondary" @click="closeExercise">退出练习</button>
          </div>
        </div>
      </div>
    </div>
    
    <AddMaterialModal 
      v-if="showAddModal" 
      @close="showAddModal = false"
      @add="handleAdd"
    />
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import AddMaterialModal from './AddMaterialModal.vue'
import { analyzeArticle, generateComprehensionQuestions, recordExerciseResult } from '../ai.js'

const props = defineProps({
  materials: {
    type: Array,
    default: () => []
  },
  iconStyle: {
    type: String,
    default: 'cute'
  }
})

const emit = defineEmits(['update'])

const searchQuery = ref('')
const showAddModal = ref(false)
const showDetailModal = ref(false)
const showExercise = ref(false)
const showExerciseTypeModal = ref(false)
const selectedMaterial = ref(null)
const isPlaying = ref(false)
const speechRate = ref(1)
const exerciseType = ref('fill')
const currentQuestion = ref(null)
const currentIndex = ref(0)
const questions = ref([])
const userAnswer = ref('')
const userAnswers = ref([])
const selectedChoice = ref(null)
const showResult = ref(false)
const isCorrect = ref(false)
const allCorrect = ref(false)
const aiAnalysis = ref(null)
const isAnalyzing = ref(false)
const aiQuestions = ref(null)
const aiUserAnswers = ref({})
const aiQuestionResults = ref({})

const filteredMaterials = computed(() => {
  if (!searchQuery.value) return props.materials
  const query = searchQuery.value.toLowerCase()
  return props.materials.filter(m => 
    m.title.toLowerCase().includes(query) || 
    m.content.toLowerCase().includes(query)
  )
})

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

function showDetail(material) {
  selectedMaterial.value = material
  showDetailModal.value = true
}

function closeDetail() {
  stopAudio()
  showDetailModal.value = false
  selectedMaterial.value = null
  aiAnalysis.value = null
  aiQuestions.value = null
  isAnalyzing.value = false
  aiUserAnswers.value = {}
  aiQuestionResults.value = {}
}

async function runAiAnalysis() {
  if (!selectedMaterial.value) return
  const apiKey = localStorage.getItem('ai_api_key')
  if (!apiKey) {
    alert('请先在设置中配置 AI API Key')
    return
  }
  isAnalyzing.value = true
  try {
    const result = await analyzeArticle(selectedMaterial.value.title, selectedMaterial.value.content)
    aiAnalysis.value = result
  } catch (e) {
    alert('AI 分析失败: ' + e.message)
  }
  isAnalyzing.value = false
}

async function runAiQuestions() {
  if (!selectedMaterial.value) return
  try {
    const result = await generateComprehensionQuestions(selectedMaterial.value.title, selectedMaterial.value.content)
    aiQuestions.value = result
    aiUserAnswers.value = {}
    aiQuestionResults.value = {}
  } catch (e) {
    alert('生成题目失败: ' + e.message)
  }
}

function selectAiAnswer(qi, ci) {
  aiUserAnswers.value[qi] = ci
  const q = aiQuestions.value.questions[qi]
  const isCorrectAns = ci === q.correctIndex
  aiQuestionResults.value[qi] = isCorrectAns
  recordExerciseResult('reading', isCorrectAns, q.difficulty || 3)
}

function toggleAudio() {
  if (!selectedMaterial.value) return
  
  if ('speechSynthesis' in window) {
    if (isPlaying.value) {
      window.speechSynthesis.pause()
      isPlaying.value = false
    } else {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.resume()
        isPlaying.value = true
      } else {
        const utterance = new SpeechSynthesisUtterance(selectedMaterial.value.content)
        utterance.lang = 'en-US'
        utterance.rate = speechRate.value
        utterance.onend = () => { isPlaying.value = false }
        utterance.onerror = (event) => { 
          isPlaying.value = false 
          console.log('Speech error:', event)
        }
        window.speechSynthesis.speak(utterance)
        isPlaying.value = true
      }
    }
  } else {
    alert('您的浏览器不支持语音功能')
  }
}

function stopAudio() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    isPlaying.value = false
  }
}

function startExerciseType(type) {
  exerciseType.value = type
  showExerciseTypeModal.value = false
  generateQuestions()
  showExercise.value = true
}

function getExerciseTitle() {
  const titles = {
    fill: '✏️ 词汇填空',
    listen_fill: '🔊✏️ 听音填空',
    paragraph_fill: '📄✏️ 段落填空',
    listen_paragraph: '🔊📄 听音段落',
    choice: '📌 选择练习'
  }
  return titles[exerciseType.value] || '练习'
}

function startExercise() {
  showExerciseTypeModal.value = true
}

function generateQuestions() {
  const content = selectedMaterial.value.content
  
  if (exerciseType.value === 'fill' || exerciseType.value === 'listen_fill') {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15)
    questions.value = sentences.map(sentence => {
      const words = sentence.trim().split(' ')
      const longWords = words.filter(w => w.length > 3 && /^[a-zA-Z]+$/.test(w))
      if (longWords.length < 2) return null
      
      const blankIndex = words.indexOf(longWords[Math.floor(Math.random() * longWords.length)])
      const answer = words[blankIndex]
      const questionWords = [...words]
      questionWords[blankIndex] = '____'
      
      return {
        sentence: questionWords.join(' '),
        answer: answer,
        original: sentence.trim()
      }
    }).filter(q => q)
  } else if (exerciseType.value === 'paragraph_fill' || exerciseType.value === 'listen_paragraph') {
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 50)
    questions.value = paragraphs.map(paragraph => {
      const words = paragraph.trim().split(' ')
      const longWords = words
        .map((w, i) => ({ word: w, index: i }))
        .filter(({ word }) => word.length > 3 && /^[a-zA-Z]+$/.test(word))
      
      if (longWords.length < 2) return null
      
      const shuffled = [...longWords].sort(() => Math.random() - 0.5)
      const selected = shuffled.slice(0, Math.min(3, shuffled.length))
      selected.sort((a, b) => a.index - b.index)
      
      const answers = selected.map(s => s.word)
      const blanks = selected.map(s => s.word)
      const questionWords = [...words]
      
      selected.forEach(s => {
        questionWords[s.index] = '____'
      })
      
      return {
        paragraph: questionWords.join(' '),
        originalParagraph: paragraph.trim(),
        answers: answers,
        blanks: blanks
      }
    }).filter(q => q)
  } else {
    const vocab = JSON.parse(localStorage.getItem('vocab') || '[]')
    questions.value = vocab.slice(0, 5).map(v => {
      const wrongOptions = vocab
        .filter(x => x.id !== v.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(x => x.meaning)
      const choices = [...wrongOptions, v.meaning].sort(() => Math.random() - 0.5)
      
      return {
        question: `单词 "${v.word}" 的中文意思是？`,
        choices: choices,
        correct: choices.indexOf(v.meaning),
        answer: v.meaning
      }
    })
  }
  
  currentIndex.value = 0
  currentQuestion.value = questions.value[0]
  resetAnswers()
}

function resetAnswers() {
  userAnswer.value = ''
  userAnswers.value = []
  if (currentQuestion.value?.answers) {
    userAnswers.value = new Array(currentQuestion.value.answers.length).fill('')
  }
}

function updateUserAnswer(index, event) {
  userAnswers.value[index] = event.target.value
}

function isBlankCorrect(index) {
  return userAnswers.value[index]?.toLowerCase().trim() === currentQuestion.value.answers[index]?.toLowerCase()
}

function selectChoice(index) {
  selectedChoice.value = index
}

function checkAnswer() {
  if (exerciseType.value === 'fill' || exerciseType.value === 'listen_fill') {
    isCorrect.value = userAnswer.value.toLowerCase().trim() === currentQuestion.value.answer.toLowerCase()
    allCorrect.value = isCorrect.value
  } else if (exerciseType.value === 'paragraph_fill' || exerciseType.value === 'listen_paragraph') {
    allCorrect.value = currentQuestion.value.answers.every((answer, index) => {
      return userAnswers.value[index]?.toLowerCase().trim() === answer.toLowerCase()
    })
  } else {
    isCorrect.value = selectedChoice.value === currentQuestion.value.correct
    allCorrect.value = isCorrect.value
  }
  showResult.value = true
}

function nextQuestion() {
  if (currentIndex.value >= questions.value.length - 1) {
    closeExercise()
    alert('练习完成！')
    return
  }
  
  currentIndex.value++
  currentQuestion.value = questions.value[currentIndex.value]
  resetAnswers()
  selectedChoice.value = null
  showResult.value = false
}

function closeExercise() {
  showExercise.value = false
  showExerciseTypeModal.value = false
  questions.value = []
  currentQuestion.value = null
  userAnswer.value = ''
  userAnswers.value = []
  selectedChoice.value = null
  showResult.value = false
}

function playSentence(text) {
  if (!text) return
  
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = speechRate.value
    window.speechSynthesis.speak(utterance)
  } else {
    alert('您的浏览器不支持语音功能')
  }
}

function deleteMaterial(material) {
  if (confirm(`确定要删除 "${material.title}" 吗？`)) {
    const newMaterials = props.materials.filter(m => m.id !== material.id)
    localStorage.setItem('materials', JSON.stringify(newMaterials))
    emit('update')
  }
}

function handleAdd(material) {
  const newMaterials = [...props.materials, {
    id: Date.now(),
    ...material,
    createdAt: new Date().toISOString()
  }]
  localStorage.setItem('materials', JSON.stringify(newMaterials))
  emit('update')
}

async function syncMaterials() {
  const pending = [
    { 
      id: Date.now(),
      title: 'Daily English ' + new Date().toLocaleDateString(), 
      content: 'The best way to learn English is consistent practice. Every day spend at least 30 minutes reading, listening, or speaking. You will see improvement over time.', 
      category: '每日推送' 
    },
    {
      id: Date.now() + 1,
      title: 'English News',
      content: 'Technology continues to change our lives. Learning new skills helps us adapt to the digital world. English is essential for global communication.',
      category: '新闻'
    }
  ]
  
  if (pending.length === 0) {
    alert('暂无新资料')
    return
  }
  
  const pendingMaterials = JSON.parse(localStorage.getItem('pendingMaterials') || '[]')
  const newPending = pending.filter(p => !pendingMaterials.some(pp => pp.title === p.title))
  
  if (newPending.length === 0) {
    alert('暂无新资料')
    return
  }
  
  localStorage.setItem('pendingMaterials', JSON.stringify([...pendingMaterials, ...newPending]))
  alert('发现 ' + newPending.length + ' 条新资料，请查看待审核列表')
}

onUnmounted(() => {
  stopAudio()
})
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.toolbar button {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  border: none;
  cursor: pointer;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-secondary {
  background: #f8f9fa;
  color: #333;
  border: 1px solid #e0e0e0;
}

.search-bar {
  margin-bottom: 16px;
}

.search-input {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  font-size: 16px;
  background: white;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
}

.materials-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.material-item {
  background: white;
  border-radius: 14px;
  padding: 16px;
  cursor: pointer;
  border: 1px solid #f0f0f0;
  transition: box-shadow 0.2s;
}

.material-item:active {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.material-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.material-title {
  font-weight: 600;
  font-size: 16px;
  color: #333;
  cursor: pointer;
}

.material-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.material-category {
  background: #e3f2fd;
  color: #1976d2;
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 20px;
}

.delete-btn {
  background: #ffebee;
  border: none;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.delete-btn:hover {
  background: #ffcdd2;
}

.material-preview {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.material-meta {
  font-size: 12px;
  color: #999;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.empty-icon {
  font-size: 56px;
  margin-bottom: 16px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 20px 20px 0 0;
  padding: 24px;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
}

.modal-header {
  margin-bottom: 20px;
}

.modal-header h3 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
}

.audio-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.audio-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 14px 24px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}

.speed-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.speed-select {
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
}

.material-full-content {
  line-height: 1.7;
  color: #333;
  margin-bottom: 20px;
  white-space: pre-wrap;
}

.detail-actions, .exercise-actions {
  display: flex;
  gap: 12px;
}

.detail-actions button, .exercise-actions button {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  border: none;
  cursor: pointer;
}

.exercise-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
}

.exercise-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.exercise-header h3 {
  font-size: 18px;
  font-weight: 600;
}

.exercise-progress {
  background: #f0f0f0;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
  color: #666;
}

.exercise-type-modal {
  max-width: 400px;
}

.exercise-types {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.exercise-type-btn {
  padding: 20px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.exercise-type-btn:hover {
  border-color: #667eea;
  background: #f5f3ff;
}

.type-icon {
  font-size: 28px;
}

.type-name {
  font-weight: 600;
  font-size: 15px;
}

.type-desc {
  font-size: 12px;
  color: #666;
}

.audio-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
  margin-bottom: 16px;
}

.audio-btn.small {
  padding: 10px 16px;
  font-size: 14px;
}

.paragraph-exercise {
  margin-bottom: 20px;
}

.paragraph-text {
  font-size: 16px;
  line-height: 1.8;
  color: #333;
  margin-bottom: 24px;
}

.multi-blanks {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.blank-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.blank-item span:first-child {
  width: 60px;
  font-size: 14px;
  color: #666;
}

.answer-input.small {
  flex: 1;
  max-width: 200px;
  padding: 12px 16px;
  font-size: 16px;
  margin-bottom: 0;
}

.blank-item span:last-child {
  font-weight: 600;
  font-size: 16px;
}

.blank-item span.correct {
  color: #4caf50;
}

.blank-item span.incorrect {
  color: #f44336;
}

.question-text {
  font-size: 18px;
  line-height: 1.6;
  color: #333;
  margin-bottom: 20px;
}

.answer-input {
  width: 100%;
  padding: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 18px;
  text-align: center;
  margin-bottom: 20px;
}

.answer-input:focus {
  outline: none;
  border-color: #667eea;
}

.choices {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
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

.choice-btn.correct {
  border-color: #4caf50;
  background: #e8f5e9;
}

.result-display {
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  margin-bottom: 20px;
  font-size: 18px;
  font-weight: 600;
}

.result-display.correct {
  background: #e8f5e9;
  color: #1b5e20;
}

.result-display.incorrect {
  background: #ffebee;
  color: #c62828;
}

.correct-answer {
  margin-top: 12px;
  font-size: 16px;
  font-weight: normal;
}

.ai-analysis-section {
  margin-bottom: 20px;
}

.btn-ai {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #00c6ff 0%, #0072ff 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 114, 255, 0.3);
}

.btn-ai-secondary {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 12px;
}

.ai-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px;
  color: #667eea;
  font-size: 15px;
}

.ai-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e0e0e0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.ai-result {
  background: #f8f9ff;
  border: 1px solid #e3f2fd;
  border-radius: 14px;
  padding: 20px;
}

.ai-result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.btn-close-ai {
  background: #f0f0f0;
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  color: #999;
}

.ai-difficulty-badge {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 16px;
}

.ai-difficulty-badge.diff-1, .ai-difficulty-badge.diff-2, .ai-difficulty-badge.diff-3 {
  background: #e8f5e9;
  color: #2e7d32;
}

.ai-difficulty-badge.diff-4, .ai-difficulty-badge.diff-5, .ai-difficulty-badge.diff-6 {
  background: #fff3e0;
  color: #e65100;
}

.ai-difficulty-badge.diff-7, .ai-difficulty-badge.diff-8, .ai-difficulty-badge.diff-9, .ai-difficulty-badge.diff-10 {
  background: #ffebee;
  color: #c62828;
}

.ai-section {
  margin-bottom: 20px;
}

.ai-section-title {
  font-size: 15px;
  font-weight: 600;
  color: #667eea;
  margin-bottom: 10px;
}

.ai-section-content {
  font-size: 14px;
  color: #555;
  line-height: 1.7;
}

.ai-translation {
  background: white;
  padding: 12px;
  border-radius: 8px;
  border-left: 3px solid #667eea;
}

.ai-vocab-item {
  background: white;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
}

.ai-vocab-word {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.ai-vocab-phonetic {
  font-size: 13px;
  color: #999;
  font-weight: normal;
}

.ai-vocab-meaning {
  font-size: 14px;
  color: #555;
  margin-top: 4px;
}

.ai-vocab-context {
  font-size: 13px;
  color: #888;
  margin-top: 4px;
  font-style: italic;
}

.ai-grammar-item {
  background: white;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
}

.ai-grammar-point {
  font-weight: 600;
  color: #333;
  font-size: 15px;
}

.ai-grammar-explain {
  font-size: 14px;
  color: #555;
  margin-top: 4px;
}

.ai-grammar-example {
  font-size: 13px;
  color: #888;
  margin-top: 4px;
  font-style: italic;
}

.ai-sentence-item {
  background: white;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  border-left: 3px solid #4caf50;
}

.ai-sentence-en {
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

.ai-sentence-cn {
  font-size: 13px;
  color: #666;
  margin-top: 4px;
}

.ai-sentence-note {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.ai-questions {
  background: #f8f9ff;
  border: 1px solid #e3f2fd;
  border-radius: 14px;
  padding: 20px;
  margin-top: 12px;
}

.ai-questions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
}

.ai-question-card {
  background: white;
  padding: 16px;
  border-radius: 10px;
  margin-bottom: 12px;
}

.ai-question-text {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  margin-bottom: 12px;
}

.ai-question-choices {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-choice-btn {
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  text-align: left;
  transition: all 0.2s;
}

.ai-choice-btn.selected {
  border-color: #667eea;
  background: #f3e5f5;
}

.ai-choice-btn.correct {
  border-color: #4caf50;
  background: #e8f5e9;
}

.ai-choice-btn.wrong {
  border-color: #f44336;
  background: #ffebee;
}

.ai-question-explain {
  margin-top: 8px;
  padding: 10px;
  background: #fff8e1;
  border-radius: 6px;
  font-size: 13px;
  color: #666;
}
</style>
