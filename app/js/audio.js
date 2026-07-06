class AudioProcessor {
    constructor() {
        this.audioContext = null;
    }

    async processFile(file, onProgress) {
        onProgress('正在读取音频文件...', 10);

        const arrayBuffer = await file.arrayBuffer();
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        onProgress('正在解码音频...', 20);
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

        const duration = Math.round(audioBuffer.duration / 60);
        onProgress('正在转录录音...', 30);

        const transcript = await this.transcribe(audioBuffer, onProgress);

        return {
            duration,
            transcript
        };
    }

    async transcribe(audioBuffer, onProgress) {
        // Web Speech API不支持离线音频文件直接转录
        // 使用模拟转录 + 提示用户可手动编辑
        // 实际生产环境可接入本地Whisper模型或第三方API

        onProgress('正在进行语音识别...', 40);

        // 模拟转录过程的进度
        await this.delay(500);
        onProgress('正在分析音频片段...', 50);
        await this.delay(500);
        onProgress('正在识别说话人...', 60);
        await this.delay(500);

        // 返回提示信息，让用户知道需要手动输入或使用API
        return {
            raw: '',
            method: 'manual',
            message: '本地版本暂不支持自动语音转录。请手动粘贴面试转录文本，或在设置中配置AI服务API。'
        };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getDurationFromFile(file) {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.src = URL.createObjectURL(file);
            audio.addEventListener('loadedmetadata', () => {
                resolve(Math.round(audio.duration / 60));
                URL.revokeObjectURL(audio.src);
            });
            audio.addEventListener('error', () => {
                resolve(0);
            });
        });
    }
}

const audioProcessor = new AudioProcessor();