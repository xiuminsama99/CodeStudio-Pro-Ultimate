/**
 * 配置验证器
 * 负责配置数据的验证、类型检查和约束验证
 */

const { EventEmitter } = require('events');

class ConfigValidator extends EventEmitter {
    constructor() {
        super();
        this.validationRules = new Map(); // 验证规则缓存
        this.customValidators = new Map(); // 自定义验证器
        this.isInitialized = false;
        
        console.log('✅ 配置验证器初始化完成');
    }

    /**
     * 初始化验证器
     */
    async initialize() {
        try {
            // 注册内置验证规则
            this.registerBuiltinValidators();
            
            this.isInitialized = true;
            console.log('🚀 配置验证器初始化成功');
            this.emit('validator_initialized');
            
            return { success: true };
        } catch (error) {
            console.error('❌ 配置验证器初始化失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 注册内置验证器
     */
    registerBuiltinValidators() {
        // 类型验证器
        this.customValidators.set('string', (value) => {
            return typeof value === 'string';
        });

        this.customValidators.set('number', (value) => {
            return typeof value === 'number' && !isNaN(value);
        });

        this.customValidators.set('boolean', (value) => {
            return typeof value === 'boolean';
        });

        this.customValidators.set('array', (value) => {
            return Array.isArray(value);
        });

        this.customValidators.set('object', (value) => {
            return typeof value === 'object' && value !== null && !Array.isArray(value);
        });

        // 格式验证器
        this.customValidators.set('email', (value) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return typeof value === 'string' && emailRegex.test(value);
        });

        this.customValidators.set('url', (value) => {
            try {
                new URL(value);
                return true;
            } catch {
                return false;
            }
        });

        this.customValidators.set('port', (value) => {
            return typeof value === 'number' && value >= 1 && value <= 65535;
        });

        this.customValidators.set('ip', (value) => {
            const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
            return typeof value === 'string' && ipRegex.test(value);
        });

        console.log('📋 内置验证器注册完成');
    }

    /**
     * 注册验证规则
     */
    registerValidationRule(key, rule) {
        try {
            if (!key || typeof key !== 'string') {
                throw new Error('验证规则键必须是非空字符串');
            }

            if (!rule || typeof rule !== 'object') {
                throw new Error('验证规则必须是对象');
            }

            this.validationRules.set(key, rule);
            
            console.log(`✅ 验证规则已注册: ${key}`);
            this.emit('validation_rule_registered', { key, rule });

            return { success: true };

        } catch (error) {
            console.error(`❌ 注册验证规则失败 (${key}):`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 注册自定义验证器
     */
    registerCustomValidator(name, validator) {
        try {
            if (!name || typeof name !== 'string') {
                throw new Error('验证器名称必须是非空字符串');
            }

            if (!validator || typeof validator !== 'function') {
                throw new Error('验证器必须是函数');
            }

            this.customValidators.set(name, validator);
            
            console.log(`✅ 自定义验证器已注册: ${name}`);
            this.emit('custom_validator_registered', { name });

            return { success: true };

        } catch (error) {
            console.error(`❌ 注册自定义验证器失败 (${name}):`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 验证单个配置
     */
    async validateConfig(key, value, rule = null) {
        try {
            if (!this.isInitialized) {
                throw new Error('验证器未初始化');
            }

            // 获取验证规则
            const validationRule = rule || this.validationRules.get(key);
            
            if (!validationRule) {
                return {
                    valid: true,
                    warnings: [`配置 ${key} 没有验证规则`]
                };
            }

            const errors = [];
            const warnings = [];

            // 必填验证
            if (validationRule.required && (value === undefined || value === null || value === '')) {
                errors.push(`配置 ${key} 是必填项`);
            }

            // 如果值为空且不是必填，跳过其他验证
            if (value === undefined || value === null) {
                return {
                    valid: errors.length === 0,
                    errors,
                    warnings
                };
            }

            // 类型验证
            if (validationRule.type) {
                const typeValidator = this.customValidators.get(validationRule.type);
                if (typeValidator && !typeValidator(value)) {
                    errors.push(`配置 ${key} 类型错误，期望 ${validationRule.type}`);
                }
            }

            // 枚举值验证
            if (validationRule.enum && Array.isArray(validationRule.enum)) {
                if (!validationRule.enum.includes(value)) {
                    errors.push(`配置 ${key} 值无效，必须是 ${validationRule.enum.join(', ')} 之一`);
                }
            }

            // 范围验证
            if (validationRule.min !== undefined && typeof value === 'number') {
                if (value < validationRule.min) {
                    errors.push(`配置 ${key} 值不能小于 ${validationRule.min}`);
                }
            }

            if (validationRule.max !== undefined && typeof value === 'number') {
                if (value > validationRule.max) {
                    errors.push(`配置 ${key} 值不能大于 ${validationRule.max}`);
                }
            }

            // 长度验证
            if (validationRule.minLength !== undefined && typeof value === 'string') {
                if (value.length < validationRule.minLength) {
                    errors.push(`配置 ${key} 长度不能小于 ${validationRule.minLength}`);
                }
            }

            if (validationRule.maxLength !== undefined && typeof value === 'string') {
                if (value.length > validationRule.maxLength) {
                    errors.push(`配置 ${key} 长度不能大于 ${validationRule.maxLength}`);
                }
            }

            // 正则表达式验证
            if (validationRule.pattern && typeof value === 'string') {
                const regex = new RegExp(validationRule.pattern);
                if (!regex.test(value)) {
                    errors.push(`配置 ${key} 格式不正确`);
                }
            }

            // 自定义验证器
            if (validationRule.validator && typeof validationRule.validator === 'string') {
                const customValidator = this.customValidators.get(validationRule.validator);
                if (customValidator && !customValidator(value)) {
                    errors.push(`配置 ${key} 自定义验证失败`);
                }
            }

            // 依赖验证
            if (validationRule.dependencies && Array.isArray(validationRule.dependencies)) {
                for (const dep of validationRule.dependencies) {
                    warnings.push(`配置 ${key} 依赖于 ${dep}`);
                }
            }

            console.log(`🔍 验证配置: ${key}, 结果: ${errors.length === 0 ? '通过' : '失败'}`);
            this.emit('config_validated', { key, value, valid: errors.length === 0, errors, warnings });

            return {
                valid: errors.length === 0,
                errors,
                warnings
            };

        } catch (error) {
            console.error(`❌ 验证配置失败 (${key}):`, error);
            return {
                valid: false,
                errors: [error.message],
                warnings: []
            };
        }
    }

    /**
     * 批量验证配置
     */
    async validateConfigs(configs, rules = null) {
        try {
            if (!this.isInitialized) {
                throw new Error('验证器未初始化');
            }

            if (!configs || typeof configs !== 'object') {
                throw new Error('配置数据必须是对象');
            }

            const results = {};
            let totalErrors = 0;
            let totalWarnings = 0;

            for (const [key, value] of Object.entries(configs)) {
                const rule = rules ? rules[key] : null;
                const result = await this.validateConfig(key, value, rule);
                
                results[key] = result;
                totalErrors += result.errors.length;
                totalWarnings += result.warnings.length;
            }

            const isValid = totalErrors === 0;

            console.log(`📋 批量验证配置: ${Object.keys(configs).length} 项, ${isValid ? '通过' : '失败'}`);
            this.emit('configs_validated', { 
                configCount: Object.keys(configs).length, 
                valid: isValid, 
                totalErrors, 
                totalWarnings 
            });

            return {
                valid: isValid,
                results,
                summary: {
                    totalConfigs: Object.keys(configs).length,
                    validConfigs: Object.values(results).filter(r => r.valid).length,
                    invalidConfigs: Object.values(results).filter(r => !r.valid).length,
                    totalErrors,
                    totalWarnings
                }
            };

        } catch (error) {
            console.error('❌ 批量验证配置失败:', error);
            return {
                valid: false,
                error: error.message,
                results: {},
                summary: {
                    totalConfigs: 0,
                    validConfigs: 0,
                    invalidConfigs: 0,
                    totalErrors: 1,
                    totalWarnings: 0
                }
            };
        }
    }

    /**
     * 验证配置模式
     */
    async validateSchema(configs, schema) {
        try {
            if (!this.isInitialized) {
                throw new Error('验证器未初始化');
            }

            const rules = this.extractRulesFromSchema(schema);
            return await this.validateConfigs(configs, rules);

        } catch (error) {
            console.error('❌ 验证配置模式失败:', error);
            return {
                valid: false,
                error: error.message,
                results: {},
                summary: {
                    totalConfigs: 0,
                    validConfigs: 0,
                    invalidConfigs: 0,
                    totalErrors: 1,
                    totalWarnings: 0
                }
            };
        }
    }

    /**
     * 从模式中提取验证规则
     */
    extractRulesFromSchema(schema) {
        const rules = {};

        const extractFromObject = (obj, prefix = '') => {
            for (const [key, value] of Object.entries(obj)) {
                const fullKey = prefix ? `${prefix}.${key}` : key;
                
                if (value && typeof value === 'object') {
                    if (value.type || value.required || value.enum) {
                        // 这是一个验证规则
                        rules[fullKey] = value;
                    } else {
                        // 这是一个嵌套对象，递归处理
                        extractFromObject(value, fullKey);
                    }
                }
            }
        };

        extractFromObject(schema);
        return rules;
    }

    /**
     * 获取验证规则
     */
    getValidationRule(key) {
        return this.validationRules.get(key);
    }

    /**
     * 获取所有验证规则
     */
    getAllValidationRules() {
        return Object.fromEntries(this.validationRules);
    }

    /**
     * 删除验证规则
     */
    removeValidationRule(key) {
        try {
            if (this.validationRules.has(key)) {
                this.validationRules.delete(key);
                console.log(`🗑️ 验证规则已删除: ${key}`);
                this.emit('validation_rule_removed', { key });
                return { success: true };
            } else {
                return { success: false, error: '验证规则不存在' };
            }
        } catch (error) {
            console.error(`❌ 删除验证规则失败 (${key}):`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return {
            totalValidationRules: this.validationRules.size,
            totalCustomValidators: this.customValidators.size,
            builtinValidators: Array.from(this.customValidators.keys()),
            isInitialized: this.isInitialized,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 清理验证器
     */
    async cleanup() {
        try {
            this.validationRules.clear();
            this.isInitialized = false;

            console.log('🧹 配置验证器已清理');
            this.emit('validator_cleaned');

            return { success: true };

        } catch (error) {
            console.error('❌ 清理配置验证器失败:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = ConfigValidator;
