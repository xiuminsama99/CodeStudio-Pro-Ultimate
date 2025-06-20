/**
 * 协同服务主应用
 * 提供WebSocket连接管理和实时协作功能
 */

const express = require('express');
const cors = require('cors');
const ConnectionManager = require('./websocket/connection_manager');
const StateSynchronizer = require('./sync/state_synchronizer');
const SessionManager = require('./session/session_manager');
const CollaborationLock = require('./lock/collaboration_lock');

const app = express();
const PORT = process.env.PORT || 3003;
const WS_PORT = process.env.WS_PORT || 3004;

// 中间件
app.use(cors());
app.use(express.json());

// 创建WebSocket连接管理器
const connectionManager = new ConnectionManager();

// 创建状态同步器
const stateSynchronizer = new StateSynchronizer(connectionManager);

// 创建会话管理器
const sessionManager = new SessionManager();

// 创建协作锁管理器
const collaborationLock = new CollaborationLock();

// 启动WebSocket服务器
connectionManager.start(WS_PORT);

// 启动状态同步器
stateSynchronizer.start(5000); // 5秒同步间隔

// 启动会话管理器
sessionManager.start();

// 启动协作锁管理器
collaborationLock.start();

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'collaboration-service',
        timestamp: new Date().toISOString(),
        websocket: {
            port: WS_PORT,
            stats: connectionManager.getStats()
        },
        synchronizer: {
            running: stateSynchronizer.isRunning,
            stateSnapshot: stateSynchronizer.getStateSnapshot()
        },
        sessionManager: {
            stats: sessionManager.getStats()
        },
        collaborationLock: {
            stats: collaborationLock.getStats()
        }
    });
});

// WebSocket统计信息端点
app.get('/api/websocket/stats', (req, res) => {
    try {
        const stats = connectionManager.getStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 向指定实例发送消息
app.post('/api/websocket/broadcast/:instanceId', (req, res) => {
    try {
        const { instanceId } = req.params;
        const { message, type = 'system_message' } = req.body;

        const roomId = `instance_${instanceId}`;
        const sentCount = connectionManager.broadcastToRoom(roomId, {
            type,
            data: {
                from: 'system',
                instanceId,
                content: message,
                timestamp: new Date().toISOString()
            }
        });

        res.json({
            success: true,
            data: {
                instanceId,
                sentCount,
                message: `消息已发送给 ${sentCount} 个连接`
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取实例在线用户
app.get('/api/websocket/instance/:instanceId/users', (req, res) => {
    try {
        const { instanceId } = req.params;
        const stats = connectionManager.getStats();

        const instanceUsers = stats.connections
            .filter(conn => conn.instanceId === instanceId && conn.userId)
            .map(conn => ({
                userId: conn.userId,
                connectedAt: conn.connectedAt
            }));

        res.json({
            success: true,
            data: {
                instanceId,
                users: instanceUsers,
                count: instanceUsers.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取状态快照
app.get('/api/sync/snapshot', (req, res) => {
    try {
        const snapshot = stateSynchronizer.getStateSnapshot();
        res.json({
            success: true,
            data: snapshot
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 强制同步实例状态
app.post('/api/sync/instance/:instanceId', (req, res) => {
    try {
        const { instanceId } = req.params;
        const instanceState = stateSynchronizer.forceInstanceSync(instanceId);

        res.json({
            success: true,
            data: {
                instanceId,
                state: instanceState,
                message: '实例状态强制同步完成'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取实例状态
app.get('/api/sync/instance/:instanceId/state', (req, res) => {
    try {
        const { instanceId } = req.params;
        const snapshot = stateSynchronizer.getStateSnapshot();
        const instanceState = snapshot.instances[instanceId];

        if (!instanceState) {
            return res.status(404).json({
                success: false,
                error: '实例状态未找到'
            });
        }

        res.json({
            success: true,
            data: {
                instanceId,
                state: instanceState
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 会话管理API
// 创建会话
app.post('/api/session/create', (req, res) => {
    try {
        const { userId, userInfo } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: '缺少用户ID'
            });
        }

        const result = sessionManager.createSession(userId, userInfo);

        if (result.success) {
            res.status(201).json({
                success: true,
                data: result
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 验证会话
app.get('/api/session/:sessionId/validate', (req, res) => {
    try {
        const { sessionId } = req.params;
        const validation = sessionManager.validateSession(sessionId);

        if (validation.valid) {
            res.json({
                success: true,
                data: {
                    valid: true,
                    session: validation.session
                }
            });
        } else {
            res.status(401).json({
                success: false,
                error: validation.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取会话信息
app.get('/api/session/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const validation = sessionManager.validateSession(sessionId);

        if (validation.valid) {
            res.json({
                success: true,
                data: validation.session
            });
        } else {
            res.status(404).json({
                success: false,
                error: validation.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 销毁会话
app.delete('/api/session/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const result = sessionManager.destroySession(sessionId);

        if (result.success) {
            res.json({
                success: true,
                message: result.message
            });
        } else {
            res.status(404).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取用户会话
app.get('/api/session/user/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const result = sessionManager.getUserSession(userId);

        if (result.found) {
            res.json({
                success: true,
                data: {
                    sessionId: result.sessionId,
                    session: result.session
                }
            });
        } else {
            res.status(404).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取实例内的用户会话
app.get('/api/session/instance/:instanceId/users', (req, res) => {
    try {
        const { instanceId } = req.params;
        const sessions = sessionManager.getInstanceSessions(instanceId);

        res.json({
            success: true,
            data: {
                instanceId,
                sessions,
                count: sessions.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取会话统计
app.get('/api/session/stats', (req, res) => {
    try {
        const stats = sessionManager.getStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 协作锁管理API
// 请求锁
app.post('/api/lock/request', (req, res) => {
    try {
        const { resourceId, userId, lockType = 'exclusive', metadata = {} } = req.body;

        if (!resourceId || !userId) {
            return res.status(400).json({
                success: false,
                error: '缺少资源ID或用户ID'
            });
        }

        const result = collaborationLock.requestLock(resourceId, userId, lockType, metadata);

        if (result.success) {
            res.status(201).json({
                success: true,
                data: result
            });
        } else {
            res.status(409).json({
                success: false,
                error: result.error,
                lockedBy: result.lockedBy,
                lockType: result.lockType,
                expiresAt: result.expiresAt
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 释放锁
app.delete('/api/lock/:lockId', (req, res) => {
    try {
        const { lockId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: '缺少用户ID'
            });
        }

        const result = collaborationLock.releaseLock(lockId, userId);

        if (result.success) {
            res.json({
                success: true,
                message: result.message
            });
        } else {
            res.status(404).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 检查资源锁状态
app.get('/api/lock/resource/:resourceId/status', (req, res) => {
    try {
        const { resourceId } = req.params;
        const status = collaborationLock.checkLockStatus(resourceId);

        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取用户持有的锁
app.get('/api/lock/user/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const locks = collaborationLock.getUserLocks(userId);

        res.json({
            success: true,
            data: {
                userId,
                locks,
                count: locks.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 续期锁
app.put('/api/lock/:lockId/renew', (req, res) => {
    try {
        const { lockId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: '缺少用户ID'
            });
        }

        const result = collaborationLock.renewLock(lockId, userId);

        if (result.success) {
            res.json({
                success: true,
                data: result.lock
            });
        } else {
            res.status(404).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 强制释放锁（管理员权限）
app.delete('/api/lock/:lockId/force', (req, res) => {
    try {
        const { lockId } = req.params;
        const { adminUserId } = req.body;

        if (!adminUserId) {
            return res.status(400).json({
                success: false,
                error: '缺少管理员用户ID'
            });
        }

        const result = collaborationLock.forceReleaseLock(lockId, adminUserId);

        if (result.success) {
            res.json({
                success: true,
                message: result.message
            });
        } else {
            res.status(404).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取锁统计信息
app.get('/api/lock/stats', (req, res) => {
    try {
        const stats = collaborationLock.getStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取所有活跃锁
app.get('/api/lock/active', (req, res) => {
    try {
        const locks = collaborationLock.getActiveLocks();
        res.json({
            success: true,
            data: {
                locks,
                count: locks.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 错误处理中间件
app.use((error, req, res, next) => {
    console.error('❌ 协同服务错误:', error);
    res.status(500).json({
        success: false,
        error: '内部服务器错误',
        message: error.message
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: '接口不存在',
        path: req.path
    });
});

// WebSocket事件监听
connectionManager.on('connection_established', ({ connectionId, clientIP }) => {
    console.log(`🔗 新连接: ${connectionId} from ${clientIP}`);
});

connectionManager.on('user_authenticated', ({ connectionId, userId }) => {
    console.log(`👤 用户认证: ${userId} (${connectionId})`);
});

connectionManager.on('user_joined_instance', ({ connectionId, userId, instanceId }) => {
    console.log(`🏠 用户加入实例: ${userId} -> ${instanceId}`);
});

connectionManager.on('user_left_instance', ({ connectionId, userId, instanceId }) => {
    console.log(`🚪 用户离开实例: ${userId} <- ${instanceId}`);
});

connectionManager.on('instance_message_sent', ({ connectionId, userId, instanceId, content }) => {
    console.log(`📢 实例消息: ${userId} @ ${instanceId}`);
});

connectionManager.on('connection_closed', ({ connectionId, code, reason }) => {
    console.log(`🔌 连接关闭: ${connectionId} (${code})`);
});

connectionManager.on('error', (error) => {
    console.error('❌ WebSocket服务器错误:', error);
});

// 状态同步器事件监听
stateSynchronizer.on('synchronizer_started', ({ intervalMs }) => {
    console.log(`🔄 状态同步器启动，间隔: ${intervalMs}ms`);
});

stateSynchronizer.on('sync_completed', ({ timestamp, instanceCount, userCount }) => {
    console.log(`✅ 状态同步完成: ${instanceCount}个实例, ${userCount}个用户`);
});

stateSynchronizer.on('sync_error', (error) => {
    console.error('❌ 状态同步错误:', error);
});

stateSynchronizer.on('instance_state_broadcasted', ({ instanceId }) => {
    console.log(`📡 实例状态已广播: ${instanceId}`);
});

stateSynchronizer.on('user_state_updated', ({ userId }) => {
    console.log(`👤 用户状态已更新: ${userId}`);
});

// 会话管理器事件监听
sessionManager.on('session_manager_started', () => {
    console.log('👥 会话管理器启动');
});

sessionManager.on('session_created', ({ sessionId, userId }) => {
    console.log(`🆕 创建会话: ${userId} -> ${sessionId}`);
});

sessionManager.on('session_destroyed', ({ sessionId, userId }) => {
    console.log(`🗑️ 销毁会话: ${userId} <- ${sessionId}`);
});

sessionManager.on('user_joined_instance', ({ sessionId, userId, instanceId }) => {
    console.log(`🏠 用户加入实例: ${userId} -> ${instanceId}`);
});

sessionManager.on('user_left_instance', ({ sessionId, userId, instanceId }) => {
    console.log(`🚪 用户离开实例: ${userId} <- ${instanceId}`);
});

sessionManager.on('sessions_cleaned', ({ count }) => {
    console.log(`🧹 清理了 ${count} 个过期会话`);
});

// 协作锁管理器事件监听
collaborationLock.on('lock_manager_started', () => {
    console.log('🔒 协作锁管理器启动');
});

collaborationLock.on('lock_acquired', ({ lockId, resourceId, userId, lockType }) => {
    console.log(`🔒 获取锁: ${resourceId} by ${userId} (${lockType})`);
});

collaborationLock.on('lock_released', ({ lockId, resourceId, userId }) => {
    console.log(`🔓 释放锁: ${resourceId} by ${userId}`);
});

collaborationLock.on('lock_force_released', ({ lockId, resourceId, originalUserId, adminUserId }) => {
    console.log(`⚡ 强制释放锁: ${resourceId} by ${adminUserId} (原持有者: ${originalUserId})`);
});

collaborationLock.on('lock_renewed', ({ lockId, resourceId, userId }) => {
    console.log(`⏰ 续期锁: ${resourceId} by ${userId}`);
});

collaborationLock.on('locks_cleaned', ({ count }) => {
    console.log(`🧹 清理了 ${count} 个过期锁`);
});

// 启动健康检查
const healthCheckInterval = connectionManager.startHealthCheck();

// 启动HTTP服务器
const server = app.listen(PORT, () => {
    console.log(`🚀 协同服务启动成功:`);
    console.log(`   HTTP服务: http://localhost:${PORT}`);
    console.log(`   WebSocket服务: ws://localhost:${WS_PORT}`);
    console.log(`   健康检查: http://localhost:${PORT}/health`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('📡 收到SIGTERM信号，开始优雅关闭...');

    clearInterval(healthCheckInterval);
    collaborationLock.stop();
    sessionManager.stop();
    stateSynchronizer.stop();
    connectionManager.stop();

    server.close(() => {
        console.log('✅ 协同服务已关闭');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('📡 收到SIGINT信号，开始优雅关闭...');

    clearInterval(healthCheckInterval);
    collaborationLock.stop();
    sessionManager.stop();
    stateSynchronizer.stop();
    connectionManager.stop();

    server.close(() => {
        console.log('✅ 协同服务已关闭');
        process.exit(0);
    });
});

module.exports = { app, connectionManager, stateSynchronizer, sessionManager, collaborationLock };
