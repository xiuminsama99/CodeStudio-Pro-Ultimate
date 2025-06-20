/**
 * 配置热更新管理器
 * 负责配置的实时更新和通知机制
 */

const { EventEmitter } = require('events');
const WebSocket = require('ws');

class HotReloadManager extends EventEmitter {
    constructor(options = {}) {
        super();
        this.port = options.port || 3006;
        this.server = null;
        this.clients = new Map(); // 存储WebSocket客户端
        this.subscriptions = new Map(); // 存储订阅关系
        this.isRunning = false;
        
        console.log('✅ 配置热更新管理器初始化完成');
    }

    /**
     * 启动热更新服务
     */
    async start() {
        try {
            if (this.isRunning) {
                throw new Error('热更新服务已在运行');
            }

            // 创建WebSocket服务器
            this.server = new WebSocket.Server({ 
                port: this.port,
                perMessageDeflate: false
            });

            // 设置连接处理
            this.server.on('connection', (ws, request) => {
                this.handleConnection(ws, request);
            });

            this.server.on('error', (error) => {
                console.error('❌ 热更新服务器错误:', error);
                this.emit('server_error', error);
            });

            this.isRunning = true;
            console.log(`🚀 配置热更新服务启动在端口 ${this.port}`);
            this.emit('hot_reload_started', { port: this.port });

            return { success: true };

        } catch (error) {
            console.error('❌ 启动热更新服务失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 停止热更新服务
     */
    async stop() {
        try {
            if (!this.isRunning) {
                return { success: true };
            }

            // 关闭所有客户端连接
            this.clients.forEach((client, clientId) => {
                if (client.ws.readyState === WebSocket.OPEN) {
                    client.ws.close();
                }
            });

            // 关闭服务器
            if (this.server) {
                this.server.close();
            }

            this.clients.clear();
            this.subscriptions.clear();
            this.isRunning = false;

            console.log('🛑 配置热更新服务已停止');
            this.emit('hot_reload_stopped');

            return { success: true };

        } catch (error) {
            console.error('❌ 停止热更新服务失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 处理客户端连接
     */
    handleConnection(ws, request) {
        const clientId = this.generateClientId();
        const clientIP = request.socket.remoteAddress;

        console.log(`🔗 热更新客户端连接: ${clientId} from ${clientIP}`);

        // 存储客户端信息
        const client = {
            id: clientId,
            ws: ws,
            ip: clientIP,
            connectedAt: new Date(),
            subscriptions: new Set(),
            isAlive: true
        };

        this.clients.set(clientId, client);

        // 设置消息处理
        ws.on('message', (data) => {
            this.handleMessage(clientId, data);
        });

        ws.on('close', (code, reason) => {
            this.handleDisconnection(clientId, code, reason);
        });

        ws.on('error', (error) => {
            console.error(`❌ 客户端 ${clientId} 错误:`, error);
            this.handleDisconnection(clientId, 1006, 'Connection error');
        });

        ws.on('pong', () => {
            client.isAlive = true;
        });

        // 发送连接确认
        this.sendToClient(clientId, {
            type: 'connection_established',
            clientId: clientId,
            timestamp: new Date().toISOString()
        });

        this.emit('client_connected', { clientId, clientIP });
    }

    /**
     * 处理客户端消息
     */
    handleMessage(clientId, data) {
        try {
            const message = JSON.parse(data.toString());
            const client = this.clients.get(clientId);

            if (!client) {
                console.warn(`⚠️ 收到来自未知客户端的消息: ${clientId}`);
                return;
            }

            console.log(`📨 收到热更新消息 from ${clientId}:`, message.type);

            switch (message.type) {
                case 'subscribe':
                    this.handleSubscribe(clientId, message);
                    break;
                case 'unsubscribe':
                    this.handleUnsubscribe(clientId, message);
                    break;
                case 'ping':
                    this.handlePing(clientId, message);
                    break;
                default:
                    console.warn(`⚠️ 未知消息类型: ${message.type}`);
                    this.sendError(clientId, 'unknown_message_type', `未知消息类型: ${message.type}`);
            }

            this.emit('message_received', { clientId, message });

        } catch (error) {
            console.error(`❌ 解析消息失败 from ${clientId}:`, error);
            this.sendError(clientId, 'invalid_message', '消息格式无效');
        }
    }

    /**
     * 处理订阅请求
     */
    handleSubscribe(clientId, message) {
        const client = this.clients.get(clientId);
        const { configKeys } = message.data || {};

        if (!configKeys || !Array.isArray(configKeys)) {
            this.sendError(clientId, 'invalid_subscription', '配置键列表无效');
            return;
        }

        // 添加订阅
        configKeys.forEach(key => {
            client.subscriptions.add(key);
            
            if (!this.subscriptions.has(key)) {
                this.subscriptions.set(key, new Set());
            }
            this.subscriptions.get(key).add(clientId);
        });

        this.sendToClient(clientId, {
            type: 'subscribed',
            data: { configKeys },
            timestamp: new Date().toISOString()
        });

        console.log(`✅ 客户端 ${clientId} 订阅配置: ${configKeys.join(', ')}`);
        this.emit('client_subscribed', { clientId, configKeys });
    }

    /**
     * 处理取消订阅请求
     */
    handleUnsubscribe(clientId, message) {
        const client = this.clients.get(clientId);
        const { configKeys } = message.data || {};

        if (!configKeys || !Array.isArray(configKeys)) {
            this.sendError(clientId, 'invalid_unsubscription', '配置键列表无效');
            return;
        }

        // 移除订阅
        configKeys.forEach(key => {
            client.subscriptions.delete(key);
            
            if (this.subscriptions.has(key)) {
                this.subscriptions.get(key).delete(clientId);
                
                // 如果没有客户端订阅此配置，删除订阅记录
                if (this.subscriptions.get(key).size === 0) {
                    this.subscriptions.delete(key);
                }
            }
        });

        this.sendToClient(clientId, {
            type: 'unsubscribed',
            data: { configKeys },
            timestamp: new Date().toISOString()
        });

        console.log(`✅ 客户端 ${clientId} 取消订阅配置: ${configKeys.join(', ')}`);
        this.emit('client_unsubscribed', { clientId, configKeys });
    }

    /**
     * 处理ping消息
     */
    handlePing(clientId, message) {
        this.sendToClient(clientId, {
            type: 'pong',
            data: { timestamp: new Date().toISOString() }
        });
    }

    /**
     * 处理客户端断开连接
     */
    handleDisconnection(clientId, code, reason) {
        const client = this.clients.get(clientId);

        if (!client) {
            return;
        }

        console.log(`🔌 热更新客户端断开: ${clientId} (${code}: ${reason})`);

        // 清理订阅
        client.subscriptions.forEach(key => {
            if (this.subscriptions.has(key)) {
                this.subscriptions.get(key).delete(clientId);
                
                if (this.subscriptions.get(key).size === 0) {
                    this.subscriptions.delete(key);
                }
            }
        });

        // 删除客户端
        this.clients.delete(clientId);

        this.emit('client_disconnected', { clientId, code, reason });
    }

    /**
     * 通知配置更新
     */
    notifyConfigUpdate(configKey, newValue, oldValue = null, metadata = {}) {
        try {
            const subscribers = this.subscriptions.get(configKey);

            if (!subscribers || subscribers.size === 0) {
                console.log(`📡 配置更新通知: ${configKey} (无订阅者)`);
                return { success: true, notifiedClients: 0 };
            }

            const updateMessage = {
                type: 'config_updated',
                data: {
                    configKey,
                    newValue,
                    oldValue,
                    metadata: {
                        ...metadata,
                        updatedAt: new Date().toISOString()
                    }
                },
                timestamp: new Date().toISOString()
            };

            let notifiedClients = 0;
            subscribers.forEach(clientId => {
                if (this.sendToClient(clientId, updateMessage)) {
                    notifiedClients++;
                }
            });

            console.log(`📡 配置更新通知: ${configKey} -> ${notifiedClients} 个客户端`);
            this.emit('config_update_notified', { configKey, notifiedClients });

            return { success: true, notifiedClients };

        } catch (error) {
            console.error(`❌ 通知配置更新失败 (${configKey}):`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 批量通知配置更新
     */
    notifyBatchConfigUpdate(configUpdates) {
        try {
            const results = {};
            let totalNotified = 0;

            for (const [configKey, update] of Object.entries(configUpdates)) {
                const result = this.notifyConfigUpdate(
                    configKey, 
                    update.newValue, 
                    update.oldValue, 
                    update.metadata
                );
                
                results[configKey] = result;
                if (result.success) {
                    totalNotified += result.notifiedClients;
                }
            }

            console.log(`📡 批量配置更新通知: ${Object.keys(configUpdates).length} 项配置, ${totalNotified} 次通知`);
            this.emit('batch_config_update_notified', { 
                configCount: Object.keys(configUpdates).length, 
                totalNotified 
            });

            return { success: true, results, totalNotified };

        } catch (error) {
            console.error('❌ 批量通知配置更新失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 向客户端发送消息
     */
    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);

        if (!client || client.ws.readyState !== WebSocket.OPEN) {
            console.warn(`⚠️ 无法发送消息到客户端 ${clientId}: 连接不可用`);
            return false;
        }

        try {
            client.ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error(`❌ 发送消息失败到 ${clientId}:`, error);
            return false;
        }
    }

    /**
     * 发送错误消息
     */
    sendError(clientId, errorCode, errorMessage) {
        this.sendToClient(clientId, {
            type: 'error',
            error: {
                code: errorCode,
                message: errorMessage
            },
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 生成客户端ID
     */
    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 健康检查
     */
    startHealthCheck() {
        const interval = setInterval(() => {
            this.clients.forEach((client, clientId) => {
                if (!client.isAlive) {
                    console.log(`💀 客户端 ${clientId} 无响应，终止连接`);
                    client.ws.terminate();
                    return;
                }

                client.isAlive = false;
                client.ws.ping();
            });
        }, 30000); // 30秒检查一次

        return interval;
    }

    /**
     * 获取统计信息
     */
    getStats() {
        const subscriptionStats = {};
        for (const [key, subscribers] of this.subscriptions.entries()) {
            subscriptionStats[key] = subscribers.size;
        }

        return {
            isRunning: this.isRunning,
            port: this.port,
            totalClients: this.clients.size,
            totalSubscriptions: this.subscriptions.size,
            subscriptionStats,
            clients: Array.from(this.clients.values()).map(client => ({
                id: client.id,
                ip: client.ip,
                connectedAt: client.connectedAt,
                subscriptions: Array.from(client.subscriptions)
            })),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 清理热更新管理器
     */
    async cleanup() {
        try {
            await this.stop();
            console.log('🧹 配置热更新管理器已清理');
            this.emit('hot_reload_cleaned');
            return { success: true };
        } catch (error) {
            console.error('❌ 清理热更新管理器失败:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = HotReloadManager;
