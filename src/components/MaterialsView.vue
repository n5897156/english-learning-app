<template>
  <div class="materials-view">
    <div class="toolbar">
      <button class="btn-secondary" @click="showAddModal = true">
        {{ iconStyle === 'cute' ? '➕' : '+' }} 添加新资料
      </button>
      <button class="btn-secondary" @click="exportMaterials">
        {{ iconStyle === 'cute' ? '📤' : '⬇️' }} 导出
      </button>
      <button class="btn-secondary" @click="showPasteImport = true">
        {{ iconStyle === 'cute' ? '📋' : '📋' }} 粘贴导入
      </button>
      <input
        type="file"
        accept=".json"
        class="file-input-hidden"
        ref="fileInputRef"
        @change="handleImportFile"
      />
    </div>
    <div class="toolbar-hint">💡 单篇导出：点击文章右侧 📤 按钮；批量导入：点「粘贴导入」粘贴 JSON</div>

    <!-- 粘贴导入模态框 -->
    <div v-if="showPasteImport" class="modal-overlay" @click.self="showPasteImport = false">
      <div class="modal-content paste-import-modal">
        <div class="modal-title">粘贴 JSON 导入</div>
        <div class="paste-hint">粘贴导出的 JSON 数据，导入后会自动合并（按标题去重）</div>
        <textarea
          v-model="pasteJson"
          class="paste-textarea"
          placeholder="在此粘贴 JSON 数据..."
          rows="8"
        ></textarea>
        <div class="paste-actions">
          <button class="btn-primary" @click="importFromPaste" :disabled="!pasteJson.trim()">
            导入
          </button>
          <button class="btn-secondary" @click="showPasteImport = false; pasteJson = ''">
            取消
          </button>
        </div>
      </div>
    </div>
    
    <div class="search-bar">
      <input 
        type="text" 
        v-model="searchQuery" 
        placeholder="搜索资料..." 
        class="search-input"
      />
    </div>
    
    <div class="materials-list">
      <div v-if="filteredMaterials.length === 0" class="empty-state">
        <div class="empty-icon">{{ iconStyle === 'cute' ? '📝' : '📄' }}</div>
        <div>暂无学习资料</div>
        <div style="font-size: 14px; margin-top: 8px;">点击上方按钮添加</div>
      </div>
      
      <div 
        v-for="material in filteredMaterials" 
        :key="material.id"
        class="material-item"
      >
        <div class="material-header">
          <div class="material-title" @click="showDetail(material)">{{ material.title }}</div>
          <div class="material-actions">
            <span class="material-category">{{ material.category }}</span>
            <button class="edit-btn" @click.stop="startEdit(material)" title="编辑">✏️</button>
            <button class="export-btn" @click.stop="exportSingle(material)" title="导出此篇">📤</button>
            <button class="delete-btn" @click.stop="deleteMaterial(material)">🗑️</button>
          </div>
        </div>
        <div class="material-preview" @click="showDetail(material)">{{ material.content.slice(0, 80) }}...</div>
        <div class="material-meta">
          {{ formatDate(material.createdAt) }}
        </div>
      </div>
    </div>
    
    <div v-if="showDetailModal" class="modal-overlay" @click.self="closeDetail">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ selectedMaterial?.title }}</h3>
          <span class="material-category">{{ selectedMaterial?.category }}</span>
        </div>
        
        <div class="audio-controls">
          <button class="audio-btn" @click="toggleAudio">
            {{ isPlaying ? '⏸️' : '🔊' }} {{ isPlaying ? '暂停' : '播放' }}
          </button>
          <div class="speed-control">
            <span>速度:</span>
            <select v-model="speechRate" class="speed-select">
              <option :value="0.5">0.5x</option>
              <option :value="0.75">0.75x</option>
              <option :value="1">1x</option>
              <option :value="1.25">1.25x</option>
              <option :value="1.5">1.5x</option>
            </select>
          </div>
        </div>
        
        <div class="material-full-content">
          {{ selectedMaterial?.content }}
        </div>

        <div class="ai-analysis-section">
          <button v-if="!aiAnalysis && !isAnalyzing" class="btn-ai" @click="runAiAnalysis">
            {{ iconStyle === 'cute' ? '🤖' : '🤖' }} AI 智能拆解文章
          </button>

          <div v-if="isAnalyzing" class="ai-loading">
            <div class="ai-spinner"></div>
            <span>AI 正在分析文章...</span>
          </div>

          <div v-if="aiAnalysis" class="ai-result">
            <div class="ai-result-header">
              <span>{{ iconStyle === 'cute' ? '🤖' : '🤖' }} AI 分析结果</span>
              <button class="btn-close-ai" @click="aiAnalysis = null">✕</button>
            </div>

            <div class="ai-difficulty-badge" :class="'diff-' + aiAnalysis.difficultyScore">
              {{ aiAnalysis.difficulty }} · 难度 {{ aiAnalysis.difficultyScore }}/10
            </div>

            <div class="ai-section">
              <div class="ai-section-title">📋 摘要</div>
              <div class="ai-section-content">{{ aiAnalysis.summary }}</div>
            </div>

            <div class="ai-section">
              <div class="ai-section-title">🔑 核心词汇</div>
              <div v-for="(v, i) in aiAnalysis.keyVocabulary" :key="i" class="ai-vocab-item">
                <div class="ai-vocab-word">{{ v.word }} <span class="ai-vocab-phonetic">{{ v.phonetic }}</span></div>
                <div class="ai-vocab-meaning">{{ v.meaning }}</div>
                <div class="ai-vocab-context">{{ v.context }}</div>
              </div>
            </div>

            <div class="ai-section">
              <div class="ai-section-title">📖 语法要点</div>
              <div v-for="(g, i) in aiAnalysis.grammarPoints" :key="i" class="ai-grammar-item">
                <div class="ai-grammar-point">{{ g.point }}</div>
                <div class="ai-grammar-explain">{{ g.explanation }}</div>
                <div class="ai-grammar-example">"{{ g.example }}"</div>
              </div>
            </div>

            <div class="ai-section">
              <div class="ai-section-title">💡 关键句型</div>
              <div v-for="(s, i) in aiAnalysis.keySentences" :key="i" class="ai-sentence-item">
                <div class="ai-sentence-en">{{ s.sentence }}</div>
                <div class="ai-sentence-cn">{{ s.translation }}</div>
                <div class="ai-sentence-note">{{ s.note }}</div>
              </div>
            </div>

            <div v-if="aiAnalysis.culturalNotes" class="ai-section">
              <div class="ai-section-title">🌍 文化背景</div>
              <div class="ai-section-content">{{ aiAnalysis.culturalNotes }}</div>
            </div>

            <div class="ai-section">
              <div class="ai-section-title">🌐 中文翻译</div>
              <div class="ai-section-content ai-translation">{{ aiAnalysis.translation }}</div>
            </div>

            <button class="btn-ai-secondary" @click="runAiQuestions">
              {{ iconStyle === 'cute' ? '📝' : '✏️' }} 生成 AI 理解题
            </button>
          </div>

          <!-- 句子训练区域 -->
          <div v-if="sentenceTraining" class="training-section">
            <div class="training-header">
              <span>{{ iconStyle === 'cute' ? '🎯' : '🎯' }} 句子训练（{{ sentenceTraining.length }} 句）</span>
              <button v-if="trainingMode" class="btn-close-ai" @click="backToModes">← 返回模式</button>
            </div>

            <!-- 模式选择 -->
            <div v-if="!trainingMode" class="training-modes">
              <button class="training-mode-btn" @click="startTraining('browse')">
                <span class="mode-icon">📖</span>
                <span class="mode-name">对照浏览</span>
                <span class="mode-desc">中英对照查看+朗读</span>
              </button>
              <button class="training-mode-btn" @click="startTraining('translate')">
                <span class="mode-icon">✍️</span>
                <span class="mode-name">看中写英</span>
                <span class="mode-desc">看中文写英文</span>
              </button>
              <button class="training-mode-btn" @click="startTraining('dictation')">
                <span class="mode-icon">🎧</span>
                <span class="mode-name">听写训练</span>
                <span class="mode-desc">听英文写出来</span>
              </button>
              <button class="training-mode-btn" @click="startTraining('cloze')">
                <span class="mode-icon">🔲</span>
                <span class="mode-name">填空测试</span>
                <span class="mode-desc">AI 生成填空题</span>
              </button>
            </div>

            <!-- 对照浏览 -->
            <div v-if="trainingMode === 'browse'" class="browse-mode">
              <div v-for="sentence in sentenceTraining" :key="sentence.id" class="sentence-card">
                <div class="sentence-top">
                  <span class="sentence-num">#{{ sentence.id }}</span>
                  <button class="speak-btn small" @click="speakText(sentence.english)">🔊</button>
                </div>
                <div class="sentence-en">{{ sentence.english }}</div>
                <div class="sentence-zh">{{ sentence.chinese }}</div>
                <div v-if="sentence.note" class="sentence-note">💡 {{ sentence.note }}</div>
              </div>
            </div>

            <!-- 看中写英 -->
            <div v-if="trainingMode === 'translate'" class="translate-mode">
              <div v-if="trainingIdx < sentenceTraining.length" class="training-card">
                <div class="training-progress">第 {{ trainingIdx + 1 }} / {{ sentenceTraining.length }} 句</div>
                <div class="training-chinese">{{ sentenceTraining[trainingIdx].chinese }}</div>
                <textarea
                  v-model="trainingAnswer"
                  class="training-input"
                  placeholder="根据中文翻译写出英文..."
                  rows="3"
                  :disabled="trainingResult"
                ></textarea>
                <div v-if="!trainingResult" class="training-actions">
                  <button class="btn-primary" @click="checkTranslateAnswer_local" :disabled="!trainingAnswer.trim() || isCheckingTraining">
                    {{ isCheckingTraining ? 'AI 评估中...' : '检查答案' }}
                  </button>
                </div>
                <div v-if="trainingResult" :class="['training-result', trainingResult.correct ? 'correct' : 'incorrect']">
                  <div class="result-icon">{{ trainingResult.correct ? '🎉' : '😅' }}</div>
                  <div class="result-text">{{ trainingResult.correct ? '翻译正确！' : '有些小问题' }}</div>
                  <div class="result-detail">
                    <div><strong>原句：</strong>{{ sentenceTraining[trainingIdx].english }}</div>
                    <div><strong>你的：</strong>{{ trainingAnswer }}</div>
                    <div class="feedback">{{ trainingResult.feedback }}</div>
                  </div>
                  <button class="btn-primary" @click="nextTraining">下一句 →</button>
                </div>
              </div>
              <div v-else class="all-done">
                <div class="done-icon">🎊</div>
                <div>全部完成！</div>
                <button class="btn-primary" @click="restartTraining">重新训练</button>
              </div>
            </div>

            <!-- 听写 -->
            <div v-if="trainingMode === 'dictation'" class="dictation-mode">
              <div v-if="trainingIdx < sentenceTraining.length" class="training-card">
                <div class="training-progress">第 {{ trainingIdx + 1 }} / {{ sentenceTraining.length }} 句</div>
                <div class="dictation-hint">点击播放听句子，写下你听到的英文</div>
                <div class="dictation-play">
                  <button class="play-btn" @click="speakText(sentenceTraining[trainingIdx].english)">🔊 播放</button>
                  <button class="play-btn secondary" @click="speakText(sentenceTraining[trainingIdx].english, 0.6)">🐢 慢速</button>
                </div>
                <textarea
                  v-model="trainingAnswer"
                  class="training-input"
                  placeholder="写下你听到的英文..."
                  rows="3"
                  :disabled="trainingResult"
                ></textarea>
                <div v-if="!trainingResult" class="training-actions">
                  <button class="btn-primary" @click="checkTranslateAnswer_local" :disabled="!trainingAnswer.trim() || isCheckingTraining">
                    {{ isCheckingTraining ? 'AI 评估中...' : '检查答案' }}
                  </button>
                  <button class="btn-secondary" @click="showDictationHint = !showDictationHint">
                    {{ showDictationHint ? '隐藏提示' : '看中文提示' }}
                  </button>
                </div>
                <div v-if="showDictationHint && !trainingResult" class="training-chinese hint">
                  {{ sentenceTraining[trainingIdx].chinese }}
                </div>
                <div v-if="trainingResult" :class="['training-result', trainingResult.correct ? 'correct' : 'incorrect']">
                  <div class="result-icon">{{ trainingResult.correct ? '🎉' : '😅' }}</div>
                  <div class="result-text">{{ trainingResult.correct ? '听写正确！' : '有些小问题' }}</div>
                  <div class="result-detail">
                    <div><strong>原句：</strong>{{ sentenceTraining[trainingIdx].english }}</div>
                    <div><strong>你的：</strong>{{ trainingAnswer }}</div>
                    <div class="feedback">{{ trainingResult.feedback }}</div>
                  </div>
                  <button class="btn-primary" @click="nextTraining">下一句 →</button>
                </div>
              </div>
              <div v-else class="all-done">
                <div class="done-icon">🎧</div>
                <div>听写完成！</div>
                <button class="btn-primary" @click="restartTraining">重新训练</button>
              </div>
            </div>

            <!-- 填空 -->
            <div v-if="trainingMode === 'cloze'" class="cloze-mode">
              <div v-if="clozeLoading" class="training-loading">
                <div class="ai-spinner"></div>
                <div>AI 正在生成填空题...</div>
              </div>
              <div v-else-if="clozeExercise && trainingIdx < sentenceTraining.length" class="cloze-card">
                <div class="training-progress">第 {{ trainingIdx + 1 }} / {{ sentenceTraining.length }} 句</div>
                <div class="cloze-question">{{ clozeExercise.question }}</div>
                <div v-if="clozeExercise.hint" class="cloze-hint">💡 {{ clozeExercise.hint }}</div>
                <div class="cloze-options">
                  <button
                    v-for="(opt, i) in clozeExercise.blanks[0].options"
                    :key="i"
                    :class="['cloze-option', {
                      selected: clozeSelected === i,
                      correct: clozeResult && i === clozeExercise.blanks[0].correctIdx,
                      wrong: clozeResult && clozeSelected === i && i !== clozeExercise.blanks[0].correctIdx
                    }]"
                    @click="selectClozeOption(i)"
                    :disabled="clozeResult"
                  >
                    {{ opt }}
                  </button>
                </div>
                <div v-if="clozeResult" :class="['training-result', clozeResult.correct ? 'correct' : 'incorrect']">
                  <div class="result-icon">{{ clozeResult.correct ? '🎉' : '😅' }}</div>
                  <div class="result-text">{{ clozeResult.correct ? '选对了！' : '答错了' }}</div>
                  <div class="result-detail">
                    <div><strong>答案：</strong>{{ clozeExercise.blanks[0].answer }}</div>
                    <div><strong>原句：</strong>{{ clozeExercise.originalSentence }}</div>
                  </div>
                  <button class="btn-primary" @click="nextTraining">下一题 →</button>
                </div>
              </div>
              <div v-else class="all-done">
                <div class="done-icon">🎓</div>
                <div>填空测试完成！</div>
                <button class="btn-primary" @click="restartTraining">重新开始</button>
              </div>
            </div>
          </div>

          <div v-if="aiQuestions" class="ai-questions">
            <div class="ai-questions-header">
              <span>📝 AI 理解题</span>
              <button class="btn-close-ai" @click="aiQuestions = null">✕</button>
            </div>
            <div v-for="(q, qi) in aiQuestions.questions" :key="qi" class="ai-question-card">
              <div class="ai-question-text">Q{{ qi + 1 }}. {{ q.question }}</div>
              <div v-if="q.type === 'choice'" class="ai-question-choices">
                <button
                  v-for="(c, ci) in q.choices"
                  :key="ci"
                  :class="['ai-choice-btn', {
                    selected: aiUserAnswers[qi] === ci,
                    correct: aiQuestionResults[qi] && ci === q.correctIndex,
                    wrong: aiQuestionResults[qi] === ci && ci !== q.correctIndex
                  }]"
                  @click="selectAiAnswer(qi, ci)"
                  :disabled="aiQuestionResults[qi] !== undefined"
                >
                  {{ ['A','B','C','D'][ci] }}. {{ c }}
                </button>
              </div>
              <div v-if="aiQuestionResults[qi] !== undefined" class="ai-question-explain">
                {{ q.explanation }}
              </div>
            </div>
            <button class="btn-ai-secondary" @click="aiQuestions = null; aiUserAnswers = {}; aiQuestionResults = {}">
              完成
            </button>
          </div>
        </div>

        <div class="detail-actions">
          <button class="btn-primary" @click="showExerciseTypeModal = true">
            {{ iconStyle === 'cute' ? '📝' : '✏️' }} 开始练习
          </button>
          <button class="btn-secondary" @click="startEdit(selectedMaterial)">
            {{ iconStyle === 'cute' ? '✏️' : '✏️' }} 编辑
          </button>
          <button class="btn-secondary" @click="exportSingle(selectedMaterial)">
            {{ iconStyle === 'cute' ? '📤' : '⬇️' }} 导出此篇
          </button>
          <button class="btn-secondary" @click="closeDetail">返回</button>
        </div>
        
        <div v-if="showExerciseTypeModal" class="modal-overlay" @click.self="showExerciseTypeModal = false">
          <div class="modal-content exercise-type-modal">
            <div class="modal-title">选择练习类型</div>
            <div class="exercise-types">
              <button class="exercise-type-btn" @click="startExerciseType('fill')">
                <span class="type-icon">✏️</span>
                <span class="type-name">词汇填空</span>
                <span class="type-desc">填写句子中的缺失单词</span>
              </button>
              <button class="exercise-type-btn" @click="startExerciseType('listen_fill')">
                <span class="type-icon">🔊✏️</span>
                <span class="type-name">听音填空</span>
                <span class="type-desc">听句子填写缺失单词</span>
              </button>
              <button class="exercise-type-btn" @click="startExerciseType('paragraph_fill')">
                <span class="type-icon">📄✏️</span>
                <span class="type-name">段落填空</span>
                <span class="type-desc">填写段落中的多个单词</span>
              </button>
              <button class="exercise-type-btn" @click="startExerciseType('listen_paragraph')">
                <span class="type-icon">🔊📄</span>
                <span class="type-name">听音段落</span>
                <span class="type-desc">听段落填写多个单词</span>
              </button>
            </div>
          </div>
        </div>
        
        <div v-if="showExercise" class="exercise-section">
          <div class="exercise-header">
            <h3>{{ getExerciseTitle() }}</h3>
            <span class="exercise-progress">{{ currentIndex + 1 }} / {{ questions.length }}</span>
          </div>
          
          <div v-if="exerciseType === 'fill'" class="fill-exercise">
            <div class="question-text">{{ currentQuestion?.sentence }}</div>
            <input 
              type="text" 
              v-model="userAnswer" 
              placeholder="输入答案..." 
              class="answer-input"
              @keyup.enter="checkAnswer"
              :disabled="showResult"
            />
          </div>
          
          <div v-else-if="exerciseType === 'listen_fill'" class="fill-exercise">
            <button class="audio-btn small" @click="playSentence(currentQuestion?.original)">
              🔊 播放句子
            </button>
            <div class="question-text">{{ currentQuestion?.sentence }}</div>
            <input 
              type="text" 
              v-model="userAnswer" 
              placeholder="输入听到的单词..." 
              class="answer-input"
              @keyup.enter="checkAnswer"
              :disabled="showResult"
            />
          </div>
          
          <div v-else-if="exerciseType === 'paragraph_fill'" class="paragraph-exercise">
            <div class="question-text paragraph-text">{{ currentQuestion?.paragraph }}</div>
            <div class="multi-blanks">
              <div 
                v-for="(blank, index) in currentQuestion?.blanks" 
                :key="index"
                class="blank-item"
              >
                <span>空格 {{ index + 1 }}:</span>
                <input 
                  type="text" 
                  :value="userAnswers[index]"
                  @input="updateUserAnswer(index, $event)"
                  placeholder="输入答案..." 
                  class="answer-input small"
                  :disabled="showResult"
                />
                <span v-if="showResult" :class="isBlankCorrect(index) ? 'correct' : 'incorrect'">
                  {{ isBlankCorrect(index) ? '✓' : '✗ ' + currentQuestion?.answers[index] }}
                </span>
              </div>
            </div>
          </div>
          
          <div v-else-if="exerciseType === 'listen_paragraph'" class="paragraph-exercise">
            <button class="audio-btn small" @click="playSentence(currentQuestion?.originalParagraph)">
              🔊 播放段落
            </button>
            <div class="question-text paragraph-text">{{ currentQuestion?.paragraph }}</div>
            <div class="multi-blanks">
              <div 
                v-for="(blank, index) in currentQuestion?.blanks" 
                :key="index"
                class="blank-item"
              >
                <span>空格 {{ index + 1 }}:</span>
                <input 
                  type="text" 
                  :value="userAnswers[index]"
                  @input="updateUserAnswer(index, $event)"
                  placeholder="输入听到的单词..." 
                  class="answer-input small"
                  :disabled="showResult"
                />
                <span v-if="showResult" :class="isBlankCorrect(index) ? 'correct' : 'incorrect'">
                  {{ isBlankCorrect(index) ? '✓' : '✗ ' + currentQuestion?.answers[index] }}
                </span>
              </div>
            </div>
          </div>
          
          <div v-else class="choice-exercise">
            <div class="question-text">{{ currentQuestion?.question }}</div>
            <div class="choices">
              <button 
                v-for="(choice, index) in currentQuestion?.choices" 
                :key="index"
                :class="['choice-btn', { selected: selectedChoice === index, correct: showResult && index === currentQuestion?.correct, disabled: showResult }]"
                @click="selectChoice(index)"
                :disabled="showResult"
              >
                {{ ['A', 'B', 'C', 'D'][index] }}. {{ choice }}
              </button>
            </div>
          </div>
          
          <div v-if="showResult" class="result-display" :class="allCorrect ? 'correct' : 'incorrect'">
            {{ allCorrect ? '🎉 全部正确！' : '😅 部分错误' }}
            <div v-if="!allCorrect && currentQuestion?.answers" class="correct-answer">
              正确答案: {{ currentQuestion?.answers.join(', ') }}
            </div>
          </div>
          
          <div class="exercise-actions">
            <button 
              v-if="!showResult" 
              class="btn-primary" 
              @click="checkAnswer"
            >
              确认答案
            </button>
            <button v-else class="btn-primary" @click="nextQuestion">
              {{ currentIndex >= questions.length - 1 ? '完成练习' : '下一题' }}
            </button>
            <button class="btn-secondary" @click="closeExercise">退出练习</button>
          </div>
        </div>
      </div>
    </div>
    
    <AddMaterialModal 
      v-if="showAddModal" 
      @close="showAddModal = false"
      @add="handleAdd"
    />

    <AddMaterialModal
      v-if="showEditModal"
      :editMaterial="editingMaterial"
      @close="closeEdit"
      @update="handleUpdate"
    />
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import AddMaterialModal from './AddMaterialModal.vue'
import { analyzeArticle, generateComprehensionQuestions, recordExerciseResult, checkTranslationAnswer, generateClozeExercise } from '../ai.js'

const props = defineProps({
  materials: {
    type: Array,
    default: () => []
  },
  iconStyle: {
    type: String,
    default: 'cute'
  }
})

const emit = defineEmits(['update'])

const searchQuery = ref('')
const showAddModal = ref(false)
const showDetailModal = ref(false)
const showExercise = ref(false)
const showExerciseTypeModal = ref(false)
const selectedMaterial = ref(null)
const isPlaying = ref(false)
const speechRate = ref(1)
const exerciseType = ref('fill')
const currentQuestion = ref(null)
const currentIndex = ref(0)
const questions = ref([])
const userAnswer = ref('')
const userAnswers = ref([])
const selectedChoice = ref(null)
const showResult = ref(false)
const isCorrect = ref(false)
const allCorrect = ref(false)
const aiAnalysis = ref(null)
const isAnalyzing = ref(false)
const aiQuestions = ref(null)
const aiUserAnswers = ref({})
const aiQuestionResults = ref({})

// 句子训练状态
const sentenceTraining = ref(null) // 存储提取的句子列表
const trainingMode = ref('') // browse | translate | dictation | cloze
const trainingIdx = ref(0)
const trainingAnswer = ref('')
const trainingResult = ref(null)
const isCheckingTraining = ref(false)
const showDictationHint = ref(false)
const clozeExercise = ref(null)
const clozeLoading = ref(false)
const clozeSelected = ref(-1)
const clozeResult = ref(null)

const filteredMaterials = computed(() => {
  if (!searchQuery.value) return props.materials
  const query = searchQuery.value.toLowerCase()
  return props.materials.filter(m => 
    m.title.toLowerCase().includes(query) || 
    m.content.toLowerCase().includes(query)
  )
})

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

function showDetail(material) {
  selectedMaterial.value = material
  showDetailModal.value = true
}

function closeDetail() {
  stopAudio()
  showDetailModal.value = false
  selectedMaterial.value = null
  aiAnalysis.value = null
  aiQuestions.value = null
  isAnalyzing.value = false
  aiUserAnswers.value = {}
  aiQuestionResults.value = {}
  sentenceTraining.value = null
  trainingMode.value = ''
  trainingIdx.value = 0
  trainingAnswer.value = ''
  trainingResult.value = null
  clozeExercise.value = null
  clozeResult.value = null
  clozeSelected.value = -1
}

async function runAiAnalysis() {
  if (!selectedMaterial.value) return
  const apiKey = localStorage.getItem('ai_api_key')
  if (!apiKey) {
    alert('请先在设置中配置 AI API Key')
    return
  }
  isAnalyzing.value = true
  try {
    const [analysis] = await Promise.all([
      analyzeArticle(selectedMaterial.value.title, selectedMaterial.value.content)
    ])
    aiAnalysis.value = analysis
    // 用 keySentences 作为训练数据
    if (analysis.keySentences && analysis.keySentences.length > 0) {
      sentenceTraining.value = analysis.keySentences.map((s, i) => ({
        id: i + 1,
        english: s.sentence,
        chinese: s.translation,
        keyWords: [],
        note: s.note
      }))
    }
  } catch (e) {
    alert('AI 分析失败: ' + e.message)
  }
  isAnalyzing.value = false
}

async function runAiQuestions() {
  if (!selectedMaterial.value) return
  try {
    const result = await generateComprehensionQuestions(selectedMaterial.value.title, selectedMaterial.value.content)
    aiQuestions.value = result
    aiUserAnswers.value = {}
    aiQuestionResults.value = {}
  } catch (e) {
    alert('生成题目失败: ' + e.message)
  }
}

function selectAiAnswer(qi, ci) {
  aiUserAnswers.value[qi] = ci
  const q = aiQuestions.value.questions[qi]
  const isCorrectAns = ci === q.correctIndex
  aiQuestionResults.value[qi] = isCorrectAns
  recordExerciseResult('reading', isCorrectAns, q.difficulty || 3)
}

function toggleAudio() {
  if (!selectedMaterial.value) return
  
  if ('speechSynthesis' in window) {
    if (isPlaying.value) {
      window.speechSynthesis.pause()
      isPlaying.value = false
    } else {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.resume()
        isPlaying.value = true
      } else {
        const utterance = new SpeechSynthesisUtterance(selectedMaterial.value.content)
        utterance.lang = 'en-US'
        utterance.rate = speechRate.value
        utterance.onend = () => { isPlaying.value = false }
        utterance.onerror = (event) => { 
          isPlaying.value = false 
          console.log('Speech error:', event)
        }
        window.speechSynthesis.speak(utterance)
        isPlaying.value = true
      }
    }
  } else {
    alert('您的浏览器不支持语音功能')
  }
}

function stopAudio() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    isPlaying.value = false
  }
}

function startExerciseType(type) {
  exerciseType.value = type
  showExerciseTypeModal.value = false
  generateQuestions()
  showExercise.value = true
}

function getExerciseTitle() {
  const titles = {
    fill: '✏️ 词汇填空',
    listen_fill: '🔊✏️ 听音填空',
    paragraph_fill: '📄✏️ 段落填空',
    listen_paragraph: '🔊📄 听音段落',
    choice: '📌 选择练习'
  }
  return titles[exerciseType.value] || '练习'
}

function startExercise() {
  showExerciseTypeModal.value = true
}

function generateQuestions() {
  const content = selectedMaterial.value.content
  
  if (exerciseType.value === 'fill' || exerciseType.value === 'listen_fill') {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15)
    questions.value = sentences.map(sentence => {
      const words = sentence.trim().split(' ')
      const longWords = words.filter(w => w.length > 3 && /^[a-zA-Z]+$/.test(w))
      if (longWords.length < 2) return null
      
      const blankIndex = words.indexOf(longWords[Math.floor(Math.random() * longWords.length)])
      const answer = words[blankIndex]
      const questionWords = [...words]
      questionWords[blankIndex] = '____'
      
      return {
        sentence: questionWords.join(' '),
        answer: answer,
        original: sentence.trim()
      }
    }).filter(q => q)
  } else if (exerciseType.value === 'paragraph_fill' || exerciseType.value === 'listen_paragraph') {
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 50)
    questions.value = paragraphs.map(paragraph => {
      const words = paragraph.trim().split(' ')
      const longWords = words
        .map((w, i) => ({ word: w, index: i }))
        .filter(({ word }) => word.length > 3 && /^[a-zA-Z]+$/.test(word))
      
      if (longWords.length < 2) return null
      
      const shuffled = [...longWords].sort(() => Math.random() - 0.5)
      const selected = shuffled.slice(0, Math.min(3, shuffled.length))
      selected.sort((a, b) => a.index - b.index)
      
      const answers = selected.map(s => s.word)
      const blanks = selected.map(s => s.word)
      const questionWords = [...words]
      
      selected.forEach(s => {
        questionWords[s.index] = '____'
      })
      
      return {
        paragraph: questionWords.join(' '),
        originalParagraph: paragraph.trim(),
        answers: answers,
        blanks: blanks
      }
    }).filter(q => q)
  } else {
    const vocab = JSON.parse(localStorage.getItem('vocab') || '[]')
    questions.value = vocab.slice(0, 5).map(v => {
      const wrongOptions = vocab
        .filter(x => x.id !== v.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(x => x.meaning)
      const choices = [...wrongOptions, v.meaning].sort(() => Math.random() - 0.5)
      
      return {
        question: `单词 "${v.word}" 的中文意思是？`,
        choices: choices,
        correct: choices.indexOf(v.meaning),
        answer: v.meaning
      }
    })
  }
  
  currentIndex.value = 0
  currentQuestion.value = questions.value[0]
  resetAnswers()
}

function resetAnswers() {
  userAnswer.value = ''
  userAnswers.value = []
  if (currentQuestion.value?.answers) {
    userAnswers.value = new Array(currentQuestion.value.answers.length).fill('')
  }
}

function updateUserAnswer(index, event) {
  userAnswers.value[index] = event.target.value
}

function isBlankCorrect(index) {
  return userAnswers.value[index]?.toLowerCase().trim() === currentQuestion.value.answers[index]?.toLowerCase()
}

function selectChoice(index) {
  selectedChoice.value = index
}

function checkAnswer() {
  if (exerciseType.value === 'fill' || exerciseType.value === 'listen_fill') {
    isCorrect.value = userAnswer.value.toLowerCase().trim() === currentQuestion.value.answer.toLowerCase()
    allCorrect.value = isCorrect.value
  } else if (exerciseType.value === 'paragraph_fill' || exerciseType.value === 'listen_paragraph') {
    allCorrect.value = currentQuestion.value.answers.every((answer, index) => {
      return userAnswers.value[index]?.toLowerCase().trim() === answer.toLowerCase()
    })
  } else {
    isCorrect.value = selectedChoice.value === currentQuestion.value.correct
    allCorrect.value = isCorrect.value
  }
  showResult.value = true
}

function nextQuestion() {
  if (currentIndex.value >= questions.value.length - 1) {
    closeExercise()
    alert('练习完成！')
    return
  }
  
  currentIndex.value++
  currentQuestion.value = questions.value[currentIndex.value]
  resetAnswers()
  selectedChoice.value = null
  showResult.value = false
}

function closeExercise() {
  showExercise.value = false
  showExerciseTypeModal.value = false
  questions.value = []
  currentQuestion.value = null
  userAnswer.value = ''
  userAnswers.value = []
  selectedChoice.value = null
  showResult.value = false
}

function playSentence(text) {
  if (!text) return
  
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = speechRate.value
    window.speechSynthesis.speak(utterance)
  } else {
    alert('您的浏览器不支持语音功能')
  }
}

function speakText(text, rate = 0.9) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = rate
  window.speechSynthesis.speak(utterance)
}

// ========== 句子训练方法 ==========

function startTraining(mode) {
  trainingMode.value = mode
  trainingIdx.value = 0
  trainingAnswer.value = ''
  trainingResult.value = null
  showDictationHint.value = false
  clozeExercise.value = null
  clozeResult.value = null
  clozeSelected.value = -1
  if (mode === 'cloze') {
    loadClozeExercise()
  }
}

function backToModes() {
  trainingMode.value = ''
  trainingResult.value = null
  clozeExercise.value = null
}

async function checkTranslateAnswer_local() {
  const answer = trainingAnswer.value.trim()
  if (!answer || isCheckingTraining.value) return
  isCheckingTraining.value = true
  trainingResult.value = null
  try {
    const sentence = sentenceTraining.value[trainingIdx.value]
    const result = await checkTranslationAnswer(sentence.english, answer)
    trainingResult.value = result
    recordExerciseResult('grammar', result.correct)
  } catch (err) {
    alert('评估失败: ' + err.message)
  } finally {
    isCheckingTraining.value = false
  }
}

function nextTraining() {
  trainingIdx.value++
  trainingAnswer.value = ''
  trainingResult.value = null
  showDictationHint.value = false
  if (trainingMode.value === 'cloze') {
    clozeSelected.value = -1
    clozeResult.value = null
    loadClozeExercise()
  }
}

function restartTraining() {
  trainingIdx.value = 0
  trainingAnswer.value = ''
  trainingResult.value = null
  showDictationHint.value = false
  clozeSelected.value = -1
  clozeResult.value = null
  if (trainingMode.value === 'cloze') {
    loadClozeExercise()
  }
}

async function loadClozeExercise() {
  if (trainingIdx.value >= sentenceTraining.value.length) return
  clozeLoading.value = true
  clozeExercise.value = null
  clozeSelected.value = -1
  clozeResult.value = null
  try {
    const sentence = sentenceTraining.value[trainingIdx.value]
    const result = await generateClozeExercise(sentence.english, sentence.keyWords || [])
    const correctAnswer = result.blanks[0].answer
    result.blanks[0].correctIdx = result.blanks[0].options.indexOf(correctAnswer)
    if (result.blanks[0].correctIdx === 0) {
      const shuffled = [...result.blanks[0].options].sort(() => Math.random() - 0.5)
      result.blanks[0].options = shuffled
      result.blanks[0].correctIdx = shuffled.indexOf(correctAnswer)
    }
    result.originalSentence = sentence.english
    clozeExercise.value = result
  } catch (err) {
    alert('生成填空题失败')
    trainingIdx.value++
    if (trainingIdx.value < sentenceTraining.value.length) loadClozeExercise()
  } finally {
    clozeLoading.value = false
  }
}

function selectClozeOption(idx) {
  if (clozeResult.value) return
  clozeSelected.value = idx
  const correct = idx === clozeExercise.value.blanks[0].correctIdx
  clozeResult.value = { correct }
  recordExerciseResult('vocabulary', correct)
}

function deleteMaterial(material) {
  if (confirm(`确定要删除 "${material.title}" 吗？`)) {
    const newMaterials = props.materials.filter(m => m.id !== material.id)
    localStorage.setItem('materials', JSON.stringify(newMaterials))
    emit('update')
  }
}

function handleAdd(material) {
  const newMaterials = [...props.materials, {
    id: Date.now(),
    ...material,
    createdAt: new Date().toISOString()
  }]
  localStorage.setItem('materials', JSON.stringify(newMaterials))
  emit('update')
}

// 编辑相关
const showEditModal = ref(false)
const editingMaterial = ref(null)

function startEdit(material) {
  editingMaterial.value = { ...material }
  showEditModal.value = true
}

function closeEdit() {
  showEditModal.value = false
  editingMaterial.value = null
}

function handleUpdate(updated) {
  const materials = JSON.parse(localStorage.getItem('materials') || '[]')
  const idx = materials.findIndex(m => m.id === editingMaterial.value.id)
  if (idx !== -1) {
    materials[idx] = {
      ...materials[idx],
      title: updated.title,
      category: updated.category,
      content: updated.content,
      updatedAt: new Date().toISOString()
    }
    localStorage.setItem('materials', JSON.stringify(materials))
    emit('update')
  }
  closeEdit()
}

const fileInputRef = ref(null)

// 粘贴导入
const showPasteImport = ref(false)
const pasteJson = ref('')

function importFromPaste() {
  try {
    const imported = JSON.parse(pasteJson.value.trim())
    if (!imported.materials || !Array.isArray(imported.materials)) {
      alert('无效的 JSON 格式，需要包含 materials 数组')
      return
    }

    const existing = JSON.parse(localStorage.getItem('materials') || '[]')
    const existingTitles = new Set(existing.map(m => m.title))

    let addedCount = 0
    imported.materials.forEach(m => {
      if (!existingTitles.has(m.title)) {
        existing.push({
          ...m,
          id: Date.now() + Math.random() * 1000
        })
        addedCount++
      }
    })

    localStorage.setItem('materials', JSON.stringify(existing))
    loadMaterials()
    showPasteImport.value = false
    pasteJson.value = ''
    alert(`导入成功！新增 ${addedCount} 篇，跳过 ${existing.length - addedCount} 篇重复文章`)
  } catch {
    alert('JSON 解析失败，请检查格式')
  }
}

function exportSingle(mat) {
  if (!mat) return
  const data = {
    version: '1.0',
    exportTime: new Date().toISOString(),
    materials: [mat]
  }
  const safeTitle = (mat.title || 'untitled').replace(/[^\w\u4e00-\u9fa5-]/g, '_').slice(0, 30)
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safeTitle}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function exportMaterials() {
  const materials = JSON.parse(localStorage.getItem('materials') || '[]')
  if (materials.length === 0) {
    alert('资料库是空的，没有内容可导出')
    return
  }
  const data = {
    version: '1.0',
    exportTime: new Date().toISOString(),
    materials: materials
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `english-materials-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  alert(`已导出 ${materials.length} 篇资料！\n\n将此文件发送到手机（微信/邮件），然后在手机上点击「导入」即可。`)
}

function triggerImport() {
  fileInputRef.value?.click()
}

function handleImportFile(event) {
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result)
      if (!imported.materials || !Array.isArray(imported.materials)) {
        alert('无效的文件格式，请确认是导出的 JSON 文件')
        return
      }

      const existing = JSON.parse(localStorage.getItem('materials') || '[]')
      const existingTitles = new Set(existing.map(m => m.title))

      let addedCount = 0
      imported.materials.forEach(m => {
        if (!existingTitles.has(m.title)) {
          existing.push({
            ...m,
            id: Date.now() + Math.random() * 1000
          })
          addedCount++
        }
      })

      localStorage.setItem('materials', JSON.stringify(existing))
      loadMaterials()
      alert(`导入成功！\n新增 ${addedCount} 篇，已存在 ${existing.length - addedCount} 篇（跳过重复）`)
    } catch {
      alert('导入失败！文件格式错误')
    }
  }
  reader.readAsText(file)
  event.target.value = ''
}

onUnmounted(() => {
  stopAudio()
})
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.toolbar-hint {
  font-size: 12px;
  color: #888;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #fff8e1;
  border-radius: 8px;
  line-height: 1.5;
}

.file-input-hidden {
  display: none;
}

/* 粘贴导入模态框 */
.paste-import-modal {
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.paste-hint {
  font-size: 13px;
  color: #888;
  margin-bottom: 12px;
  line-height: 1.5;
}

.paste-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-family: monospace;
  font-size: 13px;
  resize: vertical;
  margin-bottom: 12px;
  box-sizing: border-box;
  min-height: 150px;
}

.paste-textarea:focus {
  outline: none;
  border-color: #667eea;
}

.paste-actions {
  display: flex;
  gap: 10px;
}

.paste-actions .btn-primary,
.paste-actions .btn-secondary {
  flex: 1;
  padding: 10px;
  font-size: 14px;
}

.toolbar button {
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
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-secondary {
  background: #f8f9fa;
  color: #333;
  border: 1px solid #e0e0e0;
}

.search-bar {
  margin-bottom: 16px;
}

.search-input {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  font-size: 16px;
  background: white;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
}

.materials-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.material-item {
  background: white;
  border-radius: 14px;
  padding: 16px;
  cursor: pointer;
  border: 1px solid #f0f0f0;
  transition: box-shadow 0.2s;
}

.material-item:active {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.material-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.material-title {
  font-weight: 600;
  font-size: 16px;
  color: #333;
  cursor: pointer;
}

.material-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.material-category {
  background: #e3f2fd;
  color: #1976d2;
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 20px;
}

.edit-btn {
  background: #fff3e0;
  border: none;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.edit-btn:hover {
  background: #ffcc80;
}

.export-btn {
  background: #e3f2fd;
  border: none;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.export-btn:hover {
  background: #90caf9;
}

.delete-btn {
  background: #ffebee;
  border: none;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.delete-btn:hover {
  background: #ffcdd2;
}

.material-preview {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.material-meta {
  font-size: 12px;
  color: #999;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.empty-icon {
  font-size: 56px;
  margin-bottom: 16px;
}

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

.modal-header {
  margin-bottom: 20px;
}

.modal-header h3 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
}

.audio-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.audio-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 14px 24px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}

.speed-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.speed-select {
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
}

.material-full-content {
  line-height: 1.7;
  color: #333;
  margin-bottom: 20px;
  white-space: pre-wrap;
}

.detail-actions, .exercise-actions {
  display: flex;
  gap: 12px;
}

.detail-actions button, .exercise-actions button {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  border: none;
  cursor: pointer;
}

.exercise-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
}

.exercise-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.exercise-header h3 {
  font-size: 18px;
  font-weight: 600;
}

.exercise-progress {
  background: #f0f0f0;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
  color: #666;
}

.exercise-type-modal {
  max-width: 400px;
}

.exercise-types {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.exercise-type-btn {
  padding: 20px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.exercise-type-btn:hover {
  border-color: #667eea;
  background: #f5f3ff;
}

.type-icon {
  font-size: 28px;
}

.type-name {
  font-weight: 600;
  font-size: 15px;
}

.type-desc {
  font-size: 12px;
  color: #666;
}

.audio-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
  margin-bottom: 16px;
}

.audio-btn.small {
  padding: 10px 16px;
  font-size: 14px;
}

.paragraph-exercise {
  margin-bottom: 20px;
}

.paragraph-text {
  font-size: 16px;
  line-height: 1.8;
  color: #333;
  margin-bottom: 24px;
}

.multi-blanks {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.blank-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.blank-item span:first-child {
  width: 60px;
  font-size: 14px;
  color: #666;
}

.answer-input.small {
  flex: 1;
  max-width: 200px;
  padding: 12px 16px;
  font-size: 16px;
  margin-bottom: 0;
}

.blank-item span:last-child {
  font-weight: 600;
  font-size: 16px;
}

.blank-item span.correct {
  color: #4caf50;
}

.blank-item span.incorrect {
  color: #f44336;
}

.question-text {
  font-size: 18px;
  line-height: 1.6;
  color: #333;
  margin-bottom: 20px;
}

.answer-input {
  width: 100%;
  padding: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 18px;
  text-align: center;
  margin-bottom: 20px;
}

.answer-input:focus {
  outline: none;
  border-color: #667eea;
}

.choices {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.choice-btn {
  padding: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 16px;
  text-align: left;
  cursor: pointer;
  background: white;
  transition: all 0.2s;
}

.choice-btn.selected {
  border-color: #667eea;
  background: #f3e5f5;
}

.choice-btn.correct {
  border-color: #4caf50;
  background: #e8f5e9;
}

.result-display {
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  margin-bottom: 20px;
  font-size: 18px;
  font-weight: 600;
}

.result-display.correct {
  background: #e8f5e9;
  color: #1b5e20;
}

.result-display.incorrect {
  background: #ffebee;
  color: #c62828;
}

.correct-answer {
  margin-top: 12px;
  font-size: 16px;
  font-weight: normal;
}

.ai-analysis-section {
  margin-bottom: 20px;
}

.btn-ai {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #00c6ff 0%, #0072ff 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 114, 255, 0.3);
}

.btn-ai-secondary {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 12px;
}

.ai-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px;
  color: #667eea;
  font-size: 15px;
}

.ai-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e0e0e0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.ai-result {
  background: #f8f9ff;
  border: 1px solid #e3f2fd;
  border-radius: 14px;
  padding: 20px;
}

.ai-result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.btn-close-ai {
  background: #f0f0f0;
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  color: #999;
}

.ai-difficulty-badge {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 16px;
}

.ai-difficulty-badge.diff-1, .ai-difficulty-badge.diff-2, .ai-difficulty-badge.diff-3 {
  background: #e8f5e9;
  color: #2e7d32;
}

.ai-difficulty-badge.diff-4, .ai-difficulty-badge.diff-5, .ai-difficulty-badge.diff-6 {
  background: #fff3e0;
  color: #e65100;
}

.ai-difficulty-badge.diff-7, .ai-difficulty-badge.diff-8, .ai-difficulty-badge.diff-9, .ai-difficulty-badge.diff-10 {
  background: #ffebee;
  color: #c62828;
}

.ai-section {
  margin-bottom: 20px;
}

.ai-section-title {
  font-size: 15px;
  font-weight: 600;
  color: #667eea;
  margin-bottom: 10px;
}

.ai-section-content {
  font-size: 14px;
  color: #555;
  line-height: 1.7;
}

.ai-translation {
  background: white;
  padding: 12px;
  border-radius: 8px;
  border-left: 3px solid #667eea;
}

.ai-vocab-item {
  background: white;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
}

.ai-vocab-word {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.ai-vocab-phonetic {
  font-size: 13px;
  color: #999;
  font-weight: normal;
}

.ai-vocab-meaning {
  font-size: 14px;
  color: #555;
  margin-top: 4px;
}

.ai-vocab-context {
  font-size: 13px;
  color: #888;
  margin-top: 4px;
  font-style: italic;
}

.ai-grammar-item {
  background: white;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
}

.ai-grammar-point {
  font-weight: 600;
  color: #333;
  font-size: 15px;
}

.ai-grammar-explain {
  font-size: 14px;
  color: #555;
  margin-top: 4px;
}

.ai-grammar-example {
  font-size: 13px;
  color: #888;
  margin-top: 4px;
  font-style: italic;
}

.ai-sentence-item {
  background: white;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  border-left: 3px solid #4caf50;
}

.ai-sentence-en {
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

.ai-sentence-cn {
  font-size: 13px;
  color: #666;
  margin-top: 4px;
}

.ai-sentence-note {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.ai-questions {
  background: #f8f9ff;
  border: 1px solid #e3f2fd;
  border-radius: 14px;
  padding: 20px;
  margin-top: 12px;
}

.ai-questions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
}

.ai-question-card {
  background: white;
  padding: 16px;
  border-radius: 10px;
  margin-bottom: 12px;
}

.ai-question-text {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  margin-bottom: 12px;
}

.ai-question-choices {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-choice-btn {
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  text-align: left;
  transition: all 0.2s;
}

.ai-choice-btn.selected {
  border-color: #667eea;
  background: #f3e5f5;
}

.ai-choice-btn.correct {
  border-color: #4caf50;
  background: #e8f5e9;
}

.ai-choice-btn.wrong {
  border-color: #f44336;
  background: #ffebee;
}

.ai-question-explain {
  margin-top: 8px;
  padding: 10px;
  background: #fff8e1;
  border-radius: 6px;
  font-size: 13px;
  color: #666;
}

/* ========== 句子训练 ========== */
.training-section {
  margin-top: 16px;
  background: #f8f9ff;
  border: 1px solid #e3f2fd;
  border-radius: 14px;
  padding: 16px;
}

.training-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.training-modes {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.training-mode-btn {
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 14px 10px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

.training-mode-btn:hover {
  border-color: #667eea;
  background: #f5f3ff;
}

.mode-icon {
  font-size: 24px;
}

.mode-name {
  font-weight: 600;
  font-size: 14px;
  color: #333;
}

.mode-desc {
  font-size: 12px;
  color: #999;
}

.training-card, .cloze-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.training-progress {
  font-size: 13px;
  color: #667eea;
  font-weight: 600;
  margin-bottom: 12px;
}

.training-chinese {
  font-size: 16px;
  color: #333;
  line-height: 1.6;
  padding: 12px 14px;
  background: #f5f3ff;
  border-radius: 10px;
  margin-bottom: 12px;
  font-weight: 500;
}

.training-chinese.hint {
  font-size: 14px;
  color: #666;
  background: #fff8e1;
  font-weight: 400;
}

.training-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-size: 15px;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 12px;
  background: white;
  line-height: 1.6;
  box-sizing: border-box;
}

.training-input:focus {
  outline: none;
  border-color: #667eea;
}

.training-actions {
  display: flex;
  gap: 8px;
}

.training-actions .btn-primary,
.training-actions .btn-secondary {
  flex: 1;
  padding: 10px;
  font-size: 14px;
}

.training-loading {
  text-align: center;
  padding: 32px;
  color: #667;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.dictation-hint {
  font-size: 13px;
  color: #666;
  text-align: center;
  margin-bottom: 12px;
}

.dictation-play {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 12px;
}

.play-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.play-btn.secondary {
  background: white;
  color: #667eea;
  border: 1px solid #667eea;
}

.browse-mode {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sentence-card {
  background: white;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.sentence-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.sentence-num {
  font-size: 12px;
  color: #999;
  font-weight: 600;
  background: #f5f3ff;
  padding: 2px 8px;
  border-radius: 10px;
}

.speak-btn.small {
  padding: 4px 8px;
  font-size: 13px;
  border-radius: 8px;
  background: #f5f3ff;
  border: none;
  cursor: pointer;
}

.sentence-en {
  font-size: 15px;
  color: #333;
  line-height: 1.6;
  margin-bottom: 4px;
  font-weight: 500;
}

.sentence-zh {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  margin-bottom: 6px;
}

.sentence-note {
  font-size: 12px;
  color: #7c4dff;
  background: #f3e5f5;
  padding: 6px 8px;
  border-radius: 6px;
  line-height: 1.5;
}

.training-result {
  margin-top: 12px;
  padding: 14px;
  border-radius: 10px;
  text-align: center;
}

.training-result.correct {
  background: #e8f5e9;
}

.training-result.incorrect {
  background: #ffebee;
}

.result-icon {
  font-size: 32px;
  margin-bottom: 4px;
}

.result-text {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 10px;
}

.result-detail {
  text-align: left;
  font-size: 13px;
  color: #333;
  line-height: 1.7;
  background: rgba(255, 255, 255, 0.6);
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 10px;
}

.feedback {
  color: #667eea;
  margin-top: 4px;
  font-style: italic;
}

.cloze-question {
  font-size: 16px;
  color: #333;
  line-height: 1.8;
  padding: 14px;
  background: #f5f3ff;
  border-radius: 10px;
  margin-bottom: 12px;
  text-align: center;
}

.cloze-hint {
  font-size: 13px;
  color: #7c4dff;
  text-align: center;
  margin-bottom: 12px;
}

.cloze-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.cloze-option {
  padding: 12px 10px;
  border: 2px solid #e0e0e0;
  background: white;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
  color: #333;
}

.cloze-option:hover:not(:disabled) {
  border-color: #667eea;
  background: #f5f3ff;
}

.cloze-option.correct {
  border-color: #1b5e20;
  background: #e8f5e9;
  color: #1b5e20;
}

.cloze-option.wrong {
  border-color: #c62828;
  background: #ffebee;
  color: #c62828;
}

.cloze-option:disabled {
  cursor: not-allowed;
}

.all-done {
  background: white;
  border-radius: 12px;
  padding: 30px 20px;
  text-align: center;
}

.done-icon {
  font-size: 40px;
  margin-bottom: 8px;
}

.all-done > div:nth-child(2) {
  font-size: 16px;
  color: #333;
  font-weight: 500;
  margin-bottom: 16px;
}
</style>
