/**
 * 多用户协作锁机制
 * 防止多个用户同时编辑同一资源，确保数据一致性
 */

const { EventEmitter } = require('events');

class CollaborationLock extends EventEmitter {
    constructor() {
        super();
        this.locks = new Map(); // 存储所有锁
        this.userLocks = new Map(); // 用户持有的锁映射
        this.lockTimeout = 5 * 60 * 1000; // 5分钟锁超时
        this.cleanupInterval = null;
        
        console.log('✅ 协作锁管理器初始化完成');
    }

    /**
     * 启动锁管理器
     */
    start() {
        // 启动定期清理过期锁
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredLocks();
        }, 30 * 1000); // 每30秒检查一次

        console.log('🚀 协作锁管理器启动');
        this.emit('lock_manager_started');
    }

    /**
     * 停止锁管理器
     */
    stop() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        console.log('🛑 协作锁管理器已停止');
        this.emit('lock_manager_stopped');
    }

    /**
     * 请求锁
     */
    requestLock(resourceId, userId, lockType = 'exclusive', metadata = {}) {
        try {
            const lockId = this.generateLockId();
            const now = new Date();

            // 检查资源是否已被锁定
            const existingLock = this.getLockByResource(resourceId);
            
            if (existingLock) {
                // 检查是否是同一用户
                if (existingLock.userId === userId) {
                    // 更新现有锁的过期时间
                    existingLock.expiresAt = new Date(now.getTime() + this.lockTimeout);
                    existingLock.lastAccessedAt = now;
                    
                    console.log(`🔄 更新锁: ${resourceId} by ${userId}`);
                    this.emit('lock_renewed', { lockId: existingLock.lockId, resourceId, userId });
                    
                    return {
                        success: true,
                        lockId: existingLock.lockId,
                        message: '锁已更新'
                    };
                }

                // 检查锁类型兼容性
                if (!this.isLockCompatible(existingLock, lockType)) {
                    return {
                        success: false,
                        error: '资源已被锁定',
                        lockedBy: existingLock.userId,
                        lockType: existingLock.lockType,
                        expiresAt: existingLock.expiresAt
                    };
                }
            }

            // 创建新锁
            const lock = {
                lockId,
                resourceId,
                userId,
                lockType,
                metadata,
                createdAt: now,
                lastAccessedAt: now,
                expiresAt: new Date(now.getTime() + this.lockTimeout),
                isActive: true
            };

            // 存储锁
            this.locks.set(lockId, lock);
            
            // 更新用户锁映射
            if (!this.userLocks.has(userId)) {
                this.userLocks.set(userId, new Set());
            }
            this.userLocks.get(userId).add(lockId);

            console.log(`🔒 创建锁: ${resourceId} by ${userId} (${lockType})`);
            this.emit('lock_acquired', { lockId, resourceId, userId, lockType });

            return {
                success: true,
                lockId,
                lock: this.sanitizeLock(lock)
            };

        } catch (error) {
            console.error('❌ 请求锁失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 释放锁
     */
    releaseLock(lockId, userId) {
        try {
            const lock = this.locks.get(lockId);
            
            if (!lock) {
                return {
                    success: false,
                    error: '锁不存在'
                };
            }

            if (lock.userId !== userId) {
                return {
                    success: false,
                    error: '无权释放此锁'
                };
            }

            // 删除锁
            this.locks.delete(lockId);
            
            // 更新用户锁映射
            if (this.userLocks.has(userId)) {
                this.userLocks.get(userId).delete(lockId);
                if (this.userLocks.get(userId).size === 0) {
                    this.userLocks.delete(userId);
                }
            }

            console.log(`🔓 释放锁: ${lock.resourceId} by ${userId}`);
            this.emit('lock_released', { lockId, resourceId: lock.resourceId, userId });

            return {
                success: true,
                message: '锁已释放'
            };

        } catch (error) {
            console.error('❌ 释放锁失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 强制释放锁（管理员权限）
     */
    forceReleaseLock(lockId, adminUserId) {
        try {
            const lock = this.locks.get(lockId);
            
            if (!lock) {
                return {
                    success: false,
                    error: '锁不存在'
                };
            }

            const originalUserId = lock.userId;
            
            // 删除锁
            this.locks.delete(lockId);
            
            // 更新用户锁映射
            if (this.userLocks.has(originalUserId)) {
                this.userLocks.get(originalUserId).delete(lockId);
                if (this.userLocks.get(originalUserId).size === 0) {
                    this.userLocks.delete(originalUserId);
                }
            }

            console.log(`⚡ 强制释放锁: ${lock.resourceId} by ${adminUserId} (原持有者: ${originalUserId})`);
            this.emit('lock_force_released', { 
                lockId, 
                resourceId: lock.resourceId, 
                originalUserId, 
                adminUserId 
            });

            return {
                success: true,
                message: '锁已强制释放'
            };

        } catch (error) {
            console.error('❌ 强制释放锁失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 检查资源锁状态
     */
    checkLockStatus(resourceId) {
        const lock = this.getLockByResource(resourceId);
        
        if (!lock) {
            return {
                locked: false,
                available: true
            };
        }

        // 检查锁是否过期
        if (new Date() > lock.expiresAt) {
            this.releaseLock(lock.lockId, lock.userId);
            return {
                locked: false,
                available: true
            };
        }

        return {
            locked: true,
            available: false,
            lock: this.sanitizeLock(lock)
        };
    }

    /**
     * 获取用户持有的所有锁
     */
    getUserLocks(userId) {
        const userLockIds = this.userLocks.get(userId);
        
        if (!userLockIds) {
            return [];
        }

        const locks = [];
        for (const lockId of userLockIds) {
            const lock = this.locks.get(lockId);
            if (lock && lock.isActive) {
                // 检查锁是否过期
                if (new Date() <= lock.expiresAt) {
                    locks.push(this.sanitizeLock(lock));
                } else {
                    // 清理过期锁
                    this.releaseLock(lockId, userId);
                }
            }
        }

        return locks;
    }

    /**
     * 获取资源的锁信息
     */
    getLockByResource(resourceId) {
        for (const [lockId, lock] of this.locks.entries()) {
            if (lock.resourceId === resourceId && lock.isActive) {
                return lock;
            }
        }
        return null;
    }

    /**
     * 检查锁兼容性
     */
    isLockCompatible(existingLock, requestedLockType) {
        // 独占锁不兼容任何其他锁
        if (existingLock.lockType === 'exclusive' || requestedLockType === 'exclusive') {
            return false;
        }

        // 共享锁可以与其他共享锁兼容
        if (existingLock.lockType === 'shared' && requestedLockType === 'shared') {
            return true;
        }

        return false;
    }

    /**
     * 续期锁
     */
    renewLock(lockId, userId) {
        try {
            const lock = this.locks.get(lockId);
            
            if (!lock) {
                return {
                    success: false,
                    error: '锁不存在'
                };
            }

            if (lock.userId !== userId) {
                return {
                    success: false,
                    error: '无权续期此锁'
                };
            }

            // 更新过期时间
            lock.expiresAt = new Date(Date.now() + this.lockTimeout);
            lock.lastAccessedAt = new Date();

            console.log(`⏰ 续期锁: ${lock.resourceId} by ${userId}`);
            this.emit('lock_renewed', { lockId, resourceId: lock.resourceId, userId });

            return {
                success: true,
                lock: this.sanitizeLock(lock)
            };

        } catch (error) {
            console.error('❌ 续期锁失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 清理过期锁
     */
    cleanupExpiredLocks() {
        const now = new Date();
        let cleanedCount = 0;

        for (const [lockId, lock] of this.locks.entries()) {
            if (now > lock.expiresAt) {
                this.releaseLock(lockId, lock.userId);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`🧹 清理了 ${cleanedCount} 个过期锁`);
            this.emit('locks_cleaned', { count: cleanedCount });
        }
    }

    /**
     * 释放用户的所有锁
     */
    releaseUserLocks(userId) {
        const userLockIds = this.userLocks.get(userId);
        
        if (!userLockIds) {
            return {
                success: true,
                releasedCount: 0
            };
        }

        let releasedCount = 0;
        const lockIds = Array.from(userLockIds);
        
        for (const lockId of lockIds) {
            const result = this.releaseLock(lockId, userId);
            if (result.success) {
                releasedCount++;
            }
        }

        console.log(`🔓 释放用户所有锁: ${userId} (${releasedCount}个)`);
        this.emit('user_locks_released', { userId, releasedCount });

        return {
            success: true,
            releasedCount
        };
    }

    /**
     * 生成锁ID
     */
    generateLockId() {
        return `lock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 清理敏感信息
     */
    sanitizeLock(lock) {
        return {
            lockId: lock.lockId,
            resourceId: lock.resourceId,
            userId: lock.userId,
            lockType: lock.lockType,
            createdAt: lock.createdAt,
            expiresAt: lock.expiresAt,
            metadata: lock.metadata
        };
    }

    /**
     * 获取锁统计信息
     */
    getStats() {
        const now = new Date();
        let activeLocks = 0;
        let expiredLocks = 0;
        const lockTypeDistribution = {};
        const resourceDistribution = {};

        for (const [lockId, lock] of this.locks.entries()) {
            if (now > lock.expiresAt) {
                expiredLocks++;
            } else if (lock.isActive) {
                activeLocks++;
                
                // 统计锁类型分布
                lockTypeDistribution[lock.lockType] = 
                    (lockTypeDistribution[lock.lockType] || 0) + 1;
                
                // 统计资源分布
                resourceDistribution[lock.resourceId] = 
                    (resourceDistribution[lock.resourceId] || 0) + 1;
            }
        }

        return {
            totalLocks: this.locks.size,
            activeLocks,
            expiredLocks,
            activeUsers: this.userLocks.size,
            lockTypeDistribution,
            resourceDistribution,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 获取所有活跃锁
     */
    getActiveLocks() {
        const activeLocks = [];
        const now = new Date();
        
        for (const [lockId, lock] of this.locks.entries()) {
            if (lock.isActive && now <= lock.expiresAt) {
                activeLocks.push(this.sanitizeLock(lock));
            }
        }

        return activeLocks;
    }
}

module.exports = CollaborationLock;
