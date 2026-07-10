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
        let prompt = `## Role / 角色

你是一位资深的面试教练和职业发展顾问。你擅长从冗长、可能包含口语噪音（如"嗯"、"啊"、重复词）的面试语音转文字记录中，精准提取关键信息，并给出深度、毒辣且具有建设性的反馈。

## Task / 目标

请根据我提交的面试语音文本进行深度复盘。你的任务是分析面试表现，拆解回答逻辑，并指出具体的改进路径。

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
## Constraints & Logic / 处理逻辑

1. 智能过滤：自动忽略语音转文字中的语气助词、重复词和明显的识别错误。
2. 结构化提取：严格按照要求的JSON格式输出。
3. 批判性分析：不要只说好话，要敢于指出逻辑漏洞、表达不清或不符合岗位预期的部分。
4. 行动导向：suggestion 必须给出"能立刻执行"的改进建议，运用专业框架（如 STAR 或 3W）给出建议的表达方式。
5. 完整引用：question 和 answer 字段必须完整引用原文，不得省略或概括，不得用"..."缩写，即使内容很长也要完整保留。
6. 合并回答：如果一个问题后面有多段候选人的回答，请将所有回答内容合并为一个完整的 answer。
7. 追问识别：如果某个问题是基于上一个回答的追问，isFollowUp 设为 true。
8. 反问环节：如果面试中有候选人向面试官提问的环节，也要提取，question 填候选人的提问，answer 填面试官的回答，并在 intents 中标注"反问环节"。

## 转录文本：
${transcript}

## Output Format / 输出格式

请返回以下JSON格式（不要包含markdown代码块标记）：
{
  "questions": [
    {
      "question": "面试官的完整原话（过滤语气词后）",
      "isFollowUp": false,
      "intents": ["考察意图1", "考察意图2"],
      "answer": "候选人的完整回答原文（过滤语气词后，保留全部内容）",
      "confidence": 0.9,
      "evaluation": {
        "good": "答得好的部分：逻辑清晰、有数据支撑、切中要点的地方",
        "bad": "存在问题：逻辑混乱、没答到点子上、缺乏数据支撑、表达不清的地方"
      },
      "suggestion": "改进策略：如果再次遇到该问题，应该如何运用更专业的框架（如STAR或3W）回答，给出一段完整的建议表达方式"
    }
  ],
  "summary": {
    "overall": "综合评价：整场面试的胜算评估（1-10分）及整体观感",
    "highlights": ["亮点1", "亮点2"],
    "improvements": ["技能/知识缺口1", "技能/知识缺口2"],
    "actionPlan": ["下一步行动：具体的学习项、准备项"]
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

    async reAnalyzeQuestion(question, answer, jobType, jd) {
        if (!this.hasConfig()) return null;

        const model = this.model || 'default';
        let prompt = `你是一位资深面试教练。请对以下单个面试问答进行分析，返回JSON格式。

面试岗位方向：${jobType}
`;
        if (jd && jd.trim()) {
            prompt += `职位描述（JD）：${jd.trim()}\n`;
        }

        prompt += `
面试官的问题：${question}
候选人的回答：${answer}

请返回以下JSON格式（不要包含markdown代码块标记）：
{
  "intents": ["考察意图1", "考察意图2"],
  "confidence": 0.9,
  "evaluation": {
    "good": "答得好的部分说明",
    "bad": "需要改进的部分说明"
  },
  "suggestion": "改进后的回答示例"
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
            throw new Error(`API ${response.status}`);
        }

        const data = await response.json();
        let content = '';
        if (data.choices && data.choices[0]) {
            content = data.choices[0].message?.content || data.choices[0].text || '';
        } else if (data.content) {
            content = data.content;
        } else if (data.result) {
            content = data.result;
        }

        const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(jsonStr);
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