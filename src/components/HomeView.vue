<template>
  <div class="home-view">
    <div class="grid">
      <div class="card" @click="$emit('navigate', 'materials')">
        <div class="card-icon">{{ iconStyle === 'cute' ? '📚' : '📋' }}</div>
        <div class="card-title">学习资料</div>
        <div class="card-subtitle">{{ materialCount }} 篇文章</div>
      </div>
      <div class="card" @click="$emit('navigate', 'vocab')">
        <div class="card-icon">{{ iconStyle === 'cute' ? '📖' : '📊' }}</div>
        <div class="card-title">词汇库</div>
        <div class="card-subtitle">{{ vocabCount }} 个单词</div>
      </div>
      <div class="card" @click="$emit('navigate', 'review')">
        <div class="card-icon">{{ iconStyle === 'cute' ? '🔄' : '🔁' }}</div>
        <div class="card-title">今日复习</div>
        <div class="card-subtitle">{{ reviewCount }} 个待复习</div>
      </div>
      <div class="card" @click="$emit('navigate', 'settings')">
        <div class="card-icon">{{ iconStyle === 'cute' ? '⚙️' : '⚙️' }}</div>
        <div class="card-title">设置</div>
        <div class="card-subtitle">个性化配置</div>
      </div>
    </div>
    
    <div class="card tip-card">
      <div style="font-weight: 600; color: #333; margin-bottom: 8px;">{{ iconStyle === 'cute' ? '🐰' : '🤖' }} 学习小贴士</div>
      <div style="font-size: 14px; color: #666; line-height: 1.6;">
        {{ currentTip }}
      </div>
    </div>
    
    <div class="quick-actions">
      <button class="btn-primary" @click="$emit('navigate', 'materials')">
        {{ iconStyle === 'cute' ? '📝' : '✏️' }} 开始学习
      </button>
      <button class="btn-secondary" @click="$emit('navigate', 'review')">
        {{ iconStyle === 'cute' ? '🔄' : '🔁' }} 开始复习
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

defineProps({
  iconStyle: {
    type: String,
    default: 'cute'
  }
})

defineEmits(['navigate'])

const learningTips = [
  '每天坚持学习30分钟，效果比突击学习更好哦！',
  '学习新单词后，试着用它造一个句子吧。',
  '多听多说，语言学习需要不断练习。',
  '利用碎片时间复习，效果事半功倍。',
  '坚持每天学习，词汇量会稳步增长！',
  '阅读英文文章时，不要逐词翻译，尝试理解整体意思。',
  '用英语思考，而不是先用中文想再翻译。'
]

const currentTip = ref('')

const materialCount = computed(() => {
  const materials = JSON.parse(localStorage.getItem('materials') || '[]')
  return materials.length
})

const vocabCount = computed(() => {
  const vocab = JSON.parse(localStorage.getItem('vocab') || '[]')
  return vocab.length
})

const reviewCount = computed(() => {
  const vocab = JSON.parse(localStorage.getItem('vocab') || '[]')
  return vocab.filter(v => new Date(v.nextReview) <= new Date()).length
})

onMounted(() => {
  currentTip.value = learningTips[Math.floor(Math.random() * learningTips.length)]
})
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.card {
  background: white;
  border-radius: 16px;
  padding: 24px 12px;
  text-align: center;
  cursor: pointer;
  border: 1px solid #f0f0f0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:active {
  transform: scale(0.98);
}

.card-icon {
  font-size: 40px;
  margin-bottom: 10px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.card-subtitle {
  font-size: 12px;
  color: #999;
}

.tip-card {
  margin-top: 16px;
  padding: 20px;
  text-align: left;
}

.quick-actions {
  margin-top: 16px;
  display: flex;
  gap: 12px;
}

.quick-actions button {
  flex: 1;
  padding: 16px;
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
</style>
