/**
 * CodeStudio Pro Ultimate 主应用
 * 应用入口和初始化
 */
class CodeStudioApp {
    constructor() {
        this.config = {
            apiBaseUrl: this.getApiBaseUrl(),
            instanceId: this.getInstanceId(),
            updateInterval: 5000,
            version: '2.1.0'
        };
        
        this.components = {};
        this.services = {};
        
        this.init();
    }
    
    /**
     * 初始化应用
     */
    async init() {
        try {
            // 显示加载状态
            this.showLoading();
            
            // 初始化核心模块
            this.initCore();
            
            // 初始化服务
            this.initServices();
            
            // 初始化组件
            this.initComponents();
            
            // 绑定事件
            this.bindEvents();
            
            // 启动应用
            await this.start();
            
            // 隐藏加载状态
            this.hideLoading();
            
            console.log('CodeStudio Pro Ultimate 启动成功');
            
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.showError('应用初始化失败: ' + error.message);
        }
    }
    
    /**
     * 初始化核心模块
     */
    initCore() {
        this.apiManager = new ApiManager(this.config.apiBaseUrl, this.config.instanceId);
        this.stateManager = new StateManager();
        this.eventBus = new EventBus();
        
        // 全局状态监听
        this.stateManager.subscribe('*', (value, key, state) => {
            console.log(`状态变化: ${key} =`, value);
        });
    }
    
    /**
     * 初始化服务
     */
    initServices() {
        this.services.system = new SystemService(this.apiManager, this.stateManager);
        this.services.path = new PathService(this.apiManager, this.stateManager);
        this.services.app = new AppService(this.apiManager, this.stateManager);
    }
    
    /**
     * 初始化组件
     */
    initComponents() {
        // 状态面板
        this.components.statusPanel = new StatusPanel(
            document.getElementById('status-panel'),
            { 
                stateManager: this.stateManager,
                services: this.services
            }
        );
        
        // 日志面板
        this.components.logPanel = new LogPanel(
            document.getElementById('log-panel'),
            { 
                stateManager: this.stateManager,
                maxLogs: 100
            }
        );
        
        // 功能按钮
        this.components.actionButtons = new ActionButtons(
            {
                core: document.getElementById('core-actions'),
                system: document.getElementById('system-actions'),
                app: document.getElementById('app-actions'),
                path: document.getElementById('path-actions')
            },
            { 
                services: this.services,
                stateManager: this.stateManager
            }
        );
        
        // 工具面板
        this.components.toolsPanel = new ToolsPanel(
            document.getElementById('tools-panel'),
            { 
                stateManager: this.stateManager
            }
        );
    }
    
    /**
     * 绑定全局事件
     */
    bindEvents() {
        // 窗口关闭前保存状态
        window.addEventListener('beforeunload', () => {
            this.saveState();
        });
        
        // 错误处理
        window.addEventListener('error', (event) => {
            this.stateManager.addError(`JavaScript错误: ${event.error.message}`);
        });
        
        // 未处理的Promise拒绝
        window.addEventListener('unhandledrejection', (event) => {
            this.stateManager.addError(`未处理的Promise拒绝: ${event.reason}`);
        });
    }
    
    /**
     * 启动应用
     */
    async start() {
        // 恢复保存的状态
        this.restoreState();
        
        // 启动状态监控
        this.startStatusMonitoring();
        
        // 执行初始检查
        await this.performInitialCheck();
        
        // 记录启动日志
        this.stateManager.addLog('SUCCESS', '系统初始化完成');
        this.stateManager.addLog('INFO', `版本: ${this.config.version}`);
        this.stateManager.addLog('INFO', `实例ID: ${this.config.instanceId}`);
    }
    
    /**
     * 执行初始检查
     */
    async performInitialCheck() {
        try {
            this.stateManager.setLoading(true);
            this.stateManager.addLog('INFO', '正在检查系统状态...');
            
            // 检查系统状态
            const systemStatus = await this.services.system.getStatus();
            this.stateManager.setState('systemStatus', systemStatus.status || 'unknown');
            
            // 检查插件状态
            const pluginStatus = await this.services.system.getPluginStatus();
            this.stateManager.setState('pluginStatus', pluginStatus.status || 'unknown');
            
            this.stateManager.addLog('SUCCESS', '系统状态检查完成');
            
        } catch (error) {
            console.error('初始检查失败:', error);
            this.stateManager.addError('初始检查失败: ' + error.message);
            this.stateManager.setState('systemStatus', 'error');
        } finally {
            this.stateManager.setLoading(false);
        }
    }
    
    /**
     * 启动状态监控
     */
    startStatusMonitoring() {
        setInterval(async () => {
            try {
                const status = await this.services.system.getStatus();
                this.stateManager.setState('systemStatus', status.status, false);
            } catch (error) {
                // 静默处理监控错误
                console.warn('状态监控失败:', error);
            }
        }, this.config.updateInterval);
    }
    
    /**
     * 获取API基础URL
     */
    getApiBaseUrl() {
        const params = new URLSearchParams(window.location.search);
        const port = params.get('port') || '8180';
        return `http://localhost:${port}`;
    }
    
    /**
     * 获取实例ID
     */
    getInstanceId() {
        const params = new URLSearchParams(window.location.search);
        return params.get('instance') || '1';
    }
    
    /**
     * 保存状态到本地存储
     */
    saveState() {
        try {
            const stateToSave = {
                logs: this.stateManager.getState('logs').slice(0, 20), // 只保存最近20条日志
                lastOperation: this.stateManager.getState('lastOperation'),
                timestamp: Date.now()
            };
            
            localStorage.setItem('codestudio_state', JSON.stringify(stateToSave));
        } catch (error) {
            console.warn('保存状态失败:', error);
        }
    }
    
    /**
     * 从本地存储恢复状态
     */
    restoreState() {
        try {
            const savedState = localStorage.getItem('codestudio_state');
            if (savedState) {
                const state = JSON.parse(savedState);
                
                // 检查状态是否过期（24小时）
                if (Date.now() - state.timestamp < 24 * 60 * 60 * 1000) {
                    this.stateManager.setState('logs', state.logs || []);
                    this.stateManager.setState('lastOperation', state.lastOperation);
                }
            }
        } catch (error) {
            console.warn('恢复状态失败:', error);
        }
    }
    
    /**
     * 显示加载状态
     */
    showLoading() {
        document.body.classList.add('loading');
    }
    
    /**
     * 隐藏加载状态
     */
    hideLoading() {
        document.body.classList.remove('loading');
    }
    
    /**
     * 显示错误信息
     */
    showError(message) {
        // 这里可以显示一个错误对话框或通知
        console.error(message);
        alert(message);
    }
}

// 应用启动
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CodeStudioApp();
});

// 导出到全局
window.CodeStudioApp = CodeStudioApp;