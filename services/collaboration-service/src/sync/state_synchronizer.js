/**
 * 实时状态同步器
 * 负责同步实例状态、用户状态和系统状态
 */

const { EventEmitter } = require('events');

class StateSynchronizer extends EventEmitter {
    constructor(connectionManager) {
        super();
        this.connectionManager = connectionManager;
        this.instanceStates = new Map(); // 实例状态缓存
        this.userStates = new Map(); // 用户状态缓存
        this.systemState = { // 系统状态
            healthy: true,
            services: {},
            lastUpdate: new Date().toISOString()
        };
        
        this.syncInterval = null;
        this.isRunning = false;
        
        console.log('✅ 状态同步器初始化完成');
    }

    /**
     * 启动状态同步
     */
    start(intervalMs = 5000) {
        if (this.isRunning) {
            console.warn('⚠️ 状态同步器已在运行');
            return;
        }

        this.isRunning = true;
        
        // 定期同步状态
        this.syncInterval = setInterval(() => {
            this.syncAllStates();
        }, intervalMs);

        // 监听连接管理器事件
        this.setupConnectionListeners();

        console.log(`🚀 状态同步器启动，同步间隔: ${intervalMs}ms`);
        this.emit('synchronizer_started', { intervalMs });
    }

    /**
     * 停止状态同步
     */
    stop() {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }

        console.log('🛑 状态同步器已停止');
        this.emit('synchronizer_stopped');
    }

    /**
     * 设置连接管理器事件监听
     */
    setupConnectionListeners() {
        // 用户加入实例时同步状态
        this.connectionManager.on('user_joined_instance', ({ connectionId, userId, instanceId }) => {
            this.syncInstanceStateToUser(instanceId, connectionId);
            this.updateUserState(userId, { instanceId, status: 'active', lastSeen: new Date().toISOString() });
        });

        // 用户离开实例时更新状态
        this.connectionManager.on('user_left_instance', ({ connectionId, userId, instanceId }) => {
            this.updateUserState(userId, { instanceId: null, status: 'idle', lastSeen: new Date().toISOString() });
        });

        // 连接断开时清理状态
        this.connectionManager.on('connection_closed', ({ connectionId }) => {
            this.cleanupUserState(connectionId);
        });
    }

    /**
     * 同步所有状态
     */
    async syncAllStates() {
        try {
            await this.syncInstanceStates();
            await this.syncUserStates();
            await this.syncSystemState();
            
            this.emit('sync_completed', {
                timestamp: new Date().toISOString(),
                instanceCount: this.instanceStates.size,
                userCount: this.userStates.size
            });
        } catch (error) {
            console.error('❌ 状态同步失败:', error);
            this.emit('sync_error', error);
        }
    }

    /**
     * 同步实例状态
     */
    async syncInstanceStates() {
        try {
            // 模拟从Instance Service获取状态
            const mockInstanceStates = [
                {
                    id: 'instance-001',
                    status: 'running',
                    cpu_usage: Math.random() * 100,
                    memory_usage: Math.random() * 100,
                    last_update: new Date().toISOString()
                },
                {
                    id: 'instance-002',
                    status: 'stopped',
                    cpu_usage: 0,
                    memory_usage: 0,
                    last_update: new Date().toISOString()
                }
            ];

            // 更新实例状态缓存
            mockInstanceStates.forEach(instance => {
                const oldState = this.instanceStates.get(instance.id);
                this.instanceStates.set(instance.id, instance);

                // 如果状态发生变化，广播更新
                if (!oldState || this.hasStateChanged(oldState, instance)) {
                    this.broadcastInstanceStateUpdate(instance);
                }
            });

            console.log(`🔄 同步了 ${mockInstanceStates.length} 个实例状态`);
        } catch (error) {
            console.error('❌ 同步实例状态失败:', error);
            throw error;
        }
    }

    /**
     * 同步用户状态
     */
    async syncUserStates() {
        try {
            const stats = this.connectionManager.getStats();
            
            // 更新在线用户状态
            stats.connections.forEach(conn => {
                if (conn.userId) {
                    this.updateUserState(conn.userId, {
                        status: 'online',
                        instanceId: conn.instanceId,
                        lastSeen: new Date().toISOString(),
                        connectionId: conn.id
                    });
                }
            });

            // 清理离线用户
            this.cleanupOfflineUsers(stats.connections);

            console.log(`👥 同步了 ${stats.connections.length} 个用户状态`);
        } catch (error) {
            console.error('❌ 同步用户状态失败:', error);
            throw error;
        }
    }

    /**
     * 同步系统状态
     */
    async syncSystemState() {
        try {
            const stats = this.connectionManager.getStats();
            
            this.systemState = {
                healthy: true,
                services: {
                    websocket: {
                        status: 'running',
                        connections: stats.totalConnections,
                        rooms: stats.totalRooms
                    },
                    collaboration: {
                        status: 'running',
                        users: stats.totalUsers,
                        instances: this.instanceStates.size
                    }
                },
                lastUpdate: new Date().toISOString()
            };

            // 广播系统状态更新
            this.broadcastSystemStateUpdate();

            console.log('🖥️ 系统状态已同步');
        } catch (error) {
            console.error('❌ 同步系统状态失败:', error);
            throw error;
        }
    }

    /**
     * 更新用户状态
     */
    updateUserState(userId, stateUpdate) {
        const currentState = this.userStates.get(userId) || {};
        const newState = {
            ...currentState,
            ...stateUpdate,
            userId,
            lastUpdate: new Date().toISOString()
        };

        this.userStates.set(userId, newState);

        // 广播用户状态更新
        this.broadcastUserStateUpdate(newState);

        this.emit('user_state_updated', { userId, state: newState });
    }

    /**
     * 向实例内所有用户同步实例状态
     */
    syncInstanceStateToUser(instanceId, connectionId) {
        const instanceState = this.instanceStates.get(instanceId);
        
        if (instanceState) {
            this.connectionManager.sendToConnection(connectionId, {
                type: 'instance_state_sync',
                data: {
                    instanceId,
                    state: instanceState,
                    timestamp: new Date().toISOString()
                }
            });
        }
    }

    /**
     * 广播实例状态更新
     */
    broadcastInstanceStateUpdate(instanceState) {
        const roomId = `instance_${instanceState.id}`;
        
        this.connectionManager.broadcastToRoom(roomId, {
            type: 'instance_state_update',
            data: {
                instanceId: instanceState.id,
                state: instanceState,
                timestamp: new Date().toISOString()
            }
        });

        this.emit('instance_state_broadcasted', { instanceId: instanceState.id, state: instanceState });
    }

    /**
     * 广播用户状态更新
     */
    broadcastUserStateUpdate(userState) {
        if (userState.instanceId) {
            const roomId = `instance_${userState.instanceId}`;
            
            this.connectionManager.broadcastToRoom(roomId, {
                type: 'user_state_update',
                data: {
                    userId: userState.userId,
                    state: userState,
                    timestamp: new Date().toISOString()
                }
            }, userState.connectionId);
        }

        this.emit('user_state_broadcasted', { userId: userState.userId, state: userState });
    }

    /**
     * 广播系统状态更新
     */
    broadcastSystemStateUpdate() {
        const stats = this.connectionManager.getStats();
        
        // 向所有连接广播系统状态
        stats.connections.forEach(conn => {
            this.connectionManager.sendToConnection(conn.id, {
                type: 'system_state_update',
                data: {
                    systemState: this.systemState,
                    timestamp: new Date().toISOString()
                }
            });
        });

        this.emit('system_state_broadcasted', { state: this.systemState });
    }

    /**
     * 检查状态是否发生变化
     */
    hasStateChanged(oldState, newState) {
        // 简单的状态比较
        return (
            oldState.status !== newState.status ||
            Math.abs(oldState.cpu_usage - newState.cpu_usage) > 5 ||
            Math.abs(oldState.memory_usage - newState.memory_usage) > 5
        );
    }

    /**
     * 清理用户状态
     */
    cleanupUserState(connectionId) {
        // 查找并清理对应的用户状态
        for (const [userId, userState] of this.userStates.entries()) {
            if (userState.connectionId === connectionId) {
                this.userStates.delete(userId);
                console.log(`🧹 清理用户状态: ${userId}`);
                break;
            }
        }
    }

    /**
     * 清理离线用户
     */
    cleanupOfflineUsers(activeConnections) {
        const activeUserIds = new Set(
            activeConnections
                .filter(conn => conn.userId)
                .map(conn => conn.userId)
        );

        for (const userId of this.userStates.keys()) {
            if (!activeUserIds.has(userId)) {
                this.userStates.delete(userId);
                console.log(`🧹 清理离线用户: ${userId}`);
            }
        }
    }

    /**
     * 获取当前状态快照
     */
    getStateSnapshot() {
        return {
            instances: Object.fromEntries(this.instanceStates),
            users: Object.fromEntries(this.userStates),
            system: this.systemState,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 强制同步指定实例状态
     */
    async forceInstanceSync(instanceId) {
        try {
            // 模拟获取特定实例状态
            const instanceState = {
                id: instanceId,
                status: 'running',
                cpu_usage: Math.random() * 100,
                memory_usage: Math.random() * 100,
                last_update: new Date().toISOString()
            };

            this.instanceStates.set(instanceId, instanceState);
            this.broadcastInstanceStateUpdate(instanceState);

            console.log(`🔄 强制同步实例状态: ${instanceId}`);
            return instanceState;
        } catch (error) {
            console.error(`❌ 强制同步实例 ${instanceId} 失败:`, error);
            throw error;
        }
    }
}

module.exports = StateSynchronizer;
