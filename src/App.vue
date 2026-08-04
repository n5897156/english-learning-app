<template>
  <div class="app-container">
    <div class="header">
      <h1>{{ getStyleIcon() }} 英语学习助手</h1>
    </div>
    
    <div class="nav-tabs">
      <div 
        v-for="tab in tabs" 
        :key="tab.id"
        :class="['nav-tab', { active: currentTab === tab.id }]"
        @click="navigateTo(tab.id)"
      >
        {{ tab.icon }}{{ tab.name }}
      </div>
    </div>
    
    <div class="content">
      <HomeView 
        v-if="currentTab === 'home'" 
        @navigate="navigateTo"
        :icon-style="iconStyle"
      />
      <MaterialsView 
        v-if="currentTab === 'materials'" 
        :materials="materials"
        @update="loadMaterials"
        :icon-style="iconStyle"
      />
      <VocabView 
        v-if="currentTab === 'vocab'" 
        :vocab-list="vocabList"
        @update="loadVocab"
        :icon-style="iconStyle"
      />
      <ReviewView
        v-if="currentTab === 'review'"
        :vocab-list="vocabList"
        @update="loadVocab"
        :icon-style="iconStyle"
      />
      <AITrainingView
        v-if="currentTab === 'training'"
        :icon-style="iconStyle"
      />
      <LearningPathView
        v-if="currentTab === 'path'"
        :icon-style="iconStyle"
      />
      <SettingsView 
        v-if="currentTab === 'settings'" 
        :icon-style="iconStyle"
        @update:style="updateIconStyle"
        :versions="versions"
        @restore="restoreVersion"
      />
    </div>
    
    <AddMaterialModal 
      v-if="showAddMaterialModal" 
      @close="showAddMaterialModal = false"
      @add="addMaterial"
    />
    
    <PendingModal 
      v-if="showPendingModal" 
      :pending="pendingMaterials"
      @close="showPendingModal = false"
      @approve="approveMaterials"
    />
  </div>
</template>

<script setup>import { ref, onMounted, computed } from 'vue';
import HomeView from './components/HomeView.vue';
import MaterialsView from './components/MaterialsView.vue';
import VocabView from './components/VocabView.vue';
import ReviewView from './components/ReviewView.vue';
import SettingsView from './components/SettingsView.vue';
import AddMaterialModal from './components/AddMaterialModal.vue';
import PendingModal from './components/PendingModal.vue';
import AITrainingView from './components/AITrainingView.vue';
import LearningPathView from './components/LearningPathView.vue';
import { checkSyncUrl, syncFromUrl } from './sync.js';
const currentTab = ref('home');
const showAddMaterialModal = ref(false);
const showPendingModal = ref(false);
const iconStyle = ref(localStorage.getItem('iconStyle') || 'cute');
const materials = ref([]);
const vocabList = ref([]);
const pendingMaterials = ref([]);
const versions = ref([]);
const getIcon = (style) => {
 const icons = {
 cute: { home: '🏠', materials: '📚', vocab: '📖', review: '🔄', training: '🤖', path: '🗺️', settings: '⚙️' },
 ai: { home: '🏠', materials: '📋', vocab: '📊', review: '🔁', training: '🤖', path: '📈', settings: '⚙️' },
 nature: { home: '🌳', materials: '🍃', vocab: '📝', review: '🌱', training: '🤖', path: '🌿', settings: '⚙️' },
 neon: { home: '💡', materials: '✨', vocab: '🔤', review: '🔄', training: '🤖', path: '✨', settings: '⚙️' },
 retro: { home: '🏠', materials: '📼', vocab: '📖', review: '🔄', training: '🤖', path: '🗺️', settings: '⚙️' },
 minimal: { home: '◉', materials: '▣', vocab: '▤', review: '↺', training: '◐', path: '○', settings: '⚙' }
 }
 return icons[style] || icons.cute
}

const tabs = computed(() => {
 const icons = getIcon(iconStyle.value)
 return [
 { id: 'home', name: '首页', icon: icons.home },
 { id: 'materials', name: '资料', icon: icons.materials },
 { id: 'vocab', name: '词汇', icon: icons.vocab },
 { id: 'review', name: '复习', icon: icons.review },
 { id: 'training', name: 'AI训练', icon: icons.training },
 { id: 'path', name: '路线', icon: icons.path },
 { id: 'settings', name: '设置', icon: icons.settings }
 ]
});
const homeStats = computed(() => ({
 materials: materials.value.length,
 vocab: vocabList.value.length,
 review: vocabList.value.filter(v => new Date(v.nextReview) <= new Date()).length
}));
function navigateTo(tab) {
 currentTab.value = tab;
}
function updateIconStyle(style) {
 iconStyle.value = style;
 localStorage.setItem('iconStyle', style);
}

function getStyleIcon() {
 const icons = {
 cute: '🐰',
 ai: '🤖',
 nature: '🌿',
 neon: '✨',
 retro: '🎮',
 minimal: '◎'
 }
 return icons[iconStyle.value] || '🐰'
}
function loadMaterials() {
 materials.value = JSON.parse(localStorage.getItem('materials') || '[]');
}
function loadVocab() {
 vocabList.value = JSON.parse(localStorage.getItem('vocab') || '[]');
}
function loadVersions() {
 versions.value = JSON.parse(localStorage.getItem('versions') || '[]');
}
function addMaterial(material) {
 const newMaterial = {
 id: Date.now(),
 ...material,
 createdAt: new Date().toISOString()
 };
 materials.value.push(newMaterial);
 localStorage.setItem('materials', JSON.stringify(materials.value));
 showAddMaterialModal.value = false;
}
function checkPending() {
 const pending = JSON.parse(localStorage.getItem('pendingMaterials') || '[]');
 if (pending.length > 0) {
 pendingMaterials.value = pending;
 showPendingModal.value = true;
 }
}
function approveMaterials(approvedIds) {
 approvedIds.forEach(id => {
 const material = pendingMaterials.value.find(m => m.id === id);
 if (material) {
 materials.value.push({
 id: Date.now(),
 ...material,
 createdAt: new Date().toISOString()
 });
 }
 });
 localStorage.setItem('materials', JSON.stringify(materials.value));
 const remaining = pendingMaterials.value.filter(m => !approvedIds.includes(m.id));
 localStorage.setItem('pendingMaterials', JSON.stringify(remaining));
 pendingMaterials.value = remaining;
 showPendingModal.value = false;
}
function restoreVersion(version) {
 localStorage.setItem('materials', version.data.materials);
 localStorage.setItem('vocab', version.data.vocab);
 loadMaterials();
 loadVocab();
}
function createVersion() {
 const version = {
 id: Date.now(),
 date: new Date().toLocaleString(),
 data: {
 materials: localStorage.getItem('materials') || '[]',
 vocab: localStorage.getItem('vocab') || '[]'
 }
 };
 versions.value.push(version);
 if (versions.value.length > 10) {
 versions.value.shift();
 }
 localStorage.setItem('versions', JSON.stringify(versions.value));
}


onMounted(() => {
 loadMaterials();
 loadVocab();
 loadVersions();
 checkPending();
 
 if (checkSyncUrl()) {
 const result = syncFromUrl();
 if (result.success) {
 alert(result.message);
 loadMaterials();
 loadVocab();
 }
 }
 
 if (materials.value.length === 0) {
 materials.value = [
 { id: 1, title: 'Daily English', content: 'The best way to learn English is to practice every day. Reading, writing, listening, and speaking are all important skills. Consistent practice will help you improve quickly.', category: '文章', createdAt: new Date().toISOString() },
 { id: 2, title: 'Learning Tips', content: 'Vocabulary is the foundation of language learning. Try to learn 5-10 new words every day. Use flashcards or apps to help memorize them effectively.', category: '文章', createdAt: new Date().toISOString() }
 ];
 localStorage.setItem('materials', JSON.stringify(materials.value));
 }
 if (vocabList.value.length === 0) {
 vocabList.value = [
 { id: 1, word: 'practice', phonetic: '/ˈpræktɪs/', meaning: '练习，实践', example: 'Practice makes perfect.', reviewLevel: 1, nextReview: new Date().toISOString() },
 { id: 2, word: 'consistent', phonetic: '/kənˈsɪstən/', meaning: '一致的，持续的', example: 'Be consistent in your learning.', reviewLevel: 1, nextReview: new Date().toISOString() },
 { id: 3, word: 'improve', phonetic: '/ɪmˈpruːv/', meaning: '改善，提高', example: 'You will improve with practice.', reviewLevel: 1, nextReview: new Date().toISOString() },
 { id: 4, word: 'vocabulary', phonetic: '/vəˈkæbjələri/', meaning: '词汇', example: 'Build your vocabulary every day.', reviewLevel: 1, nextReview: new Date().toISOString() },
 { id: 5, word: 'foundation', phonetic: '/faʊnˈdeɪʃn/', meaning: '基础，根基', example: 'Vocabulary is the foundation of language.', reviewLevel: 1, nextReview: new Date().toISOString() }
 ];
 localStorage.setItem('vocab', JSON.stringify(vocabList.value));
 }
 window.addEventListener('storage', (e) => {
 if (e.key === 'materials')
 loadMaterials();
 if (e.key === 'vocab')
 loadVocab();
 });
});
</script>

<style scoped>
.app-container {
  max-width: 480px;
  margin: 0 auto;
  background: #f5f5f5;
  min-height: 100vh;
  position: relative;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 24px 20px;
  text-align: center;
  box-shadow: 0 2px 10px rgba(102, 126, 234, 0.3);
}

.header h1 {
  font-size: 24px;
  font-weight: 600;
}

.nav-tabs {
  display: flex;
  background: white;
  border-bottom: 1px solid #f0f0f0;
  position: sticky;
  top: 0;
  z-index: 100;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.nav-tabs::-webkit-scrollbar {
  display: none;
}

.nav-tab {
  flex: 1;
  min-width: 64px;
  padding: 18px 8px;
  text-align: center;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  position: relative;
  transition: color 0.2s;
}

.nav-tab.active {
  color: #667eea;
  font-weight: 600;
}

.nav-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 3px;
  background: #667eea;
  border-radius: 2px;
}

.content {
  padding: 16px;
  min-height: calc(100vh - 160px);
}
</style>
