<template>
  <div class="material-picker">
    <div v-if="materials.length === 0" class="empty-materials">
      <div class="empty-icon">📭</div>
      <div>资料库还是空的</div>
      <div class="empty-hint">请先到「资料」tab 添加文章</div>
      <button class="btn-primary" @click="goToMaterials">📚 去资料tab</button>
    </div>

    <div v-else class="materials-picker">
      <div
        v-for="mat in materials"
        :key="mat.id"
        class="material-picker-item"
        @click="$emit('select', mat)"
      >
        <div class="picker-title">{{ mat.title || '无标题文章' }}</div>
        <div class="picker-preview">{{ getPreview(mat.content) }}</div>
        <div class="picker-meta">
          <span>{{ (mat.content || '').length }} 字</span>
          <span>{{ mat.createdAt ? formatDate(mat.createdAt) : '' }}</span>
        </div>
        <button class="btn-primary small">
          {{ buttonText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  buttonText: {
    type: String,
    default: '🚀 开始训练'
  }
})

defineEmits(['select'])

const materials = ref([])

function loadMaterials() {
  materials.value = JSON.parse(localStorage.getItem('materials') || '[]')
}

function getPreview(content) {
  if (!content) return ''
  const text = content.replace(/\s+/g, ' ').trim()
  return text.length > 80 ? text.slice(0, 80) + '...' : text
}

function formatDate(iso) {
  try {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()}`
  } catch {
    return ''
  }
}

function goToMaterials() {
  window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'materials' }))
}

onMounted(loadMaterials)

defineExpose({ loadMaterials })
</script>

<style scoped>
.material-picker {
  width: 100%;
}

.empty-materials {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-materials > div:nth-child(2) {
  font-size: 15px;
  color: #666;
  margin-bottom: 6px;
}

.empty-hint {
  font-size: 13px;
  color: #999;
  margin-bottom: 20px;
}

.empty-materials .btn-primary {
  display: inline-block;
}

.materials-picker {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.material-picker-item {
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.material-picker-item:hover {
  border-color: #667eea;
  box-shadow: 0 2px 12px rgba(102, 126, 234, 0.1);
}

.picker-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-preview {
  font-size: 13px;
  color: #888;
  line-height: 1.5;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.picker-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #aaa;
  margin-bottom: 10px;
}

.material-picker-item .btn-primary.small {
  width: 100%;
  padding: 8px;
  font-size: 13px;
}

.btn-primary.small {
  padding: 8px 16px;
  font-size: 13px;
}
</style>
