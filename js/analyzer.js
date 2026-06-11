class Analyzer {
    constructor() {
        this.apiKey = localStorage.getItem('ai_api_key') || '';
        this.apiEndpoint = localStorage.getItem('ai_api_endpoint') || '';
        this.model = localStorage.getItem('ai_model') || '';
    }

    setConfig(apiKey, endpoint, model) {
        this.apiKey = apiKey;
        this.apiEndpoint = endpoint;
        this.model = model;
        localStorage.setItem('ai_api_key', apiKey);
        localStorage.setItem('ai_api_endpoint', endpoint);
        localStorage.setItem('ai_model', model);
    }

    hasConfig() {
        return this.apiKey && this.apiEndpoint;
    }

    async analyzeTranscript(transcript, jobType, onProgress, jd = '') {
        if (!this.hasConfig()) {
            onProgress('未配置AI服务，使用基础文本解析...', 70);
            return this.basicParse(transcript);
        }

        onProgress('正在调用AI分析...', 70);

        try {
            const result = await this.callAI(transcript, jobType, jd, onProgress);
            return result;
        } catch (err) {
            console.error('AI analysis failed:', err);
            onProgress(`AI分析出错: ${err.message}，回退到基础解析`, 75);
            await new Promise(r => setTimeout(r, 1500));
            return this.basicParse(transcript);
        }
    }

    async callAI(transcript, jobType, jd, onProgress) {
        const model = this.model || 'default';
        let prompt = `你是一位资深面试教练。请分析以下面试对话转录文本，并以JSON格式返回分析结果。

面试岗位方向：${jobType}
`;

        if (jd && jd.trim()) {
            prompt += `
职位描述（JD）：
${jd.trim()}

请结合以上职位描述对候选人的表现进行针对性评估。
`;
        }

        prompt += `
转录文本：
${transcript}

请返回以下JSON格式（不要包含markdown代码块标记）：
{
  "questions": [
    {
      "question": "面试官的问题",
      "isFollowUp": false,
      "intents": ["考察意图1", "考察意图2"],
      "answer": "候选人的回答",
      "confidence": 0.9,
      "evaluation": {
        "good": "答得好的部分说明",
        "bad": "需要改进的部分说明"
      },
      "suggestion": "改进后的回答示例"
    }
  ],
  "summary": {
    "overall": "整体评价",
    "highlights": ["亮点1", "亮点2"],
    "improvements": ["待改进1", "待改进2"]
  }
}`;

        const endpoint = this.apiEndpoint.endsWith('/chat/completions')
            ? this.apiEndpoint
            : this.apiEndpoint.replace(/\/?$/, '/chat/completions');

        const response = await fetch('/api/proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'X-Target-URL': endpoint
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`API ${response.status}: ${errBody.substring(0, 200)}`);
        }

        onProgress('正在解析分析结果...', 85);
        const data = await response.json();

        // Support both OpenAI format and other formats
        let content = '';
        if (data.choices && data.choices[0]) {
            content = data.choices[0].message?.content || data.choices[0].text || '';
        } else if (data.content) {
            content = data.content;
        } else if (data.result) {
            content = data.result;
        } else {
            throw new Error('无法解析API返回结果: ' + JSON.stringify(data).substring(0, 200));
        }

        const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(jsonStr);
    }

    basicParse(transcript) {
        if (!transcript || transcript.trim().length === 0) {
            return { questions: [], summary: { overall: '暂无内容', highlights: [], improvements: [] } };
        }

        const lines = transcript.split('\n').filter(l => l.trim());
        const questions = [];
        let currentQ = null;

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('Q:') || trimmed.startsWith('问：') || trimmed.startsWith('面试官：')) {
                if (currentQ) questions.push(currentQ);
                currentQ = {
                    question: trimmed.replace(/^(Q:|问：|面试官：)\s*/, ''),
                    isFollowUp: false,
                    intents: ['待分析'],
                    answer: '',
                    confidence: 0.8,
                    evaluation: { good: '待AI分析', bad: '待AI分析' },
                    suggestion: '请配置AI服务以获取改进建议'
                };
            } else if (currentQ && (trimmed.startsWith('A:') || trimmed.startsWith('答：') || trimmed.startsWith('候选人：'))) {
                currentQ.answer = trimmed.replace(/^(A:|答：|候选人：)\s*/, '');
            } else if (currentQ) {
                currentQ.answer += ' ' + trimmed;
            }
        }
        if (currentQ) questions.push(currentQ);

        if (questions.length === 0) {
            questions.push({
                question: '(未能自动识别问题结构)',
                isFollowUp: false,
                intents: ['待分析'],
                answer: transcript.substring(0, 500),
                confidence: 0.5,
                evaluation: { good: '请配置AI服务进行分析', bad: '' },
                suggestion: '请配置AI服务以获取改进建议'
            });
        }

        return {
            questions,
            summary: {
                overall: `共识别到 ${questions.length} 个问答对`,
                highlights: [],
                improvements: ['建议配置AI服务获取更深入的分析']
            }
        };
    }

    generateInsights(interviews) {
        const analyzed = interviews.filter(i => i.analysis && i.analysis.questions.length > 0);
        if (analyzed.length < 2) return null;

        const weaknesses = {};
        const hotspots = {};
        const intentCounts = {};

        for (const interview of analyzed) {
            for (const q of interview.analysis.questions) {
                for (const intent of q.intents) {
                    if (intent === '待分析') continue;
                    intentCounts[intent] = (intentCounts[intent] || 0) + 1;
                    hotspots[intent] = (hotspots[intent] || 0) + 1;
                }

                if (q.evaluation && q.evaluation.bad && q.evaluation.bad !== '待AI分析') {
                    const key = q.intents[0] || '其他';
                    if (key !== '待分析') {
                        weaknesses[key] = (weaknesses[key] || 0) + 1;
                    }
                }
            }
        }

        const sortedWeaknesses = Object.entries(weaknesses)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const sortedHotspots = Object.entries(hotspots)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        return {
            totalInterviews: analyzed.length,
            weaknesses: sortedWeaknesses,
            hotspots: sortedHotspots
        };
    }
}

const analyzer = new Analyzer();