<template>
  <div class="settings-view">
    <div class="section">
      <div class="section-title">{{ iconStyle === 'cute' ? '🎨' : '🎛️' }} 界面风格</div>
      
      <div class="setting-card">
        <div class="setting-label">图标风格</div>
        <div class="style-options">
          <button 
            :class="['style-btn', { active: iconStyle === 'cute' }]"
            @click="updateStyle('cute')"
          >
            <span class="style-icon">🐰</span>
            <span>可爱型</span>
          </button>
          <button 
            :class="['style-btn', { active: iconStyle === 'ai' }]"
            @click="updateStyle('ai')"
          >
            <span class="style-icon">🤖</span>
            <span>AI风格</span>
          </button>
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">{{ iconStyle === 'cute' ? '📦' : '📁' }} 版本管理</div>
      
      <div class="setting-card">
        <div class="setting-label">保存当前版本</div>
        <button class="btn-primary" @click="saveVersion">
          {{ iconStyle === 'cute' ? '💾' : '📥' }} 保存备份
        </button>
      </div>
      
      <div v-if="versions.length === 0" class="empty-state">
        <div class="empty-icon">{{ iconStyle === 'cute' ? '📭' : '📋' }}</div>
        <div>暂无备份版本</div>
        <div style="font-size: 14px; margin-top: 8px;">点击上方按钮创建备份</div>
      </div>
      
      <div v-else class="versions-list">
        <div 
          v-for="version in versions" 
          :key="version.id"
          class="version-item"
        >
          <div class="version-info">
            <div class="version-date">{{ version.date }}</div>
            <div class="version-data">
              {{ getVersionStats(version) }}
            </div>
          </div>
          <button 
            class="restore-btn"
            @click="confirmRestore(version)"
          >
            {{ iconStyle === 'cute' ? '🔄' : '↺' }} 恢复
          </button>
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">{{ iconStyle === 'cute' ? '📊' : '📈' }} 数据统计</div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">{{ iconStyle === 'cute' ? '📚' : '📋' }}</div>
          <div class="stat-value">{{ materialCount }}</div>
          <div class="stat-label">学习资料</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">{{ iconStyle === 'cute' ? '📖' : '📊' }}</div>
          <div class="stat-value">{{ vocabCount }}</div>
          <div class="stat-label">单词数量</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">{{ iconStyle === 'cute' ? '🎯' : '🎖️' }}</div>
          <div class="stat-value">{{ masteredCount }}</div>
          <div class="stat-label">已掌握</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">{{ iconStyle === 'cute' ? '🔄' : '🔁' }}</div>
          <div class="stat-value">{{ reviewCount }}</div>
          <div class="stat-label">待复习</div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">{{ iconStyle === 'cute' ? '⚠️' : '⚠️' }} 危险操作</div>
      
      <div class="setting-card danger">
        <div class="setting-label">清空所有数据</div>
        <button class="btn-danger" @click="confirmClear">
          {{ iconStyle === 'cute' ? '🗑️' : '🗑️' }} 清空数据
        </button>
      </div>
    </div>
    
    <div class="footer">
      <div>英语学习助手 v1.0</div>
      <div style="font-size: 12px; color: #999; margin-top: 4px;">
        {{ iconStyle === 'cute' ? '🐰 学习愉快！' : '🤖 学习愉快！' }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  iconStyle: {
    type: String,
    default: 'cute'
  },
  versions: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:style', 'restore'])

const materialCount = computed(() => {
  const materials = JSON.parse(localStorage.getItem('materials') || '[]')
  return materials.length
})

const vocabCount = computed(() => {
  const vocab = JSON.parse(localStorage.getItem('vocab') || '[]')
  return vocab.length
})

const masteredCount = computed(() => {
  const vocab = JSON.parse(localStorage.getItem('vocab') || '[]')
  return vocab.filter(v => v.reviewLevel >= 6).length
})

const reviewCount = computed(() => {
  const vocab = JSON.parse(localStorage.getItem('vocab') || '[]')
  return vocab.filter(v => new Date(v.nextReview) <= new Date()).length
})

function updateStyle(style) {
  emit('update:style', style)
}

function getVersionStats(version) {
  const materials = JSON.parse(version.data.materials || '[]')
  const vocab = JSON.parse(version.data.vocab || '[]')
  return `${materials.length} 资料, ${vocab.length} 单词`
}

function saveVersion() {
  const version = {
    id: Date.now(),
    date: new Date().toLocaleString(),
    data: {
      materials: localStorage.getItem('materials') || '[]',
      vocab: localStorage.getItem('vocab') || '[]'
    }
  }
  
  let versions = JSON.parse(localStorage.getItem('versions') || '[]')
  versions.push(version)
  
  if (versions.length > 10) {
    versions = versions.slice(-10)
  }
  
  localStorage.setItem('versions', JSON.stringify(versions))
  alert('备份成功！')
}

function confirmRestore(version) {
  if (confirm(`确定要恢复到 ${version.date} 的版本吗？当前数据将被覆盖。`)) {
    emit('restore', version)
    alert('恢复成功！')
  }
}

function confirmClear() {
  if (confirm('⚠️ 确定要清空所有数据吗？此操作不可恢复！')) {
    localStorage.clear()
    alert('数据已清空')
    location.reload()
  }
}
</script>

<style scoped>
.section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 4px solid #667eea;
}

.setting-card {
  background: white;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 12px;
}

.setting-card.danger {
  background: #fff5f5;
  border: 1px solid #ffe0e0;
}

.setting-label {
  font-size: 15px;
  color: #333;
  margin-bottom: 12px;
}

.style-options {
  display: flex;
  gap: 12px;
}

.style-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.style-btn.active {
  border-color: #667eea;
  background: #f3e5f5;
}

.style-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.style-btn span:last-child {
  font-size: 14px;
  color: #333;
}

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
}

.btn-danger {
  width: 100%;
  padding: 14px;
  background: #ef5350;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.empty-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.versions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.version-item {
  background: white;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.version-info {
  flex: 1;
}

.version-date {
  font-weight: 600;
  font-size: 15px;
  color: #333;
}

.version-data {
  font-size: 13px;
  color: #999;
  margin-top: 4px;
}

.restore-btn {
  background: #e3f2fd;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  color: #1976d2;
  cursor: pointer;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-card {
  background: white;
  border-radius: 14px;
  padding: 20px;
  text-align: center;
}

.stat-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #667eea;
}

.stat-label {
  font-size: 13px;
  color: #999;
  margin-top: 4px;
}

.footer {
  text-align: center;
  padding: 30px 20px;
  color: #666;
}
</style>
