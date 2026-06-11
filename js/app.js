class App {
    constructor() {
        this.currentPage = 'home';
        this.currentCompany = null;
        this.currentInterview = null;
        this.currentFilter = 'all';
        this.interviews = [];
    }

    async init() {
        await db.init();
        this.interviews = await db.getAllInterviews();
        this.bindEvents();
        this.renderHome();
        this.setDefaultDate();
        this.loadAISettings();
        this.loadStoragePath();
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                if (page === 'home') this.showPage('home');
                else if (page === 'insights') this.showInsights();
                else if (page === 'settings') this.showPage('settings');
            });
        });

        // Filter tags
        document.getElementById('filterTags').addEventListener('click', (e) => {
            if (e.target.classList.contains('tag')) {
                document.querySelectorAll('.filter-tags .tag').forEach(t => t.classList.remove('tag-active'));
                e.target.classList.add('tag-active');
                this.currentFilter = e.target.dataset.filter;
                this.renderHome();
            }
        });

        // Upload button
        document.getElementById('uploadBtn').addEventListener('click', () => this.showUploadModal());

        // Upload zone
        const zone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('audioFile');

        zone.addEventListener('click', () => fileInput.click());
        zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                this.handleFileSelect(e.dataTransfer.files[0]);
            }
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) this.handleFileSelect(e.target.files[0]);
        });

        // Start analysis
        document.getElementById('startAnalysis').addEventListener('click', () => this.startAnalysis());

        // Upload tab switching
        document.getElementById('uploadTabs').addEventListener('click', (e) => {
            if (e.target.classList.contains('upload-tab')) {
                document.querySelectorAll('.upload-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.upload-tab-content').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                const tab = e.target.dataset.tab;
                document.getElementById(tab === 'audio' ? 'tabAudio' : 'tabText').classList.add('active');
            }
        });
    }

    // --- Page Navigation ---

    showPage(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

        const sidebar = document.getElementById('sidebar');
        const tocSection = document.getElementById('tocSection');

        if (page === 'home') {
            document.getElementById('homePage').classList.add('active');
            document.querySelector('[data-page="home"]').classList.add('active');
            sidebar.classList.remove('expanded');
            tocSection.style.display = 'none';
            document.body.classList.remove('sidebar-expanded');
            this.renderHome();
        } else if (page === 'interview') {
            document.getElementById('interviewPage').classList.add('active');
            document.querySelector('[data-page="home"]').classList.add('active');
            sidebar.classList.add('expanded');
            tocSection.style.display = 'block';
            document.body.classList.add('sidebar-expanded');
            this.renderInterviewDetail();
        } else if (page === 'insights') {
            document.getElementById('insightsPage').classList.add('active');
            document.querySelector('[data-page="insights"]').classList.add('active');
            sidebar.classList.remove('expanded');
            tocSection.style.display = 'none';
            document.body.classList.remove('sidebar-expanded');
        } else if (page === 'settings') {
            document.getElementById('settingsPage').classList.add('active');
            document.querySelector('[data-page="settings"]').classList.add('active');
            sidebar.classList.remove('expanded');
            tocSection.style.display = 'none';
            document.body.classList.remove('sidebar-expanded');
        }
        this.currentPage = page;
    }

    // --- Home Page ---

    renderFilterTags() {
        const filterTags = document.getElementById('filterTags');
        const jobTypes = [...new Set(this.interviews.map(i => i.jobType).filter(jt => jt))];

        let html = '<span class="tag tag-active" data-filter="all">全部</span>';
        for (const jt of jobTypes) {
            const activeClass = this.currentFilter === jt ? 'tag-active' : '';
            html += `<span class="tag ${activeClass}" data-filter="${this.escapeHtml(jt)}">${this.escapeHtml(jt)}</span>`;
        }
        filterTags.innerHTML = html;
    }

    renderHome() {
        this.renderFilterTags();
        const container = document.getElementById('interviewListContainer');
        const empty = document.getElementById('emptyState');

        let filtered = this.interviews;
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(i => i.jobType === this.currentFilter);
        }

        if (filtered.length === 0) {
            container.innerHTML = '';
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        const sorted = filtered.sort((a, b) => b.date.localeCompare(a.date));

        container.innerHTML = sorted.map(i => {
            const qCount = i.analysis ? i.analysis.questions.length : 0;
            return `
                <div class="interview-item" onclick="app.openInterview('${i.id}')">
                    <div class="item-actions">
                        <button class="btn-icon" onclick="event.stopPropagation(); app.showEditModal('${i.id}')" title="编辑">✏️</button>
                        <button class="btn-icon btn-delete" onclick="event.stopPropagation(); app.deleteInterview('${i.id}')" title="删除">🗑️</button>
                    </div>
                    <div>
                        <div style="font-weight:600;font-size:15px;margin-bottom:6px;padding-right:50px;">${this.escapeHtml(i.company)}</div>
                        <div style="font-size:14px;color:#495057;">${this.escapeHtml(i.round)}</div>
                    </div>
                    <div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
                            <span class="tag">${this.escapeHtml(i.jobType)}</span>
                            <span class="tag" style="background:#d3f9d8;color:#2b8a3e;">${qCount}个问题</span>
                        </div>
                        <div class="date">${i.date}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getCompanyList() {
        let filtered = this.interviews;
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(i => i.jobType === this.currentFilter);
        }

        const companies = {};
        for (const i of filtered) {
            if (!companies[i.company]) {
                companies[i.company] = { name: i.company, jobType: i.jobType, count: 0, lastDate: i.date };
            }
            companies[i.company].count++;
            if (i.date > companies[i.company].lastDate) {
                companies[i.company].lastDate = i.date;
            }
        }

        return Object.values(companies).sort((a, b) => b.lastDate.localeCompare(a.lastDate));
    }

    // --- Edit/Delete ---

    showEditModal(id) {
        const interview = this.interviews.find(i => i.id === id);
        if (!interview) return;

        this.editingId = id;
        document.getElementById('editCompany').value = interview.company;
        document.getElementById('editJobType').value = interview.jobType;
        document.getElementById('editRound').value = interview.round;
        document.getElementById('editDate').value = interview.date;
        document.getElementById('editJD').value = interview.jd || '';

        const datalist = document.getElementById('editJobTypeSuggestions');
        const jobTypes = [...new Set(this.interviews.map(i => i.jobType))];
        datalist.innerHTML = jobTypes.map(jt => `<option value="${this.escapeHtml(jt)}">`).join('');

        document.getElementById('editModal').classList.add('show');
    }

    async saveEdit() {
        if (!this.editingId) return;

        const interview = this.interviews.find(i => i.id === this.editingId);
        if (!interview) return;

        interview.company = document.getElementById('editCompany').value.trim();
        interview.jobType = document.getElementById('editJobType').value.trim();
        interview.round = document.getElementById('editRound').value;
        interview.date = document.getElementById('editDate').value;
        interview.jd = document.getElementById('editJD').value.trim();

        await db.addInterview(interview);
        this.hideModal();
        this.renderHome();
    }

    async deleteInterview(id) {
        if (!confirm('确定要删除这场面试记录吗？此操作不可恢复。')) return;

        await db.deleteInterview(id);
        this.interviews = this.interviews.filter(i => i.id !== id);

        if (this.currentInterview && this.currentInterview.id === id) {
            this.currentInterview = null;
            this.showPage('home');
        } else {
            this.renderHome();
        }
    }

    // --- Company Detail (deprecated, kept for compatibility) ---

    openCompany(name) {
        this.currentCompany = name;
    }

    // --- Interview Detail ---

    openInterview(id) {
        this.currentInterview = this.interviews.find(i => i.id === id);
        this.showPage('interview');
    }

    renderInterviewDetail() {
        const i = this.currentInterview;
        if (!i) return;

        // Header
        document.getElementById('interviewHeader').innerHTML = `
            <h2>${this.escapeHtml(i.company)} - ${this.escapeHtml(i.round)}</h2>
            <div class="meta">
                <div>📅 ${i.date}</div>
                <div>⏱️ ${i.duration || '?'}分钟</div>
                <div>❓ ${i.analysis ? i.analysis.questions.length : 0}个问题</div>
                <div>🏷️ ${this.escapeHtml(i.jobType)}</div>
            </div>
        `;

        // QA List
        const qaList = document.getElementById('qaList');
        if (!i.analysis || i.analysis.questions.length === 0) {
            qaList.innerHTML = `
                <div class="card">
                    <p>尚未完成分析。请在下方粘贴面试转录文本：</p>
                    <textarea id="manualTranscript" rows="10" style="width:100%;margin:12px 0;padding:12px;border:1px solid #ced4da;border-radius:6px;font-size:14px;" placeholder="格式示例：&#10;面试官：请介绍一下你的项目&#10;候选人：我最近做的项目是...&#10;面试官：为什么选择这个方案？&#10;候选人：因为..."></textarea>
                    <button class="btn btn-primary" onclick="app.analyzeManualTranscript()">分析文本</button>
                </div>
            `;
            this.updateTOC([]);
            return;
        }

        qaList.innerHTML = i.analysis.questions.map((q, idx) => `
            <div class="qa-item" id="qa-${idx}">
                <div class="question-section">
                    <div class="question-num">问题 #${idx + 1}</div>
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

        this.updateTOC(i.analysis.questions);
    }

    updateTOC(questions) {
        const breadcrumb = document.getElementById('tocBreadcrumb');
        const tocItems = document.getElementById('tocItems');

        if (!this.currentInterview) return;
        const i = this.currentInterview;
        breadcrumb.textContent = `${i.company} › ${i.jobType} › ${i.round}`;

        tocItems.innerHTML = questions.map((q, idx) => {
            const label = q.question.length > 12 ? q.question.substring(0, 12) + '...' : q.question;
            return `<div class="toc-item ${idx === 0 ? 'active' : ''}" onclick="app.scrollToQA(${idx})">#${idx + 1} ${this.escapeHtml(label)}</div>`;
        }).join('');
    }

    scrollToQA(idx) {
        const el = document.getElementById(`qa-${idx}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            document.querySelectorAll('.toc-item').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.toc-item')[idx]?.classList.add('active');
        }
    }

    // --- Upload & Analysis ---

    showUploadModal() {
        document.getElementById('uploadModal').classList.add('show');
        this.updateCompanySuggestions();
        this.updateJobTypeSuggestions();
    }

    hideModal() {
        document.getElementById('uploadModal').classList.remove('show');
        document.getElementById('processingModal').classList.remove('show');
        document.getElementById('editModal').classList.remove('show');
    }

    handleFileSelect(file) {
        const validTypes = ['.m4a', '.mp3', '.wav', '.aac'];
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        if (!validTypes.includes(ext)) {
            alert('不支持的格式。请上传 m4a, mp3, wav 文件。');
            return;
        }
        if (file.size > 500 * 1024 * 1024) {
            alert('文件过大，请上传500MB以内的录音文件。');
            return;
        }
        const nameEl = document.getElementById('uploadFileName');
        nameEl.textContent = `✓ 已选择: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`;
        nameEl.classList.add('show');
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('interviewDate').value = today;
    }

    updateCompanySuggestions() {
        const datalist = document.getElementById('companySuggestions');
        const companies = [...new Set(this.interviews.map(i => i.company))];
        datalist.innerHTML = companies.map(c => `<option value="${this.escapeHtml(c)}">`).join('');
    }

    async startAnalysis() {
        const company = document.getElementById('companyName').value.trim();
        const jobType = document.getElementById('jobType').value.trim();
        const round = document.getElementById('interviewRound').value;
        const date = document.getElementById('interviewDate').value;
        const jd = document.getElementById('uploadJD').value.trim();
        const fileInput = document.getElementById('audioFile');
        const transcriptInput = document.getElementById('uploadTranscript');

        if (!company) { alert('请输入公司名称'); return; }
        if (!jobType) { alert('请输入岗位方向'); return; }

        // Determine upload mode
        const isTextMode = document.querySelector('.upload-tab.active').dataset.tab === 'text';
        const hasFile = !isTextMode && fileInput.files.length > 0;
        const hasText = isTextMode && transcriptInput.value.trim();

        if (!hasFile && !hasText) {
            alert(isTextMode ? '请粘贴转写文本' : '请选择录音文件');
            return;
        }

        const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        let duration = 0;

        if (hasFile) {
            duration = await audioProcessor.getDurationFromFile(fileInput.files[0]);
            await db.saveAudioFile(id, fileInput.files[0]);
        }

        const interview = {
            id, company, jobType, round, date, duration,
            jd: jd || '',
            createdAt: new Date().toISOString(),
            analysis: null,
            transcript: ''
        };

        await db.addInterview(interview);
        this.interviews.push(interview);

        // Hide upload modal
        this.hideModal();

        // Show processing modal
        document.getElementById('processingModal').classList.add('show');
        const progressFill = document.getElementById('progressFill');
        const statusEl = document.getElementById('processingStatus');

        const onProgress = (msg, pct) => {
            statusEl.textContent = msg;
            progressFill.style.width = pct + '%';
        };

        onProgress('正在处理...', 10);

        try {
            let transcript = '';

            if (hasText) {
                // Text mode: use pasted text directly
                transcript = transcriptInput.value.trim();
                onProgress('已获取转写文本，正在分析...', 50);
            } else if (hasFile && whisperSTT.hasConfig()) {
                // Audio mode with Whisper STT: auto transcribe
                onProgress('正在调用语音转文字服务...', 15);
                transcript = await whisperSTT.transcribe(fileInput.files[0], onProgress);
            } else if (hasFile) {
                // Audio mode without STT config
                onProgress('录音已保存。请在设置中配置录音转文字服务，或重新以文本模式上传。', 100);
                await new Promise(r => setTimeout(r, 2000));
                this.hideModal();
                this.currentInterview = interview;
                this.currentCompany = company;
                this.showPage('interview');
                this.resetUploadForm();
                return;
            }

            // Run AI analysis
            interview.transcript = transcript;
            onProgress('正在进行AI分析...', 70);
            const analysis = await analyzer.analyzeTranscript(transcript, jobType, onProgress, interview.jd);
            interview.analysis = analysis;

            await db.addInterview(interview);
            const idx = this.interviews.findIndex(i => i.id === interview.id);
            if (idx >= 0) this.interviews[idx] = interview;

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
    }

    async analyzeManualTranscript() {
        const textarea = document.getElementById('manualTranscript');
        const transcript = textarea.value.trim();
        if (!transcript) { alert('请粘贴面试转录文本'); return; }

        // Show processing
        document.getElementById('processingModal').classList.add('show');
        const progressFill = document.getElementById('progressFill');
        const statusEl = document.getElementById('processingStatus');

        const onProgress = (msg, pct) => {
            statusEl.textContent = msg;
            progressFill.style.width = pct + '%';
        };

        const analysis = await analyzer.analyzeTranscript(transcript, this.currentInterview.jobType, onProgress, this.currentInterview.jd || '');

        onProgress('保存分析结果...', 95);
        this.currentInterview.transcript = transcript;
        this.currentInterview.analysis = analysis;
        await db.addInterview(this.currentInterview);

        const idx = this.interviews.findIndex(i => i.id === this.currentInterview.id);
        if (idx >= 0) this.interviews[idx] = this.currentInterview;

        onProgress('完成!', 100);
        await new Promise(r => setTimeout(r, 500));
        this.hideModal();
        this.renderInterviewDetail();
    }

    resetUploadForm() {
        document.getElementById('companyName').value = '';
        document.getElementById('audioFile').value = '';
        document.getElementById('uploadFileName').classList.remove('show');
        document.getElementById('uploadTranscript').value = '';
        document.getElementById('uploadJD').value = '';
        this.setDefaultDate();
    }

    updateJobTypeSuggestions() {
        const datalist = document.getElementById('jobTypeSuggestions');
        const jobTypes = [...new Set(this.interviews.map(i => i.jobType))];
        datalist.innerHTML = jobTypes.map(jt => `<option value="${this.escapeHtml(jt)}">`).join('');
    }

    async saveStoragePath() {
        const path = document.getElementById('storagePathInput').value.trim();
        if (!path) {
            alert('请输入存储路径');
            return;
        }
        try {
            await db.setStoragePath(path);
            const saved = document.getElementById('storagePathSaved');
            saved.style.display = 'inline';
            setTimeout(() => saved.style.display = 'none', 2000);
        } catch (err) {
            alert('保存失败: ' + err.message);
        }
    }

    async loadStoragePath() {
        try {
            const path = await db.getStoragePath();
            document.getElementById('storagePathInput').value = path;
        } catch (err) {
            console.warn('Failed to load storage path:', err);
        }
    }

    // --- Insights ---

    showInsights() {
        this.showPage('insights');
        const content = document.getElementById('insightsContent');
        const analyzed = this.interviews.filter(i => i.analysis && i.analysis.questions.length > 0);

        if (analyzed.length < 2) {
            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📊</div>
                    <p>至少需要2场已分析的面试才能生成规律分析</p>
                </div>`;
            return;
        }

        const companies = [...new Set(analyzed.map(i => i.company))];
        const jobTypes = [...new Set(analyzed.map(i => i.jobType))];

        let html = `
            <div class="card" style="margin-bottom:16px;">
                <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
                    <span style="font-size:14px;font-weight:500;color:#495057;">筛选：</span>
                    <select id="insightFilterType" onchange="app.filterInsightList()" style="padding:6px 12px;border:1px solid #ced4da;border-radius:6px;font-size:14px;">
                        <option value="all">全部</option>
                        <option value="company">按公司</option>
                        <option value="jobType">按岗位</option>
                    </select>
                    <select id="insightFilterValue" onchange="app.filterInsightList()" style="padding:6px 12px;border:1px solid #ced4da;border-radius:6px;font-size:14px;display:none;">
                    </select>
                </div>
            </div>
            <div class="card">
                <h3>选择要分析的面试</h3>
                <p style="font-size:13px;color:#6c757d;margin-bottom:16px;">勾选需要分析的面试记录，生成规律分析报告</p>
                <div id="insightSelectionList"></div>
                <button class="btn btn-primary" onclick="app.runSelectedInsights()" style="margin-top:16px;">生成分析</button>
            </div>
            <div id="insightsResult"></div>
        `;
        content.innerHTML = html;
        this._insightAnalyzed = analyzed;
        this._insightCompanies = companies;
        this._insightJobTypes = jobTypes;
        this.filterInsightList();
    }

    filterInsightList() {
        const filterType = document.getElementById('insightFilterType').value;
        const filterValueEl = document.getElementById('insightFilterValue');

        if (filterType === 'all') {
            filterValueEl.style.display = 'none';
        } else {
            filterValueEl.style.display = '';
            const options = filterType === 'company' ? this._insightCompanies : this._insightJobTypes;
            const currentVal = filterValueEl.value;
            filterValueEl.innerHTML = options.map(o => `<option value="${this.escapeHtml(o)}">${this.escapeHtml(o)}</option>`).join('');
            if (options.includes(currentVal)) filterValueEl.value = currentVal;
        }

        let filtered = this._insightAnalyzed;
        if (filterType === 'company' && filterValueEl.value) {
            filtered = filtered.filter(i => i.company === filterValueEl.value);
        } else if (filterType === 'jobType' && filterValueEl.value) {
            filtered = filtered.filter(i => i.jobType === filterValueEl.value);
        }

        const listEl = document.getElementById('insightSelectionList');
        listEl.innerHTML = filtered.map(i => `
            <label style="display:flex;align-items:center;padding:8px 0;cursor:pointer;">
                <input type="checkbox" class="insight-checkbox" value="${i.id}" checked style="margin-right:12px;width:18px;height:18px;cursor:pointer;">
                <span style="flex:1;">
                    <strong>${this.escapeHtml(i.company)} - ${this.escapeHtml(i.round)}</strong>
                    <span style="margin-left:12px;font-size:13px;color:#6c757d;">${i.date}</span>
                    <span class="tag" style="margin-left:8px;">${this.escapeHtml(i.jobType)}</span>
                </span>
            </label>
        `).join('');
    }

    runSelectedInsights() {
        const checkboxes = document.querySelectorAll('.insight-checkbox:checked');
        const selectedIds = Array.from(checkboxes).map(cb => cb.value);
        const selected = this.interviews.filter(i => selectedIds.includes(i.id));

        if (selected.length < 2) {
            alert('请至少选择2场面试进行分析');
            return;
        }

        const insights = analyzer.generateInsights(selected);
        const resultDiv = document.getElementById('insightsResult');

        let html = `
            <div class="insight-card">
                <h3>📊 分析概览</h3>
                <p>基于 ${insights.totalInterviews} 场已分析面试的数据</p>
            </div>`;

        if (insights.weaknesses.length > 0) {
            html += `<div class="insight-card"><h3>⚠️ 共性弱点 (出现频率最高)</h3>`;
            html += insights.weaknesses.map(([label, count]) => `
                <div class="weakness-item">
                    <span class="weakness-label">${this.escapeHtml(label)}</span>
                    <span class="weakness-count">出现 ${count} 次</span>
                </div>
            `).join('');
            html += `</div>`;
        }

        if (insights.hotspots.length > 0) {
            html += `<div class="insight-card"><h3>🔥 高频考点</h3>`;
            html += insights.hotspots.map(([label, count]) => `
                <div class="hotspot-item">
                    <span>${this.escapeHtml(label)}</span>
                    <span class="hotspot-count">${count} 次</span>
                </div>
            `).join('');
            html += `</div>`;
        }

        resultDiv.innerHTML = html;
    }

    // --- Data Management ---

    async exportData() {
        const json = await db.exportAll();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `interview-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const text = await file.text();
            try {
                await db.importData(text);
                this.interviews = await db.getAllInterviews();
                this.renderHome();
                alert('导入成功！');
            } catch (err) {
                alert('导入失败：' + err.message);
            }
        };
        input.click();
    }

    async clearAllData() {
        if (!confirm('确定要清空所有数据吗？此操作不可恢复。')) return;
        await db.clearAll();
        this.interviews = [];
        this.renderHome();
    }

    // --- Helpers ---

    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    saveAISettings() {
        const endpoint = document.getElementById('settingEndpoint').value.trim();
        const apiKey = document.getElementById('settingApiKey').value.trim();
        const model = document.getElementById('settingModel').value.trim();
        analyzer.setConfig(apiKey, endpoint, model);
        const saved = document.getElementById('settingSaved');
        saved.style.display = 'inline';
        setTimeout(() => saved.style.display = 'none', 2000);
    }

    loadAISettings() {
        document.getElementById('settingEndpoint').value = localStorage.getItem('ai_api_endpoint') || '';
        document.getElementById('settingApiKey').value = localStorage.getItem('ai_api_key') || '';
        document.getElementById('settingModel').value = localStorage.getItem('ai_model') || '';
        // STT settings
        document.getElementById('sttEndpoint').value = localStorage.getItem('stt_api_endpoint') || '';
        document.getElementById('sttApiKey').value = localStorage.getItem('stt_api_key') || '';
        document.getElementById('sttModel').value = localStorage.getItem('stt_api_model') || '';
    }

    saveSTTSettings() {
        const endpoint = document.getElementById('sttEndpoint').value.trim();
        const apiKey = document.getElementById('sttApiKey').value.trim();
        const model = document.getElementById('sttModel').value.trim();
        whisperSTT.setConfig(endpoint, apiKey, model);
        const saved = document.getElementById('sttSaved');
        saved.style.display = 'inline';
        setTimeout(() => saved.style.display = 'none', 2000);
    }

    applySTTPreset() {
        const preset = document.getElementById('sttPreset').value;
        if (!preset) return;

        const presets = {
            mimo: { endpoint: 'https://token-plan-cn.xiaomimimo.com/v1', model: 'mimo-v2.5-asr' },
            groq: { endpoint: 'https://api.groq.com/openai/v1', model: 'whisper-large-v3-turbo' },
            local: { endpoint: 'http://localhost:8000/v1', model: 'whisper-1' },
            tingwu: { endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'paraformer-v2' }
        };

        const p = presets[preset];
        if (p) {
            document.getElementById('sttEndpoint').value = p.endpoint;
            document.getElementById('sttModel').value = p.model;
            document.getElementById('sttApiKey').placeholder = preset === 'local' ? '本地无需API Key，留空即可' : '请填入你的API Key';
        }
    }

    applyAIPreset() {
        const preset = document.getElementById('aiPreset').value;
        if (!preset) return;

        const presets = {
            mimo: { endpoint: 'https://token-plan-cn.xiaomimimo.com/v1', model: 'MiMo-V2.5-Pro' },
            deepseek: { endpoint: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
            qwen: { endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
            ollama: { endpoint: 'http://localhost:11434/v1', model: 'llama3' }
        };

        const p = presets[preset];
        if (p) {
            document.getElementById('settingEndpoint').value = p.endpoint;
            document.getElementById('settingModel').value = p.model;
            document.getElementById('settingApiKey').placeholder = preset === 'ollama' ? '本地无需API Key，留空即可' : '请填入你的API Key';
        }
    }
}

const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());