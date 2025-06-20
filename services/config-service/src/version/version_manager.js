/**
 * 配置版本管理器
 * 负责配置的版本控制、历史记录和回滚功能
 */

const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class VersionManager extends EventEmitter {
    constructor(options = {}) {
        super();
        this.versionsDir = options.versionsDir || path.join(__dirname, '../data/versions');
        this.maxVersions = options.maxVersions || 50; // 最大保留版本数
        this.versions = new Map(); // 版本缓存 key -> [versions]
        this.isInitialized = false;
        
        console.log('✅ 配置版本管理器初始化完成');
    }

    /**
     * 初始化版本管理器
     */
    async initialize() {
        try {
            // 确保版本目录存在
            await fs.mkdir(this.versionsDir, { recursive: true });
            
            // 加载现有版本
            await this.loadVersions();
            
            this.isInitialized = true;
            console.log('🚀 配置版本管理器初始化成功');
            this.emit('version_manager_initialized');
            
            return { success: true };
        } catch (error) {
            console.error('❌ 版本管理器初始化失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 加载现有版本
     */
    async loadVersions() {
        try {
            const files = await fs.readdir(this.versionsDir);
            const versionFiles = files.filter(file => file.endsWith('.json'));
            
            for (const file of versionFiles) {
                const filePath = path.join(this.versionsDir, file);
                const data = await fs.readFile(filePath, 'utf8');
                const versionData = JSON.parse(data);
                
                const key = versionData.key;
                if (!this.versions.has(key)) {
                    this.versions.set(key, []);
                }
                this.versions.get(key).push(versionData);
            }
            
            // 按版本号排序
            for (const [key, versions] of this.versions.entries()) {
                versions.sort((a, b) => a.version - b.version);
            }
            
            console.log(`📥 加载了 ${versionFiles.length} 个版本记录`);
        } catch (error) {
            console.error('❌ 加载版本失败:', error);
            throw error;
        }
    }

    /**
     * 创建新版本
     */
    async createVersion(key, value, metadata = {}) {
        try {
            if (!this.isInitialized) {
                throw new Error('版本管理器未初始化');
            }

            if (!key || typeof key !== 'string') {
                throw new Error('配置键必须是非空字符串');
            }

            // 获取当前版本号
            const currentVersions = this.versions.get(key) || [];
            const nextVersion = currentVersions.length > 0 ? 
                Math.max(...currentVersions.map(v => v.version)) + 1 : 1;

            // 创建版本记录
            const versionRecord = {
                key,
                version: nextVersion,
                value,
                metadata: {
                    ...metadata,
                    createdAt: new Date().toISOString(),
                    createdBy: metadata.createdBy || 'system',
                    changeType: metadata.changeType || 'update',
                    description: metadata.description || `版本 ${nextVersion}`
                },
                checksum: this.calculateChecksum(value)
            };

            // 存储到内存缓存
            if (!this.versions.has(key)) {
                this.versions.set(key, []);
            }
            this.versions.get(key).push(versionRecord);

            // 持久化到文件
            await this.saveVersion(versionRecord);

            // 清理旧版本
            await this.cleanupOldVersions(key);

            console.log(`📝 创建版本: ${key} v${nextVersion}`);
            this.emit('version_created', { key, version: nextVersion, versionRecord });

            return {
                success: true,
                key,
                version: nextVersion,
                versionRecord: this.sanitizeVersion(versionRecord)
            };

        } catch (error) {
            console.error(`❌ 创建版本失败 (${key}):`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 获取版本历史
     */
    async getVersionHistory(key, options = {}) {
        try {
            if (!this.isInitialized) {
                throw new Error('版本管理器未初始化');
            }

            const versions = this.versions.get(key) || [];
            
            if (versions.length === 0) {
                return {
                    success: false,
                    error: '配置无版本历史'
                };
            }

            // 应用过滤选项
            let filteredVersions = [...versions];
            
            if (options.limit) {
                filteredVersions = filteredVersions.slice(-options.limit);
            }
            
            if (options.fromVersion) {
                filteredVersions = filteredVersions.filter(v => v.version >= options.fromVersion);
            }
            
            if (options.toVersion) {
                filteredVersions = filteredVersions.filter(v => v.version <= options.toVersion);
            }

            const sanitizedVersions = filteredVersions.map(v => this.sanitizeVersion(v));

            console.log(`📋 获取版本历史: ${key}, ${sanitizedVersions.length} 个版本`);
            this.emit('version_history_retrieved', { key, count: sanitizedVersions.length });

            return {
                success: true,
                key,
                versions: sanitizedVersions,
                totalVersions: versions.length,
                filteredCount: sanitizedVersions.length
            };

        } catch (error) {
            console.error(`❌ 获取版本历史失败 (${key}):`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 获取特定版本
     */
    async getVersion(key, version) {
        try {
            if (!this.isInitialized) {
                throw new Error('版本管理器未初始化');
            }

            const versions = this.versions.get(key) || [];
            const versionRecord = versions.find(v => v.version === version);

            if (!versionRecord) {
                return {
                    success: false,
                    error: '版本不存在'
                };
            }

            console.log(`📥 获取版本: ${key} v${version}`);
            this.emit('version_retrieved', { key, version });

            return {
                success: true,
                key,
                version,
                versionRecord: this.sanitizeVersion(versionRecord)
            };

        } catch (error) {
            console.error(`❌ 获取版本失败 (${key} v${version}):`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 获取最新版本
     */
    async getLatestVersion(key) {
        try {
            if (!this.isInitialized) {
                throw new Error('版本管理器未初始化');
            }

            const versions = this.versions.get(key) || [];
            
            if (versions.length === 0) {
                return {
                    success: false,
                    error: '配置无版本记录'
                };
            }

            const latestVersion = versions[versions.length - 1];

            console.log(`📥 获取最新版本: ${key} v${latestVersion.version}`);
            this.emit('latest_version_retrieved', { key, version: latestVersion.version });

            return {
                success: true,
                key,
                version: latestVersion.version,
                versionRecord: this.sanitizeVersion(latestVersion)
            };

        } catch (error) {
            console.error(`❌ 获取最新版本失败 (${key}):`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 回滚到指定版本
     */
    async rollbackToVersion(key, targetVersion, metadata = {}) {
        try {
            if (!this.isInitialized) {
                throw new Error('版本管理器未初始化');
            }

            const versions = this.versions.get(key) || [];
            const targetVersionRecord = versions.find(v => v.version === targetVersion);

            if (!targetVersionRecord) {
                return {
                    success: false,
                    error: '目标版本不存在'
                };
            }

            // 创建回滚版本（新版本，但值是旧版本的值）
            const rollbackResult = await this.createVersion(
                key, 
                targetVersionRecord.value, 
                {
                    ...metadata,
                    changeType: 'rollback',
                    rollbackFrom: versions[versions.length - 1]?.version,
                    rollbackTo: targetVersion,
                    description: `回滚到版本 ${targetVersion}`
                }
            );

            if (rollbackResult.success) {
                console.log(`🔄 回滚配置: ${key} 从 v${rollbackResult.rollbackFrom || 'latest'} 到 v${targetVersion}`);
                this.emit('version_rollback', { 
                    key, 
                    targetVersion, 
                    newVersion: rollbackResult.version,
                    rollbackFrom: rollbackResult.rollbackFrom
                });
            }

            return rollbackResult;

        } catch (error) {
            console.error(`❌ 回滚版本失败 (${key} -> v${targetVersion}):`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 比较版本差异
     */
    async compareVersions(key, version1, version2) {
        try {
            if (!this.isInitialized) {
                throw new Error('版本管理器未初始化');
            }

            const versions = this.versions.get(key) || [];
            const v1Record = versions.find(v => v.version === version1);
            const v2Record = versions.find(v => v.version === version2);

            if (!v1Record || !v2Record) {
                return {
                    success: false,
                    error: '版本不存在'
                };
            }

            const comparison = {
                key,
                version1: {
                    version: v1Record.version,
                    value: v1Record.value,
                    createdAt: v1Record.metadata.createdAt,
                    checksum: v1Record.checksum
                },
                version2: {
                    version: v2Record.version,
                    value: v2Record.value,
                    createdAt: v2Record.metadata.createdAt,
                    checksum: v2Record.checksum
                },
                identical: v1Record.checksum === v2Record.checksum,
                timeDiff: new Date(v2Record.metadata.createdAt) - new Date(v1Record.metadata.createdAt)
            };

            console.log(`🔍 比较版本: ${key} v${version1} vs v${version2}`);
            this.emit('versions_compared', { key, version1, version2, identical: comparison.identical });

            return {
                success: true,
                comparison
            };

        } catch (error) {
            console.error(`❌ 比较版本失败 (${key} v${version1} vs v${version2}):`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 删除版本
     */
    async deleteVersion(key, version) {
        try {
            if (!this.isInitialized) {
                throw new Error('版本管理器未初始化');
            }

            const versions = this.versions.get(key) || [];
            const versionIndex = versions.findIndex(v => v.version === version);

            if (versionIndex === -1) {
                return {
                    success: false,
                    error: '版本不存在'
                };
            }

            // 不允许删除最新版本
            if (versionIndex === versions.length - 1) {
                return {
                    success: false,
                    error: '不能删除最新版本'
                };
            }

            const versionRecord = versions[versionIndex];
            
            // 从内存删除
            versions.splice(versionIndex, 1);

            // 删除文件
            await this.deleteVersionFile(versionRecord);

            console.log(`🗑️ 删除版本: ${key} v${version}`);
            this.emit('version_deleted', { key, version });

            return {
                success: true,
                message: '版本已删除'
            };

        } catch (error) {
            console.error(`❌ 删除版本失败 (${key} v${version}):`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 保存版本到文件
     */
    async saveVersion(versionRecord) {
        try {
            const filename = `${versionRecord.key}_v${versionRecord.version}_${Date.now()}.json`;
            const filePath = path.join(this.versionsDir, filename);
            
            await fs.writeFile(filePath, JSON.stringify(versionRecord, null, 2), 'utf8');
            console.log(`💾 版本已保存: ${filename}`);

        } catch (error) {
            console.error('❌ 保存版本文件失败:', error);
            throw error;
        }
    }

    /**
     * 删除版本文件
     */
    async deleteVersionFile(versionRecord) {
        try {
            const files = await fs.readdir(this.versionsDir);
            const targetFile = files.find(file => 
                file.includes(`${versionRecord.key}_v${versionRecord.version}_`)
            );
            
            if (targetFile) {
                const filePath = path.join(this.versionsDir, targetFile);
                await fs.unlink(filePath);
                console.log(`🗑️ 版本文件已删除: ${targetFile}`);
            }

        } catch (error) {
            console.error('❌ 删除版本文件失败:', error);
            throw error;
        }
    }

    /**
     * 清理旧版本
     */
    async cleanupOldVersions(key) {
        try {
            const versions = this.versions.get(key) || [];
            
            if (versions.length <= this.maxVersions) {
                return;
            }

            const versionsToDelete = versions.splice(0, versions.length - this.maxVersions);
            
            for (const versionRecord of versionsToDelete) {
                await this.deleteVersionFile(versionRecord);
            }

            console.log(`🧹 清理旧版本: ${key}, 删除了 ${versionsToDelete.length} 个版本`);
            this.emit('old_versions_cleaned', { key, deletedCount: versionsToDelete.length });

        } catch (error) {
            console.error(`❌ 清理旧版本失败 (${key}):`, error);
        }
    }

    /**
     * 计算校验和
     */
    calculateChecksum(value) {
        const crypto = require('crypto');
        return crypto.createHash('md5').update(JSON.stringify(value)).digest('hex');
    }

    /**
     * 清理敏感信息
     */
    sanitizeVersion(versionRecord) {
        return {
            key: versionRecord.key,
            version: versionRecord.version,
            value: versionRecord.value,
            metadata: {
                createdAt: versionRecord.metadata.createdAt,
                createdBy: versionRecord.metadata.createdBy,
                changeType: versionRecord.metadata.changeType,
                description: versionRecord.metadata.description
            },
            checksum: versionRecord.checksum
        };
    }

    /**
     * 获取统计信息
     */
    getStats() {
        let totalVersions = 0;
        const keyStats = {};

        for (const [key, versions] of this.versions.entries()) {
            totalVersions += versions.length;
            keyStats[key] = {
                versionCount: versions.length,
                latestVersion: versions.length > 0 ? versions[versions.length - 1].version : 0,
                firstCreated: versions.length > 0 ? versions[0].metadata.createdAt : null,
                lastUpdated: versions.length > 0 ? versions[versions.length - 1].metadata.createdAt : null
            };
        }

        return {
            totalKeys: this.versions.size,
            totalVersions,
            maxVersionsPerKey: this.maxVersions,
            versionsDir: this.versionsDir,
            isInitialized: this.isInitialized,
            keyStats,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 清理版本管理器
     */
    async cleanup() {
        try {
            this.versions.clear();
            this.isInitialized = false;

            console.log('🧹 版本管理器已清理');
            this.emit('version_manager_cleaned');

            return { success: true };

        } catch (error) {
            console.error('❌ 清理版本管理器失败:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = VersionManager;
