/**
 * 用户会话管理器
 * 管理用户会话、认证状态和权限控制
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');

class SessionManager extends EventEmitter {
    constructor() {
        super();
        this.sessions = new Map(); // 存储活跃会话
        this.userSessions = new Map(); // 用户ID到会话ID的映射
        this.sessionTimeout = 24 * 60 * 60 * 1000; // 24小时超时
        this.cleanupInterval = null;
        
        console.log('✅ 用户会话管理器初始化完成');
    }

    /**
     * 启动会话管理器
     */
    start() {
        // 启动定期清理过期会话
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredSessions();
        }, 60 * 1000); // 每分钟检查一次

        console.log('🚀 用户会话管理器启动');
        this.emit('session_manager_started');
    }

    /**
     * 停止会话管理器
     */
    stop() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        console.log('🛑 用户会话管理器已停止');
        this.emit('session_manager_stopped');
    }

    /**
     * 创建新会话
     */
    createSession(userId, userInfo = {}) {
        try {
            // 生成会话ID
            const sessionId = this.generateSessionId();
            
            // 检查用户是否已有活跃会话
            const existingSessionId = this.userSessions.get(userId);
            if (existingSessionId) {
                // 清理旧会话
                this.destroySession(existingSessionId);
            }

            // 创建会话数据
            const session = {
                sessionId,
                userId,
                userInfo: {
                    username: userInfo.username || `user_${userId}`,
                    email: userInfo.email || null,
                    role: userInfo.role || 'user',
                    permissions: userInfo.permissions || ['read', 'write'],
                    ...userInfo
                },
                createdAt: new Date(),
                lastAccessedAt: new Date(),
                expiresAt: new Date(Date.now() + this.sessionTimeout),
                isActive: true,
                connectionId: null,
                instanceId: null,
                metadata: {}
            };

            // 存储会话
            this.sessions.set(sessionId, session);
            this.userSessions.set(userId, sessionId);

            console.log(`✅ 创建用户会话: ${userId} -> ${sessionId}`);
            this.emit('session_created', { sessionId, userId, session });

            return {
                success: true,
                sessionId,
                session: this.sanitizeSession(session)
            };

        } catch (error) {
            console.error('❌ 创建会话失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 验证会话
     */
    validateSession(sessionId) {
        try {
            const session = this.sessions.get(sessionId);
            
            if (!session) {
                return {
                    valid: false,
                    error: '会话不存在'
                };
            }

            if (!session.isActive) {
                return {
                    valid: false,
                    error: '会话已失效'
                };
            }

            if (new Date() > session.expiresAt) {
                this.destroySession(sessionId);
                return {
                    valid: false,
                    error: '会话已过期'
                };
            }

            // 更新最后访问时间
            session.lastAccessedAt = new Date();

            return {
                valid: true,
                session: this.sanitizeSession(session)
            };

        } catch (error) {
            console.error('❌ 验证会话失败:', error);
            return {
                valid: false,
                error: error.message
            };
        }
    }

    /**
     * 更新会话信息
     */
    updateSession(sessionId, updates) {
        try {
            const session = this.sessions.get(sessionId);
            
            if (!session) {
                return {
                    success: false,
                    error: '会话不存在'
                };
            }

            // 允许更新的字段
            const allowedUpdates = ['connectionId', 'instanceId', 'metadata'];
            
            allowedUpdates.forEach(field => {
                if (updates.hasOwnProperty(field)) {
                    session[field] = updates[field];
                }
            });

            session.lastAccessedAt = new Date();

            console.log(`🔄 更新会话: ${sessionId}`);
            this.emit('session_updated', { sessionId, session, updates });

            return {
                success: true,
                session: this.sanitizeSession(session)
            };

        } catch (error) {
            console.error('❌ 更新会话失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 销毁会话
     */
    destroySession(sessionId) {
        try {
            const session = this.sessions.get(sessionId);
            
            if (!session) {
                return {
                    success: false,
                    error: '会话不存在'
                };
            }

            // 清理映射关系
            this.userSessions.delete(session.userId);
            this.sessions.delete(sessionId);

            console.log(`🗑️ 销毁会话: ${sessionId} (用户: ${session.userId})`);
            this.emit('session_destroyed', { sessionId, userId: session.userId });

            return {
                success: true,
                message: '会话已销毁'
            };

        } catch (error) {
            console.error('❌ 销毁会话失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 获取用户会话
     */
    getUserSession(userId) {
        const sessionId = this.userSessions.get(userId);
        
        if (!sessionId) {
            return {
                found: false,
                error: '用户无活跃会话'
            };
        }

        const validation = this.validateSession(sessionId);
        
        if (!validation.valid) {
            return {
                found: false,
                error: validation.error
            };
        }

        return {
            found: true,
            sessionId,
            session: validation.session
        };
    }

    /**
     * 获取实例内的所有用户会话
     */
    getInstanceSessions(instanceId) {
        const instanceSessions = [];
        
        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.instanceId === instanceId && session.isActive) {
                const validation = this.validateSession(sessionId);
                if (validation.valid) {
                    instanceSessions.push({
                        sessionId,
                        userId: session.userId,
                        userInfo: session.userInfo,
                        joinedAt: session.metadata.joinedInstanceAt || session.createdAt
                    });
                }
            }
        }

        return instanceSessions;
    }

    /**
     * 用户加入实例
     */
    joinInstance(sessionId, instanceId) {
        const updateResult = this.updateSession(sessionId, {
            instanceId,
            metadata: {
                ...this.sessions.get(sessionId)?.metadata,
                joinedInstanceAt: new Date().toISOString()
            }
        });

        if (updateResult.success) {
            const session = this.sessions.get(sessionId);
            console.log(`🏠 用户加入实例: ${session.userId} -> ${instanceId}`);
            this.emit('user_joined_instance', { sessionId, userId: session.userId, instanceId });
        }

        return updateResult;
    }

    /**
     * 用户离开实例
     */
    leaveInstance(sessionId) {
        const session = this.sessions.get(sessionId);
        
        if (!session) {
            return {
                success: false,
                error: '会话不存在'
            };
        }

        const previousInstanceId = session.instanceId;
        
        const updateResult = this.updateSession(sessionId, {
            instanceId: null,
            metadata: {
                ...session.metadata,
                leftInstanceAt: new Date().toISOString()
            }
        });

        if (updateResult.success && previousInstanceId) {
            console.log(`🚪 用户离开实例: ${session.userId} <- ${previousInstanceId}`);
            this.emit('user_left_instance', { sessionId, userId: session.userId, instanceId: previousInstanceId });
        }

        return updateResult;
    }

    /**
     * 检查用户权限
     */
    checkPermission(sessionId, permission) {
        const validation = this.validateSession(sessionId);
        
        if (!validation.valid) {
            return {
                hasPermission: false,
                error: validation.error
            };
        }

        const session = validation.session;
        const hasPermission = session.userInfo.permissions.includes(permission) || 
                             session.userInfo.role === 'admin';

        return {
            hasPermission,
            userRole: session.userInfo.role,
            userPermissions: session.userInfo.permissions
        };
    }

    /**
     * 清理过期会话
     */
    cleanupExpiredSessions() {
        const now = new Date();
        let cleanedCount = 0;

        for (const [sessionId, session] of this.sessions.entries()) {
            if (now > session.expiresAt || !session.isActive) {
                this.destroySession(sessionId);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`🧹 清理了 ${cleanedCount} 个过期会话`);
            this.emit('sessions_cleaned', { count: cleanedCount });
        }
    }

    /**
     * 生成会话ID
     */
    generateSessionId() {
        return `sess_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
    }

    /**
     * 清理敏感信息
     */
    sanitizeSession(session) {
        return {
            sessionId: session.sessionId,
            userId: session.userId,
            userInfo: {
                username: session.userInfo.username,
                role: session.userInfo.role,
                permissions: session.userInfo.permissions
            },
            createdAt: session.createdAt,
            lastAccessedAt: session.lastAccessedAt,
            expiresAt: session.expiresAt,
            isActive: session.isActive,
            instanceId: session.instanceId
        };
    }

    /**
     * 获取会话统计信息
     */
    getStats() {
        const now = new Date();
        let activeSessions = 0;
        let expiredSessions = 0;
        const instanceDistribution = {};
        const roleDistribution = {};

        for (const [sessionId, session] of this.sessions.entries()) {
            if (now > session.expiresAt) {
                expiredSessions++;
            } else if (session.isActive) {
                activeSessions++;
                
                // 统计实例分布
                if (session.instanceId) {
                    instanceDistribution[session.instanceId] = 
                        (instanceDistribution[session.instanceId] || 0) + 1;
                }
                
                // 统计角色分布
                const role = session.userInfo.role;
                roleDistribution[role] = (roleDistribution[role] || 0) + 1;
            }
        }

        return {
            totalSessions: this.sessions.size,
            activeSessions,
            expiredSessions,
            instanceDistribution,
            roleDistribution,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 获取所有活跃会话
     */
    getActiveSessions() {
        const activeSessions = [];
        
        for (const [sessionId, session] of this.sessions.entries()) {
            const validation = this.validateSession(sessionId);
            if (validation.valid) {
                activeSessions.push(validation.session);
            }
        }

        return activeSessions;
    }
}

module.exports = SessionManager;
