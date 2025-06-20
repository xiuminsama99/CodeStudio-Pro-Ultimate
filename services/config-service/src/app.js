/**
 * 配置管理服务主应用
 * 提供配置存储、检索和管理功能
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const ConfigStorage = require('./storage/config_storage');
const VersionManager = require('./version/version_manager');
const TemplateManager = require('./template/template_manager');
const ConfigValidator = require('./validation/config_validator');
const HotReloadManager = require('./hotreload/hot_reload_manager');

const app = express();
const PORT = process.env.PORT || 3005;

// 中间件
app.use(cors());
app.use(express.json());

// 创建配置存储管理器
const configStorage = new ConfigStorage({
    storageDir: path.join(__dirname, 'data')
});

// 创建版本管理器
const versionManager = new VersionManager({
    versionsDir: path.join(__dirname, 'data/versions'),
    maxVersions: 50
});

// 创建模板管理器
const templateManager = new TemplateManager({
    templatesDir: path.join(__dirname, 'data/templates')
});

// 创建配置验证器
const configValidator = new ConfigValidator();

// 创建热更新管理器
const hotReloadManager = new HotReloadManager({
    port: process.env.HOT_RELOAD_PORT || 3006
});

// 初始化所有管理器
Promise.all([
    configStorage.initialize(),
    versionManager.initialize(),
    templateManager.initialize(),
    configValidator.initialize(),
    hotReloadManager.start()
]).then(results => {
    const [storageResult, versionResult, templateResult, validatorResult, hotReloadResult] = results;

    if (storageResult.success && versionResult.success && templateResult.success && validatorResult.success && hotReloadResult.success) {
        console.log('✅ 所有管理器初始化成功');
    } else {
        console.error('❌ 初始化失败:', {
            storage: storageResult.error,
            version: versionResult.error,
            template: templateResult.error,
            validator: validatorResult.error,
            hotReload: hotReloadResult.error
        });
        process.exit(1);
    }
});

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'config-service',
        timestamp: new Date().toISOString(),
        storage: configStorage.getStats(),
        versionManager: versionManager.getStats(),
        templateManager: templateManager.getStats(),
        configValidator: configValidator.getStats(),
        hotReloadManager: hotReloadManager.getStats()
    });
});

// 配置管理API

// 设置配置
app.post('/api/config', async (req, res) => {
    try {
        const { key, value, metadata } = req.body;

        if (!key) {
            return res.status(400).json({
                success: false,
                error: '缺少配置键'
            });
        }

        // 验证配置
        const validation = await configValidator.validateConfig(key, value);

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: '配置验证失败',
                validationErrors: validation.errors
            });
        }

        const result = await configStorage.setConfig(key, value, metadata);

        if (result.success) {
            // 创建版本记录
            const versionResult = await versionManager.createVersion(key, value, {
                ...metadata,
                createdBy: req.headers['x-user-id'] || 'system',
                changeType: 'create'
            });

            // 触发热更新通知
            hotReloadManager.notifyConfigUpdate(key, value, null, {
                ...metadata,
                version: versionResult.success ? versionResult.version : null,
                updatedBy: req.headers['x-user-id'] || 'system'
            });

            res.status(201).json({
                success: true,
                data: {
                    ...result,
                    version: versionResult.success ? versionResult.version : null,
                    validation: {
                        warnings: validation.warnings
                    }
                }
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

// 获取配置
app.get('/api/config/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const result = await configStorage.getConfig(key);

        if (result.success) {
            res.json({
                success: true,
                data: result
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

// 更新配置
app.put('/api/config/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const { value, metadata } = req.body;

        const result = await configStorage.setConfig(key, value, metadata);

        if (result.success) {
            // 创建版本记录
            const versionResult = await versionManager.createVersion(key, value, {
                ...metadata,
                createdBy: req.headers['x-user-id'] || 'system',
                changeType: 'update'
            });

            res.json({
                success: true,
                data: {
                    ...result,
                    version: versionResult.success ? versionResult.version : null
                }
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

// 删除配置
app.delete('/api/config/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const result = await configStorage.deleteConfig(key);

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

// 获取所有配置
app.get('/api/configs', async (req, res) => {
    try {
        const result = await configStorage.getAllConfigs();

        if (result.success) {
            res.json({
                success: true,
                data: result
            });
        } else {
            res.status(500).json({
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

// 搜索配置
app.get('/api/configs/search', async (req, res) => {
    try {
        const { pattern } = req.query;

        if (!pattern) {
            return res.status(400).json({
                success: false,
                error: '缺少搜索模式'
            });
        }

        const result = await configStorage.searchConfigs(pattern);

        if (result.success) {
            res.json({
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

// 批量设置配置
app.post('/api/configs/batch', async (req, res) => {
    try {
        const { configs } = req.body;

        if (!configs) {
            return res.status(400).json({
                success: false,
                error: '缺少配置数据'
            });
        }

        const result = await configStorage.setConfigs(configs);

        res.json({
            success: result.success,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 导出配置
app.post('/api/configs/export', async (req, res) => {
    try {
        const { exportPath } = req.body;

        if (!exportPath) {
            return res.status(400).json({
                success: false,
                error: '缺少导出路径'
            });
        }

        const result = await configStorage.exportConfigs(exportPath);

        if (result.success) {
            res.json({
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

// 导入配置
app.post('/api/configs/import', async (req, res) => {
    try {
        const { importPath } = req.body;

        if (!importPath) {
            return res.status(400).json({
                success: false,
                error: '缺少导入路径'
            });
        }

        const result = await configStorage.importConfigs(importPath);

        res.json({
            success: result.success,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取存储统计
app.get('/api/storage/stats', (req, res) => {
    try {
        const stats = configStorage.getStats();
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

// 版本管理API

// 获取配置版本历史
app.get('/api/config/:key/versions', async (req, res) => {
    try {
        const { key } = req.params;
        const { limit, fromVersion, toVersion } = req.query;

        const options = {};
        if (limit) options.limit = parseInt(limit);
        if (fromVersion) options.fromVersion = parseInt(fromVersion);
        if (toVersion) options.toVersion = parseInt(toVersion);

        const result = await versionManager.getVersionHistory(key, options);

        if (result.success) {
            res.json({
                success: true,
                data: result
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

// 获取特定版本
app.get('/api/config/:key/versions/:version', async (req, res) => {
    try {
        const { key, version } = req.params;
        const result = await versionManager.getVersion(key, parseInt(version));

        if (result.success) {
            res.json({
                success: true,
                data: result
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

// 获取最新版本
app.get('/api/config/:key/versions/latest', async (req, res) => {
    try {
        const { key } = req.params;
        const result = await versionManager.getLatestVersion(key);

        if (result.success) {
            res.json({
                success: true,
                data: result
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

// 回滚到指定版本
app.post('/api/config/:key/rollback/:version', async (req, res) => {
    try {
        const { key, version } = req.params;
        const { metadata } = req.body;

        const rollbackMetadata = {
            ...metadata,
            createdBy: req.headers['x-user-id'] || 'system'
        };

        const result = await versionManager.rollbackToVersion(key, parseInt(version), rollbackMetadata);

        if (result.success) {
            // 同时更新配置存储
            const versionRecord = await versionManager.getVersion(key, result.version);
            if (versionRecord.success) {
                await configStorage.setConfig(key, versionRecord.versionRecord.value);
            }

            res.json({
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

// 比较版本
app.get('/api/config/:key/compare/:version1/:version2', async (req, res) => {
    try {
        const { key, version1, version2 } = req.params;
        const result = await versionManager.compareVersions(
            key,
            parseInt(version1),
            parseInt(version2)
        );

        if (result.success) {
            res.json({
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

// 删除版本
app.delete('/api/config/:key/versions/:version', async (req, res) => {
    try {
        const { key, version } = req.params;
        const result = await versionManager.deleteVersion(key, parseInt(version));

        if (result.success) {
            res.json({
                success: true,
                message: result.message
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

// 获取版本统计
app.get('/api/versions/stats', (req, res) => {
    try {
        const stats = versionManager.getStats();
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

// 模板管理API

// 创建模板
app.post('/api/templates', async (req, res) => {
    try {
        const templateData = req.body;

        if (!templateData.id || !templateData.name) {
            return res.status(400).json({
                success: false,
                error: '缺少模板ID或名称'
            });
        }

        const result = await templateManager.createTemplate({
            ...templateData,
            createdBy: req.headers['x-user-id'] || 'system'
        });

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

// 获取模板
app.get('/api/templates/:templateId', async (req, res) => {
    try {
        const { templateId } = req.params;
        const result = await templateManager.getTemplate(templateId);

        if (result.success) {
            res.json({
                success: true,
                data: result
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

// 获取所有模板
app.get('/api/templates', async (req, res) => {
    try {
        const result = await templateManager.getAllTemplates();

        if (result.success) {
            res.json({
                success: true,
                data: result
            });
        } else {
            res.status(500).json({
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

// 应用模板
app.post('/api/templates/:templateId/apply', async (req, res) => {
    try {
        const { templateId } = req.params;
        const { overrides = {} } = req.body;

        const result = await templateManager.applyTemplate(templateId, overrides);

        if (result.success) {
            res.json({
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

// 删除模板
app.delete('/api/templates/:templateId', async (req, res) => {
    try {
        const { templateId } = req.params;
        const result = await templateManager.deleteTemplate(templateId);

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

// 获取模板统计
app.get('/api/templates/stats', (req, res) => {
    try {
        const stats = templateManager.getStats();
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

// 配置验证API

// 验证单个配置
app.post('/api/validate/config', async (req, res) => {
    try {
        const { key, value, rule } = req.body;

        if (!key) {
            return res.status(400).json({
                success: false,
                error: '缺少配置键'
            });
        }

        const result = await configValidator.validateConfig(key, value, rule);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 批量验证配置
app.post('/api/validate/configs', async (req, res) => {
    try {
        const { configs, rules } = req.body;

        if (!configs) {
            return res.status(400).json({
                success: false,
                error: '缺少配置数据'
            });
        }

        const result = await configValidator.validateConfigs(configs, rules);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 验证配置模式
app.post('/api/validate/schema', async (req, res) => {
    try {
        const { configs, schema } = req.body;

        if (!configs || !schema) {
            return res.status(400).json({
                success: false,
                error: '缺少配置数据或模式'
            });
        }

        const result = await configValidator.validateSchema(configs, schema);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 注册验证规则
app.post('/api/validation/rules', async (req, res) => {
    try {
        const { key, rule } = req.body;

        if (!key || !rule) {
            return res.status(400).json({
                success: false,
                error: '缺少验证规则键或规则'
            });
        }

        const result = configValidator.registerValidationRule(key, rule);

        if (result.success) {
            res.status(201).json({
                success: true,
                message: '验证规则已注册'
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

// 获取验证规则
app.get('/api/validation/rules/:key', (req, res) => {
    try {
        const { key } = req.params;
        const rule = configValidator.getValidationRule(key);

        if (rule) {
            res.json({
                success: true,
                data: { key, rule }
            });
        } else {
            res.status(404).json({
                success: false,
                error: '验证规则不存在'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取所有验证规则
app.get('/api/validation/rules', (req, res) => {
    try {
        const rules = configValidator.getAllValidationRules();
        res.json({
            success: true,
            data: {
                rules,
                count: Object.keys(rules).length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 删除验证规则
app.delete('/api/validation/rules/:key', (req, res) => {
    try {
        const { key } = req.params;
        const result = configValidator.removeValidationRule(key);

        if (result.success) {
            res.json({
                success: true,
                message: '验证规则已删除'
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

// 获取验证器统计
app.get('/api/validation/stats', (req, res) => {
    try {
        const stats = configValidator.getStats();
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

// 热更新管理API

// 获取热更新统计
app.get('/api/hotreload/stats', (req, res) => {
    try {
        const stats = hotReloadManager.getStats();
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

// 手动触发配置更新通知
app.post('/api/hotreload/notify', async (req, res) => {
    try {
        const { configKey, newValue, oldValue, metadata } = req.body;

        if (!configKey) {
            return res.status(400).json({
                success: false,
                error: '缺少配置键'
            });
        }

        const result = hotReloadManager.notifyConfigUpdate(configKey, newValue, oldValue, metadata);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 批量触发配置更新通知
app.post('/api/hotreload/notify-batch', async (req, res) => {
    try {
        const { configUpdates } = req.body;

        if (!configUpdates || typeof configUpdates !== 'object') {
            return res.status(400).json({
                success: false,
                error: '缺少配置更新数据'
            });
        }

        const result = hotReloadManager.notifyBatchConfigUpdate(configUpdates);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取订阅信息
app.get('/api/hotreload/subscriptions', (req, res) => {
    try {
        const stats = hotReloadManager.getStats();
        res.json({
            success: true,
            data: {
                totalSubscriptions: stats.totalSubscriptions,
                subscriptionStats: stats.subscriptionStats,
                totalClients: stats.totalClients
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
    console.error('❌ 配置服务错误:', error);
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

// 配置存储事件监听
configStorage.on('storage_initialized', () => {
    console.log('📦 配置存储已初始化');
});

configStorage.on('config_set', ({ key, version }) => {
    console.log(`📝 配置已设置: ${key} (版本: ${version})`);
});

configStorage.on('config_retrieved', ({ key }) => {
    console.log(`📥 配置已检索: ${key}`);
});

configStorage.on('config_deleted', ({ key }) => {
    console.log(`🗑️ 配置已删除: ${key}`);
});

configStorage.on('configs_saved', ({ count }) => {
    console.log(`💾 配置已保存: ${count} 项`);
});

configStorage.on('configs_exported', ({ exportPath, count }) => {
    console.log(`📤 配置已导出: ${count} 项 -> ${exportPath}`);
});

configStorage.on('configs_imported', ({ importPath, successCount, errorCount }) => {
    console.log(`📥 配置已导入: ${successCount} 成功, ${errorCount} 失败 <- ${importPath}`);
});

// 版本管理器事件监听
versionManager.on('version_manager_initialized', () => {
    console.log('📦 版本管理器已初始化');
});

versionManager.on('version_created', ({ key, version }) => {
    console.log(`📝 版本已创建: ${key} v${version}`);
});

versionManager.on('version_rollback', ({ key, targetVersion, newVersion }) => {
    console.log(`🔄 版本已回滚: ${key} 回滚到 v${targetVersion}, 新版本 v${newVersion}`);
});

versionManager.on('version_deleted', ({ key, version }) => {
    console.log(`🗑️ 版本已删除: ${key} v${version}`);
});

versionManager.on('old_versions_cleaned', ({ key, deletedCount }) => {
    console.log(`🧹 清理旧版本: ${key}, 删除了 ${deletedCount} 个版本`);
});

// 模板管理器事件监听
templateManager.on('template_manager_initialized', () => {
    console.log('📋 模板管理器已初始化');
});

templateManager.on('template_created', ({ templateId }) => {
    console.log(`📝 模板已创建: ${templateId}`);
});

templateManager.on('template_applied', ({ templateId }) => {
    console.log(`🔧 模板已应用: ${templateId}`);
});

templateManager.on('template_deleted', ({ templateId }) => {
    console.log(`🗑️ 模板已删除: ${templateId}`);
});

// 配置验证器事件监听
configValidator.on('validator_initialized', () => {
    console.log('🔍 配置验证器已初始化');
});

configValidator.on('validation_rule_registered', ({ key }) => {
    console.log(`📝 验证规则已注册: ${key}`);
});

configValidator.on('config_validated', ({ key, valid }) => {
    console.log(`🔍 配置已验证: ${key} - ${valid ? '通过' : '失败'}`);
});

configValidator.on('configs_validated', ({ configCount, valid, totalErrors }) => {
    console.log(`📋 批量验证完成: ${configCount} 项配置, ${valid ? '通过' : `失败(${totalErrors}个错误)`}`);
});

// 热更新管理器事件监听
hotReloadManager.on('hot_reload_started', ({ port }) => {
    console.log(`🔥 热更新服务已启动，端口: ${port}`);
});

hotReloadManager.on('client_connected', ({ clientId, clientIP }) => {
    console.log(`🔗 热更新客户端连接: ${clientId} from ${clientIP}`);
});

hotReloadManager.on('client_subscribed', ({ clientId, configKeys }) => {
    console.log(`📝 客户端订阅: ${clientId} -> ${configKeys.join(', ')}`);
});

hotReloadManager.on('config_update_notified', ({ configKey, notifiedClients }) => {
    console.log(`📡 配置更新通知: ${configKey} -> ${notifiedClients} 个客户端`);
});

hotReloadManager.on('client_disconnected', ({ clientId }) => {
    console.log(`🔌 热更新客户端断开: ${clientId}`);
});

// 启动HTTP服务器
const server = app.listen(PORT, () => {
    console.log(`🚀 配置管理服务启动成功:`);
    console.log(`   HTTP服务: http://localhost:${PORT}`);
    console.log(`   健康检查: http://localhost:${PORT}/health`);
    console.log(`   API文档: http://localhost:${PORT}/api/configs`);
});

// 优雅关闭
process.on('SIGTERM', async () => {
    console.log('📡 收到SIGTERM信号，开始优雅关闭...');

    await Promise.all([
        configStorage.cleanup(),
        versionManager.cleanup(),
        templateManager.cleanup(),
        configValidator.cleanup(),
        hotReloadManager.cleanup()
    ]);

    server.close(() => {
        console.log('✅ 配置管理服务已关闭');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('📡 收到SIGINT信号，开始优雅关闭...');

    await Promise.all([
        configStorage.cleanup(),
        versionManager.cleanup(),
        templateManager.cleanup(),
        configValidator.cleanup(),
        hotReloadManager.cleanup()
    ]);

    server.close(() => {
        console.log('✅ 配置管理服务已关闭');
        process.exit(0);
    });
});

module.exports = { app, configStorage, versionManager, templateManager, configValidator, hotReloadManager };
