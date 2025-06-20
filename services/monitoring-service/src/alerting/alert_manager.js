/**
 * 告警管理器
 * 负责管理告警规则、触发告警和通知处理
 */

const { EventEmitter } = require('events');

class AlertManager extends EventEmitter {
    constructor(options = {}) {
        super();
        this.rules = new Map(); // 告警规则
        this.activeAlerts = new Map(); // 活跃告警
        this.alertHistory = []; // 告警历史
        this.checkInterval = options.checkInterval || 30000; // 30秒检查间隔
        this.maxHistorySize = options.maxHistorySize || 1000;
        this.isRunning = false;
        
        // 告警级别
        this.alertLevels = {
            critical: 0,
            warning: 1,
            info: 2
        };

        console.log('✅ 告警管理器初始化完成');
    }

    /**
     * 启动告警管理器
     */
    async start() {
        try {
            if (this.isRunning) {
                throw new Error('告警管理器已在运行');
            }

            // 启动定期检查
            this.checkTimer = setInterval(() => {
                this.checkAlerts();
            }, this.checkInterval);

            this.isRunning = true;
            console.log('🚀 告警管理器启动成功');
            this.emit('alert_manager_started');

            return { success: true };

        } catch (error) {
            console.error('❌ 启动告警管理器失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 停止告警管理器
     */
    async stop() {
        try {
            if (!this.isRunning) {
                return { success: true };
            }

            // 停止定期检查
            if (this.checkTimer) {
                clearInterval(this.checkTimer);
            }

            this.isRunning = false;
            console.log('🛑 告警管理器已停止');
            this.emit('alert_manager_stopped');

            return { success: true };

        } catch (error) {
            console.error('❌ 停止告警管理器失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 添加告警规则
     */
    addRule(ruleId, rule) {
        try {
            if (!ruleId || typeof ruleId !== 'string') {
                throw new Error('规则ID必须是非空字符串');
            }

            if (!rule || typeof rule !== 'object') {
                throw new Error('规则必须是对象');
            }

            // 验证规则
            const validation = this.validateRule(rule);
            if (!validation.valid) {
                throw new Error(`规则验证失败: ${validation.errors.join(', ')}`);
            }

            // 添加默认值
            const completeRule = {
                id: ruleId,
                name: rule.name || ruleId,
                description: rule.description || '',
                condition: rule.condition,
                level: rule.level || 'warning',
                enabled: rule.enabled !== false,
                threshold: rule.threshold,
                duration: rule.duration || 300, // 5分钟
                cooldown: rule.cooldown || 600, // 10分钟冷却
                tags: rule.tags || [],
                actions: rule.actions || [],
                createdAt: new Date().toISOString(),
                lastTriggered: null,
                triggerCount: 0
            };

            this.rules.set(ruleId, completeRule);

            console.log(`✅ 告警规则已添加: ${ruleId}`);
            this.emit('rule_added', { ruleId, rule: completeRule });

            return { success: true, rule: completeRule };

        } catch (error) {
            console.error(`❌ 添加告警规则失败 (${ruleId}):`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 验证告警规则
     */
    validateRule(rule) {
        const errors = [];

        if (!rule.condition) {
            errors.push('缺少条件表达式');
        }

        if (rule.level && !this.alertLevels.hasOwnProperty(rule.level)) {
            errors.push('无效的告警级别');
        }

        if (rule.threshold !== undefined && typeof rule.threshold !== 'number') {
            errors.push('阈值必须是数字');
        }

        if (rule.duration !== undefined && (typeof rule.duration !== 'number' || rule.duration < 0)) {
            errors.push('持续时间必须是非负数字');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 更新告警规则
     */
    updateRule(ruleId, updates) {
        try {
            const rule = this.rules.get(ruleId);
            if (!rule) {
                return { success: false, error: '规则不存在' };
            }

            // 验证更新
            const validation = this.validateRule({ ...rule, ...updates });
            if (!validation.valid) {
                return { success: false, error: `规则验证失败: ${validation.errors.join(', ')}` };
            }

            // 更新规则
            const updatedRule = { ...rule, ...updates };
            this.rules.set(ruleId, updatedRule);

            console.log(`🔄 告警规则已更新: ${ruleId}`);
            this.emit('rule_updated', { ruleId, rule: updatedRule });

            return { success: true, rule: updatedRule };

        } catch (error) {
            console.error(`❌ 更新告警规则失败 (${ruleId}):`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 删除告警规则
     */
    removeRule(ruleId) {
        try {
            if (!this.rules.has(ruleId)) {
                return { success: false, error: '规则不存在' };
            }

            this.rules.delete(ruleId);

            // 清理相关的活跃告警
            for (const [alertId, alert] of this.activeAlerts.entries()) {
                if (alert.ruleId === ruleId) {
                    this.resolveAlert(alertId, 'rule_deleted');
                }
            }

            console.log(`🗑️ 告警规则已删除: ${ruleId}`);
            this.emit('rule_removed', { ruleId });

            return { success: true };

        } catch (error) {
            console.error(`❌ 删除告警规则失败 (${ruleId}):`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 检查告警
     */
    async checkAlerts() {
        try {
            if (!this.isRunning) {
                return;
            }

            const now = new Date();
            let triggeredCount = 0;
            let resolvedCount = 0;

            for (const [ruleId, rule] of this.rules.entries()) {
                if (!rule.enabled) {
                    continue;
                }

                // 检查冷却期
                if (rule.lastTriggered) {
                    const timeSinceLastTrigger = now.getTime() - new Date(rule.lastTriggered).getTime();
                    if (timeSinceLastTrigger < rule.cooldown * 1000) {
                        continue;
                    }
                }

                // 评估条件
                const conditionResult = await this.evaluateCondition(rule);
                
                if (conditionResult.triggered) {
                    const alertId = `${ruleId}_${now.getTime()}`;
                    const triggered = this.triggerAlert(alertId, rule, conditionResult.value);
                    if (triggered) {
                        triggeredCount++;
                    }
                } else {
                    // 检查是否需要解决现有告警
                    for (const [alertId, alert] of this.activeAlerts.entries()) {
                        if (alert.ruleId === ruleId) {
                            this.resolveAlert(alertId, 'condition_resolved');
                            resolvedCount++;
                        }
                    }
                }
            }

            if (triggeredCount > 0 || resolvedCount > 0) {
                console.log(`🔔 告警检查完成: ${triggeredCount} 个触发, ${resolvedCount} 个解决`);
            }

            this.emit('alerts_checked', { triggeredCount, resolvedCount });

        } catch (error) {
            console.error('❌ 检查告警失败:', error);
        }
    }

    /**
     * 评估条件
     */
    async evaluateCondition(rule) {
        try {
            // 这里应该根据实际的监控数据来评估条件
            // 为了演示，我们使用模拟数据
            const mockValue = Math.random() * 100;
            
            let triggered = false;
            
            // 简单的条件评估
            if (rule.condition.includes('cpu_usage')) {
                triggered = mockValue > (rule.threshold || 80);
            } else if (rule.condition.includes('memory_usage')) {
                triggered = mockValue > (rule.threshold || 85);
            } else if (rule.condition.includes('error_rate')) {
                triggered = mockValue > (rule.threshold || 5);
            } else if (rule.condition.includes('response_time')) {
                triggered = mockValue > (rule.threshold || 1000);
            }

            return {
                triggered,
                value: mockValue,
                evaluatedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error(`❌ 评估条件失败 (${rule.id}):`, error);
            return {
                triggered: false,
                value: null,
                error: error.message
            };
        }
    }

    /**
     * 触发告警
     */
    triggerAlert(alertId, rule, value) {
        try {
            const alert = {
                id: alertId,
                ruleId: rule.id,
                ruleName: rule.name,
                level: rule.level,
                condition: rule.condition,
                threshold: rule.threshold,
                currentValue: value,
                message: this.generateAlertMessage(rule, value),
                status: 'active',
                triggeredAt: new Date().toISOString(),
                resolvedAt: null,
                tags: rule.tags,
                actions: rule.actions
            };

            this.activeAlerts.set(alertId, alert);
            this.alertHistory.unshift(alert);

            // 限制历史记录大小
            if (this.alertHistory.length > this.maxHistorySize) {
                this.alertHistory = this.alertHistory.slice(0, this.maxHistorySize);
            }

            // 更新规则统计
            rule.lastTriggered = alert.triggeredAt;
            rule.triggerCount++;

            // 执行告警动作
            this.executeAlertActions(alert);

            console.log(`🚨 告警触发: ${alert.ruleName} (${alert.level})`);
            this.emit('alert_triggered', { alert });

            return true;

        } catch (error) {
            console.error(`❌ 触发告警失败 (${alertId}):`, error);
            return false;
        }
    }

    /**
     * 解决告警
     */
    resolveAlert(alertId, reason = 'manual') {
        try {
            const alert = this.activeAlerts.get(alertId);
            if (!alert) {
                return { success: false, error: '告警不存在' };
            }

            alert.status = 'resolved';
            alert.resolvedAt = new Date().toISOString();
            alert.resolveReason = reason;

            this.activeAlerts.delete(alertId);

            console.log(`✅ 告警已解决: ${alert.ruleName} (${reason})`);
            this.emit('alert_resolved', { alert, reason });

            return { success: true, alert };

        } catch (error) {
            console.error(`❌ 解决告警失败 (${alertId}):`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 生成告警消息
     */
    generateAlertMessage(rule, value) {
        const threshold = rule.threshold || 'N/A';
        return `${rule.name}: 当前值 ${value} 超过阈值 ${threshold}`;
    }

    /**
     * 执行告警动作
     */
    executeAlertActions(alert) {
        try {
            for (const action of alert.actions) {
                switch (action.type) {
                    case 'email':
                        this.sendEmailNotification(alert, action);
                        break;
                    case 'webhook':
                        this.sendWebhookNotification(alert, action);
                        break;
                    case 'log':
                        this.logAlert(alert);
                        break;
                    default:
                        console.warn(`⚠️ 未知的告警动作类型: ${action.type}`);
                }
            }
        } catch (error) {
            console.error('❌ 执行告警动作失败:', error);
        }
    }

    /**
     * 发送邮件通知
     */
    sendEmailNotification(alert, action) {
        // 模拟邮件发送
        console.log(`📧 发送邮件通知: ${alert.message} -> ${action.recipients?.join(', ')}`);
        this.emit('email_notification_sent', { alert, action });
    }

    /**
     * 发送Webhook通知
     */
    sendWebhookNotification(alert, action) {
        // 模拟Webhook发送
        console.log(`🔗 发送Webhook通知: ${alert.message} -> ${action.url}`);
        this.emit('webhook_notification_sent', { alert, action });
    }

    /**
     * 记录告警日志
     */
    logAlert(alert) {
        console.log(`📝 告警日志: [${alert.level.toUpperCase()}] ${alert.message}`);
        this.emit('alert_logged', { alert });
    }

    /**
     * 获取告警规则
     */
    getRule(ruleId) {
        return this.rules.get(ruleId);
    }

    /**
     * 获取所有告警规则
     */
    getAllRules() {
        return Object.fromEntries(this.rules);
    }

    /**
     * 获取活跃告警
     */
    getActiveAlerts() {
        return Object.fromEntries(this.activeAlerts);
    }

    /**
     * 获取告警历史
     */
    getAlertHistory(limit = 100) {
        return this.alertHistory.slice(0, limit);
    }

    /**
     * 获取统计信息
     */
    getStats() {
        const ruleStats = {};
        for (const [level] of Object.entries(this.alertLevels)) {
            ruleStats[level] = Array.from(this.rules.values()).filter(r => r.level === level).length;
        }

        const alertStats = {};
        for (const [level] of Object.entries(this.alertLevels)) {
            alertStats[level] = Array.from(this.activeAlerts.values()).filter(a => a.level === level).length;
        }

        return {
            isRunning: this.isRunning,
            totalRules: this.rules.size,
            enabledRules: Array.from(this.rules.values()).filter(r => r.enabled).length,
            activeAlerts: this.activeAlerts.size,
            totalAlertHistory: this.alertHistory.length,
            checkInterval: this.checkInterval,
            ruleStats,
            alertStats,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 清理告警管理器
     */
    async cleanup() {
        try {
            await this.stop();
            this.rules.clear();
            this.activeAlerts.clear();
            this.alertHistory.length = 0;

            console.log('🧹 告警管理器已清理');
            this.emit('alert_manager_cleaned');

            return { success: true };

        } catch (error) {
            console.error('❌ 清理告警管理器失败:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = AlertManager;
