<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-title">添加学习资料</div>
      
      <div class="upload-section">
        <div class="upload-btn" @click="triggerFileInput">
          {{ iconStyle === 'cute' ? '📁' : '📂' }} 上传本地文件
        </div>
        <input 
          type="file" 
          id="file-input" 
          class="file-input"
          accept=".txt,.md,.json"
          @change="handleFileUpload"
        />
      </div>
      
      <div class="upload-section">
        <button class="upload-btn" @click="handleClipboard">
          {{ iconStyle === 'cute' ? '📋' : '📥' }} 从剪贴板粘贴
        </button>
      </div>
      
      <div class="upload-section">
        <button class="upload-btn" @click="handleImageOCR">
          {{ iconStyle === 'cute' ? '📷' : '📸' }} 从图片提取文字
        </button>
      </div>
      
      <div class="form-section">
        <div class="form-group">
          <label>标题</label>
          <input 
            type="text" 
            v-model="formData.title" 
            placeholder="输入标题"
            class="form-input"
          />
        </div>
        
        <div class="form-group">
          <label>分类</label>
          <select v-model="formData.category" class="form-select">
            <option value="文章">文章</option>
            <option value="新闻">新闻</option>
            <option value="对话">对话</option>
            <option value="每日推送">每日推送</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>内容</label>
          <textarea 
            v-model="formData.content" 
            placeholder="输入英文内容..."
            class="form-textarea"
            rows="6"
          ></textarea>
        </div>
      </div>
      
      <button class="btn-primary" @click="submit">添加</button>
      <button class="btn-secondary" @click="$emit('close')">取消</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  iconStyle: {
    type: String,
    default: 'cute'
  }
})

const emit = defineEmits(['close', 'add'])

const formData = ref({
  title: '',
  category: '文章',
  content: ''
})

function triggerFileInput() {
  document.getElementById('file-input').click()
}

function handleFileUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target.result
    formData.value.content = content
    
    const fileName = file.name.replace(/\.[^/.]+$/, '')
    if (!formData.value.title) {
      formData.value.title = fileName
    }
  }
  reader.readAsText(file)
}

async function handleClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      formData.value.content = text
    } else {
      alert('剪贴板为空')
    }
  } catch (err) {
    alert('无法读取剪贴板')
  }
}

function handleImageOCR() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.capture = 'environment'
  
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    try {
      if ('OCR' in window) {
        const result = await window.OCR.recognize(file)
        formData.value.content = result.text
      } else {
        alert('您的浏览器不支持OCR功能')
      }
    } catch (err) {
      alert('图片识别失败')
    }
  }
  
  input.click()
}

function submit() {
  if (!formData.value.title || !formData.value.content) {
    alert('请填写标题和内容')
    return
  }
  
  emit('add', { ...formData.value })
  formData.value = { title: '', category: '文章', content: '' }
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
  max-height: 85vh;
  overflow-y: auto;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 20px;
}

.upload-section {
  margin-bottom: 12px;
}

.upload-btn {
  width: 100%;
  padding: 16px;
  background: #f5f5f5;
  border: 2px dashed #ddd;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  font-size: 15px;
  color: #666;
  transition: all 0.2s;
}

.upload-btn:hover {
  border-color: #667eea;
  background: #f3e5f5;
}

.file-input {
  display: none;
}

.form-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
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

.form-input, .form-select, .form-textarea {
  width: 100%;
  padding: 14px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-size: 16px;
  background: #fafafa;
}

.form-input:focus, .form-select:focus, .form-textarea:focus {
  outline: none;
  border-color: #667eea;
  background: white;
}

.form-textarea {
  resize: none;
}

.btn-primary {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 8px;
}

.btn-secondary {
  width: 100%;
  padding: 14px;
  background: #f8f9fa;
  color: #333;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 10px;
}
</style>
