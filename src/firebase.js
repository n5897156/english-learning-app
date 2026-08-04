import { initializeApp } from 'firebase/app'
import { getDatabase, ref, onValue, set, update } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyA9K9Z1J8n3a7mXN1M5eB2P0QrL8k7J7R8",
  authDomain: "english-learning-sync.firebaseapp.com",
  databaseURL: "https://english-learning-sync-default-rtdb.firebaseio.com",
  projectId: "english-learning-sync",
  storageBucket: "english-learning-sync.appspot.com",
  messagingSenderId: "10987654321",
  appId: "1:10987654321:web:a1b2c3d4e5f6g7h8"
}

let app = null
let db = null

export function initFirebase() {
  if (!app) {
    try {
      app = initializeApp(firebaseConfig)
      db = getDatabase(app)
      return { success: true, message: 'Firebase 初始化成功' }
    } catch (error) {
      console.error('Firebase 初始化失败:', error)
      return { success: false, message: 'Firebase 初始化失败' }
    }
  }
  return { success: true, message: 'Firebase 已初始化' }
}

export function syncToCloud(userId, data) {
  if (!db) {
    return { success: false, message: '请先初始化 Firebase' }
  }
  
  try {
    const userRef = ref(db, `users/${userId}`)
    update(userRef, {
      data: data,
      lastUpdate: Date.now()
    })
    return { success: true, message: '数据已同步到云端' }
  } catch (error) {
    console.error('同步失败:', error)
    return { success: false, message: '同步失败，请重试' }
  }
}

export function syncFromCloud(userId, callback) {
  if (!db) {
    return { success: false, message: '请先初始化 Firebase' }
  }
  
  try {
    const userRef = ref(db, `users/${userId}/data`)
    onValue(userRef, (snapshot) => {
      const data = snapshot.val()
      if (data && callback) {
        callback(data)
      }
    })
    return { success: true, message: '已连接到云端' }
  } catch (error) {
    console.error('连接失败:', error)
    return { success: false, message: '连接失败，请重试' }
  }
}

export function getCurrentUserId() {
  let userId = localStorage.getItem('userId')
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    localStorage.setItem('userId', userId)
  }
  return userId
}