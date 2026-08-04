export function generateSyncLink() {
  const materials = JSON.parse(localStorage.getItem('materials') || '[]')
  const vocab = JSON.parse(localStorage.getItem('vocab') || '[]')
  
  const data = {
    materials: materials,
    vocab: vocab,
    timestamp: Date.now()
  }
  
  try {
    const jsonStr = JSON.stringify(data)
    
    if (jsonStr.length > 10000) {
      return { 
        success: false, 
        message: `数据量过大（${Math.round(jsonStr.length / 1024)}KB），请使用导入/导出功能` 
      }
    }
    
    const encoded = btoa(unescape(encodeURIComponent(jsonStr)))
    const safeEncoded = encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    const url = `${window.location.origin}${window.location.pathname}?sync=${safeEncoded}`
    
    return { success: true, url, message: '同步链接已生成！' }
  } catch (error) {
    console.error('生成同步链接失败:', error)
    return { success: false, message: '生成链接失败，请重试' }
  }
}

export function generateShareLink() {
  return { 
    success: true, 
    url: window.location.origin + window.location.pathname,
    message: '分享链接已生成！'
  }
}

export function syncFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const syncData = params.get('sync')
  
  if (!syncData) {
    return { success: false, message: 'URL中没有同步数据' }
  }
  
  try {
    let decoded
    try {
      decoded = decodeURIComponent(syncData)
    } catch {
      const restored = syncData.replace(/-/g, '+').replace(/_/g, '/')
      const padding = restored.length % 4
      const padded = restored + (padding ? '='.repeat(4 - padding) : '')
      decoded = decodeURIComponent(escape(atob(padded)))
    }
    
    const parsed = JSON.parse(decoded)
    
    const localMaterials = JSON.parse(localStorage.getItem('materials') || '[]')
    const localVocab = JSON.parse(localStorage.getItem('vocab') || '[]')
    
    const mergedMaterials = mergeArray(localMaterials, parsed.materials, 'title')
    const mergedVocab = mergeVocab(localVocab, parsed.vocab)
    
    localStorage.setItem('materials', JSON.stringify(mergedMaterials))
    localStorage.setItem('vocab', JSON.stringify(mergedVocab))
    
    const url = new URL(window.location.href)
    url.searchParams.delete('sync')
    window.history.replaceState({}, document.title, url.toString())
    
    const addedMaterials = mergedMaterials.length - localMaterials.length
    const addedVocab = mergedVocab.length - localVocab.length
    
    return { 
      success: true, 
      message: `同步成功！\n\n新增资料: ${addedMaterials} 条\n新增单词: ${addedVocab} 个`,
      addedMaterials,
      addedVocab
    }
  } catch {
    return { success: false, message: '同步失败，数据格式错误' }
  }
}

export function checkSyncUrl() {
  const params = new URLSearchParams(window.location.search)
  return params.has('sync')
}

function mergeArray(local, cloud, keyField) {
  const localKeys = new Set(local.map(item => item[keyField]))
  const merged = [...local]
  
  cloud.forEach(item => {
    if (!localKeys.has(item[keyField])) {
      merged.push({ ...item, id: Date.now() + Math.random() })
    }
  })
  
  return merged
}

function mergeVocab(local, cloud) {
  const localWords = new Map(local.map(v => [v.word.toLowerCase(), v]))
  const merged = [...local]
  
  cloud.forEach(v => {
    const key = v.word.toLowerCase()
    if (!localWords.has(key)) {
      merged.push({
        ...v,
        id: Date.now() + Math.random(),
        reviewLevel: 1,
        nextReview: new Date().toISOString()
      })
    } else {
      const existing = localWords.get(key)
      const index = merged.findIndex(m => m.word.toLowerCase() === key)
      if (index !== -1) {
        merged[index].reviewLevel = Math.max(merged[index].reviewLevel, v.reviewLevel || 1)
        if (new Date(v.nextReview) > new Date(merged[index].nextReview)) {
          merged[index].nextReview = v.nextReview
        }
      }
    }
  })
  
  return merged
}
