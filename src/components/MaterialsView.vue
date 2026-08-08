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
          <!-- 识别到中英对照结构时的绿色提示条 -->
          <div v-if="selectedMaterial && hasCnEnStructure" class="local-ready-tip">
            <span class="tip-icon">✅</span>
            <span class="tip-text">已识别为中英对照资料，无需联网/AI，直接开始训练</span>
          </div>

          <!-- 直接训练按钮放在前面，最突出 -->
          <button v-if="selectedMaterial && !sentenceTraining.length && !isAnalyzing" class="btn-ai direct-train" @click="extractSentencesFromContent">
            {{ iconStyle === 'cute' ? '🎯' : '🎯' }} 直接开始训练
            <span class="btn-sub">免 AI · 免联网 · 即开即用</span>
          </button>
          <button v-if="sentenceTraining.length > 0 && !trainingMode && !isAnalyzing" class="btn-ai direct-train" @click="extractSentencesFromContent">
            {{ iconStyle === 'cute' ? '🔁' : '🔁' }} 重新解析资料句子
          </button>

          <!-- AI 拆解设为次要 -->
          <button v-if="!aiAnalysis && !isAnalyzing" class="btn-ai optional-ai" @click="runAiAnalysis">
            {{ iconStyle === 'cute' ? '🤖' : '🤖' }} AI 智能拆解（需联网+API Key）
            <span class="btn-sub">增强：词汇/语法/文化笔记</span>
          </button>

          <div v-if="isAnalyzing" class="ai-loading">
            <div class="ai-spinner"></div>
            <span v-if="isAnalyzingLocal">本地解析中...</span>
            <span v-else>AI 正在分析文章... (失败时会自动切换到本地解析)</span>
          </div>
          <div v-if="aiAnalysis && isLocalAnalysis" class="local-analysis-badge">
            📦 当前显示为本地离线分析结果（无需 AI 网络）
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
              <!-- 快捷入口：继续上次 / 随机开始 -->
              <div v-if="hasLastProgress" class="quick-start-bar">
                <button class="quick-btn continue" @click="continueLastTraining">
                  ▶️ 继续上次（第 {{ lastTrainingIdx + 1 }} 句）
                </button>
                <button class="quick-btn random" @click="startRandomTraining">
                  🎲 随机开始
                </button>
              </div>
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
              <button class="training-mode-btn voice-mode" @click="startTraining('cn2en')">
                <span class="mode-icon">🎤</span>
                <span class="mode-name">听中说英</span>
                <span class="mode-desc">听中文说英文(语音)</span>
              </button>
              <button class="training-mode-btn voice-mode" @click="startTraining('en2cn')">
                <span class="mode-icon">🎤</span>
                <span class="mode-name">听英说中</span>
                <span class="mode-desc">听英文说中文(语音)</span>
              </button>
              <button v-if="!hasLastProgress" class="training-mode-btn random-mode" @click="startRandomTraining">
                <span class="mode-icon">🎲</span>
                <span class="mode-name">随机开始</span>
                <span class="mode-desc">随机抽一句开始</span>
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

            <!-- 语音问答训练（听中说英 / 听英说中） -->
            <div v-if="trainingMode === 'cn2en' || trainingMode === 'en2cn'" class="voice-mode">
              <div v-if="trainingIdx < sentenceTraining.length" class="training-card">
                <div class="training-progress">第 {{ trainingIdx + 1 }} / {{ sentenceTraining.length }} 句</div>
                <div class="voice-direction">
                  {{ trainingMode === 'cn2en' ? '🎤 系统用中文提问，请用英文回答' : '🎤 系统用英文提问，请用中文回答' }}
                </div>
                <div class="voice-question">
                  {{ trainingMode === 'cn2en' 
                    ? sentenceTraining[trainingIdx].chinese 
                    : sentenceTraining[trainingIdx].english 
                  }}
                </div>
                <div class="voice-actions">
                  <button class="btn-primary voice-speak-btn" @click="speakQuestion" :disabled="isSpeaking">
                    {{ isSpeaking ? '🔊 朗读中...' : '🔊 播放提问' }}
                  </button>
                  <button 
                    :class="['voice-record-btn', { recording: isRecording }]" 
                    @click="toggleRecording"
                    :disabled="isCheckingTraining"
                  >
                    {{ isRecording ? '🔴 停止录音' : '🎤 开始回答' }}
                  </button>
                </div>
                <div v-if="transcript" class="voice-transcript">
                  <div class="transcript-label">识别结果：</div>
                  <div class="transcript-text">{{ transcript }}</div>
                </div>
                <div class="voice-input-area">
                  <textarea
                    v-model="voiceTextInput"
                    class="training-input"
                    :placeholder="trainingMode === 'cn2en' ? '或直接输入英文回答...' : '或直接输入中文回答...'"
                    rows="2"
                    :disabled="trainingResult"
                  ></textarea>
                </div>
                <div v-if="!trainingResult && !isCheckingTraining" class="training-actions">
                  <button 
                    class="btn-primary" 
                    @click="checkVoiceAnswer" 
                    :disabled="!transcript && !voiceTextInput.trim()"
                  >
                    ✅ 检查答案
                  </button>
                  <button class="btn-secondary" @click="skipVoiceAnswer">
                    直接看答案
                  </button>
                </div>
                <div v-if="isCheckingTraining" class="voice-evaluating">
                  <div class="ai-spinner"></div>
                  <span>AI 正在评判中...</span>
                </div>
                <div v-if="trainingResult" :class="['training-result', trainingResult.correct ? 'correct' : 'incorrect']">
                  <div class="result-icon">{{ trainingResult.correct ? '🎉' : '😅' }}</div>
                  <div class="result-text">{{ trainingResult.correct ? '回答正确！' : '回答不太对' }}</div>
                  <div class="result-detail">
                    <div><strong>期望答案：</strong>{{ trainingMode === 'cn2en' ? sentenceTraining[trainingIdx].english : sentenceTraining[trainingIdx].chinese }}</div>
                    <div v-if="transcript"><strong>你的语音：</strong>{{ transcript }}</div>
                    <div v-if="voiceTextInput"><strong>你的输入：</strong>{{ voiceTextInput }}</div>
                    <div class="feedback">{{ trainingResult.feedback }}</div>
                  </div>
                  <button class="btn-primary" @click="nextTraining">下一句 →</button>
                </div>
              </div>
              <div v-else class="all-done">
                <div class="done-icon">🎊</div>
                <div>语音训练完成！</div>
                <button class="btn-primary" @click="restartTraining">重新训练</button>
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
const isAnalyzingLocal = ref(false)
const isLocalAnalysis = ref(false) // 标记当前 aiAnalysis 是否为本地离线构建
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

// 语音训练状态
const isSpeaking = ref(false)
const isRecording = ref(false)
const transcript = ref('')
const voiceTextInput = ref('')
let recognition = null
let shouldStopRecording = false

// 训练进度记忆
const lastTrainingIdx = ref(0) // 上次训练到的位置
const hasLastProgress = ref(false)

const filteredMaterials = computed(() => {
  if (!searchQuery.value) return props.materials
  const query = searchQuery.value.toLowerCase()
  return props.materials.filter(m => 
    m.title.toLowerCase().includes(query) || 
    m.content.toLowerCase().includes(query)
  )
})

// 判断资料内容是否像"中英对照"结构
const hasCnEnStructure = computed(() => {
  if (!selectedMaterial.value) return false
  const c = selectedMaterial.value.content || ''
  // 规则1: 存在 ## 数字序号. 中文 + 下一行是 **英文** 的模式（命中≥3次）
  const hits = c.match(/^#{2,6}\s*\d+[\.、)]\s*.*[\u4e00-\u9fa5]+.*\n\s*\*\*.+\*\*/gm)
  if (hits && hits.length >= 3) return true
  // 规则2: 直接提取 sentenceTraining 已解析出 ≥3 句也算
  if (sentenceTraining.value && sentenceTraining.value.length >= 3) return true
  return false
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
  isAnalyzing.value = true
  isAnalyzingLocal.value = false
  isLocalAnalysis.value = false

  try {
    if (apiKey) {
      const analysis = await analyzeArticle(
        selectedMaterial.value.title,
        selectedMaterial.value.content
      )
      aiAnalysis.value = analysis
      if (analysis.keySentences && analysis.keySentences.length > 0) {
        sentenceTraining.value = analysis.keySentences.map((s, i) => ({
          id: i + 1,
          english: s.sentence,
          chinese: s.translation,
          keyWords: [],
          note: s.note
        }))
      }
    } else {
      throw new Error('no-api-key')
    }
  } catch (e) {
    // 自动 fallback 到本地分析
    isAnalyzingLocal.value = true
    try {
      const analysis = await buildLocalAnalysisFromSentences(
        selectedMaterial.value.title,
        selectedMaterial.value.content
      )
      aiAnalysis.value = analysis
      isLocalAnalysis.value = true
    } catch (e2) {
      alert('本地解析也失败: ' + e2.message)
    }
  } finally {
    isAnalyzingLocal.value = false
    isAnalyzing.value = false
    if (sentenceTraining.value && sentenceTraining.value.length > 0) {
      loadTrainingProgress()
    }
  }
}

// ========== 本地离线 AI 分析构建（完全无需联网） ==========
async function buildLocalAnalysisFromSentences(title, content) {
  // 先尝试解析句子
  let sentences = []
  const lines = (content || '').split('\n')

  const pushSentence = (zh, en) => {
    zh = (zh || '').trim()
    en = (en || '').trim()
    if (!zh || !en) return
    if (/[\u4e00-\u9fa5]/.test(en)) return
    if (sentences.some(s => s.chinese === zh && s.english === en)) return
    sentences.push({ chinese: zh, english: en })
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const m = line.match(/^#{2,6}\s*\d+[\.、)]\s*(.+)$/)
    if (m) {
      const zh = m[1].trim()
      const next = lines[i + 1]?.trim() || ''
      const enMatch = next.match(/^\*\*(.+)\*\*$/)
      if (enMatch) {
        pushSentence(zh, enMatch[1])
        i++
        continue
      }
    }
    const m2 = line.match(/^#{2,6}\s*(.+)$/)
    if (m2) {
      const zh = m2[1].replace(/^\d+[\.、)]\s*/, '').trim()
      const next = lines[i + 1]?.trim() || ''
      const enMatch = next.match(/^\*\*(.+)\*\*$/)
      if (enMatch) {
        pushSentence(zh, enMatch[1])
        i++
      }
    }
  }

  // 兜底：按行成对解析
  if (sentences.length === 0) {
    const clean = lines.map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    for (let i = 0; i < clean.length - 1; i += 2) {
      let zh = clean[i].replace(/^\d+[\.、)]\s*/, '').trim()
      let en = clean[i + 1].replace(/^\d+[\.、)]\s*/, '').trim()
      if (/[\u4e00-\u9fa5]/.test(zh) && !/[\u4e00-\u9fa5]/.test(en)) {
        pushSentence(zh, en)
      }
    }
  }

  if (sentences.length === 0) {
    throw new Error('未识别到有效中英对照句子，请检查资料格式：英文行应为 **句子** 样式')
  }

  // 同步写入 sentenceTraining
  sentenceTraining.value = sentences.map((s, i) => ({
    id: i + 1,
    english: s.english,
    chinese: s.chinese,
    keyWords: [],
    note: ''
  }))

  // 1. 核心词汇：收集所有句子中的"长英文单词"并去重
  const stopwords = new Set([
    'the','a','an','is','are','am','was','were','be','been','being',
    'do','does','did','have','has','had','will','would','shall','should',
    'can','could','may','might','must','of','to','in','on','at','for',
    'with','by','from','as','and','or','but','so','if','then','than',
    'it','its','this','that','these','those','i','you','he','she','we',
    'they','me','him','her','us','them','my','your','his','our','their',
    'what','when','where','who','why','how','which','whom','whose',
    'not','no','yes','here','there','very','much','many','some','any'
  ])
  const wordMap = new Map()
  for (const s of sentences) {
    const toks = s.english.toLowerCase().split(/[^a-z]/).filter(Boolean)
    for (const t of toks) {
      if (t.length < 4) continue
      if (stopwords.has(t)) continue
      if (!wordMap.has(t)) wordMap.set(t, 0)
      wordMap.set(t, wordMap.get(t) + 1)
    }
  }
  const topWords = [...wordMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([w, freq]) => ({ word: w, meaning: '（本地解析，建议用字典查详细释义）', level: freq >= 3 ? '高频' : '常用' }))

  // 2. 句子分析（keySentences）
  const keySents = sentences.slice(0, 20).map(s => ({
    sentence: s.english,
    translation: s.chinese,
    note: localGrammarNote(s.english)
  }))

  // 3. 语法点（grammarPoints）：按句子结构识别
  const grammarPoints = buildGrammarPoints(sentences)

  // 4. 阅读理解题（基于句子随机生成问答配对选择题）
  const questions = buildLocalComprehensionQuestions(sentences)

  // 5. 难度分数：按句数和疑问词复杂度估算
  let diffScore = 3
  if (sentences.length >= 50) diffScore = 4
  if (sentences.length >= 80) diffScore = 5
  const hasWhWord = sentences.some(s => /^(what|when|where|who|why|how|which|whom|whose)\b/i.test(s.english))
  if (hasWhWord) diffScore = Math.min(10, diffScore + 1)
  const difficulty = diffScore <= 3 ? '初级' : diffScore <= 6 ? '中级' : '高级'

  const difficultyScore = diffScore
  return {
    title: title || '本地解析资料',
    difficulty,
    difficultyScore,
    summary: `本资料共收录 ${sentences.length} 句中英对照内容${hasWhWord ? '，重点包含疑问句式练习（What/When/Where/Who/Why/How）' : ''}。本地已自动解析为训练句子，可直接进入句子训练和语音问答。`,
    coreVocabulary: topWords,
    keySentences: keySents,
    grammarPoints: grammarPoints,
    readingComprehension: { questions },
    culturalNotes: null
  }
}

// 基于英文句子的结构给出简单语法提示
function localGrammarNote(en) {
  const lower = en.toLowerCase().trim()
  if (/^(what|when|where|who|why|how|which|whom|whose)\b/.test(lower)) {
    const qword = lower.split(/\s+/)[0].toUpperCase()
    if (/\?$/.test(en)) {
      return `${qword} 引导的特殊疑问句：语序为"疑问词 + 一般疑问句"。`
    }
  }
  if (/^(is|are|am|was|were|do|does|did|have|has|had|can|could|will|would|shall|should|may|might|must)\b/.test(lower)) {
    const aux = lower.split(/\s+/)[0].toUpperCase()
    return `${aux} 开头的一般疑问句：回答用 Yes/No + 主语 + 助动词。`
  }
  if (/be (going to|about to)/i.test(lower)) return '一般将来时：be going to 表示打算或即将发生的动作。'
  if (/\bdid\b/.test(lower) || /\bwent\b|\bsaid\b|\bgave\b|\bwas\b|\bwere\b|\bhad\b.*\bed\b/.test(lower)) return '一般过去时：描述过去发生的动作或状态。'
  if (/\bhave|has\b.*\bed\b/.test(lower)) return '现在完成时：have/has + 过去分词，强调对现在的影响。'
  return '陈述句：主语 + 谓语 + 宾语/表语的基本语序。'
}

// 构建语法点列表
function buildGrammarPoints(sentences) {
  const kinds = new Map()
  const add = (k, desc, ex) => {
    if (!kinds.has(k)) kinds.set(k, { point: k, explanation: desc, examples: [] })
    const entry = kinds.get(k)
    if (ex && !entry.examples.includes(ex) && entry.examples.length < 3) entry.examples.push(ex)
  }
  for (const s of sentences) {
    const l = s.english.toLowerCase()
    if (/^(what|when|where|who|why|how|which)\b/.test(l)) add('Wh- 特殊疑问句', '疑问词(What/When/Where/Who/Why/How/Which)开头，直接提问具体信息。', s.english)
    if (/^(is|are|am|was|were|do|does|did|have|has|had|can|could|will|would)\b/.test(l) && !/^(what|when|where|who|why|how|which)\b/.test(l)) add('一般疑问句', '助动词/be动词/情态动词提前，回答通常为 Yes/No。', s.english)
    if (/be (going to)/i.test(l)) add('be going to 表将来', '"am/is/are going to + 动词原形"表示计划/打算。', s.english)
    if (/\bdid\b|\bwent\b|\bwas\b|\bwere\b/.test(l)) add('一般过去时', '描述过去发生的事：助动词did，实义动词用过去式。', s.english)
    if (/\?\s*$/.test(s.english.trim())) add('疑问句句末用问号', '英文疑问句结尾必须带问号 "?"，朗读时通常句尾升调。', s.english)
  }
  return [...kinds.values()].slice(0, 8)
}

// 本地构建阅读理解选择题
function buildLocalComprehensionQuestions(sentences) {
  const qs = []
  const picked = new Set()
  const total = sentences.length
  for (let attempt = 0; attempt < Math.min(5, total); attempt++) {
    let idx
    do { idx = Math.floor(Math.random() * total) } while (picked.has(idx) && picked.size < total)
    picked.add(idx)
    const s = sentences[idx]
    const question = `「${s.chinese}」对应的英文是哪一句？`
    const correct = s.english
    const wrongPool = sentences.filter((_, i) => i !== idx).map(o => o.english)
    const wrongs = wrongPool.sort(() => Math.random() - 0.5).slice(0, 3)
    const options = [...wrongs, correct].sort(() => Math.random() - 0.5)
    const correctIndex = options.indexOf(correct)
    qs.push({
      question,
      options,
      correctIndex,
      explanation: '正确答案：' + correct,
      difficulty: 3
    })
  }
  return qs
}

async function runAiQuestions() {
  if (!selectedMaterial.value) return
  const apiKey = localStorage.getItem('ai_api_key')

  // 确保先有 sentenceTraining / aiAnalysis
  if (!sentenceTraining.value || sentenceTraining.value.length === 0) {
    extractSentencesFromContent()
  }

  try {
    let result = null
    if (apiKey) {
      result = await generateComprehensionQuestions(
        selectedMaterial.value.title,
        selectedMaterial.value.content
      )
    }
    if (!result || !result.questions || result.questions.length === 0) throw new Error('no-ai')
    aiQuestions.value = result
  } catch (e) {
    // 走本地题目
    const sentArr = (sentenceTraining.value || []).map(s => ({ english: s.english, chinese: s.chinese }))
    if (sentArr.length === 0) {
      // 没解析出句子再试一次
      await buildLocalAnalysisFromSentences(
        selectedMaterial.value.title,
        selectedMaterial.value.content
      )
    }
    const arr = (sentenceTraining.value || []).map(s => ({ english: s.english, chinese: s.chinese }))
    aiQuestions.value = {
      passage: selectedMaterial.value.content,
      questions: buildLocalComprehensionQuestions(arr)
    }
    isLocalAnalysis.value = true
  }

  aiUserAnswers.value = {}
  aiQuestionResults.value = {}
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

function startTraining(mode, startIdx = 0) {
  trainingMode.value = mode
  trainingIdx.value = startIdx
  trainingAnswer.value = ''
  trainingResult.value = null
  showDictationHint.value = false
  clozeExercise.value = null
  clozeResult.value = null
  clozeSelected.value = -1
  transcript.value = ''
  voiceTextInput.value = ''
  isSpeaking.value = false
  isRecording.value = false
  if (mode === 'cloze') {
    loadClozeExercise()
  }
  // 语音模式不自动播放（iOS 需用户手势触发），改为提示用户点击播放
  if ((mode === 'cn2en' || mode === 'en2cn') && startIdx > 0) {
    // 继续上次时显示提示
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
  transcript.value = ''
  voiceTextInput.value = ''
  isRecording.value = false
  if (trainingMode.value === 'cloze') {
    clozeSelected.value = -1
    clozeResult.value = null
    loadClozeExercise()
  }
  // 保存进度
  saveTrainingProgress()
}

function restartTraining() {
  trainingIdx.value = 0
  trainingAnswer.value = ''
  trainingResult.value = null
  showDictationHint.value = false
  clozeSelected.value = -1
  clozeResult.value = null
  transcript.value = ''
  voiceTextInput.value = ''
  isRecording.value = false
  if (trainingMode.value === 'cloze') {
    loadClozeExercise()
  }
  saveTrainingProgress()
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

// ========== 句子提取（从 markdown 内容直接提取） ==========
function extractSentencesFromContent() {
  if (!selectedMaterial.value) return
  const content = selectedMaterial.value.content
  const lines = content.split('\n')
  const extracted = []
  let currentZh = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    // 严格匹配 ## 1. xxx 或 ### 1. xxx 格式的条目（必须有数字序号的子标题）
    const zhMatch = line.match(/^#{2,6}\s*\d+[\.、)]\s*(.+)$/)
    if (zhMatch) {
      currentZh = zhMatch[1].trim()
      // 检查下一行是否是 **英文**
      const nextLine = lines[i + 1]?.trim() || ''
      const enMatch = nextLine.match(/^\*\*(.+)\*\*$/)
      if (enMatch) {
        const en = enMatch[1].trim()
        if (currentZh && en) {
          // 过滤掉中英文混淆的脏数据（英文中不应包含中文核心字）
          const hasChinese = /[\u4e00-\u9fa5]/.test(en)
          if (!hasChinese) {
            extracted.push({
              id: extracted.length + 1,
              chinese: currentZh,
              english: en,
              keyWords: [],
              note: ''
            })
          }
        }
        currentZh = null
        i++ // skip the english line
      }
    }
  }

  // 若严格匹配没到足够的数量，再尝试宽松匹配：## xxx 后紧跟 **English**
  if (extracted.length < 5) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      const zhMatch2 = line.match(/^#{2,6}\s*(.+)$/)
      if (zhMatch2) {
        const zh = zhMatch2[1].replace(/^\d+[\.、)]\s*/, '').trim()
        const nextLine = lines[i + 1]?.trim() || ''
        const enMatch = nextLine.match(/^\*\*(.+)\*\*$/)
        if (enMatch && zh && enMatch[1].trim()) {
          const en = enMatch[1].trim()
          const already = extracted.some(s => s.chinese === zh && s.english === en)
          const hasChinese = /[\u4e00-\u9fa5]/.test(en)
          if (!already && !hasChinese) {
            extracted.push({
              id: extracted.length + 1,
              chinese: zh,
              english: en,
              keyWords: [],
              note: ''
            })
          }
          i++
        }
      }
    }
  }

  // 最后兜底：非 # 开头的中英文交替行
  if (extracted.length === 0) {
    const cleanLines = lines.map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    for (let i = 0; i < cleanLines.length - 1; i += 2) {
      let zh = cleanLines[i]
      let en = cleanLines[i + 1]
      if (!zh || !en) continue
      // 去掉行首序号
      zh = zh.replace(/^\d+[\.、)]\s*/, '').trim()
      en = en.replace(/^\d+[\.、)]\s*/, '').trim()
      const hasChineseZh = /[\u4e00-\u9fa5]/.test(zh)
      const hasChineseEn = /[\u4e00-\u9fa5]/.test(en)
      if (hasChineseZh && !hasChineseEn) {
        extracted.push({
          id: extracted.length + 1,
          chinese: zh,
          english: en,
          keyWords: [],
          note: ''
        })
      }
    }
  }

  if (extracted.length === 0) {
    alert('未能从内容中提取到句子结构，请先使用 AI 分析功能')
    return
  }

  sentenceTraining.value = extracted
  trainingMode.value = ''
  trainingIdx.value = 0
  trainingAnswer.value = ''
  trainingResult.value = null
  showDictationHint.value = false
  clozeExercise.value = null
  clozeResult.value = null
  transcript.value = ''
  voiceTextInput.value = ''
  
  // 检查是否有上次的训练进度
  loadTrainingProgress()
}

// ========== 训练进度记忆 ==========
function getProgressKey() {
  if (!selectedMaterial.value) return null
  return `training_progress_${selectedMaterial.value.id}`
}

function loadTrainingProgress() {
  if (!selectedMaterial.value) {
    hasLastProgress.value = false
    return
  }
  const saved = localStorage.getItem(getProgressKey())
  if (saved) {
    const { idx, total } = JSON.parse(saved)
    // 确保存的进度对应当前句子总数
    if (total === sentenceTraining.value.length && idx > 0 && idx < total) {
      lastTrainingIdx.value = idx
      hasLastProgress.value = true
    } else {
      hasLastProgress.value = false
    }
  } else {
    hasLastProgress.value = false
  }
}

function saveTrainingProgress() {
  if (!selectedMaterial.value || !sentenceTraining.value) return
  localStorage.setItem(getProgressKey(), JSON.stringify({
    idx: trainingIdx.value,
    total: sentenceTraining.value.length,
    time: Date.now()
  }))
}

function continueLastTraining() {
  startTraining('cn2en', lastTrainingIdx.value)
}

function startRandomTraining() {
  if (!sentenceTraining.value || sentenceTraining.value.length === 0) return
  const randomIdx = Math.floor(Math.random() * sentenceTraining.value.length)
  startTraining('cn2en', randomIdx)
}

// ========== 语音训练方法 ==========

// iOS/Safari 下需要先加载 voices 并匹配对应语言的声音
let voicesLoaded = false
let ttsWarmedUp = false

function pickVoice(lang) {
  const isZh = lang === 'zh-CN'
  try {
    if (!voicesLoaded && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices() // 触发加载
      return null
    }
    const voices = window.speechSynthesis.getVoices()
    if (!voices || voices.length === 0) return null
    // 按语言精确匹配 + 本地优先
    const preferred = voices.filter(v => {
      const match = isZh
        ? (v.lang && v.lang.toLowerCase().startsWith('zh'))
        : (v.lang && v.lang.toLowerCase().startsWith('en'))
      return match
    })
    if (preferred.length === 0) return null
    const local = preferred.find(v => v.localService === true)
    return local || preferred[0]
  } catch {
    return null
  }
}

// 冷启动解锁：在用户首次手势内播放一个无声的短音
function warmupTTS() {
  if (ttsWarmedUp || !('speechSynthesis' in window)) return
  try {
    // 静音 " " 唤醒 iOS 引擎
    const u = new SpeechSynthesisUtterance(' ')
    u.volume = 0
    u.rate = 1
    window.speechSynthesis.speak(u)
    ttsWarmedUp = true
  } catch {}
}

if ('speechSynthesis' in window) {
  try {
    window.speechSynthesis.onvoiceschanged = () => { voicesLoaded = true }
    // 立即尝试获取一次（某些浏览器同步加载）
    const v = window.speechSynthesis.getVoices()
    if (v && v.length > 0) voicesLoaded = true
  } catch {}
}

function speakQuestion() {
  if (!sentenceTraining.value || trainingIdx.value >= sentenceTraining.value.length) return
  const sentence = sentenceTraining.value[trainingIdx.value]
  if (!sentence) return
  const text = (trainingMode.value === 'cn2en' ? sentence.chinese : sentence.english) || ''
  if (!text) {
    alert('当前句内容为空，跳过')
    return
  }
  const lang = trainingMode.value === 'cn2en' ? 'zh-CN' : 'en-US'

  if (!('speechSynthesis' in window)) {
    alert('您的浏览器不支持语音合成')
    return
  }

  // 用户手势内直接执行：wamup + cancel + speak 保持在同一同步调用栈
  warmupTTS()
  isSpeaking.value = true

  // 取消之前的播报，然后立即创建新 utterance
  try { window.speechSynthesis.cancel() } catch {}

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = speechRate.value || 1
  utterance.pitch = 1
  utterance.volume = 1

  const voice = pickVoice(lang)
  if (voice) {
    utterance.voice = voice
    if (voice.lang) utterance.lang = voice.lang // 跟随选中的 voice 的 lang
  }

  const resetSpeaking = () => {
    isSpeaking.value = false
  }
  utterance.onend = resetSpeaking
  utterance.onerror = resetSpeaking

  window.speechSynthesis.speak(utterance)

  // iOS resume 兜底（不包裹 speak 调用）
  setTimeout(() => {
    try {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume()
      if (!window.speechSynthesis.speaking && isSpeaking.value) isSpeaking.value = false
    } catch {}
  }, 150)
  setTimeout(() => {
    // 10s 后强制重置状态，防止卡死
    if (isSpeaking.value) isSpeaking.value = false
  }, 10000)
}

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    alert('您的浏览器不支持语音识别。请使用 Chrome/Edge 浏览器，或直接使用文本输入框回答。')
    return null
  }
  
  const rec = new SpeechRecognition()
  rec.lang = trainingMode.value === 'cn2en' ? 'en-US' : 'zh-CN'
  rec.continuous = false
  rec.interimResults = true
  
  let finalText = ''
  
  rec.onresult = (event) => {
    let interimText = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      if (result.isFinal) {
        finalText += result[0].transcript
      } else {
        interimText += result[0].transcript
      }
    }
    transcript.value = finalText + interimText
  }
  
  rec.onerror = (event) => {
    console.error('语音识别错误:', event.error)
    isRecording.value = false
    if (event.error === 'not-allowed') {
      alert('请允许浏览器使用麦克风权限')
    }
  }
  
  rec.onend = () => {
    isRecording.value = false
    if (finalText && !transcript.value) {
      transcript.value = finalText
    }
  }
  
  return rec
}

function toggleRecording() {
  if (isRecording.value) {
    shouldStopRecording = true
    if (recognition) {
      try { recognition.stop() } catch {}
    }
    isRecording.value = false
  } else {
    transcript.value = ''
    recognition = initSpeechRecognition()
    if (!recognition) return
    
    try {
      shouldStopRecording = false
      isRecording.value = true
      recognition.start()
    } catch (err) {
      console.error('启动语音识别失败:', err)
      isRecording.value = false
    }
  }
}

function checkVoiceAnswer() {
  const userAnswer = transcript.value.trim() || voiceTextInput.value.trim()
  if (!userAnswer) return
  const sentence = sentenceTraining.value[trainingIdx.value]
  const expected = trainingMode.value === 'cn2en' ? sentence.english : sentence.chinese
  const direction = trainingMode.value

  isCheckingTraining.value = true
  trainingResult.value = null

  // 立即给出本地评判（避免 AI 慢）
  const { correct, score, matchRate, missing, feedback } = evaluateAnswerLocal(userAnswer, expected, direction)

  trainingResult.value = {
    correct,
    score,
    expectedAnswer: expected,
    feedback: feedback || (correct
      ? `回答正确！核心词匹配度 ${matchRate}%，得分 ${score}/10`
      : `匹配度 ${matchRate}%，还差一些。核心词：${missing.length ? missing.join(', ') : '整体语义有偏差'}`)
  }
  recordExerciseResult('grammar', correct)
  isCheckingTraining.value = false
}

// 本地答案评判：英文核心词匹配≥85%判正确；中文语义匹配≥85%判正确
function evaluateAnswerLocal(userAnswer, expected, direction) {
  // 先做基础清洗
  const norm = (s, isEnglish) => {
    if (!s) return ''
    let t = s.toLowerCase().trim()
    if (isEnglish) {
      // 英文：保留字母、数字、空格、单引号；去重复空白
      t = t.replace(/[^a-z0-9'\s]/g, ' ').replace(/\s+/g, ' ').trim()
    } else {
      // 中文：保留汉字 + 英文字母（可能有专有名词）+ 数字
      t = t.replace(/[^\u4e00-\u9fa5a-z0-9]/g, '')
    }
    return t
  }

  const isEn = direction === 'cn2en' // 听中说英：用户回答英文（比较英文）
  const u = norm(userAnswer, isEn)
  const e = norm(expected, isEn)
  if (!u || !e) {
    return { correct: false, score: 0, matchRate: 0, missing: [], feedback: '未识别到有效回答' }
  }

  // 完全一致
  if (u === e) {
    return { correct: true, score: 10, matchRate: 100, missing: [] }
  }

  let matchRate = 0
  let missing = []
  const THRESHOLD = 0.85 // 85%

  if (isEn) {
    // 英文：核心词匹配（忽略常见小词，如 the/a/an/is/do 等）
    const stopwords = new Set([
      'the','a','an','is','are','am','was','were','be','been','being',
      'do','does','did','have','has','had','will','would','shall','should',
      'can','could','may','might','must','of','to','in','on','at','for',
      'with','by','from','as','and','or','but','so','if','then','than',
      'it','its','this','that','these','those','i','you','he','she','we',
      'they','me','him','her','us','them','my','your','his','our','their'
    ])
    const getTokens = (s) => s.split(/\s+/).filter(Boolean)
    const eToks = getTokens(e)
    const uToks = getTokens(u)

    const eCore = eToks.filter(w => w.length > 1 && !stopwords.has(w))

    if (eCore.length === 0) {
      // 没有核心词，直接比较去空格后的字符串相似度
      const e2 = e.replace(/\s+/g, '')
      const u2 = u.replace(/\s+/g, '')
      if (e2 && u2) {
        const common = [...e2].filter(c => u2.includes(c)).length
        matchRate = Math.round(100 * common / e2.length)
      } else {
        matchRate = 0
      }
    } else {
      let hit = 0
      missing = []
      for (const w of eCore) {
        // 匹配：完全相同，或用户包含该词根（如 goes / go 视为相同）
        const matched = uToks.some(uw => uw === w || uw.startsWith(w.slice(0, Math.min(4, w.length))) || w.startsWith(uw.slice(0, Math.min(4, uw.length))))
        if (matched) hit++
        else missing.push(w)
      }
      matchRate = Math.round(100 * hit / eCore.length)
    }
  } else {
    // 中文：按汉字字符相似度匹配
    let common = 0
    const eChars = [...e]
    const uChars = new Set([...u])
    for (const c of eChars) {
      if (uChars.has(c)) common++
    }
    matchRate = Math.round(100 * common / eChars.length)

    // 找缺失的中文
    const missingSet = new Set()
    for (const c of eChars) {
      if (!uChars.has(c)) missingSet.add(c)
    }
    missing = [...missingSet]
  }

  const correct = matchRate / 100 >= THRESHOLD
  let score = Math.max(0, Math.min(10, Math.round(matchRate / 10)))
  // 完全没有命中，只给 0 分；刚过阈值给 8 分；100 给 10 分
  if (correct && score < 8) score = 8
  if (matchRate >= 98) score = 10

  return { correct, score, matchRate, missing }
}

// 直接看答案：如果有回答就评估，没有就显示正确答案
function skipVoiceAnswer() {
  const userAnswer = transcript.value.trim() || voiceTextInput.value.trim()
  const sentence = sentenceTraining.value[trainingIdx.value]
  const expectedAnswer = trainingMode.value === 'cn2en' ? sentence.english : sentence.chinese
  
  if (userAnswer) {
    checkVoiceAnswer()
    return
  }
  trainingResult.value = {
    correct: false,
    score: 0,
    feedback: '未作答，请看正确答案',
    expectedAnswer
  }
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

.btn-ai.voice {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
  margin-top: 8px;
}

.btn-ai.direct-train {
  background: linear-gradient(135deg, #00b894 0%, #00a381 100%);
  box-shadow: 0 4px 14px rgba(0, 184, 148, 0.35);
  font-size: 18px;
  padding: 20px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.btn-ai.direct-train + .btn-ai.direct-train {
  background: linear-gradient(135deg, #0984e3 0%, #0869b8 100%);
  box-shadow: 0 4px 14px rgba(9, 132, 227, 0.35);
  font-size: 15px;
  padding: 14px;
}

.btn-ai .btn-sub {
  display: block;
  font-size: 12px;
  font-weight: 400;
  opacity: 0.9;
}

.btn-ai.optional-ai {
  background: linear-gradient(135deg, #dfe6e9 0%, #b2bec3 100%);
  color: #2d3436;
  box-shadow: none;
  font-size: 14px;
  padding: 14px;
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.local-ready-tip {
  background: linear-gradient(135deg, #e8f8f2 0%, #d4f5e9 100%);
  border: 1px solid #81ecec;
  border-radius: 10px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 13px;
  color: #00b894;
  font-weight: 600;
}
.local-ready-tip .tip-icon { font-size: 18px; }

.local-analysis-badge {
  background: #fff9db;
  border: 1px dashed #f0b429;
  color: #b8860b;
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 10px;
  font-size: 13px;
  text-align: center;
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

/* 语音训练模式按钮特殊样式 */
.training-mode-btn.voice-mode {
  border-color: #ff6b6b;
  background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%);
}

.training-mode-btn.voice-mode:hover {
  border-color: #ff6b6b;
  background: linear-gradient(135deg, #ffe8e8 0%, #ffd4d4 100%);
}

.training-mode-btn.random-mode {
  border-color: #00b894;
  background: linear-gradient(135deg, #f0fff4 0%, #e0f7ee 100%);
}

.training-mode-btn.random-mode:hover {
  border-color: #00b894;
  background: linear-gradient(135deg, #e0f7ee 0%, #c8f0db 100%);
}

/* 快捷开始栏 */
.quick-start-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
  width: 100%;
}

.quick-btn {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-btn.continue {
  background: linear-gradient(135deg, #00b894 0%, #00a381 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(0, 184, 148, 0.3);
}

.quick-btn.continue:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 184, 148, 0.4);
}

.quick-btn.random {
  background: linear-gradient(135deg, #6c5ce7 0%, #5b4bd6 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(108, 92, 231, 0.3);
}

.quick-btn.random:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(108, 92, 231, 0.4);
}

/* 语音训练样式 */
.voice-mode {
  padding: 8px 0;
}

.voice-direction {
  text-align: center;
  font-size: 14px;
  color: #667eea;
  font-weight: 600;
  margin-bottom: 12px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
  border-radius: 8px;
}

.voice-question {
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 10px;
  line-height: 1.6;
}

.voice-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.voice-speak-btn {
  flex: 1;
  padding: 14px !important;
  font-size: 15px !important;
}

.voice-record-btn {
  flex: 1;
  padding: 14px !important;
  font-size: 15px !important;
  border: 2px solid #ff6b6b;
  background: white;
  color: #ff6b6b;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.voice-record-btn:hover {
  background: #fff5f5;
}

.voice-record-btn.recording {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
  color: white;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

.voice-transcript {
  background: #e8f5e9;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.transcript-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.transcript-text {
  font-size: 16px;
  color: #2e7d32;
  font-weight: 500;
  line-height: 1.5;
}

.voice-input-area {
  margin-bottom: 12px;
}

.voice-evaluating {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #f5f3ff;
  border-radius: 8px;
  margin-bottom: 12px;
  color: #667eea;
  font-size: 14px;
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
