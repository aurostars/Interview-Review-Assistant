# 面试问题筛选与编辑功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a question filter/edit modal that appears after AI analysis completes, letting users select which questions to keep and edit question/answer text with re-analysis.

**Architecture:** A new modal (`questionFilterModal`) rendered by `app.js` shows all questions with checkboxes and inline editing. The existing `analyzer.reAnalyzeQuestion()` method handles single-question re-analysis. Two new fields (`excludedQuestions`, `editedQuestions`) are persisted in the interview JSON. The detail page filters out excluded questions during rendering.

**Tech Stack:** Vanilla JS, CSS, existing Python server (no changes needed)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `app/index.html` | Modify | Add questionFilterModal HTML structure |
| `app/css/main.css` | Modify | Add styles for filter modal |
| `app/js/app.js` | Modify | Add filter modal logic, modify startAnalysis/analyzeManualTranscript flow, modify renderInterviewDetail/updateTOC to respect excludedQuestions |

No new files needed. `analyzer.js` already has `reAnalyzeQuestion()`.

---

### Task 1: Add Question Filter Modal HTML

**Files:**
- Modify: `app/index.html:305-325` (insert before editQuestionModal)

- [ ] **Step 1: Add the filter modal markup**

Insert this HTML before the `<!-- Edit Question Modal -->` comment (line 307):

```html
<!-- Question Filter Modal -->
<div class="modal" id="questionFilterModal">
    <div class="modal-content modal-large">
        <h2>筛选面试问题</h2>
        <p class="filter-modal-desc">选择要保留的问题，点击问题或回答文本可编辑</p>
        <div class="filter-actions-top">
            <label class="filter-select-all">
                <input type="checkbox" id="filterSelectAll" checked> 全选
            </label>
            <span class="filter-count" id="filterCount">已选 0 / 共 0 题</span>
        </div>
        <div class="filter-question-list" id="filterQuestionList"></div>
        <div class="filter-modal-footer">
            <div id="filterReanalysisStatus" class="filter-status"></div>
            <div class="modal-actions">
                <button class="btn btn-primary" id="filterConfirmBtn" onclick="app.confirmQuestionFilter()">确认</button>
                <button class="btn btn-secondary" onclick="app.hideModal()">取消</button>
            </div>
        </div>
    </div>
</div>
```

- [ ] **Step 2: Update hideModal in app.js to include the new modal**

In `app/js/app.js`, find the `hideModal()` method (~line 428) and add:

```js
document.getElementById('questionFilterModal').classList.remove('show');
```

- [ ] **Step 3: Verify the page loads without errors**

Open http://localhost:8080 in the browser. Check the console for no errors. The modal exists in DOM but is hidden.

- [ ] **Step 4: Commit**

```bash
git add app/index.html app/js/app.js
git commit -m "feat: add question filter modal HTML structure"
```

---

### Task 2: Add Filter Modal CSS

**Files:**
- Modify: `app/css/main.css` (append at end)

- [ ] **Step 1: Add filter modal styles**

Append to the end of `app/css/main.css`:

```css
/* Question Filter Modal */
.modal-large {
    max-width: 700px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
}
.filter-modal-desc {
    font-size: 13px;
    color: #6c757d;
    margin-bottom: 12px;
}
.filter-actions-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e9ecef;
}
.filter-select-all {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    cursor: pointer;
}
.filter-count {
    font-size: 13px;
    color: #6c757d;
}
.filter-question-list {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 16px;
}
.filter-q-item {
    display: flex;
    gap: 12px;
    padding: 12px;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    margin-bottom: 8px;
    transition: opacity 0.2s;
}
.filter-q-item.excluded {
    opacity: 0.4;
    background: #f8f9fa;
}
.filter-q-item input[type="checkbox"] {
    margin-top: 2px;
    flex-shrink: 0;
}
.filter-q-content {
    flex: 1;
    min-width: 0;
}
.filter-q-num {
    font-size: 12px;
    color: #6c757d;
    margin-bottom: 4px;
}
.filter-q-text {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 6px;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 4px;
    border: 1px solid transparent;
}
.filter-q-text:hover {
    border-color: #dee2e6;
    background: #f8f9fa;
}
.filter-q-answer-toggle {
    font-size: 12px;
    color: #4263eb;
    cursor: pointer;
    margin-bottom: 4px;
}
.filter-q-answer {
    font-size: 13px;
    color: #495057;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 4px;
    border: 1px solid transparent;
    display: none;
}
.filter-q-answer.show {
    display: block;
}
.filter-q-answer:hover {
    border-color: #dee2e6;
    background: #f8f9fa;
}
.filter-q-editing {
    width: 100%;
    padding: 8px;
    border: 1px solid #4263eb;
    border-radius: 4px;
    font-size: 13px;
    resize: vertical;
    font-family: inherit;
}
.filter-q-modified {
    display: inline-block;
    font-size: 11px;
    color: #e67700;
    background: #fff3bf;
    padding: 1px 6px;
    border-radius: 3px;
    margin-left: 8px;
}
.filter-modal-footer {
    border-top: 1px solid #e9ecef;
    padding-top: 12px;
}
.filter-status {
    font-size: 13px;
    color: #495057;
    margin-bottom: 8px;
    min-height: 20px;
}
```

- [ ] **Step 2: Verify styles render correctly**

Open http://localhost:8080, inspect the DOM for `#questionFilterModal`. Manually add `show` class via devtools to verify layout.

- [ ] **Step 3: Commit**

```bash
git add app/css/main.css
git commit -m "feat: add question filter modal styles"
```

---

### Task 3: Implement Filter Modal Rendering and Interaction Logic

**Files:**
- Modify: `app/js/app.js` (add new methods after `saveQuestionEdit`, ~line 418)

- [ ] **Step 1: Add showQuestionFilter method**

Add after the `saveQuestionEdit()` method (after line 418):

```js
// --- Question Filter ---

showQuestionFilter() {
    const i = this.currentInterview;
    if (!i || !i.analysis || !i.analysis.questions.length) return;

    if (!i.excludedQuestions) i.excludedQuestions = [];
    if (!i.editedQuestions) i.editedQuestions = {};

    this.filterState = {
        excluded: new Set(i.excludedQuestions),
        edits: JSON.parse(JSON.stringify(i.editedQuestions))
    };

    this.renderFilterList();
    document.getElementById('questionFilterModal').classList.add('show');
}

renderFilterList() {
    const i = this.currentInterview;
    const questions = i.analysis.questions;
    const container = document.getElementById('filterQuestionList');

    container.innerHTML = questions.map((q, idx) => {
        const checked = !this.filterState.excluded.has(idx);
        const excludedClass = checked ? '' : 'excluded';
        const edited = this.filterState.edits[idx];
        const displayQ = edited ? edited.question : q.question;
        const displayA = edited ? edited.answer : q.answer;
        const modifiedTag = edited ? '<span class="filter-q-modified">已修改</span>' : '';

        return `
            <div class="filter-q-item ${excludedClass}" id="filterItem-${idx}">
                <input type="checkbox" ${checked ? 'checked' : ''} onchange="app.toggleFilterQuestion(${idx}, this.checked)">
                <div class="filter-q-content">
                    <div class="filter-q-num">问题 #${idx + 1} ${modifiedTag}</div>
                    <div class="filter-q-text" id="filterQ-${idx}" onclick="app.editFilterField(${idx}, 'question')">${this.escapeHtml(displayQ)}</div>
                    <div class="filter-q-answer-toggle" onclick="app.toggleFilterAnswer(${idx})">查看/编辑回答 ▾</div>
                    <div class="filter-q-answer" id="filterA-${idx}" onclick="app.editFilterField(${idx}, 'answer')">${this.escapeHtml(displayA)}</div>
                </div>
            </div>
        `;
    }).join('');

    this.updateFilterCount();

    const selectAll = document.getElementById('filterSelectAll');
    selectAll.checked = this.filterState.excluded.size === 0;
    selectAll.onchange = () => this.toggleFilterAll(selectAll.checked);
}

toggleFilterQuestion(idx, checked) {
    if (checked) {
        this.filterState.excluded.delete(idx);
    } else {
        this.filterState.excluded.add(idx);
    }
    const item = document.getElementById(`filterItem-${idx}`);
    item.classList.toggle('excluded', !checked);
    this.updateFilterCount();
}

toggleFilterAll(checked) {
    const i = this.currentInterview;
    const questions = i.analysis.questions;
    for (let idx = 0; idx < questions.length; idx++) {
        if (checked) {
            this.filterState.excluded.delete(idx);
        } else {
            this.filterState.excluded.add(idx);
        }
    }
    this.renderFilterList();
}

toggleFilterAnswer(idx) {
    const el = document.getElementById(`filterA-${idx}`);
    el.classList.toggle('show');
}

updateFilterCount() {
    const total = this.currentInterview.analysis.questions.length;
    const selected = total - this.filterState.excluded.size;
    document.getElementById('filterCount').textContent = `已选 ${selected} / 共 ${total} 题`;
}

editFilterField(idx, field) {
    const elId = field === 'question' ? `filterQ-${idx}` : `filterA-${idx}`;
    const el = document.getElementById(elId);

    if (el.querySelector('textarea')) return;

    const i = this.currentInterview;
    const q = i.analysis.questions[idx];
    const edited = this.filterState.edits[idx];
    const currentValue = edited ? edited[field] : q[field];

    const textarea = document.createElement('textarea');
    textarea.className = 'filter-q-editing';
    textarea.value = currentValue;
    textarea.rows = field === 'question' ? 2 : 4;

    const originalContent = el.innerHTML;
    el.innerHTML = '';
    el.appendChild(textarea);
    textarea.focus();

    textarea.addEventListener('blur', () => {
        const newValue = textarea.value.trim();
        if (!newValue) {
            el.innerHTML = originalContent;
            return;
        }

        const original = q[field];
        if (newValue !== original) {
            if (!this.filterState.edits[idx]) {
                this.filterState.edits[idx] = { question: q.question, answer: q.answer };
            }
            this.filterState.edits[idx][field] = newValue;
            el.innerHTML = this.escapeHtml(newValue);
            this.renderFilterList();
        } else {
            if (this.filterState.edits[idx]) {
                this.filterState.edits[idx][field] = newValue;
                const e = this.filterState.edits[idx];
                if (e.question === q.question && e.answer === q.answer) {
                    delete this.filterState.edits[idx];
                }
            }
            el.innerHTML = this.escapeHtml(newValue);
            this.renderFilterList();
        }
    });
}
```

- [ ] **Step 2: Add confirmQuestionFilter method**

Add immediately after `editFilterField`:

```js
async confirmQuestionFilter() {
    const i = this.currentInterview;
    i.excludedQuestions = [...this.filterState.excluded];

    const prevEdits = i.editedQuestions || {};
    const newEdits = this.filterState.edits;
    const toReanalyze = [];

    for (const [idxStr, edit] of Object.entries(newEdits)) {
        const idx = parseInt(idxStr);
        const prev = prevEdits[idxStr];
        const q = i.analysis.questions[idx];
        const wasEdited = prev && (prev.question !== q.question || prev.answer !== q.answer);
        const isNewEdit = edit.question !== q.question || edit.answer !== q.answer;

        if (isNewEdit && (!prev || edit.question !== prev.question || edit.answer !== prev.answer)) {
            toReanalyze.push(idx);
        }
    }

    i.editedQuestions = newEdits;

    const statusEl = document.getElementById('filterReanalysisStatus');
    const confirmBtn = document.getElementById('filterConfirmBtn');

    if (toReanalyze.length > 0) {
        confirmBtn.disabled = true;
        for (let j = 0; j < toReanalyze.length; j++) {
            const idx = toReanalyze[j];
            const edit = newEdits[idx];
            statusEl.textContent = `正在重新分析第 ${idx + 1} 题 (${j + 1}/${toReanalyze.length})...`;

            try {
                const result = await analyzer.reAnalyzeQuestion(edit.question, edit.answer, i.jobType, i.jd || '');
                if (result) {
                    const q = i.analysis.questions[idx];
                    q.question = edit.question;
                    q.answer = edit.answer;
                    q.intents = result.intents || q.intents;
                    q.evaluation = result.evaluation || q.evaluation;
                    q.suggestion = result.suggestion || q.suggestion;
                    q.confidence = result.confidence != null ? result.confidence : q.confidence;
                }
            } catch (err) {
                console.warn(`Re-analysis failed for question ${idx + 1}:`, err);
                statusEl.textContent = `第 ${idx + 1} 题重新分析失败，保留原结果`;
                await new Promise(r => setTimeout(r, 1000));
                const q = i.analysis.questions[idx];
                q.question = edit.question;
                q.answer = edit.answer;
            }
        }
        confirmBtn.disabled = false;
    }

    await db.addInterview(i);
    const listIdx = this.interviews.findIndex(x => x.id === i.id);
    if (listIdx >= 0) this.interviews[listIdx] = i;

    statusEl.textContent = '';
    this.hideModal();
    this.renderInterviewDetail();
}
```

- [ ] **Step 3: Verify filter modal opens (temporarily add a test button)**

In browser console, run: `app.currentInterview = app.interviews[0]; app.showQuestionFilter();`
Verify the modal displays questions with checkboxes.

- [ ] **Step 4: Commit**

```bash
git add app/js/app.js
git commit -m "feat: implement question filter modal logic"
```

---

### Task 4: Integrate Filter Modal into Analysis Flow

**Files:**
- Modify: `app/js/app.js:541-563` (startAnalysis method) and `app/js/app.js:566-595` (analyzeManualTranscript method)

- [ ] **Step 1: Modify startAnalysis to show filter modal after analysis**

In `startAnalysis()`, replace the block at lines 550-563 (from `onProgress('全部完成!'...)` to the end of the method) with:

```js
            onProgress('全部完成!', 100);
            await new Promise(r => setTimeout(r, 800));
        } catch (err) {
            onProgress(`处理出错: ${err.message}`, 100);
            await new Promise(r => setTimeout(r, 2000));
        }

        this.hideModal();
        this.resetUploadForm();

        this.currentInterview = interview;
        this.currentCompany = company;
        this.showPage('interview');

        if (interview.analysis && interview.analysis.questions.length > 0) {
            this.showQuestionFilter();
        }
    }
```

- [ ] **Step 2: Modify analyzeManualTranscript to show filter modal after analysis**

In `analyzeManualTranscript()`, replace lines 591-594 (from `onProgress('完成!'...)` to end) with:

```js
        onProgress('完成!', 100);
        await new Promise(r => setTimeout(r, 500));
        this.hideModal();
        this.renderInterviewDetail();

        if (this.currentInterview.analysis && this.currentInterview.analysis.questions.length > 0) {
            this.showQuestionFilter();
        }
    }
```

- [ ] **Step 3: Commit**

```bash
git add app/js/app.js
git commit -m "feat: show filter modal after analysis completes"
```

---

### Task 5: Add Filter Button to Interview Detail Page

**Files:**
- Modify: `app/js/app.js:258-271` (renderInterviewDetail header section)

- [ ] **Step 1: Add filter button to the interview detail header**

In `renderInterviewDetail()`, replace the header HTML (lines 263-271) with:

```js
        document.getElementById('interviewHeader').innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                <div>
                    <h2>${this.escapeHtml(i.company)} - ${this.escapeHtml(i.round)}</h2>
                    <div class="meta">
                        <div>📅 ${i.date}</div>
                        <div>⏱️ ${i.duration || '?'}分钟</div>
                        <div>❓ ${i.analysis ? i.analysis.questions.filter((_, idx) => !(i.excludedQuestions || []).includes(idx)).length : 0}个问题</div>
                        <div>🏷️ ${this.escapeHtml(i.jobType)}</div>
                    </div>
                </div>
                ${i.analysis && i.analysis.questions.length > 0 ? '<button class="btn btn-secondary" onclick="app.showQuestionFilter()">筛选问题</button>' : ''}
            </div>
        `;
```

- [ ] **Step 2: Commit**

```bash
git add app/js/app.js
git commit -m "feat: add filter button to interview detail header"
```

---

### Task 6: Filter Excluded Questions in Detail Page Rendering

**Files:**
- Modify: `app/js/app.js:287-324` (renderInterviewDetail QA list and updateTOC)

- [ ] **Step 1: Modify QA list rendering to skip excluded questions**

Replace the QA list rendering block (lines 287-322) with:

```js
        const excluded = new Set(i.excludedQuestions || []);
        const visibleQuestions = i.analysis.questions
            .map((q, idx) => ({ ...q, originalIdx: idx }))
            .filter(q => !excluded.has(q.originalIdx));

        qaList.innerHTML = visibleQuestions.map((q, displayIdx) => `
            <div class="qa-item" id="qa-${q.originalIdx}">
                <div class="qa-item-actions">
                    <button class="btn-icon" onclick="app.editQuestion(${q.originalIdx})" title="编辑">✏️</button>
                    <button class="btn-icon btn-delete" onclick="app.deleteQuestion(${q.originalIdx})" title="删除">🗑️</button>
                </div>
                <div class="question-section">
                    <div class="question-num">问题 #${displayIdx + 1}</div>
                    ${q.isFollowUp ? '<div class="followup-indicator">↳ 追问</div>' : ''}
                    <div class="question-text">${this.escapeHtml(q.question)}</div>
                    <div>
                        ${q.intents.map(t => `<span class="intent-tag">考察: ${this.escapeHtml(t)}</span>`).join('')}
                    </div>
                    ${q.confidence < 0.7 ? '<span class="low-confidence">⚠️ 低置信度转录</span>' : ''}
                </div>

                <div class="answer-label">你的回答</div>
                <div class="answer-text">${this.escapeHtml(q.answer)}</div>

                <div class="evaluation">
                    ${q.evaluation.good ? `<div class="eval-item"><div class="eval-good">✓ 答得好的部分</div><div class="eval-text">${this.escapeHtml(q.evaluation.good)}</div></div>` : ''}
                    ${q.evaluation.bad ? `<div class="eval-item"><div class="eval-bad">✗ 需要改进</div><div class="eval-text">${this.escapeHtml(q.evaluation.bad)}</div></div>` : ''}
                </div>

                ${q.suggestion ? `
                <div class="suggestion">
                    <div class="suggestion-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.textContent = this.nextElementSibling.style.display === 'none' ? '💡 改进建议 (点击展开)' : '💡 改进建议 (点击收起)'">
                        💡 改进建议 (点击收起)
                    </div>
                    <div class="suggestion-body">
                        <strong>优化后的回答示例：</strong>
                        <p style="margin-top:8px;">${this.escapeHtml(q.suggestion)}</p>
                    </div>
                </div>` : ''}
            </div>
        `).join('');

        this.updateTOC(visibleQuestions);
```

- [ ] **Step 2: Modify updateTOC to work with filtered questions**

Replace the `updateTOC` method (lines 327-342) with:

```js
    updateTOC(questions) {
        const breadcrumb = document.getElementById('tocBreadcrumb');
        const tocItems = document.getElementById('tocItems');

        if (!this.currentInterview) return;
        const i = this.currentInterview;
        breadcrumb.textContent = `${i.company} › ${i.jobType} › ${i.round}`;

        tocItems.innerHTML = questions.map((q, displayIdx) => {
            const originalIdx = q.originalIdx != null ? q.originalIdx : displayIdx;
            const label = q.question.length > 12 ? q.question.substring(0, 12) + '...' : q.question;
            return `<div class="toc-item ${displayIdx === 0 ? 'active' : ''}" onclick="app.scrollToQA(${originalIdx})">
                <span class="toc-item-text">#${displayIdx + 1} ${this.escapeHtml(label)}</span>
                <span class="toc-item-delete" onclick="event.stopPropagation(); app.deleteQuestion(${originalIdx})" title="删除该问题">×</span>
            </div>`;
        }).join('');
    }
```

- [ ] **Step 3: Verify detail page renders correctly with excluded questions**

Navigate to an existing interview, open filter modal, uncheck some questions, confirm, verify they disappear from the detail page and TOC.

- [ ] **Step 4: Commit**

```bash
git add app/js/app.js
git commit -m "feat: filter excluded questions in detail page rendering"
```

---

### Task 7: End-to-End Verification

- [ ] **Step 1: Test full flow — upload text and verify filter modal appears**

1. Click "上传面试录音"
2. Switch to "粘贴转写文本" tab
3. Paste sample text:
```
面试官：请介绍一下你自己
候选人：我是一名后端开发工程师，有3年经验
面试官：你用过哪些数据库？
候选人：MySQL和Redis
面试官：说说Redis的持久化机制
候选人：RDB和AOF两种方式
```
4. Fill company/position, click "开始分析"
5. Verify filter modal appears after analysis
6. Uncheck question #2, confirm
7. Verify detail page shows only questions 1 and 3

- [ ] **Step 2: Test edit and re-analysis**

1. On the detail page, click "筛选问题"
2. Click on a question text to edit it
3. Modify the text, click away to save
4. Click "确认"
5. Verify re-analysis runs (progress shown) and result updates

- [ ] **Step 3: Test persistence**

1. Refresh the page
2. Open the same interview
3. Verify excluded questions remain hidden
4. Open filter modal, verify checkboxes reflect saved state

- [ ] **Step 4: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address issues found during e2e testing"
```
