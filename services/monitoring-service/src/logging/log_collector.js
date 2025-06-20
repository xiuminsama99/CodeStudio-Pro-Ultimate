/**
 * 分布式日志收集器
 * 负责收集、聚合和转发各服务的日志
 */

const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');

class LogCollector extends EventEmitter {
    constructor(options = {}) {
        super();
        this.logDir = options.logDir || path.join(__dirname, '../logs');
        this.maxLogSize = options.maxLogSize || 100 * 1024 * 1024; // 100MB
        this.maxLogFiles = options.maxLogFiles || 10;
        this.logLevel = options.logLevel || 'info';
        this.services = new Map(); // 服务日志配置
        this.logBuffer = new Map(); // 日志缓冲区
        this.flushInterval = options.flushInterval || 5000; // 5秒刷新间隔
        this.isRunning = false;
        
        // 日志级别优先级
        this.logLevels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3,
            trace: 4
        };

        console.log('✅ 分布式日志收集器初始化完成');
    }

    /**
     * 启动日志收集器
     */
    async start() {
        try {
            if (this.isRunning) {
                throw new Error('日志收集器已在运行');
            }

            // 确保日志目录存在
            await fs.mkdir(this.logDir, { recursive: true });

            // 启动定期刷新
            this.flushTimer = setInterval(() => {
                this.flushLogs();
            }, this.flushInterval);

            this.isRunning = true;
            console.log('🚀 分布式日志收集器启动成功');
            this.emit('log_collector_started');

            return { success: true };

        } catch (error) {
            console.error('❌ 启动日志收集器失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 停止日志收集器
     */
    async stop() {
        try {
            if (!this.isRunning) {
                return { success: true };
            }

            // 停止定期刷新
            if (this.flushTimer) {
                clearInterval(this.flushTimer);
            }

            // 刷新剩余日志
            await this.flushLogs();

            this.isRunning = false;
            console.log('🛑 分布式日志收集器已停止');
            this.emit('log_collector_stopped');

            return { success: true };

        } catch (error) {
            console.error('❌ 停止日志收集器失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 注册服务
     */
    registerService(serviceName, config = {}) {
        try {
            const serviceConfig = {
                name: serviceName,
                logLevel: config.logLevel || this.logLevel,
                logFile: config.logFile || `${serviceName}.log`,
                maxSize: config.maxSize || this.maxLogSize,
                maxFiles: config.maxFiles || this.maxLogFiles,
                format: config.format || 'json',
                enabled: config.enabled !== false
            };

            this.services.set(serviceName, serviceConfig);
            this.logBuffer.set(serviceName, []);

            console.log(`✅ 服务已注册: ${serviceName}`);
            this.emit('service_registered', { serviceName, config: serviceConfig });

            return { success: true, serviceConfig };

        } catch (error) {
            console.error(`❌ 注册服务失败 (${serviceName}):`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 收集日志
     */
    collectLog(serviceName, level, message, metadata = {}) {
        try {
            if (!this.isRunning) {
                return { success: false, error: '日志收集器未运行' };
            }

            const serviceConfig = this.services.get(serviceName);
            if (!serviceConfig) {
                return { success: false, error: '服务未注册' };
            }

            if (!serviceConfig.enabled) {
                return { success: false, error: '服务日志已禁用' };
            }

            // 检查日志级别
            if (this.logLevels[level] > this.logLevels[serviceConfig.logLevel]) {
                return { success: false, error: '日志级别过低' };
            }

            // 创建日志条目
            const logEntry = {
                timestamp: new Date().toISOString(),
                service: serviceName,
                level: level.toUpperCase(),
                message,
                metadata,
                pid: process.pid,
                hostname: require('os').hostname()
            };

            // 添加到缓冲区
            const buffer = this.logBuffer.get(serviceName);
            buffer.push(logEntry);

            // 如果是错误级别，立即刷新
            if (level === 'error') {
                setImmediate(() => this.flushServiceLogs(serviceName));
            }

            this.emit('log_collected', { serviceName, level, logEntry });

            return { success: true, logEntry };

        } catch (error) {
            console.error(`❌ 收集日志失败 (${serviceName}):`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 批量收集日志
     */
    collectLogs(serviceName, logs) {
        try {
            if (!Array.isArray(logs)) {
                throw new Error('日志必须是数组');
            }

            const results = [];
            for (const log of logs) {
                const result = this.collectLog(
                    serviceName,
                    log.level,
                    log.message,
                    log.metadata
                );
                results.push(result);
            }

            const successCount = results.filter(r => r.success).length;
            const errorCount = results.length - successCount;

            console.log(`📦 批量收集日志: ${serviceName}, ${successCount} 成功, ${errorCount} 失败`);
            this.emit('logs_batch_collected', { serviceName, successCount, errorCount });

            return {
                success: errorCount === 0,
                results,
                successCount,
                errorCount
            };

        } catch (error) {
            console.error(`❌ 批量收集日志失败 (${serviceName}):`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 刷新所有日志
     */
    async flushLogs() {
        try {
            const promises = [];
            for (const serviceName of this.services.keys()) {
                promises.push(this.flushServiceLogs(serviceName));
            }

            await Promise.all(promises);
            console.log('💾 所有日志已刷新');

        } catch (error) {
            console.error('❌ 刷新日志失败:', error);
        }
    }

    /**
     * 刷新特定服务的日志
     */
    async flushServiceLogs(serviceName) {
        try {
            const buffer = this.logBuffer.get(serviceName);
            if (!buffer || buffer.length === 0) {
                return;
            }

            const serviceConfig = this.services.get(serviceName);
            const logFile = path.join(this.logDir, serviceConfig.logFile);

            // 格式化日志
            const formattedLogs = buffer.map(entry => {
                if (serviceConfig.format === 'json') {
                    return JSON.stringify(entry);
                } else {
                    return `${entry.timestamp} [${entry.level}] ${entry.service}: ${entry.message}`;
                }
            }).join('\n') + '\n';

            // 写入文件
            await fs.appendFile(logFile, formattedLogs, 'utf8');

            // 检查文件大小并轮转
            await this.rotateLogIfNeeded(serviceName, logFile);

            // 清空缓冲区
            buffer.length = 0;

            console.log(`💾 服务日志已刷新: ${serviceName}`);
            this.emit('service_logs_flushed', { serviceName, logCount: buffer.length });

        } catch (error) {
            console.error(`❌ 刷新服务日志失败 (${serviceName}):`, error);
        }
    }

    /**
     * 日志轮转
     */
    async rotateLogIfNeeded(serviceName, logFile) {
        try {
            const stats = await fs.stat(logFile);
            const serviceConfig = this.services.get(serviceName);

            if (stats.size >= serviceConfig.maxSize) {
                // 轮转日志文件
                for (let i = serviceConfig.maxFiles - 1; i > 0; i--) {
                    const oldFile = `${logFile}.${i}`;
                    const newFile = `${logFile}.${i + 1}`;

                    try {
                        await fs.access(oldFile);
                        if (i === serviceConfig.maxFiles - 1) {
                            await fs.unlink(oldFile); // 删除最老的文件
                        } else {
                            await fs.rename(oldFile, newFile);
                        }
                    } catch (err) {
                        // 文件不存在，忽略
                    }
                }

                // 重命名当前文件
                await fs.rename(logFile, `${logFile}.1`);

                console.log(`🔄 日志文件已轮转: ${serviceName}`);
                this.emit('log_rotated', { serviceName, logFile });
            }

        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error(`❌ 日志轮转失败 (${serviceName}):`, error);
            }
        }
    }

    /**
     * 查询日志
     */
    async queryLogs(serviceName, options = {}) {
        try {
            const serviceConfig = this.services.get(serviceName);
            if (!serviceConfig) {
                return { success: false, error: '服务未注册' };
            }

            const logFile = path.join(this.logDir, serviceConfig.logFile);
            const logs = [];

            try {
                const data = await fs.readFile(logFile, 'utf8');
                const lines = data.trim().split('\n');

                for (const line of lines) {
                    if (!line) continue;

                    try {
                        if (serviceConfig.format === 'json') {
                            const logEntry = JSON.parse(line);
                            
                            // 应用过滤器
                            if (this.matchesFilter(logEntry, options)) {
                                logs.push(logEntry);
                            }
                        } else {
                            // 简单文本格式解析
                            logs.push({ raw: line });
                        }
                    } catch (parseError) {
                        // 忽略解析错误的行
                    }
                }
            } catch (fileError) {
                if (fileError.code !== 'ENOENT') {
                    throw fileError;
                }
            }

            // 排序和限制
            logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            const limit = options.limit || 100;
            const limitedLogs = logs.slice(0, limit);

            console.log(`🔍 查询日志: ${serviceName}, 找到 ${limitedLogs.length} 条`);
            this.emit('logs_queried', { serviceName, count: limitedLogs.length });

            return {
                success: true,
                logs: limitedLogs,
                total: logs.length,
                limited: limitedLogs.length
            };

        } catch (error) {
            console.error(`❌ 查询日志失败 (${serviceName}):`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 检查日志条目是否匹配过滤器
     */
    matchesFilter(logEntry, options) {
        // 级别过滤
        if (options.level && logEntry.level.toLowerCase() !== options.level.toLowerCase()) {
            return false;
        }

        // 时间范围过滤
        if (options.from || options.to) {
            const timestamp = new Date(logEntry.timestamp);
            if (options.from && timestamp < new Date(options.from)) {
                return false;
            }
            if (options.to && timestamp > new Date(options.to)) {
                return false;
            }
        }

        // 消息内容过滤
        if (options.search && !logEntry.message.toLowerCase().includes(options.search.toLowerCase())) {
            return false;
        }

        return true;
    }

    /**
     * 获取服务配置
     */
    getServiceConfig(serviceName) {
        return this.services.get(serviceName);
    }

    /**
     * 获取所有服务配置
     */
    getAllServiceConfigs() {
        return Object.fromEntries(this.services);
    }

    /**
     * 更新服务配置
     */
    updateServiceConfig(serviceName, config) {
        try {
            const currentConfig = this.services.get(serviceName);
            if (!currentConfig) {
                return { success: false, error: '服务未注册' };
            }

            const updatedConfig = { ...currentConfig, ...config };
            this.services.set(serviceName, updatedConfig);

            console.log(`🔄 服务配置已更新: ${serviceName}`);
            this.emit('service_config_updated', { serviceName, config: updatedConfig });

            return { success: true, config: updatedConfig };

        } catch (error) {
            console.error(`❌ 更新服务配置失败 (${serviceName}):`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取统计信息
     */
    getStats() {
        const stats = {
            isRunning: this.isRunning,
            totalServices: this.services.size,
            logDir: this.logDir,
            flushInterval: this.flushInterval,
            services: {},
            bufferStats: {},
            timestamp: new Date().toISOString()
        };

        // 服务统计
        for (const [serviceName, config] of this.services.entries()) {
            stats.services[serviceName] = {
                enabled: config.enabled,
                logLevel: config.logLevel,
                logFile: config.logFile
            };

            const buffer = this.logBuffer.get(serviceName);
            stats.bufferStats[serviceName] = {
                bufferedLogs: buffer ? buffer.length : 0
            };
        }

        return stats;
    }

    /**
     * 清理日志收集器
     */
    async cleanup() {
        try {
            await this.stop();
            this.services.clear();
            this.logBuffer.clear();

            console.log('🧹 分布式日志收集器已清理');
            this.emit('log_collector_cleaned');

            return { success: true };

        } catch (error) {
            console.error('❌ 清理日志收集器失败:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = LogCollector;
