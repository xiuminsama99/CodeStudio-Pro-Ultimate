/**
 * 配置存储和检索管理器
 * 负责配置数据的持久化存储和快速检索
 */

const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class ConfigStorage extends EventEmitter {
    constructor(options = {}) {
        super();
        this.storageDir = options.storageDir || path.join(__dirname, '../data');
        this.configFile = path.join(this.storageDir, 'configs.json');
        this.backupDir = path.join(this.storageDir, 'backups');
        this.configs = new Map(); // 内存缓存
        this.isInitialized = false;
        
        console.log('✅ 配置存储管理器初始化完成');
    }

    /**
     * 初始化存储
     */
    async initialize() {
        try {
            // 确保存储目录存在
            await this.ensureDirectories();
            
            // 加载现有配置
            await this.loadConfigs();
            
            this.isInitialized = true;
            console.log('🚀 配置存储管理器初始化成功');
            this.emit('storage_initialized');
            
            return { success: true };
        } catch (error) {
            console.error('❌ 配置存储初始化失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 确保目录存在
     */
    async ensureDirectories() {
        try {
            await fs.mkdir(this.storageDir, { recursive: true });
            await fs.mkdir(this.backupDir, { recursive: true });
            console.log('📁 存储目录创建完成');
        } catch (error) {
            console.error('❌ 创建存储目录失败:', error);
            throw error;
        }
    }

    /**
     * 加载配置文件
     */
    async loadConfigs() {
        try {
            const exists = await this.fileExists(this.configFile);
            
            if (exists) {
                const data = await fs.readFile(this.configFile, 'utf8');
                const configData = JSON.parse(data);
                
                // 加载到内存缓存
                this.configs.clear();
                for (const [key, value] of Object.entries(configData)) {
                    this.configs.set(key, value);
                }
                
                console.log(`📥 加载了 ${this.configs.size} 个配置项`);
            } else {
                // 创建空配置文件
                await this.saveConfigs();
                console.log('📄 创建了新的配置文件');
            }
        } catch (error) {
            console.error('❌ 加载配置失败:', error);
            throw error;
        }
    }

    /**
     * 保存配置到文件
     */
    async saveConfigs() {
        try {
            const configData = Object.fromEntries(this.configs);
            const jsonData = JSON.stringify(configData, null, 2);
            
            await fs.writeFile(this.configFile, jsonData, 'utf8');
            console.log('💾 配置已保存到文件');
            
            this.emit('configs_saved', { count: this.configs.size });
        } catch (error) {
            console.error('❌ 保存配置失败:', error);
            throw error;
        }
    }

    /**
     * 存储配置
     */
    async setConfig(key, value, metadata = {}) {
        try {
            if (!this.isInitialized) {
                throw new Error('存储未初始化');
            }

            if (!key || typeof key !== 'string') {
                throw new Error('配置键必须是非空字符串');
            }

            const configItem = {
                value,
                metadata: {
                    ...metadata,
                    createdAt: this.configs.has(key) ? 
                        this.configs.get(key).metadata.createdAt : 
                        new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    version: this.configs.has(key) ? 
                        (this.configs.get(key).metadata.version || 0) + 1 : 1
                }
            };

            // 备份旧值（如果存在）
            if (this.configs.has(key)) {
                await this.backupConfig(key, this.configs.get(key));
            }

            // 存储到内存缓存
            this.configs.set(key, configItem);

            // 持久化到文件
            await this.saveConfigs();

            console.log(`✅ 配置已存储: ${key}`);
            this.emit('config_set', { key, value, metadata: configItem.metadata });

            return {
                success: true,
                key,
                version: configItem.metadata.version
            };

        } catch (error) {
            console.error(`❌ 存储配置失败 (${key}):`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 检索配置
     */
    async getConfig(key) {
        try {
            if (!this.isInitialized) {
                throw new Error('存储未初始化');
            }

            if (!key || typeof key !== 'string') {
                throw new Error('配置键必须是非空字符串');
            }

            const configItem = this.configs.get(key);

            if (!configItem) {
                return {
                    success: false,
                    error: '配置不存在'
                };
            }

            console.log(`📥 检索配置: ${key}`);
            this.emit('config_retrieved', { key });

            return {
                success: true,
                key,
                value: configItem.value,
                metadata: configItem.metadata
            };

        } catch (error) {
            console.error(`❌ 检索配置失败 (${key}):`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 删除配置
     */
    async deleteConfig(key) {
        try {
            if (!this.isInitialized) {
                throw new Error('存储未初始化');
            }

            if (!this.configs.has(key)) {
                return {
                    success: false,
                    error: '配置不存在'
                };
            }

            // 备份被删除的配置
            await this.backupConfig(key, this.configs.get(key), 'deleted');

            // 从内存缓存删除
            this.configs.delete(key);

            // 持久化到文件
            await this.saveConfigs();

            console.log(`🗑️ 配置已删除: ${key}`);
            this.emit('config_deleted', { key });

            return {
                success: true,
                message: '配置已删除'
            };

        } catch (error) {
            console.error(`❌ 删除配置失败 (${key}):`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 获取所有配置
     */
    async getAllConfigs() {
        try {
            if (!this.isInitialized) {
                throw new Error('存储未初始化');
            }

            const configs = {};
            for (const [key, configItem] of this.configs.entries()) {
                configs[key] = {
                    value: configItem.value,
                    metadata: configItem.metadata
                };
            }

            console.log(`📋 检索所有配置: ${this.configs.size} 项`);
            this.emit('all_configs_retrieved', { count: this.configs.size });

            return {
                success: true,
                configs,
                count: this.configs.size
            };

        } catch (error) {
            console.error('❌ 检索所有配置失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 搜索配置
     */
    async searchConfigs(pattern) {
        try {
            if (!this.isInitialized) {
                throw new Error('存储未初始化');
            }

            const regex = new RegExp(pattern, 'i');
            const matchedConfigs = {};

            for (const [key, configItem] of this.configs.entries()) {
                if (regex.test(key)) {
                    matchedConfigs[key] = {
                        value: configItem.value,
                        metadata: configItem.metadata
                    };
                }
            }

            console.log(`🔍 搜索配置: ${pattern}, 找到 ${Object.keys(matchedConfigs).length} 项`);
            this.emit('configs_searched', { pattern, count: Object.keys(matchedConfigs).length });

            return {
                success: true,
                pattern,
                configs: matchedConfigs,
                count: Object.keys(matchedConfigs).length
            };

        } catch (error) {
            console.error(`❌ 搜索配置失败 (${pattern}):`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 批量设置配置
     */
    async setConfigs(configsData) {
        try {
            if (!this.isInitialized) {
                throw new Error('存储未初始化');
            }

            if (!configsData || typeof configsData !== 'object') {
                throw new Error('配置数据必须是对象');
            }

            const results = {};
            let successCount = 0;
            let errorCount = 0;

            for (const [key, value] of Object.entries(configsData)) {
                const result = await this.setConfig(key, value);
                results[key] = result;
                
                if (result.success) {
                    successCount++;
                } else {
                    errorCount++;
                }
            }

            console.log(`📦 批量设置配置: ${successCount} 成功, ${errorCount} 失败`);
            this.emit('configs_batch_set', { successCount, errorCount });

            return {
                success: errorCount === 0,
                results,
                successCount,
                errorCount
            };

        } catch (error) {
            console.error('❌ 批量设置配置失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 备份配置
     */
    async backupConfig(key, configItem, action = 'updated') {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(this.backupDir, `${key}_${timestamp}_${action}.json`);
            
            const backupData = {
                key,
                action,
                timestamp,
                config: configItem
            };

            await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2), 'utf8');
            console.log(`💾 配置已备份: ${key} -> ${backupFile}`);

        } catch (error) {
            console.error(`❌ 备份配置失败 (${key}):`, error);
            // 备份失败不应该阻止主操作
        }
    }

    /**
     * 检查文件是否存在
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 获取存储统计信息
     */
    getStats() {
        const stats = {
            totalConfigs: this.configs.size,
            storageDir: this.storageDir,
            configFile: this.configFile,
            backupDir: this.backupDir,
            isInitialized: this.isInitialized,
            memoryUsage: process.memoryUsage(),
            timestamp: new Date().toISOString()
        };

        return stats;
    }

    /**
     * 清理存储
     */
    async cleanup() {
        try {
            // 保存当前配置
            if (this.isInitialized) {
                await this.saveConfigs();
            }

            // 清空内存缓存
            this.configs.clear();
            this.isInitialized = false;

            console.log('🧹 配置存储已清理');
            this.emit('storage_cleaned');

            return { success: true };

        } catch (error) {
            console.error('❌ 清理存储失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 导出配置
     */
    async exportConfigs(exportPath) {
        try {
            if (!this.isInitialized) {
                throw new Error('存储未初始化');
            }

            const exportData = {
                exportedAt: new Date().toISOString(),
                version: '1.0',
                configs: Object.fromEntries(this.configs)
            };

            await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2), 'utf8');

            console.log(`📤 配置已导出到: ${exportPath}`);
            this.emit('configs_exported', { exportPath, count: this.configs.size });

            return {
                success: true,
                exportPath,
                count: this.configs.size
            };

        } catch (error) {
            console.error('❌ 导出配置失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 导入配置
     */
    async importConfigs(importPath) {
        try {
            if (!this.isInitialized) {
                throw new Error('存储未初始化');
            }

            const exists = await this.fileExists(importPath);
            if (!exists) {
                throw new Error('导入文件不存在');
            }

            const data = await fs.readFile(importPath, 'utf8');
            const importData = JSON.parse(data);

            if (!importData.configs) {
                throw new Error('无效的导入文件格式');
            }

            const result = await this.setConfigs(importData.configs);

            console.log(`📥 配置已导入: ${result.successCount} 成功, ${result.errorCount} 失败`);
            this.emit('configs_imported', { 
                importPath, 
                successCount: result.successCount, 
                errorCount: result.errorCount 
            });

            return result;

        } catch (error) {
            console.error('❌ 导入配置失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = ConfigStorage;
