<template>
  <div class="settings-view">
    <div class="section">
      <div class="section-title">{{ iconStyle === 'cute' ? '🤖' : '🤖' }} AI 智能配置</div>

      <div class="setting-card">
        <div class="setting-label">NVIDIA API Key</div>
        <input
          type="password"
          v-model="apiKey"
          placeholder="输入 nvapi-... 开头的密钥"
          class="form-input"
        />
        <div class="setting-hint">用于 AI 拆解文章、智能对话、学习路线等功能。密钥仅存储在本地浏览器。</div>
        <button class="btn-primary" style="margin-top: 12px;" @click="saveApiKey">
          {{ iconStyle === 'cute' ? '💾' : '💾' }} 保存密钥
        </button>
      </div>

      <div class="setting-card">
        <div class="setting-label">AI 模型</div>
        <select v-model="aiModel" class="form-input">
          <option value="deepseek-ai/deepseek-v4-pro">DeepSeek V4 Pro（推荐）</option>
          <option value="meta/llama-3.1-8b-instruct">Llama 3.1 8B（轻量）</option>
        </select>
        <div class="setting-hint">选择 AI 模型，大模型效果更好但速度稍慢</div>
      </div>

      <div class="setting-card">
        <div class="setting-label">CORS 代理（解决跨域问题）</div>
        <select v-model="proxyMode" class="form-input" @change="onProxyModeChange">
          <option value="cloudflare">Cloudflare Worker（推荐，稳定）</option>
          <option value="corsproxy">corsproxy.io（公共代理）</option>
          <option value="direct">直连（仅本地开发可用）</option>
          <option value="custom">自定义代理 URL</option>
        </select>
        <div v-if="proxyMode === 'cloudflare'" class="setting-hint">
          需要部署一个 Cloudflare Worker。免费快速：
          <a href="https://dash.cloudflare.com/sign-up" target="_blank" style="color:#667eea;text-decoration:underline;">注册 Cloudflare</a>
          → 创建 Worker → 粘贴项目根目录的 cloudflare-worker.js 代码
        </div>
        <div v-if="proxyMode === 'cloudflare' || proxyMode === 'custom'" style="margin-top: 12px;">
          <input
            type="text"
            v-model="customProxyUrl"
            :placeholder="proxyMode === 'cloudflare' ? 'https://your-worker.workers.dev' : 'https://your-proxy-server.com'"
            class="form-input"
            @change="saveProxy"
          />
        </div>
        <div class="setting-hint">从 GitHub Pages 部署时必须使用代理，否则浏览器会阻止跨域请求</div>
      </div>

      <div v-if="apiKeySaved" class="setting-card ai-status-card">
        <div class="ai-status">{{ iconStyle === 'cute' ? '✅' : '✅' }} AI 功能已就绪</div>
        <button class="btn-secondary" @click="testApiKey" :disabled="isTesting">
          {{ isTesting ? '测试中...' : '测试连接' }}
        </button>
        <div v-if="testResult" class="test-result" :class="testResult.ok ? 'success' : 'error'">
          {{ testResult.msg }}
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">{{ iconStyle === 'cute' ? '🎨' : '🎛️' }} 界面风格</div>
      
      <div class="setting-card">
        <div class="setting-label">图标风格</div>
        <div class="style-options-grid">
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
          <button 
            :class="['style-btn', { active: iconStyle === 'nature' }]"
            @click="updateStyle('nature')"
          >
            <span class="style-icon">🌿</span>
            <span>自然风</span>
          </button>
          <button 
            :class="['style-btn', { active: iconStyle === 'neon' }]"
            @click="updateStyle('neon')"
          >
            <span class="style-icon">✨</span>
            <span>霓虹风</span>
          </button>
          <button 
            :class="['style-btn', { active: iconStyle === 'retro' }]"
            @click="updateStyle('retro')"
          >
            <span class="style-icon">🎮</span>
            <span>复古风</span>
          </button>
          <button 
            :class="['style-btn', { active: iconStyle === 'minimal' }]"
            @click="updateStyle('minimal')"
          >
            <span class="style-icon">◉</span>
            <span>简约风</span>
          </button>
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">{{ iconStyle === 'cute' ? '🔄' : '🔁' }} 数据同步</div>
      
      <div class="setting-card">
        <div class="setting-label">生成同步二维码</div>
        <button class="btn-primary" @click="generateSyncQrCode">
          {{ iconStyle === 'cute' ? '📱' : '📱' }} 生成同步二维码
        </button>
        <div class="setting-hint">使用手机扫描二维码，快速同步数据（限10KB内）</div>
      </div>
      
      <div v-if="syncQrCode" class="setting-card qrcode-card">
        <div class="setting-label">同步二维码</div>
        <div class="qrcode-container">
          <img :src="syncQrCode" alt="同步二维码" class="qrcode-image" />
        </div>
        <div class="setting-hint">打开手机相机扫描此二维码即可同步数据</div>
        <button class="btn-secondary small" @click="syncQrCode = null">
          {{ iconStyle === 'cute' ? '✕' : '✕' }} 关闭
        </button>
      </div>
      
      <div class="setting-card">
        <div class="setting-label">导出数据</div>
        <button class="btn-primary" @click="exportDataAsFile">
          {{ iconStyle === 'cute' ? '📥' : '⬇️' }} 下载数据文件
        </button>
        <button class="btn-secondary" @click="exportDataToClipboard">
          {{ iconStyle === 'cute' ? '📋' : '📋' }} 复制到剪贴板
        </button>
        <div class="setting-hint">将所有资料和单词导出，在其他设备导入</div>
      </div>
      
      <div class="setting-card">
        <div class="setting-label">导入数据</div>
        <input 
          type="file" 
          accept=".json" 
          class="file-input" 
          id="fileInput"
          @change="handleFileImport"
        />
        <button class="btn-secondary file-input-btn" @click="triggerFileInput">
          {{ iconStyle === 'cute' ? '📁' : '📁' }} 选择文件
        </button>
        <div class="setting-hint">或粘贴数据到下方文本框</div>
        <textarea 
          v-model="importData" 
          placeholder="粘贴导出的数据..." 
          class="import-textarea"
          rows="3"
        ></textarea>
        <button 
          class="btn-secondary" 
          @click="importDataAction"
          :disabled="!importData.trim()"
        >
          {{ iconStyle === 'cute' ? '📥' : '⬇️' }} 导入并合并
        </button>
        <div class="setting-hint">导入的数据会与现有数据合并，不会覆盖</div>
      </div>
      

      
      <div class="setting-card">
        <div class="setting-label">立即同步</div>
        <button class="btn-secondary" @click="syncNow">
          {{ iconStyle === 'cute' ? '⚡' : '⚡' }} 检查并同步
        </button>
        <div class="setting-hint">检查URL中是否有同步数据并自动合并</div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">{{ iconStyle === 'cute' ? '👥' : '👤' }} 分享应用</div>
      
      <div class="setting-card">
        <div class="setting-label">生成分享二维码</div>
        <button class="btn-primary" @click="generateShareQrCode">
          {{ iconStyle === 'cute' ? '🔗' : '🔗' }} 生成分享二维码
        </button>
        <div class="setting-hint">生成分享链接，让他人也可以使用这个应用</div>
      </div>
      
      <div v-if="shareQrCode" class="setting-card qrcode-card">
        <div class="setting-label">分享二维码</div>
        <div class="qrcode-container">
          <img :src="shareQrCode" alt="分享二维码" class="qrcode-image" />
        </div>
        <div class="setting-hint">扫描二维码即可访问英语学习助手</div>
        <input 
          type="text" 
          :value="shareLink" 
          readonly 
          class="sync-link-input"
        />
        <button class="btn-secondary small" @click="copyShareLink">
          {{ iconStyle === 'cute' ? '📋' : '📋' }} 复制链接
        </button>
        <button class="btn-secondary small" @click="shareQrCode = null">
          {{ iconStyle === 'cute' ? '✕' : '✕' }} 关闭
        </button>
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
      <div 
        class="section-title collapsible" 
        @click="showDangerZone = !showDangerZone"
      >
        {{ iconStyle === 'cute' ? '⚠️' : '⚠️' }} 危险操作 
        <span class="collapse-icon">{{ showDangerZone ? '▲' : '▼' }}</span>
      </div>
      
      <div v-if="showDangerZone" class="danger-zone">
        <div class="setting-card danger">
          <div class="setting-label">清空所有数据</div>
          <div class="danger-warning">⚠️ 此操作将永久删除所有学习数据，包括资料、单词和复习记录，且不可恢复！</div>
          <button class="btn-danger" @click="confirmClear">
            {{ iconStyle === 'cute' ? '🗑️' : '🗑️' }} 确认清空数据
          </button>
        </div>
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
import { ref, computed, onMounted } from 'vue'
import QRCode from 'qrcode'
import { generateSyncLink as genSyncLink, syncFromUrl, checkSyncUrl, generateShareLink } from '../sync.js'

const showDangerZone = ref(false)
const syncQrCode = ref('')
const shareQrCode = ref('')
const shareLink = ref('')
const importData = ref('')
const apiKey = ref('')
const aiModel = ref('deepseek-ai/deepseek-v4-pro')
const proxyMode = ref('corsproxy')
const customProxyUrl = ref('')
const apiKeySaved = ref(false)
const isTesting = ref(false)
const testResult = ref(null)

const PROXY_PRESETS = {
  corsproxy: 'https://corsproxy.io/?',
  cloudflare: '', // 由用户自定义
  direct: 'direct',
  custom: 'custom'
}

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
  window.location.reload()
}

function confirmRestore(version) {
  if (confirm(`确定要恢复到 ${version.date} 的版本吗？当前数据将被覆盖。`)) {
    emit('restore', version)
    alert('恢复成功！')
  }
}

async function generateSyncQrCode() {
  const result = genSyncLink()
  if (!result.success) {
    alert(result.message)
    return
  }
  
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(result.url, {
      width: 200,
      margin: 2
    })
    syncQrCode.value = qrCodeDataUrl
  } catch (error) {
    console.error('生成二维码失败:', error)
    alert('生成二维码失败，可能是数据量过大。请使用导入/导出功能。')
  }
}

async function generateShareQrCode() {
  const result = generateShareLink()
  if (result.success) {
    shareLink.value = result.url
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(result.url, {
        width: 200,
        margin: 2
      })
      shareQrCode.value = qrCodeDataUrl
    } catch (error) {
      console.error('生成二维码失败:', error)
      alert('生成二维码失败，请重试')
    }
  }
}

function copyShareLink() {
  navigator.clipboard.writeText(shareLink.value).then(() => {
    alert('分享链接已复制到剪贴板！')
  })
}

function exportDataAsFile() {
  const data = {
    version: '1.0',
    exportTime: new Date().toISOString(),
    materials: JSON.parse(localStorage.getItem('materials') || '[]'),
    vocab: JSON.parse(localStorage.getItem('vocab') || '[]')
  }
  
  const dataStr = JSON.stringify(data, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `english-learning-backup-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  
  alert('数据文件已下载！\n\n你可以将此文件传输到其他设备进行导入。')
}

function exportDataToClipboard() {
  const data = {
    version: '1.0',
    exportTime: new Date().toISOString(),
    materials: JSON.parse(localStorage.getItem('materials') || '[]'),
    vocab: JSON.parse(localStorage.getItem('vocab') || '[]')
  }
  
  const dataStr = JSON.stringify(data)
  
  if (navigator.clipboard) {
    navigator.clipboard.writeText(dataStr).then(() => {
      alert('数据已复制到剪贴板！\n\n你可以在其他设备的"导入数据"中粘贴此内容进行同步。')
    }).catch(() => {
      alert('复制失败，请手动复制')
    })
  } else {
    alert('您的浏览器不支持剪贴板功能')
  }
}

function triggerFileInput() {
  const fileInput = document.getElementById('fileInput')
  if (fileInput) {
    fileInput.click()
  }
}

function handleFileImport(event) {
  const file = event.target.files[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = function(e) {
    try {
      importData.value = e.target.result
      alert('文件已读取！点击"导入并合并"按钮完成导入。')
    } catch {
      alert('文件格式错误，请选择正确的JSON文件')
    }
  }
  reader.readAsText(file)
  
  event.target.value = ''
}

function importDataAction() {
  try {
    const imported = JSON.parse(importData.value)
    
    if (!imported.materials || !imported.vocab) {
      alert('无效的数据格式！')
      return
    }
    
    const existingMaterials = JSON.parse(localStorage.getItem('materials') || '[]')
    const existingVocab = JSON.parse(localStorage.getItem('vocab') || '[]')
    
    const newMaterials = mergeMaterials(existingMaterials, imported.materials)
    const newVocab = mergeVocab(existingVocab, imported.vocab)
    
    localStorage.setItem('materials', JSON.stringify(newMaterials))
    localStorage.setItem('vocab', JSON.stringify(newVocab))
    
    const addedMaterials = newMaterials.length - existingMaterials.length
    const addedVocab = newVocab.length - existingVocab.length
    
    importData.value = ''
    alert(`导入成功！\n\n新增资料: ${addedMaterials} 条\n新增单词: ${addedVocab} 个\n\n已存在的数据不会被覆盖。`)
    
    window.location.reload()
  } catch (error) {
    alert('导入失败！请检查数据格式是否正确。')
  }
}

function mergeMaterials(existing, imported) {
  const existingTitles = new Set(existing.map(m => m.title))
  const newMaterials = [...existing]
  
  imported.forEach(m => {
    if (!existingTitles.has(m.title)) {
      newMaterials.push({
        ...m,
        id: Date.now() + Math.random()
      })
    }
  })
  
  return newMaterials
}

function mergeVocab(existing, imported) {
  const existingWords = new Set(existing.map(v => v.word.toLowerCase()))
  const newVocab = [...existing]
  
  imported.forEach(v => {
    if (!existingWords.has(v.word.toLowerCase())) {
      newVocab.push({
        ...v,
        id: Date.now() + Math.random(),
        reviewLevel: 1,
        nextReview: new Date().toISOString()
      })
    } else {
      const index = existing.findIndex(e => e.word.toLowerCase() === v.word.toLowerCase())
      if (index !== -1) {
        const existingItem = existing[index]
        const maxLevel = Math.max(existingItem.reviewLevel, v.reviewLevel || 1)
        existingItem.reviewLevel = maxLevel
        if (new Date(v.nextReview) > new Date(existingItem.nextReview)) {
          existingItem.nextReview = v.nextReview
        }
      }
    }
  })
  
  return newVocab
}

function syncNow() {
  const result = syncFromUrl()
  if (result.success) {
    alert(result.message)
    window.location.reload()
  } else {
    alert('暂无同步数据，或URL中没有同步信息')
  }
}

function confirmClear() {
  if (confirm('⚠️ 确定要清空所有数据吗？此操作不可恢复！')) {
    localStorage.clear()
    alert('数据已清空')
    location.reload()
  }
}

function resolveProxyUrl() {
  if (proxyMode.value === 'cloudflare' || proxyMode.value === 'custom') {
    return customProxyUrl.value
  }
  return PROXY_PRESETS[proxyMode.value] || 'direct'
}

function saveApiKey() {
  if (!apiKey.value.trim()) {
    alert('请输入 API Key')
    return
  }
  localStorage.setItem('ai_api_key', apiKey.value.trim())
  localStorage.setItem('ai_model', aiModel.value)
  localStorage.setItem('ai_proxy_mode', proxyMode.value)
  if (customProxyUrl.value) {
    localStorage.setItem('ai_custom_proxy', customProxyUrl.value)
  }
  const proxy = resolveProxyUrl()
  localStorage.setItem('ai_proxy', proxy)
  apiKeySaved.value = true
  alert('API Key 已保存！AI 功能已就绪。')
}

function saveProxy() {
  const proxy = resolveProxyUrl()
  localStorage.setItem('ai_proxy', proxy)
  localStorage.setItem('ai_proxy_mode', proxyMode.value)
  if (customProxyUrl.value) {
    localStorage.setItem('ai_custom_proxy', customProxyUrl.value)
  }
}

function onProxyModeChange() {
  if (proxyMode.value === 'corsproxy') {
    customProxyUrl.value = ''
    saveProxy()
  }
}

function buildProxyUrl(url) {
  const proxy = resolveProxyUrl()
  if (proxy === 'direct' || !proxy) return url
  if (proxy === 'https://corsproxy.io/?') return proxy + encodeURIComponent(url)
  // Cloudflare Worker or custom: the proxy URL is the full endpoint, append path
  return proxy.replace(/\/$/, '') + '/v1/chat/completions'
}

async function testApiKey() {
  isTesting.value = true
  testResult.value = null
  try {
    const key = localStorage.getItem('ai_api_key')
    const model = localStorage.getItem('ai_model') || 'deepseek-ai/deepseek-v4-pro'
    const proxyUrl = buildProxyUrl('https://integrate.api.nvidia.com/v1/chat/completions')
    const resp = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Say "OK" in one word.' }],
        max_tokens: 5
      })
    })
    if (resp.ok) {
      testResult.value = { ok: true, msg: '连接成功！AI 功能正常工作。' }
    } else {
      const err = await resp.text()
      testResult.value = { ok: false, msg: `连接失败 (${resp.status}): ${err.slice(0, 100)}` }
    }
  } catch (e) {
    testResult.value = { ok: false, msg: `网络错误: ${e.message}。请检查 CORS 代理配置。` }
  }
  isTesting.value = false
}

onMounted(() => {
  const savedKey = localStorage.getItem('ai_api_key')
  if (savedKey) {
    apiKey.value = savedKey
    apiKeySaved.value = true
  }
  const savedModel = localStorage.getItem('ai_model')
  if (savedModel) {
    aiModel.value = savedModel
  }
  const savedProxyMode = localStorage.getItem('ai_proxy_mode')
  if (savedProxyMode) {
    proxyMode.value = savedProxyMode
  }
  const savedCustomProxy = localStorage.getItem('ai_custom_proxy')
  if (savedCustomProxy) {
    customProxyUrl.value = savedCustomProxy
  }
})
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

.section-title.collapsible {
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-right: 8px;
}

.collapse-icon {
  font-size: 12px;
  color: #999;
}

.danger-zone {
  margin-top: -8px;
}

.danger-warning {
  font-size: 13px;
  color: #c62828;
  margin-bottom: 12px;
  padding: 12px;
  background: #ffebee;
  border-radius: 8px;
}

.setting-hint {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

.sync-link-input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 13px;
  font-family: monospace;
  margin-bottom: 12px;
  box-sizing: border-box;
  word-break: break-all;
}

.btn-secondary.small {
  padding: 8px 16px;
  font-size: 13px;
}

.qrcode-card {
  text-align: center;
}

.qrcode-container {
  display: flex;
  justify-content: center;
  margin: 16px 0;
  background: white;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.qrcode-image {
  width: 200px;
  height: 200px;
  border-radius: 8px;
}

.file-input {
  display: none;
}

.file-input-btn {
  margin-bottom: 8px;
}

.import-textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 13px;
  font-family: monospace;
  resize: vertical;
  margin-bottom: 12px;
  box-sizing: border-box;
}

.import-textarea:focus {
  outline: none;
  border-color: #667eea;
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

.form-input {
  width: 100%;
  padding: 14px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-size: 16px;
  background: #fafafa;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  background: white;
}

.ai-status-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.ai-status {
  color: #4caf50;
  font-weight: 600;
  font-size: 15px;
}

.test-result {
  font-size: 14px;
  padding: 10px 16px;
  border-radius: 8px;
  text-align: center;
  width: 100%;
  box-sizing: border-box;
}

.test-result.success {
  background: #e8f5e9;
  color: #2e7d32;
}

.test-result.error {
  background: #ffebee;
  color: #c62828;
}

.style-options-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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
