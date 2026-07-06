class WhisperSTT {
    constructor() {
        this.apiEndpoint = localStorage.getItem('stt_api_endpoint') || '';
        this.apiKey = localStorage.getItem('stt_api_key') || '';
        this.model = localStorage.getItem('stt_api_model') || '';
    }

    setConfig(endpoint, apiKey, model) {
        this.apiEndpoint = endpoint;
        this.apiKey = apiKey;
        this.model = model;
        localStorage.setItem('stt_api_endpoint', endpoint);
        localStorage.setItem('stt_api_key', apiKey);
        localStorage.setItem('stt_api_model', model);
    }

    hasConfig() {
        return this.apiEndpoint && this.apiKey;
    }

    isMimoASR() {
        const model = (this.model || '').toLowerCase();
        return model.includes('mimo') && model.includes('asr');
    }

    getTranscriptionUrl() {
        let url = this.apiEndpoint;
        if (this.isMimoASR()) {
            if (url.endsWith('/chat/completions')) return url;
            url = url.replace(/\/?$/, '');
            if (!url.endsWith('/v1')) url += '/v1';
            return url + '/chat/completions';
        }
        if (url.endsWith('/audio/transcriptions')) return url;
        if (url.endsWith('/v1')) return url + '/audio/transcriptions';
        url = url.replace(/\/?$/, '');
        if (!url.includes('/v1')) url += '/v1';
        return url + '/audio/transcriptions';
    }

    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    getMimeType(file) {
        const ext = file.name.split('.').pop().toLowerCase();
        const mimeMap = { wav: 'audio/wav', mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac' };
        return mimeMap[ext] || 'audio/wav';
    }

    async transcribe(file, onProgress) {
        if (!this.hasConfig()) {
            throw new Error('未配置录音转文字服务');
        }

        if (this.isMimoASR()) {
            return this.transcribeMimoASR(file, onProgress);
        }
        return this.transcribeWhisper(file, onProgress);
    }

    async transcribeMimoASR(file, onProgress) {
        onProgress('正在编码音频文件...', 15);
        const base64Audio = await this.fileToBase64(file);
        const mimeType = this.getMimeType(file);

        onProgress('正在调用 MiMo ASR 服务...', 30);

        const targetUrl = this.getTranscriptionUrl();
        const body = JSON.stringify({
            model: this.model || 'mimo-v2.5-asr',
            messages: [{
                role: 'user',
                content: [{
                    type: 'input_audio',
                    input_audio: {
                        data: `data:${mimeType};base64,${base64Audio}`
                    }
                }]
            }],
            asr_options: { language: 'zh' }
        });

        const response = await fetch('/api/proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'X-Target-URL': targetUrl
            },
            body: body
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`转写失败 (${response.status}): ${errBody.substring(0, 200)}`);
        }

        onProgress('正在解析转写结果...', 80);
        const data = await response.json();

        let transcript = '';
        if (data.choices && data.choices[0]) {
            transcript = data.choices[0].message?.content || data.choices[0].text || '';
        } else if (data.content) {
            transcript = data.content;
        }

        if (!transcript) {
            throw new Error('ASR 返回结果为空');
        }

        onProgress('转写完成', 95);
        return transcript.trim();
    }

    async transcribeWhisper(file, onProgress) {
        onProgress('正在上传音频文件...', 20);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('model', this.model || 'whisper-1');
        formData.append('language', 'zh');
        formData.append('response_format', 'text');

        const targetUrl = this.getTranscriptionUrl();

        const response = await fetch('/api/proxy', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'X-Target-URL': targetUrl
            },
            body: formData
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`转写失败 (${response.status}): ${errBody.substring(0, 200)}`);
        }

        onProgress('正在解析转写结果...', 80);

        const contentType = response.headers.get('Content-Type') || '';
        let transcript;

        if (contentType.includes('application/json')) {
            const data = await response.json();
            transcript = data.text || data.result || JSON.stringify(data);
        } else {
            transcript = await response.text();
        }

        onProgress('转写完成', 95);
        return transcript.trim();
    }
}

const whisperSTT = new WhisperSTT();
