<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-title">待审核资料</div>
      <div class="modal-subtitle">发现 {{ pending.length }} 条新资料，选择要接收的内容</div>
      
      <div class="pending-list">
        <div 
          v-for="item in pending" 
          :key="item.id"
          :class="['pending-item', { selected: selectedIds.includes(item.id) }]"
          @click="toggleSelect(item.id)"
        >
          <div class="pending-checkbox">
            <span v-if="selectedIds.includes(item.id)">✓</span>
          </div>
          <div class="pending-content">
            <div class="pending-title">{{ item.title }}</div>
            <div class="pending-category">{{ item.category }}</div>
          </div>
        </div>
      </div>
      
      <div class="modal-actions">
        <button class="btn-secondary" @click="selectAll">全选</button>
        <button class="btn-primary" @click="approve">确认接收</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  pending: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'approve'])

const selectedIds = ref([])

function toggleSelect(id) {
  const index = selectedIds.value.indexOf(id)
  if (index === -1) {
    selectedIds.value.push(id)
  } else {
    selectedIds.value.splice(index, 1)
  }
}

function selectAll() {
  if (selectedIds.value.length === pending.value.length) {
    selectedIds.value = []
  } else {
    selectedIds.value = pending.value.map(item => item.id)
  }
}

function approve() {
  if (selectedIds.value.length === 0) {
    alert('请至少选择一项')
    return
  }
  emit('approve', selectedIds.value)
}
</script>

<style scoped>
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
  max-height: 80vh;
  overflow-y: auto;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 8px;
}

.modal-subtitle {
  font-size: 14px;
  color: #999;
  text-align: center;
  margin-bottom: 20px;
}

.pending-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.pending-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fafafa;
  border-radius: 12px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.pending-item.selected {
  background: #e3f2fd;
  border-color: #1976d2;
}

.pending-checkbox {
  width: 28px;
  height: 28px;
  border: 2px solid #ddd;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: white;
  background: white;
}

.pending-item.selected .pending-checkbox {
  background: #667eea;
  border-color: #667eea;
}

.pending-content {
  flex: 1;
}

.pending-title {
  font-weight: 600;
  font-size: 15px;
  color: #333;
}

.pending-category {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.modal-actions button {
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
}

.btn-secondary {
  background: #f8f9fa;
  color: #333;
  border: 1px solid #e0e0e0;
}
</style>
