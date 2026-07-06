class InterviewDB {
    constructor() {
        this.storagePath = '';
    }

    async init() {
        try {
            const resp = await fetch('/api/data/config');
            if (resp.ok) {
                const config = await resp.json();
                this.storagePath = config.storagePath || '';
            }
        } catch (err) {
            console.warn('Failed to load storage config:', err);
        }
    }

    async setStoragePath(path) {
        const resp = await fetch('/api/data/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storagePath: path })
        });
        if (!resp.ok) {
            const error = await resp.json();
            throw new Error(error.error || 'Failed to set storage path');
        }
        const result = await resp.json();
        this.storagePath = result.storagePath;
        return result;
    }

    async getStoragePath() {
        const resp = await fetch('/api/data/config');
        if (!resp.ok) throw new Error('Failed to get config');
        const config = await resp.json();
        return config.storagePath || '';
    }

    async addInterview(interview) {
        const resp = await fetch('/api/data/interviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(interview)
        });
        if (!resp.ok) {
            const error = await resp.json();
            throw new Error(error.error || 'Failed to save interview');
        }
        return resp.json();
    }

    async getAllInterviews() {
        const resp = await fetch('/api/data/interviews');
        if (!resp.ok) throw new Error('Failed to load interviews');
        return resp.json();
    }

    async deleteInterview(id) {
        const resp = await fetch(`/api/data/interviews?id=${encodeURIComponent(id)}`, {
            method: 'DELETE'
        });
        if (!resp.ok) {
            const error = await resp.json();
            throw new Error(error.error || 'Failed to delete interview');
        }
        return resp.json();
    }

    async saveAudioFile(id, file) {
        const ext = file.name.split('.').pop().toLowerCase();
        const resp = await fetch('/api/data/audio', {
            method: 'POST',
            headers: {
                'X-Audio-ID': id,
                'X-Audio-Ext': ext
            },
            body: file
        });
        if (!resp.ok) {
            const error = await resp.json();
            throw new Error(error.error || 'Failed to save audio file');
        }
        return resp.json();
    }

    async clearAll() {
        const resp = await fetch('/api/data/clear', { method: 'POST' });
        if (!resp.ok) {
            const error = await resp.json();
            throw new Error(error.error || 'Failed to clear data');
        }
        return resp.json();
    }

    async exportAll() {
        const interviews = await this.getAllInterviews();
        return JSON.stringify(interviews, null, 2);
    }

    async importData(jsonStr) {
        const interviews = JSON.parse(jsonStr);
        const resp = await fetch('/api/data/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(interviews)
        });
        if (!resp.ok) {
            const error = await resp.json();
            throw new Error(error.error || 'Failed to import data');
        }
        return resp.json();
    }
}

const db = new InterviewDB();
