<template>
  <div class="learning-path-view">
    <!-- 1. 顶部水平概览卡片 -->
    <div class="header-card">
      <div class="level-circle-wrap">
        <svg class="level-circle" viewBox="0 0 100 100">
          <circle class="lc-bg" cx="50" cy="50" r="45" />
          <circle
            class="lc-progress"
            cx="50"
            cy="50"
            r="45"
            :stroke="getLevelColor(stats.level)"
            :stroke-dasharray="CIRCUMFERENCE"
            :stroke-dashoffset="CIRCUMFERENCE * (1 - stats.level / 5)"
          />
        </svg>
        <div class="level-circle-inner">
          <div class="lc-number">{{ stats.level }}</div>
          <div class="lc-label">/ 5</div>
        </div>
      </div>

      <div class="header-info">
        <div class="header-level-text">{{ levelLabel }}</div>
        <div class="header-stats">
          <div class="stat-item">
            <span class="stat-icon">{{ iconStyle === 'cute' ? '🔥' : '🔥' }}</span>
            <span class="stat-value">{{ stats.streakDays }}</span>
            <span class="stat-text">天连击</span>
          </div>
          <div class="stat-item">
            <span class="stat-icon">{{ iconStyle === 'cute' ? '📝' : '✏️' }}</span>
            <span class="stat-value">{{ stats.totalExercises }}</span>
            <span class="stat-text">总练习</span>
          </div>
          <div class="stat-item">
            <span class="stat-icon">{{ iconStyle === 'cute' ? '🎯' : '✔' }}</span>
            <span class="stat-value">{{ accuracy }}%</span>
            <span class="stat-text">正确率</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. 技能雷达 (水平条) -->
    <div class="section-card">
      <div class="section-title">{{ iconStyle === 'cute' ? '🌟' : '📊' }} 技能分布</div>
      <div class="skill-bars">
        <div v-for="(score, skill) in stats.skillScores" :key="skill" class="skill-bar">
          <div class="skill-bar-label">{{ getSkillLabel(skill) }}</div>
          <div class="skill-bar-track">
            <div
              class="skill-bar-fill"
              :style="{
                width: (score / 5 * 100) + '%',
                background: getSkillColor(skill)
              }"
            ></div>
          </div>
          <div class="skill-bar-score">{{ score.toFixed(1) }}</div>
        </div>
      </div>
    </div>

    <!-- 3. AI 生成学习路线按钮 -->
    <div class="path-action">
      <button
        v-if="!learningPath"
        class="btn-primary generate-btn"
        :disabled="isGenerating"
        @click="generatePath"
      >
        <span v-if="!isGenerating">{{ iconStyle === 'cute' ? '🚀' : '✨' }} 生成个性化学习路线</span>
        <span v-else class="loading-text">
          <span class="mini-spinner"></span> AI 正在规划...
        </span>
      </button>
      <button
        v-else
        class="btn-secondary regenerate-btn"
        :disabled="isGenerating"
        @click="generatePath"
      >
        {{ isGenerating ? '生成中...' : (iconStyle === 'cute' ? '🔄 重新生成' : '🔄 重新生成') }}
      </button>
    </div>

    <!-- 4. 学习路线时间线 -->
    <div v-if="learningPath" class="path-display">
      <div class="path-goal">
        <div class="goal-label">{{ iconStyle === 'cute' ? '🎯' : '🎯' }} 阶段目标</div>
        <div class="goal-text">{{ learningPath.goal || '持续提升英语能力' }}</div>
      </div>

      <div class="timeline">
        <div class="timeline-line"></div>
        <div
          v-for="(milestone, mIndex) in learningPath.milestones"
          :key="mIndex"
          :class="[
            'milestone',
            {
              completed: getMilestoneProgress(milestone) >= 100,
              current: mIndex === currentMilestoneIndex
            }
          ]"
        >
          <div class="milestone-node">
            <span v-if="getMilestoneProgress(milestone) >= 100" class="node-check">✓</span>
            <span v-else class="node-dot"></span>
          </div>

          <div class="milestone-card">
            <div class="milestone-header">
              <div class="milestone-title">{{ milestone.title }}</div>
              <div class="milestone-days">{{ iconStyle === 'cute' ? '⏱️' : '⏱' }} {{ milestone.estimatedDays || 7 }} 天</div>
            </div>

            <div v-if="milestone.description" class="milestone-desc">{{ milestone.description }}</div>

            <div v-if="milestone.skills && milestone.skills.length" class="skill-tags">
              <span
                v-for="skill in milestone.skills"
                :key="skill"
                class="skill-tag"
                :style="{ background: getSkillColor(skill) + '22', color: getSkillColor(skill) }"
              >
                {{ getSkillLabel(skill) }}
              </span>
            </div>

            <div class="milestone-progress">
              <div class="mp-track">
                <div
                  class="mp-fill"
                  :style="{ width: getMilestoneProgress(milestone) + '%' }"
                ></div>
              </div>
              <div class="mp-text">{{ Math.round(getMilestoneProgress(milestone)) }}%</div>
            </div>

            <div class="task-list">
              <label
                v-for="(task, tIndex) in milestone.tasks"
                :key="tIndex"
                class="task-item"
              >
                <input
                  type="checkbox"
                  :checked="task.done"
                  @change="toggleTask(mIndex, tIndex)"
                />
                <span class="task-checkmark"></span>
                <span :class="['task-text', { done: task.done }]">{{ task.text }}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态提示 -->
    <div v-if="!learningPath && !isGenerating" class="empty-path">
      <div class="empty-icon">{{ iconStyle === 'cute' ? '🗺️' : '📍' }}</div>
      <div class="empty-title">还没有学习路线</div>
      <div class="empty-desc">点击上方按钮，AI 会根据你的学习数据生成专属学习计划</div>
    </div>

    <!-- 5. 薄弱环节 -->
    <div v-if="learningPath && learningPath.weakAreas && learningPath.weakAreas.length" class="section-card">
      <div class="section-title">{{ iconStyle === 'cute' ? '⚠️' : '!' }} 薄弱环节</div>
      <div class="weak-list">
        <div v-for="(area, index) in learningPath.weakAreas" :key="index" class="weak-card">
          <div class="weak-icon">{{ iconStyle === 'cute' ? '⚠️' : '!' }}</div>
          <div class="weak-text">{{ area }}</div>
        </div>
      </div>
    </div>

    <!-- 6. AI 建议 -->
    <div v-if="learningPath && learningPath.recommendations && learningPath.recommendations.length" class="section-card">
      <div class="section-title">{{ iconStyle === 'cute' ? '💡' : '💡' }} AI 学习建议</div>
      <div class="rec-list">
        <div v-for="(rec, index) in learningPath.recommendations" :key="index" class="rec-card">
          <div class="rec-icon">{{ iconStyle === 'cute' ? '💡' : '•' }}</div>
          <div class="rec-text">{{ rec }}</div>
        </div>
      </div>
    </div>

    <!-- 7. 水平测试按钮 -->
    <div class="assessment-section">
      <button
        class="btn-primary assess-btn"
        :disabled="isAssessing"
        @click="startAssessment"
      >
        <span v-if="!isAssessing">{{ iconStyle === 'cute' ? '🧪' : '📋' }} 开始水平测试</span>
        <span v-else class="loading-text">
          <span class="mini-spinner"></span> 正在生成题目...
        </span>
      </button>
      <div class="assess-hint">10 道 AI 出题，精准评估你的英语水平</div>
    </div>

    <!-- 水平测试弹窗 (底部抽屉) -->
    <div v-if="showTestModal" class="modal-overlay" @click.self="closeTestModal">
      <div class="modal-content">
        <!-- 测试中 -->
        <template v-if="!testResult">
          <div class="test-header">
            <div class="test-title">{{ iconStyle === 'cute' ? '🧪' : '📋' }} 水平测试</div>
            <button class="test-close" @click="closeTestModal">✕</button>
          </div>

          <div class="test-progress">
            <div class="tp-text">第 {{ currentTestIndex + 1 }} / {{ testQuestions.length }} 题</div>
            <div class="tp-bar">
              <div
                class="tp-fill"
                :style="{ width: ((currentTestIndex) / testQuestions.length * 100) + '%' }"
              ></div>
            </div>
          </div>

          <div v-if="testQuestions.length" class="question-block">
            <div class="question-meta">
              <span class="q-tag" :style="{ background: getLevelColor(testQuestions[currentTestIndex].level) + '22', color: getLevelColor(testQuestions[currentTestIndex].level) }">
                {{ getSkillLabel(testQuestions[currentTestIndex].skill) }}
              </span>
              <span class="q-level">Lv.{{ testQuestions[currentTestIndex].level }}</span>
            </div>
            <div class="question-text">{{ testQuestions[currentTestIndex].question }}</div>

            <div class="choices">
              <button
                v-for="(choice, cIndex) in testQuestions[currentTestIndex].choices"
                :key="cIndex"
                :class="[
                  'choice-btn',
                  {
                    selected: testAnswers[currentTestIndex] === cIndex,
                    correct: testAnswers[currentTestIndex] === cIndex && cIndex === testQuestions[currentTestIndex].correctIndex,
                    wrong: testAnswers[currentTestIndex] === cIndex && cIndex !== testQuestions[currentTestIndex].correctIndex
                  }
                ]"
                :disabled="testAnswers[currentTestIndex] !== undefined"
                @click="submitTestAnswer(cIndex)"
              >
                <span class="choice-letter">{{ String.fromCharCode(65 + cIndex) }}</span>
                <span class="choice-text">{{ choice }}</span>
              </button>
            </div>
          </div>
        </template>

        <!-- 测试结果 -->
        <template v-else>
          <div class="result-header">
            <div class="result-emoji">{{ testResult.accuracy >= 60 ? (iconStyle === 'cute' ? '🎉' : '★') : (iconStyle === 'cute' ? '💪' : '★') }}</div>
            <div class="result-title">测试完成！</div>
          </div>

          <div class="result-summary">
            <div class="result-score">
              <div class="rs-number">{{ testResult.correct }}/{{ testResult.total }}</div>
              <div class="rs-label">答对题数</div>
            </div>
            <div class="result-divider"></div>
            <div class="result-score">
              <div class="rs-number" :style="{ color: getLevelColor(testResult.assessedLevel) }">{{ testResult.accuracy }}%</div>
              <div class="rs-label">正确率</div>
            </div>
            <div class="result-divider"></div>
            <div class="result-score">
              <div class="rs-number" :style="{ color: getLevelColor(testResult.assessedLevel) }">Lv.{{ testResult.assessedLevel }}</div>
              <div class="rs-label">评估等级</div>
            </div>
          </div>

          <div class="result-note">
            {{ iconStyle === 'cute' ? '✨' : '✓' }} 已根据测试结果更新你的自适应学习数据
          </div>

          <div class="result-details">
            <div class="details-title">题目回顾</div>
            <div
              v-for="(q, qIndex) in testQuestions"
              :key="qIndex"
              class="detail-item"
            >
              <div class="detail-q">
                <span :class="['detail-mark', testAnswers[qIndex] === q.correctIndex ? 'right' : 'wrong']">
                  {{ testAnswers[qIndex] === q.correctIndex ? '✓' : '✗' }}
                </span>
                <span class="detail-text">{{ q.question }}</span>
              </div>
              <div class="detail-a">
                你的答案：<span :class="testAnswers[qIndex] === q.correctIndex ? 'txt-right' : 'txt-wrong'">
                  {{ q.choices[testAnswers[qIndex]] || '未作答' }}
                </span>
                <span v-if="testAnswers[qIndex] !== q.correctIndex" class="detail-correct">
                  ｜ 正确：{{ q.choices[q.correctIndex] }}
                </span>
              </div>
            </div>
          </div>

          <button class="btn-primary" @click="closeTestModal">{{ iconStyle === 'cute' ? '✅ 完成' : '完成' }}</button>
        </template>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMessage" class="error-toast" @click="errorMessage = ''">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  generateLearningPath,
  assessLevel,
  getAdaptiveStats,
  getAdaptiveLevel,
  recordExerciseResult
} from '../ai.js'

const props = defineProps({
  iconStyle: {
    type: String,
    default: 'cute'
  }
})

const PATH_STORAGE_KEY = 'learning_path'
const CIRCUMFERENCE = 2 * Math.PI * 45

// 技能颜色映射
const SKILL_COLORS = {
  vocabulary: '#667eea',
  grammar: '#f093fb',
  reading: '#4facfe',
  listening: '#43e97b',
  speaking: '#fa709a'
}

// 状态
const stats = ref(getAdaptiveStats())
const learningPath = ref(null)
const isGenerating = ref(false)
const isAssessing = ref(false)
const showTestModal = ref(false)
const testQuestions = ref([])
const testAnswers = ref([])
const testResult = ref(null)
const currentTestIndex = ref(0)

// 错误提示
const errorMessage = ref('')

// 计算属性
const levelLabel = computed(() => getAdaptiveLevel())

const accuracy = computed(() => {
  if (!stats.value || stats.value.totalExercises === 0) return 0
  return Math.round(stats.value.correctCount / stats.value.totalExercises * 100)
})

const currentMilestoneIndex = computed(() => {
  if (!learningPath.value || !learningPath.value.milestones) return -1
  return learningPath.value.milestones.findIndex(m => getMilestoneProgress(m) < 100)
})

// 工具方法
function getLevelColor(level) {
  const colors = ['#9e9e9e', '#ff7043', '#ffa726', '#66bb6a', '#42a5f5', '#7e57c2']
  return colors[level] || colors[3]
}

function getSkillLabel(skill) {
  const labels = {
    vocabulary: '词汇',
    grammar: '语法',
    reading: '阅读',
    listening: '听力',
    speaking: '口语'
  }
  return labels[skill] || skill
}

function getSkillColor(skill) {
  return SKILL_COLORS[skill] || '#667eea'
}

function getMilestoneProgress(milestone) {
  if (!milestone || !milestone.tasks || milestone.tasks.length === 0) return 0
  const done = milestone.tasks.filter(t => t.done).length
  return done / milestone.tasks.length * 100
}

function showError(msg) {
  errorMessage.value = msg
  setTimeout(() => {
    errorMessage.value = ''
  }, 4000)
}

// 规范化学习路线，将 tasks 字符串数组转为对象数组以便跟踪完成状态
function normalizePath(path) {
  if (!path) return null
  const normalized = { ...path }
  if (normalized.milestones) {
    normalized.milestones = normalized.milestones.map(m => ({
      ...m,
      tasks: (m.tasks || []).map(t =>
        typeof t === 'string' ? { text: t, done: false } : { text: t.text || String(t), done: !!t.done }
      )
    }))
  }
  return normalized
}

// 加载统计
function loadStats() {
  stats.value = getAdaptiveStats()
}

// 生成学习路线
async function generatePath() {
  if (isGenerating.value) return
  isGenerating.value = true
  try {
    const path = await generateLearningPath()
    const normalized = normalizePath(path)
    learningPath.value = normalized
    localStorage.setItem(PATH_STORAGE_KEY, JSON.stringify(normalized))
  } catch (err) {
    showError(err.message || '生成学习路线失败，请稍后重试')
  } finally {
    isGenerating.value = false
  }
}

// 切换任务完成状态
function toggleTask(milestoneIndex, taskIndex) {
  if (!learningPath.value || !learningPath.value.milestones) return
  const milestone = learningPath.value.milestones[milestoneIndex]
  if (!milestone || !milestone.tasks || !milestone.tasks[taskIndex]) return
  milestone.tasks[taskIndex].done = !milestone.tasks[taskIndex].done
  localStorage.setItem(PATH_STORAGE_KEY, JSON.stringify(learningPath.value))
}

// 开始水平测试
async function startAssessment() {
  if (isAssessing.value) return
  isAssessing.value = true
  testResult.value = null
  testQuestions.value = []
  testAnswers.value = []
  currentTestIndex.value = 0

  try {
    const result = await assessLevel()
    if (!result.questions || result.questions.length === 0) {
      showError('未能生成测试题，请稍后重试')
      return
    }
    testQuestions.value = result.questions
    testAnswers.value = new Array(result.questions.length).fill(undefined)
    showTestModal.value = true
  } catch (err) {
    showError(err.message || '生成测试题失败，请稍后重试')
  } finally {
    isAssessing.value = false
  }
}

// 提交单题答案
function submitTestAnswer(index) {
  if (testAnswers.value[currentTestIndex.value] !== undefined) return
  testAnswers.value[currentTestIndex.value] = index

  // 短暂展示作答反馈后进入下一题
  setTimeout(() => {
    if (currentTestIndex.value < testQuestions.value.length - 1) {
      currentTestIndex.value++
    } else {
      finishTest()
    }
  }, 650)
}

// 完成测试，计算结果并更新自适应数据
function finishTest() {
  let correct = 0
  const levelStats = {}

  testQuestions.value.forEach((q, i) => {
    const userAnswer = testAnswers.value[i]
    const isCorrect = userAnswer === q.correctIndex
    if (isCorrect) correct++

    // 调用 recordExerciseResult 更新自适应统计
    const skill = q.skill && SKILL_COLORS[q.skill] !== undefined ? q.skill : 'vocabulary'
    const difficulty = q.level || 3
    recordExerciseResult(skill, isCorrect, difficulty)

    // 按等级聚合统计用于评估等级
    const lvl = q.level || 3
    if (!levelStats[lvl]) levelStats[lvl] = { correct: 0, total: 0 }
    levelStats[lvl].total++
    if (isCorrect) levelStats[lvl].correct++
  })

  // 评估等级：最高且正确率 >= 50% 的等级
  let assessedLevel = 1
  for (let lvl = 5; lvl >= 1; lvl--) {
    if (levelStats[lvl] && levelStats[lvl].correct / levelStats[lvl].total >= 0.5) {
      assessedLevel = lvl
      break
    }
  }

  const total = testQuestions.value.length
  testResult.value = {
    correct,
    total,
    accuracy: total > 0 ? Math.round(correct / total * 100) : 0,
    assessedLevel
  }

  // 刷新顶部统计
  loadStats()
}

// 关闭测试弹窗
function closeTestModal() {
  showTestModal.value = false
}

// 生命周期
onMounted(() => {
  loadStats()
  try {
    const saved = localStorage.getItem(PATH_STORAGE_KEY)
    if (saved) {
      learningPath.value = normalizePath(JSON.parse(saved))
    }
  } catch (err) {
    learningPath.value = null
  }
})
</script>

<style scoped>
.learning-path-view {
  padding: 16px;
  max-width: 480px;
  margin: 0 auto;
  position: relative;
}

/* ===== 通用 ===== */
.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 14px;
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
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  transition: all 0.2s;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-secondary {
  padding: 12px;
  background: #f8f9fa;
  color: #333;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ===== 顶部水平卡片 ===== */
.header-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 22px;
  display: flex;
  align-items: center;
  gap: 20px;
  color: white;
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
  margin-bottom: 16px;
}

.level-circle-wrap {
  position: relative;
  width: 96px;
  height: 96px;
  flex-shrink: 0;
}

.level-circle {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.lc-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.2);
  stroke-width: 8;
}

.lc-progress {
  fill: none;
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.6s ease;
}

.level-circle-inner {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.lc-number {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
}

.lc-label {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 2px;
}

.header-info {
  flex: 1;
  min-width: 0;
}

.header-level-text {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
}

.header-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.stat-icon {
  font-size: 14px;
}

.stat-value {
  font-weight: 600;
  font-size: 15px;
}

.stat-text {
  opacity: 0.85;
}

/* ===== 通用 section 卡片 ===== */
.section-card {
  background: white;
  border-radius: 16px;
  padding: 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 16px;
}

/* ===== 技能条 ===== */
.skill-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skill-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.skill-bar-label {
  width: 42px;
  font-size: 13px;
  color: #555;
  font-weight: 500;
  flex-shrink: 0;
}

.skill-bar-track {
  flex: 1;
  height: 10px;
  background: #f0f0f0;
  border-radius: 5px;
  overflow: hidden;
}

.skill-bar-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.skill-bar-score {
  width: 32px;
  text-align: right;
  font-size: 13px;
  color: #666;
  font-weight: 600;
  flex-shrink: 0;
}

/* ===== 生成按钮 / 空状态 ===== */
.path-action {
  margin-bottom: 16px;
}

.generate-btn {
  padding: 18px;
  font-size: 16px;
}

.regenerate-btn {
  width: 100%;
}

.loading-text {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.mini-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-path {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.empty-icon {
  font-size: 56px;
  margin-bottom: 12px;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: #555;
  margin-bottom: 6px;
}

.empty-desc {
  font-size: 13px;
  color: #999;
  line-height: 1.5;
}

/* ===== 学习路线 / 时间线 ===== */
.path-display {
  margin-bottom: 16px;
}

.path-goal {
  background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 18px;
  border-left: 4px solid #667eea;
}

.goal-label {
  font-size: 12px;
  color: #667eea;
  font-weight: 600;
  margin-bottom: 4px;
}

.goal-text {
  font-size: 14px;
  color: #333;
  line-height: 1.5;
}

.timeline {
  position: relative;
  padding-left: 8px;
}

.timeline-line {
  position: absolute;
  left: 14px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: #e0e0e0;
}

.milestone {
  position: relative;
  padding-left: 36px;
  margin-bottom: 16px;
}

.milestone:last-child {
  margin-bottom: 0;
}

.milestone-node {
  position: absolute;
  left: 4px;
  top: 14px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: white;
  border: 2px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.node-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ccc;
}

.node-check {
  color: white;
  font-size: 13px;
  font-weight: 700;
}

.milestone.completed .milestone-node {
  background: #43e97b;
  border-color: #43e97b;
}

.milestone.current .milestone-node {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.15);
  animation: nodePulse 2s infinite;
}

@keyframes nodePulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.15); }
  50% { box-shadow: 0 0 0 8px rgba(102, 126, 234, 0.08); }
}

.milestone-card {
  background: white;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.2s;
}

.milestone.current .milestone-card {
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.15);
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.milestone.completed .milestone-card {
  opacity: 0.85;
}

.milestone-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.milestone-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  flex: 1;
}

.milestone-days {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
  background: #f5f5f5;
  padding: 3px 8px;
  border-radius: 10px;
}

.milestone-desc {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  margin-bottom: 10px;
}

.skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.skill-tag {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.milestone-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.mp-track {
  flex: 1;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.mp-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 3px;
  transition: width 0.4s ease;
}

.mp-text {
  font-size: 12px;
  color: #999;
  font-weight: 500;
  width: 32px;
  text-align: right;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 4px;
  cursor: pointer;
  font-size: 13px;
  color: #444;
  user-select: none;
}

.task-item input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.task-checkmark {
  width: 18px;
  height: 18px;
  border: 2px solid #ccc;
  border-radius: 5px;
  flex-shrink: 0;
  position: relative;
  transition: all 0.2s;
}

.task-item input[type="checkbox"]:checked + .task-checkmark {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
}

.task-item input[type="checkbox"]:checked + .task-checkmark::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 11px;
  font-weight: 700;
}

.task-text {
  line-height: 1.4;
}

.task-text.done {
  color: #aaa;
  text-decoration: line-through;
}

/* ===== 薄弱环节 ===== */
.weak-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.weak-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: #fff8e1;
  border-left: 3px solid #ffa000;
  padding: 10px 12px;
  border-radius: 8px;
}

.weak-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.weak-text {
  font-size: 13px;
  color: #5d4037;
  line-height: 1.5;
}

/* ===== AI 建议 ===== */
.rec-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rec-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: #f5f3ff;
  padding: 10px 12px;
  border-radius: 8px;
}

.rec-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.rec-text {
  font-size: 13px;
  color: #4527a0;
  line-height: 1.5;
}

/* ===== 水平测试 ===== */
.assessment-section {
  text-align: center;
  padding: 8px 0 20px;
}

.assess-btn {
  margin-bottom: 8px;
}

.assess-hint {
  font-size: 12px;
  color: #999;
}

/* ===== 测试弹窗 ===== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: white;
  border-radius: 20px 20px 0 0;
  padding: 20px;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  max-height: 88vh;
  overflow-y: auto;
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.test-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.test-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.test-close {
  width: 30px;
  height: 30px;
  border: none;
  background: #f5f5f5;
  border-radius: 50%;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.test-close:hover {
  background: #e0e0e0;
}

.test-progress {
  margin-bottom: 20px;
}

.tp-text {
  font-size: 13px;
  color: #999;
  margin-bottom: 6px;
}

.tp-bar {
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.tp-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.question-block {
  margin-bottom: 16px;
}

.question-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.q-tag {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.q-level {
  font-size: 11px;
  color: #999;
  background: #f5f5f5;
  padding: 3px 8px;
  border-radius: 10px;
}

.question-text {
  font-size: 16px;
  color: #333;
  line-height: 1.6;
  margin-bottom: 16px;
  font-weight: 500;
}

.choices {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.choice-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #fafafa;
  border: 2px solid #eee;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  font-size: 14px;
  color: #333;
}

.choice-btn:hover:not(:disabled) {
  border-color: #667eea;
  background: #f5f3ff;
}

.choice-btn:disabled {
  cursor: default;
}

.choice-btn.selected {
  border-color: #667eea;
  background: #f5f3ff;
}

.choice-btn.correct {
  border-color: #43e97b;
  background: #e8f8ee;
}

.choice-btn.wrong {
  border-color: #f44336;
  background: #ffebee;
}

.choice-letter {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: white;
  border: 1px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 13px;
  color: #666;
  flex-shrink: 0;
}

.choice-btn.correct .choice-letter {
  background: #43e97b;
  border-color: #43e97b;
  color: white;
}

.choice-btn.wrong .choice-letter {
  background: #f44336;
  border-color: #f44336;
  color: white;
}

.choice-text {
  flex: 1;
  line-height: 1.4;
}

/* ===== 测试结果 ===== */
.result-header {
  text-align: center;
  padding: 8px 0 20px;
}

.result-emoji {
  font-size: 48px;
  margin-bottom: 8px;
}

.result-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.result-summary {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: #f9f9ff;
  border-radius: 14px;
  padding: 18px 12px;
  margin-bottom: 12px;
}

.result-score {
  text-align: center;
  flex: 1;
}

.rs-number {
  font-size: 24px;
  font-weight: 700;
  color: #667eea;
  line-height: 1.2;
}

.rs-label {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.result-divider {
  width: 1px;
  height: 36px;
  background: #e0e0e0;
}

.result-note {
  text-align: center;
  font-size: 13px;
  color: #43e97b;
  background: #e8f8ee;
  padding: 10px;
  border-radius: 10px;
  margin-bottom: 16px;
}

.result-details {
  margin-bottom: 16px;
}

.details-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
}

.detail-item {
  background: #fafafa;
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 8px;
}

.detail-q {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: #333;
  line-height: 1.5;
  margin-bottom: 4px;
}

.detail-mark {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
  color: white;
}

.detail-mark.right {
  background: #43e97b;
}

.detail-mark.wrong {
  background: #f44336;
}

.detail-text {
  flex: 1;
}

.detail-a {
  font-size: 12px;
  color: #666;
  padding-left: 26px;
  line-height: 1.5;
}

.txt-right {
  color: #43e97b;
  font-weight: 500;
}

.txt-wrong {
  color: #f44336;
  text-decoration: line-through;
}

.detail-correct {
  color: #43e97b;
}

/* ===== 错误提示 ===== */
.error-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(51, 51, 51, 0.95);
  color: white;
  padding: 12px 20px;
  border-radius: 24px;
  font-size: 14px;
  z-index: 1001;
  max-width: 90%;
  text-align: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  animation: toastUp 0.3s ease;
}

@keyframes toastUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>
