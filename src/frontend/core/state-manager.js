/**
 * 状态管理器 - 集中管理应用状态
 * 负责状态的存储、更新和通知
 */
class StateManager {
    constructor() {
        this.state = {
            systemStatus: 'checking',
            pluginStatus: 'checking',
            configStatus: 'checking',
            lastOperation: null,
            logs: [],
            isLoading: false,
            errors: []
        };
        
        this.listeners = new Map();
        this.history = [];
        this.maxHistory = 50;
    }
    
    /**
     * 获取状态值
     * @param {string} key - 状态键名
     * @returns {any} 状态值
     */
    getState(key) {
        if (key) {
            return this.state[key];
        }
        return { ...this.state };
    }
    
    /**
     * 设置状态值
     * @param {string|object} key - 状态键名或状态对象
     * @param {any} value - 状态值
     * @param {boolean} notify - 是否通知监听器
     */
    setState(key, value, notify = true) {
        const oldState = { ...this.state };
        
        if (typeof key === 'object') {
            // 批量更新状态
            Object.assign(this.state, key);
        } else {
            // 单个状态更新
            this.state[key] = value;
        }
        
        // 记录状态变化历史
        this.addToHistory(oldState, this.state);
        
        if (notify) {
            if (typeof key === 'object') {
                // 通知所有变化的键
                Object.keys(key).forEach(k => {
                    this.notifyListeners(k, this.state[k]);
                });
            } else {
                this.notifyListeners(key, value);
            }
        }
    }
    
    /**
     * 订阅状态变化
     * @param {string} key - 状态键名
     * @param {function} callback - 回调函数
     * @returns {function} 取消订阅函数
     */
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        
        this.listeners.get(key).add(callback);
        
        // 返回取消订阅函数
        return () => {
            const keyListeners = this.listeners.get(key);
            if (keyListeners) {
                keyListeners.delete(callback);
                if (keyListeners.size === 0) {
                    this.listeners.delete(key);
                }
            }
        };
    }
    
    /**
     * 通知监听器
     * @param {string} key - 状态键名
     * @param {any} value - 新值
     */
    notifyListeners(key, value) {
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
            keyListeners.forEach(callback => {
                try {
                    callback(value, key);
                } catch (error) {
                    console.error('状态监听器执行错误:', error);
                }
            });
        }
        
        // 通知全局监听器
        const globalListeners = this.listeners.get('*');
        if (globalListeners) {
            globalListeners.forEach(callback => {
                try {
                    callback(value, key, this.state);
                } catch (error) {
                    console.error('全局状态监听器执行错误:', error);
                }
            });
        }
    }
    
    /**
     * 添加到历史记录
     * @param {object} oldState - 旧状态
     * @param {object} newState - 新状态
     */
    addToHistory(oldState, newState) {
        this.history.unshift({
            timestamp: Date.now(),
            oldState: oldState,
            newState: { ...newState }
        });
        
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(0, this.maxHistory);
        }
    }
    
    /**
     * 获取状态历史
     * @param {number} limit - 限制数量
     * @returns {array} 历史记录
     */
    getHistory(limit = 10) {
        return this.history.slice(0, limit);
    }
    
    /**
     * 重置状态
     * @param {object} initialState - 初始状态
     */
    reset(initialState = {}) {
        const defaultState = {
            systemStatus: 'checking',
            pluginStatus: 'checking',
            configStatus: 'checking',
            lastOperation: null,
            logs: [],
            isLoading: false,
            errors: []
        };
        
        this.state = { ...defaultState, ...initialState };
        this.history = [];
        
        // 通知所有监听器
        Object.keys(this.state).forEach(key => {
            this.notifyListeners(key, this.state[key]);
        });
    }
    
    /**
     * 添加日志
     * @param {string} level - 日志级别
     * @param {string} message - 日志消息
     */
    addLog(level, message) {
        const logEntry = {
            id: Date.now(),
            timestamp: new Date().toLocaleTimeString(),
            level: level,
            message: message
        };
        
        const logs = [...this.state.logs];
        logs.unshift(logEntry);
        
        // 限制日志数量
        if (logs.length > 100) {
            logs.splice(100);
        }
        
        this.setState('logs', logs);
        this.setState('lastOperation', `${logEntry.timestamp} ${level}`);
    }
    
    /**
     * 清空日志
     */
    clearLogs() {
        this.setState('logs', []);
    }
    
    /**
     * 设置加载状态
     * @param {boolean} loading - 是否加载中
     */
    setLoading(loading) {
        this.setState('isLoading', loading);
    }
    
    /**
     * 添加错误
     * @param {string|Error} error - 错误信息
     */
    addError(error) {
        const errorMessage = error instanceof Error ? error.message : error;
        const errors = [...this.state.errors];
        errors.unshift({
            id: Date.now(),
            message: errorMessage,
            timestamp: Date.now()
        });
        
        // 限制错误数量
        if (errors.length > 10) {
            errors.splice(10);
        }
        
        this.setState('errors', errors);
        this.addLog('ERROR', errorMessage);
    }
    
    /**
     * 清空错误
     */
    clearErrors() {
        this.setState('errors', []);
    }
}