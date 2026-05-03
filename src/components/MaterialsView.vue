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
        @click="showDetail(material)"
      >
        <div class="material-header">
          <div class="material-title">{{ material.title }}</div>
          <span class="material-category">{{ material.category }}</span>
        </div>
        <div class="material-preview">{{ material.content.slice(0, 80) }}...</div>
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
        
        <div class="detail-actions">
          <button class="btn-primary" @click="startExercise">
            {{ iconStyle === 'cute' ? '📝' : '✏️' }} 开始练习
          </button>
          <button class="btn-secondary" @click="closeDetail">返回</button>
        </div>
      </div>
    </div>
    
    <div v-if="showExerciseModal" class="modal-overlay" @click.self="closeExercise">
      <div class="modal-content">
        <div class="exercise-header">
          <h3>{{ exerciseType === 'fill' ? '填空练习' : '选择练习' }}</h3>
        </div>
        
        <div v-if="exerciseType === 'fill'" class="fill-exercise">
          <div class="question-text">{{ currentQuestion.sentence }}</div>
          <input 
            type="text" 
            v-model="userAnswer" 
            placeholder="输入答案..." 
            class="answer-input"
            @keyup.enter="checkAnswer"
          />
        </div>
        
        <div v-else class="choice-exercise">
          <div class="question-text">{{ currentQuestion.question }}</div>
          <div class="choices">
            <button 
              v-for="(choice, index) in currentQuestion.choices" 
              :key="index"
              :class="['choice-btn', { selected: selectedChoice === index, correct: showResult && index === currentQuestion.correct }]"
              @click="selectChoice(index)"
            >
              {{ ['A', 'B', 'C', 'D'][index] }}. {{ choice }}
            </button>
          </div>
        </div>
        
        <div v-if="showResult" class="result-display" :class="isCorrect ? 'correct' : 'incorrect'">
          {{ isCorrect ? '🎉 回答正确！' : '😅 回答错误' }}
          <div v-if="!isCorrect" class="correct-answer">
            正确答案: {{ currentQuestion.answer }}
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
const showExerciseModal = ref(false)
const selectedMaterial = ref(null)
const isPlaying = ref(false)
const speechRate = ref(1)
const exerciseType = ref('fill')
const currentQuestion = ref(null)
const currentIndex = ref(0)
const questions = ref([])
const userAnswer = ref('')
const selectedChoice = ref(null)
const showResult = ref(false)
const isCorrect = ref(false)

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
}

function toggleAudio() {
  if (!selectedMaterial.value) return
  
  if ('speechSynthesis' in window) {
    if (isPlaying.value) {
      window.speechSynthesis.cancel()
      isPlaying.value = false
    } else {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(selectedMaterial.value.content)
      utterance.lang = 'en-US'
      utterance.rate = speechRate.value
      utterance.onend = () => { isPlaying.value = false }
      utterance.onerror = () => { 
        isPlaying.value = false 
        alert('语音播放失败')
      }
      window.speechSynthesis.speak(utterance)
      isPlaying.value = true
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

function startExercise() {
  closeDetail()
  exerciseType.value = Math.random() > 0.5 ? 'fill' : 'choice'
  generateQuestions()
  showExerciseModal.value = true
}

function generateQuestions() {
  const content = selectedMaterial.value.content
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15)
  
  if (exerciseType.value === 'fill') {
    questions.value = sentences.slice(0, 5).map(sentence => {
      const words = sentence.trim().split(' ')
      const longWords = words.filter(w => w.length > 3 && /^[a-zA-Z]+$/.test(w))
      if (longWords.length < 2) return null
      
      const blankIndex = words.indexOf(longWords[Math.floor(Math.random() * longWords.length)])
      const answer = words[blankIndex]
      const questionWords = [...words]
      questionWords[blankIndex] = '____'
      
      return {
        sentence: questionWords.join(' '),
        answer: answer
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
}

function selectChoice(index) {
  selectedChoice.value = index
}

function checkAnswer() {
  if (exerciseType.value === 'fill') {
    isCorrect.value = userAnswer.value.toLowerCase().trim() === currentQuestion.value.answer.toLowerCase()
  } else {
    isCorrect.value = selectedChoice.value === currentQuestion.value.correct
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
  userAnswer.value = ''
  selectedChoice.value = null
  showResult.value = false
}

function closeExercise() {
  showExerciseModal.value = false
  questions.value = []
  currentQuestion.value = null
  userAnswer.value = ''
  selectedChoice.value = null
  showResult.value = false
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
}

.material-category {
  background: #e3f2fd;
  color: #1976d2;
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 20px;
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

.exercise-header {
  margin-bottom: 20px;
}

.exercise-header h3 {
  font-size: 20px;
  font-weight: 600;
  text-align: center;
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
</style>
