<template>
  <div class="vocab-view">
    <div class="toolbar">
      <button class="btn-secondary" @click="showAddModal = true">
        {{ iconStyle === 'cute' ? '➕' : '+' }} 添加单词
      </button>
      <button class="btn-primary" @click="importFromClipboard">
        {{ iconStyle === 'cute' ? '📋' : '📥' }} 粘贴导入
      </button>
    </div>
    
    <div class="search-bar">
      <input 
        type="text" 
        v-model="searchQuery" 
        placeholder="搜索单词..." 
        class="search-input"
      />
    </div>
    
    <div class="vocab-list">
      <div v-if="filteredVocab.length === 0" class="empty-state">
        <div class="empty-icon">{{ iconStyle === 'cute' ? '📖' : '📊' }}</div>
        <div>暂无单词</div>
        <div style="font-size: 14px; margin-top: 8px;">点击上方按钮添加</div>
      </div>
      
      <div 
        v-for="vocab in filteredVocab" 
        :key="vocab.id"
        class="vocab-card"
      >
        <div class="vocab-header">
          <div class="vocab-word">{{ vocab.word }}</div>
          <button 
            class="add-review-btn" 
            @click="addToReview(vocab)"
            title="添加到复习列表"
          >
            {{ iconStyle === 'cute' ? '⭐' : '★' }}
          </button>
        </div>
        
        <div v-if="vocab.phonetic" class="vocab-phonetic">{{ vocab.phonetic }}</div>
        
        <div class="vocab-meaning">{{ vocab.meaning }}</div>
        
        <div v-if="vocab.example" class="vocab-example">
          <span>例：</span>{{ vocab.example }}
        </div>
        
        <div class="vocab-meta">
          <span>复习等级: Lv.{{ vocab.reviewLevel }}</span>
          <span>下次复习: {{ formatNextReview(vocab.nextReview) }}</span>
        </div>
        
        <div class="vocab-actions">
          <button class="action-btn edit" @click="editVocab(vocab)">编辑</button>
          <button class="action-btn delete" @click="deleteVocab(vocab)">删除</button>
        </div>
      </div>
    </div>
    
    <div v-if="showAddModal" class="modal-overlay" @click.self="closeAddModal">
      <div class="modal-content">
        <div class="modal-title">{{ editingVocab ? '编辑单词' : '添加单词' }}</div>
        
        <div class="form-group">
          <label>英文单词</label>
          <input 
            type="text" 
            v-model="formData.word" 
            placeholder="输入英文单词"
            class="form-input"
          />
        </div>
        
        <div class="form-group">
          <label>音标</label>
          <input 
            type="text" 
            v-model="formData.phonetic" 
            placeholder="输入音标（可选）"
            class="form-input"
          />
        </div>
        
        <div class="form-group">
          <label>中文释义</label>
          <input 
            type="text" 
            v-model="formData.meaning" 
            placeholder="输入中文释义"
            class="form-input"
          />
        </div>
        
        <div class="form-group">
          <label>例句</label>
          <textarea 
            v-model="formData.example" 
            placeholder="输入例句（可选）"
            class="form-textarea"
            rows="3"
          ></textarea>
        </div>
        
        <button class="btn-primary" @click="saveVocab">
          {{ editingVocab ? '保存修改' : '添加单词' }}
        </button>
        <button class="btn-secondary" @click="closeAddModal">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

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

const searchQuery = ref('')
const showAddModal = ref(false)
const editingVocab = ref(null)
const formData = ref({
  word: '',
  phonetic: '',
  meaning: '',
  example: ''
})

const filteredVocab = computed(() => {
  if (!searchQuery.value) return props.vocabList
  const query = searchQuery.value.toLowerCase()
  return props.vocabList.filter(v => 
    v.word.toLowerCase().includes(query) || v.meaning.includes(query)
  )
})

function formatNextReview(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.ceil((date - now) / (1000 * 60 * 60 * 24))
  
  if (diff < 0) return '已到期'
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  return `${diff}天后`
}

function showAddModalHandler() {
  editingVocab.value = null
  formData.value = { word: '', phonetic: '', meaning: '', example: '' }
  showAddModal.value = true
}

function editVocab(vocab) {
  editingVocab.value = vocab
  formData.value = { ...vocab }
  showAddModal.value = true
}

function closeAddModal() {
  showAddModal.value = false
  editingVocab.value = null
  formData.value = { word: '', phonetic: '', meaning: '', example: '' }
}

function saveVocab() {
  if (!formData.value.word || !formData.value.meaning) {
    alert('请填写单词和释义')
    return
  }
  
  let vocab = JSON.parse(localStorage.getItem('vocab') || '[]')
  
  if (editingVocab.value) {
    const index = vocab.findIndex(v => v.id === editingVocab.value.id)
    if (index !== -1) {
      vocab[index] = { ...vocab[index], ...formData.value }
    }
  } else {
    vocab.push({
      id: Date.now(),
      ...formData.value,
      reviewLevel: 1,
      nextReview: new Date().toISOString()
    })
  }
  
  localStorage.setItem('vocab', JSON.stringify(vocab))
  emit('update')
  closeAddModal()
}

function deleteVocab(vocab) {
  if (confirm('确定要删除这个单词吗？')) {
    let vocabList = JSON.parse(localStorage.getItem('vocab') || '[]')
    vocabList = vocabList.filter(v => v.id !== vocab.id)
    localStorage.setItem('vocab', JSON.stringify(vocabList))
    emit('update')
  }
}

function addToReview(vocab) {
  let vocabList = JSON.parse(localStorage.getItem('vocab') || '[]')
  const index = vocabList.findIndex(v => v.id === vocab.id)
  if (index !== -1) {
    vocabList[index].nextReview = new Date().toISOString()
    localStorage.setItem('vocab', JSON.stringify(vocabList))
    emit('update')
    alert('已添加到复习列表！')
  }
}

async function importFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    if (!text) {
      alert('剪贴板为空')
      return
    }
    
    const lines = text.split('\n').filter(l => l.trim())
    const newVocab = []
    
    for (const line of lines) {
      const parts = line.split(/[\t|，,]/).map(p => p.trim())
      if (parts.length >= 2) {
        newVocab.push({
          id: Date.now(),
          word: parts[0],
          meaning: parts.slice(1).join(''),
          phonetic: '',
          example: '',
          reviewLevel: 1,
          nextReview: new Date().toISOString()
        })
      }
    }
    
    if (newVocab.length === 0) {
      alert('未找到有效的单词数据')
      return
    }
    
    let vocab = JSON.parse(localStorage.getItem('vocab') || '[]')
    vocab = [...vocab, ...newVocab]
    localStorage.setItem('vocab', JSON.stringify(vocab))
    emit('update')
    alert(`成功导入 ${newVocab.length} 个单词！`)
  } catch (err) {
    alert('无法读取剪贴板，请手动输入')
  }
}
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

.vocab-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vocab-card {
  background: white;
  border-radius: 14px;
  padding: 16px;
  border: 1px solid #f0f0f0;
}

.vocab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.vocab-word {
  font-weight: 600;
  font-size: 18px;
  color: #333;
}

.add-review-btn {
  background: #fff3e0;
  border: none;
  padding: 8px;
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
}

.vocab-phonetic {
  font-size: 14px;
  color: #999;
  margin-bottom: 8px;
}

.vocab-meaning {
  font-size: 16px;
  color: #333;
  margin-bottom: 8px;
}

.vocab-example {
  font-size: 14px;
  color: #666;
  font-style: italic;
  margin-bottom: 12px;
}

.vocab-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
  margin-bottom: 12px;
}

.vocab-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
}

.action-btn.edit {
  background: #e3f2fd;
  color: #1976d2;
}

.action-btn.delete {
  background: #ffebee;
  color: #c62828;
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

.modal-title {
  font-size: 20px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #333;
}

.form-input, .form-textarea {
  width: 100%;
  padding: 14px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-size: 16px;
  background: #fafafa;
}

.form-input:focus, .form-textarea:focus {
  outline: none;
  border-color: #667eea;
  background: white;
}

.form-textarea {
  resize: none;
}
</style>
