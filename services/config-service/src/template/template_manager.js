/**
 * 配置模板管理器
 * 负责配置模板的创建、管理和应用
 */

const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class TemplateManager extends EventEmitter {
    constructor(options = {}) {
        super();
        this.templatesDir = options.templatesDir || path.join(__dirname, '../data/templates');
        this.templates = new Map(); // 模板缓存
        this.isInitialized = false;

        console.log('✅ 配置模板管理器初始化完成');
    }

    /**
     * 初始化模板管理器
     */
    async initialize() {
        try {
            // 确保模板目录存在
            await fs.mkdir(this.templatesDir, { recursive: true });

            // 设置初始化状态
            this.isInitialized = true;

            // 加载现有模板
            await this.loadTemplates();

            // 创建默认模板
            await this.createDefaultTemplates();

            console.log('🚀 配置模板管理器初始化成功');
            this.emit('template_manager_initialized');

            return { success: true };
        } catch (error) {
            console.error('❌ 模板管理器初始化失败:', error);
            this.isInitialized = false;
            return { success: false, error: error.message };
        }
    }

    /**
     * 加载现有模板
     */
    async loadTemplates() {
        try {
            const files = await fs.readdir(this.templatesDir);
            const templateFiles = files.filter(file => file.endsWith('.json'));

            for (const file of templateFiles) {
                const filePath = path.join(this.templatesDir, file);
                const data = await fs.readFile(filePath, 'utf8');
                const template = JSON.parse(data);

                this.templates.set(template.id, template);
            }

            console.log(`📥 加载了 ${templateFiles.length} 个模板`);
        } catch (error) {
            console.error('❌ 加载模板失败:', error);
            throw error;
        }
    }

    /**
     * 创建默认模板
     */
    async createDefaultTemplates() {
        try {
            const defaultTemplates = [
                {
                    id: 'basic-app',
                    name: '基础应用配置',
                    description: '适用于基础应用的配置模板',
                    category: 'application',
                    schema: {
                        app: {
                            name: { type: 'string', required: true, description: '应用名称' },
                            version: { type: 'string', required: true, description: '应用版本' },
                            debug: { type: 'boolean', default: false, description: '调试模式' },
                            port: { type: 'number', default: 3000, description: '端口号' }
                        },
                        database: {
                            host: { type: 'string', required: true, description: '数据库主机' },
                            port: { type: 'number', default: 5432, description: '数据库端口' },
                            name: { type: 'string', required: true, description: '数据库名称' },
                            ssl: { type: 'boolean', default: false, description: '启用SSL' }
                        }
                    },
                    defaults: {
                        'app.name': 'MyApp',
                        'app.version': '1.0.0',
                        'app.debug': false,
                        'app.port': 3000,
                        'database.host': 'localhost',
                        'database.port': 5432,
                        'database.name': 'myapp_db',
                        'database.ssl': false
                    }
                },
                {
                    id: 'microservice',
                    name: '微服务配置',
                    description: '适用于微服务架构的配置模板',
                    category: 'microservice',
                    schema: {
                        service: {
                            name: { type: 'string', required: true, description: '服务名称' },
                            version: { type: 'string', required: true, description: '服务版本' },
                            port: { type: 'number', required: true, description: '服务端口' },
                            healthCheck: { type: 'string', default: '/health', description: '健康检查路径' }
                        },
                        registry: {
                            enabled: { type: 'boolean', default: true, description: '启用服务注册' },
                            url: { type: 'string', required: true, description: '注册中心地址' },
                            timeout: { type: 'number', default: 5000, description: '超时时间' }
                        },
                        logging: {
                            level: { type: 'string', default: 'info', enum: ['debug', 'info', 'warn', 'error'], description: '日志级别' },
                            format: { type: 'string', default: 'json', enum: ['json', 'text'], description: '日志格式' }
                        }
                    },
                    defaults: {
                        'service.name': 'my-service',
                        'service.version': '1.0.0',
                        'service.port': 3001,
                        'service.healthCheck': '/health',
                        'registry.enabled': true,
                        'registry.url': 'http://localhost:8500',
                        'registry.timeout': 5000,
                        'logging.level': 'info',
                        'logging.format': 'json'
                    }
                }
            ];

            for (const template of defaultTemplates) {
                if (!this.templates.has(template.id)) {
                    await this.createTemplate(template);
                }
            }

            console.log('📋 默认模板创建完成');
        } catch (error) {
            console.error('❌ 创建默认模板失败:', error);
        }
    }

    /**
     * 创建模板
     */
    async createTemplate(templateData) {
        try {
            if (!this.isInitialized) {
                throw new Error('模板管理器未初始化');
            }

            const template = {
                id: templateData.id,
                name: templateData.name,
                description: templateData.description || '',
                category: templateData.category || 'general',
                schema: templateData.schema || {},
                defaults: templateData.defaults || {},
                metadata: {
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdBy: templateData.createdBy || 'system',
                    version: 1
                }
            };

            // 验证模板
            const validation = this.validateTemplate(template);
            if (!validation.valid) {
                throw new Error(`模板验证失败: ${validation.errors.join(', ')}`);
            }

            // 存储到内存缓存
            this.templates.set(template.id, template);

            // 持久化到文件
            await this.saveTemplate(template);

            console.log(`✅ 模板已创建: ${template.id}`);
            this.emit('template_created', { templateId: template.id, template });

            return {
                success: true,
                templateId: template.id,
                template: this.sanitizeTemplate(template)
            };

        } catch (error) {
            console.error(`❌ 创建模板失败 (${templateData.id}):`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 获取模板
     */
    async getTemplate(templateId) {
        try {
            if (!this.isInitialized) {
                throw new Error('模板管理器未初始化');
            }

            const template = this.templates.get(templateId);

            if (!template) {
                return {
                    success: false,
                    error: '模板不存在'
                };
            }

            console.log(`📥 获取模板: ${templateId}`);
            this.emit('template_retrieved', { templateId });

            return {
                success: true,
                templateId,
                template: this.sanitizeTemplate(template)
            };

        } catch (error) {
            console.error(`❌ 获取模板失败 (${templateId}):`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 获取所有模板
     */
    async getAllTemplates() {
        try {
            if (!this.isInitialized) {
                throw new Error('模板管理器未初始化');
            }

            const templates = {};
            for (const [id, template] of this.templates.entries()) {
                templates[id] = this.sanitizeTemplate(template);
            }

            console.log(`📋 获取所有模板: ${this.templates.size} 个`);
            this.emit('all_templates_retrieved', { count: this.templates.size });

            return {
                success: true,
                templates,
                count: this.templates.size
            };

        } catch (error) {
            console.error('❌ 获取所有模板失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 应用模板
     */
    async applyTemplate(templateId, overrides = {}) {
        try {
            if (!this.isInitialized) {
                throw new Error('模板管理器未初始化');
            }

            const template = this.templates.get(templateId);

            if (!template) {
                return {
                    success: false,
                    error: '模板不存在'
                };
            }

            // 合并默认值和覆盖值
            const configs = { ...template.defaults, ...overrides };

            // 验证配置
            const validation = this.validateConfigs(configs, template.schema);
            if (!validation.valid) {
                return {
                    success: false,
                    error: `配置验证失败: ${validation.errors.join(', ')}`
                };
            }

            console.log(`🔧 应用模板: ${templateId}`);
            this.emit('template_applied', { templateId, configs });

            return {
                success: true,
                templateId,
                configs,
                validation: validation.warnings
            };

        } catch (error) {
            console.error(`❌ 应用模板失败 (${templateId}):`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 删除模板
     */
    async deleteTemplate(templateId) {
        try {
            if (!this.isInitialized) {
                throw new Error('模板管理器未初始化');
            }

            if (!this.templates.has(templateId)) {
                return {
                    success: false,
                    error: '模板不存在'
                };
            }

            // 从内存删除
            this.templates.delete(templateId);

            // 删除文件
            await this.deleteTemplateFile(templateId);

            console.log(`🗑️ 模板已删除: ${templateId}`);
            this.emit('template_deleted', { templateId });

            return {
                success: true,
                message: '模板已删除'
            };

        } catch (error) {
            console.error(`❌ 删除模板失败 (${templateId}):`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 验证模板
     */
    validateTemplate(template) {
        const errors = [];

        if (!template.id || typeof template.id !== 'string') {
            errors.push('模板ID必须是非空字符串');
        }

        if (!template.name || typeof template.name !== 'string') {
            errors.push('模板名称必须是非空字符串');
        }

        if (!template.schema || typeof template.schema !== 'object') {
            errors.push('模板schema必须是对象');
        }

        if (!template.defaults || typeof template.defaults !== 'object') {
            errors.push('模板默认值必须是对象');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 验证配置
     */
    validateConfigs(configs, schema) {
        const errors = [];
        const warnings = [];

        // 简化的验证逻辑
        for (const [key, value] of Object.entries(configs)) {
            const schemaPath = this.getSchemaPath(key, schema);

            if (schemaPath) {
                if (schemaPath.required && (value === undefined || value === null)) {
                    errors.push(`必填字段 ${key} 不能为空`);
                }

                if (schemaPath.type && typeof value !== schemaPath.type) {
                    errors.push(`字段 ${key} 类型错误，期望 ${schemaPath.type}，实际 ${typeof value}`);
                }

                if (schemaPath.enum && !schemaPath.enum.includes(value)) {
                    errors.push(`字段 ${key} 值无效，必须是 ${schemaPath.enum.join(', ')} 之一`);
                }
            } else {
                warnings.push(`字段 ${key} 不在模板schema中`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 获取schema路径
     */
    getSchemaPath(key, schema) {
        const parts = key.split('.');
        let current = schema;

        for (const part of parts) {
            if (current && current[part]) {
                current = current[part];
            } else {
                return null;
            }
        }

        return current;
    }

    /**
     * 保存模板到文件
     */
    async saveTemplate(template) {
        try {
            const filename = `${template.id}.json`;
            const filePath = path.join(this.templatesDir, filename);

            await fs.writeFile(filePath, JSON.stringify(template, null, 2), 'utf8');
            console.log(`💾 模板已保存: ${filename}`);

        } catch (error) {
            console.error('❌ 保存模板文件失败:', error);
            throw error;
        }
    }

    /**
     * 删除模板文件
     */
    async deleteTemplateFile(templateId) {
        try {
            const filename = `${templateId}.json`;
            const filePath = path.join(this.templatesDir, filename);

            await fs.unlink(filePath);
            console.log(`🗑️ 模板文件已删除: ${filename}`);

        } catch (error) {
            console.error('❌ 删除模板文件失败:', error);
            throw error;
        }
    }

    /**
     * 清理敏感信息
     */
    sanitizeTemplate(template) {
        return {
            id: template.id,
            name: template.name,
            description: template.description,
            category: template.category,
            schema: template.schema,
            defaults: template.defaults,
            metadata: {
                createdAt: template.metadata.createdAt,
                updatedAt: template.metadata.updatedAt,
                version: template.metadata.version
            }
        };
    }

    /**
     * 获取统计信息
     */
    getStats() {
        const categoryStats = {};

        for (const template of this.templates.values()) {
            const category = template.category || 'general';
            categoryStats[category] = (categoryStats[category] || 0) + 1;
        }

        return {
            totalTemplates: this.templates.size,
            categoryStats,
            templatesDir: this.templatesDir,
            isInitialized: this.isInitialized,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 清理模板管理器
     */
    async cleanup() {
        try {
            this.templates.clear();
            this.isInitialized = false;

            console.log('🧹 模板管理器已清理');
            this.emit('template_manager_cleaned');

            return { success: true };

        } catch (error) {
            console.error('❌ 清理模板管理器失败:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = TemplateManager;
