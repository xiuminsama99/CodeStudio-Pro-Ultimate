/**
 * API管理器 - 统一管理所有API调用
 * 负责处理与后端的所有通信
 */
class ApiManager {
    constructor(baseUrl, instanceId) {
        this.baseUrl = baseUrl || 'http://localhost:8180';
        this.instanceId = instanceId || '1';
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'X-Instance-ID': this.instanceId,
            'Accept': 'application/json'
        };
    }
    
    /**
     * 统一的API请求方法
     * @param {string} endpoint - API端点
     * @param {object} options - 请求选项
     * @returns {Promise} API响应
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            method: 'GET',
            headers: { ...this.defaultHeaders, ...options.headers },
            ...options
        };
        
        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error?.message || '操作失败');
            }
            
            return result.data;
            
        } catch (error) {
            console.error('API调用失败:', error);
            throw error;
        }
    }
    
    // 系统状态API
    async getSystemStatus() {
        return await this.request('/api/system-status');
    }
    
    async checkSystemHealth() {
        return await this.request('/api/system-check', { method: 'POST' });
    }
    
    // 路径管理API
    async getPathInfo(options = {}) {
        const params = new URLSearchParams(options);
        return await this.request(`/api/path-info?${params}`);
    }
    
    async validatePaths(options = {}) {
        return await this.request('/api/path-validate', {
            method: 'POST',
            body: JSON.stringify(options)
        });
    }
    
    async getProjectStructure(options = {}) {
        const params = new URLSearchParams(options);
        return await this.request(`/api/project-structure?${params}`);
    }
    
    async runPathTest(config = {}) {
        return await this.request('/api/path-test', {
            method: 'POST',
            body: JSON.stringify(config)
        });
    }
    
    // 应用控制API
    async launchApp(options = {}) {
        return await this.request('/api/launch-app', {
            method: 'POST',
            body: JSON.stringify(options)
        });
    }
    
    async quickStart() {
        return await this.request('/api/quick-start', { method: 'POST' });
    }
    
    async directLaunch() {
        return await this.request('/api/direct-launch', { method: 'POST' });
    }
    
    async oneClickRefill() {
        return await this.request('/api/one-click-refill', { method: 'POST' });
    }
    
    // 清理操作API
    async lightClean() {
        return await this.request('/api/light-clean', { method: 'POST' });
    }
    
    async deepClean() {
        return await this.request('/api/deep-clean', { method: 'POST' });
    }
    
    async completeReset() {
        return await this.request('/api/complete-reset', { method: 'POST' });
    }
    
    // 插件管理API
    async fixPlugin(options = {}) {
        return await this.request('/api/fix-plugin', {
            method: 'POST',
            body: JSON.stringify(options)
        });
    }
    
    async getPluginStatus() {
        return await this.request('/api/plugin-status');
    }
}