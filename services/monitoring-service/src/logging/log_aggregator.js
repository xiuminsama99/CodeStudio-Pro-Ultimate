/**
 * 日志聚合器
 * 负责聚合、分析和处理来自多个服务的日志
 */

const { EventEmitter } = require('events');

class LogAggregator extends EventEmitter {
    constructor(options = {}) {
        super();
        this.aggregationWindow = options.aggregationWindow || 60000; // 1分钟聚合窗口
        this.maxAggregationSize = options.maxAggregationSize || 1000;
        this.aggregatedLogs = new Map(); // 聚合后的日志
        this.logPatterns = new Map(); // 日志模式统计
        this.errorPatterns = new Map(); // 错误模式统计
        this.serviceMetrics = new Map(); // 服务指标
        this.isRunning = false;
        
        console.log('✅ 日志聚合器初始化完成');
    }

    /**
     * 启动日志聚合器
     */
    async start() {
        try {
            if (this.isRunning) {
                throw new Error('日志聚合器已在运行');
            }

            // 启动定期聚合
            this.aggregationTimer = setInterval(() => {
                this.performAggregation();
            }, this.aggregationWindow);

            this.isRunning = true;
            console.log('🚀 日志聚合器启动成功');
            this.emit('aggregator_started');

            return { success: true };

        } catch (error) {
            console.error('❌ 启动日志聚合器失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 停止日志聚合器
     */
    async stop() {
        try {
            if (!this.isRunning) {
                return { success: true };
            }

            // 停止定期聚合
            if (this.aggregationTimer) {
                clearInterval(this.aggregationTimer);
            }

            // 执行最后一次聚合
            this.performAggregation();

            this.isRunning = false;
            console.log('🛑 日志聚合器已停止');
            this.emit('aggregator_stopped');

            return { success: true };

        } catch (error) {
            console.error('❌ 停止日志聚合器失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 处理日志条目
     */
    processLogEntry(logEntry) {
        try {
            if (!this.isRunning) {
                return { success: false, error: '日志聚合器未运行' };
            }

            // 更新服务指标
            this.updateServiceMetrics(logEntry);

            // 分析日志模式
            this.analyzeLogPattern(logEntry);

            // 检测错误模式
            if (logEntry.level === 'ERROR') {
                this.analyzeErrorPattern(logEntry);
            }

            // 添加到聚合缓冲区
            this.addToAggregationBuffer(logEntry);

            this.emit('log_processed', { logEntry });

            return { success: true };

        } catch (error) {
            console.error('❌ 处理日志条目失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 批量处理日志条目
     */
    processLogEntries(logEntries) {
        try {
            if (!Array.isArray(logEntries)) {
                throw new Error('日志条目必须是数组');
            }

            const results = [];
            for (const logEntry of logEntries) {
                const result = this.processLogEntry(logEntry);
                results.push(result);
            }

            const successCount = results.filter(r => r.success).length;
            const errorCount = results.length - successCount;

            console.log(`📦 批量处理日志: ${successCount} 成功, ${errorCount} 失败`);
            this.emit('logs_batch_processed', { successCount, errorCount });

            return {
                success: errorCount === 0,
                results,
                successCount,
                errorCount
            };

        } catch (error) {
            console.error('❌ 批量处理日志失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 更新服务指标
     */
    updateServiceMetrics(logEntry) {
        const serviceName = logEntry.service;
        
        if (!this.serviceMetrics.has(serviceName)) {
            this.serviceMetrics.set(serviceName, {
                totalLogs: 0,
                errorLogs: 0,
                warnLogs: 0,
                infoLogs: 0,
                debugLogs: 0,
                lastLogTime: null,
                avgLogsPerMinute: 0,
                logHistory: []
            });
        }

        const metrics = this.serviceMetrics.get(serviceName);
        metrics.totalLogs++;
        metrics.lastLogTime = new Date(logEntry.timestamp);

        // 按级别统计
        const level = logEntry.level.toLowerCase();
        if (metrics[`${level}Logs`] !== undefined) {
            metrics[`${level}Logs`]++;
        }

        // 更新历史记录
        metrics.logHistory.push({
            timestamp: logEntry.timestamp,
            level: logEntry.level
        });

        // 保持历史记录在合理范围内
        if (metrics.logHistory.length > 1000) {
            metrics.logHistory = metrics.logHistory.slice(-1000);
        }

        // 计算平均日志频率
        this.calculateLogFrequency(serviceName);
    }

    /**
     * 计算日志频率
     */
    calculateLogFrequency(serviceName) {
        const metrics = this.serviceMetrics.get(serviceName);
        const now = new Date();
        const oneMinuteAgo = new Date(now.getTime() - 60000);

        const recentLogs = metrics.logHistory.filter(log => 
            new Date(log.timestamp) > oneMinuteAgo
        );

        metrics.avgLogsPerMinute = recentLogs.length;
    }

    /**
     * 分析日志模式
     */
    analyzeLogPattern(logEntry) {
        // 提取消息模式（去除变量部分）
        const pattern = this.extractPattern(logEntry.message);
        const key = `${logEntry.service}:${pattern}`;

        if (!this.logPatterns.has(key)) {
            this.logPatterns.set(key, {
                service: logEntry.service,
                pattern: pattern,
                count: 0,
                firstSeen: logEntry.timestamp,
                lastSeen: logEntry.timestamp,
                levels: new Set()
            });
        }

        const patternData = this.logPatterns.get(key);
        patternData.count++;
        patternData.lastSeen = logEntry.timestamp;
        patternData.levels.add(logEntry.level);
    }

    /**
     * 分析错误模式
     */
    analyzeErrorPattern(logEntry) {
        const errorPattern = this.extractErrorPattern(logEntry.message);
        const key = `${logEntry.service}:${errorPattern}`;

        if (!this.errorPatterns.has(key)) {
            this.errorPatterns.set(key, {
                service: logEntry.service,
                pattern: errorPattern,
                count: 0,
                firstSeen: logEntry.timestamp,
                lastSeen: logEntry.timestamp,
                severity: this.calculateErrorSeverity(logEntry)
            });
        }

        const errorData = this.errorPatterns.get(key);
        errorData.count++;
        errorData.lastSeen = logEntry.timestamp;
        
        // 更新严重性
        const newSeverity = this.calculateErrorSeverity(logEntry);
        if (newSeverity > errorData.severity) {
            errorData.severity = newSeverity;
        }
    }

    /**
     * 提取日志模式
     */
    extractPattern(message) {
        // 简单的模式提取：替换数字、UUID、时间戳等为占位符
        return message
            .replace(/\d+/g, '{number}')
            .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '{uuid}')
            .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '{timestamp}')
            .replace(/\b\d+\.\d+\.\d+\.\d+\b/g, '{ip}')
            .replace(/\/[a-zA-Z0-9\/\-_]+/g, '{path}');
    }

    /**
     * 提取错误模式
     */
    extractErrorPattern(message) {
        // 提取错误类型和关键信息
        const errorTypes = [
            'Error', 'Exception', 'Failed', 'Timeout', 'Connection',
            'Database', 'Network', 'Authentication', 'Authorization'
        ];

        for (const errorType of errorTypes) {
            if (message.toLowerCase().includes(errorType.toLowerCase())) {
                return errorType;
            }
        }

        return 'Unknown Error';
    }

    /**
     * 计算错误严重性
     */
    calculateErrorSeverity(logEntry) {
        const message = logEntry.message.toLowerCase();
        
        // 高严重性关键词
        const highSeverityKeywords = [
            'fatal', 'critical', 'crash', 'panic', 'abort',
            'database down', 'service unavailable', 'out of memory'
        ];

        // 中等严重性关键词
        const mediumSeverityKeywords = [
            'timeout', 'connection failed', 'authentication failed',
            'permission denied', 'not found'
        ];

        for (const keyword of highSeverityKeywords) {
            if (message.includes(keyword)) {
                return 3; // 高严重性
            }
        }

        for (const keyword of mediumSeverityKeywords) {
            if (message.includes(keyword)) {
                return 2; // 中等严重性
            }
        }

        return 1; // 低严重性
    }

    /**
     * 添加到聚合缓冲区
     */
    addToAggregationBuffer(logEntry) {
        const windowKey = this.getAggregationWindowKey(logEntry.timestamp);
        
        if (!this.aggregatedLogs.has(windowKey)) {
            this.aggregatedLogs.set(windowKey, {
                windowStart: windowKey,
                windowEnd: new Date(windowKey.getTime() + this.aggregationWindow),
                services: new Map(),
                totalLogs: 0,
                errorCount: 0,
                warnCount: 0
            });
        }

        const window = this.aggregatedLogs.get(windowKey);
        window.totalLogs++;

        // 按级别统计
        if (logEntry.level === 'ERROR') {
            window.errorCount++;
        } else if (logEntry.level === 'WARN') {
            window.warnCount++;
        }

        // 按服务统计
        if (!window.services.has(logEntry.service)) {
            window.services.set(logEntry.service, {
                logCount: 0,
                errorCount: 0,
                warnCount: 0
            });
        }

        const serviceStats = window.services.get(logEntry.service);
        serviceStats.logCount++;
        
        if (logEntry.level === 'ERROR') {
            serviceStats.errorCount++;
        } else if (logEntry.level === 'WARN') {
            serviceStats.warnCount++;
        }
    }

    /**
     * 获取聚合窗口键
     */
    getAggregationWindowKey(timestamp) {
        const time = new Date(timestamp);
        const windowStart = new Date(
            Math.floor(time.getTime() / this.aggregationWindow) * this.aggregationWindow
        );
        return windowStart;
    }

    /**
     * 执行聚合
     */
    performAggregation() {
        try {
            const now = new Date();
            const cutoffTime = new Date(now.getTime() - this.aggregationWindow * 2);

            // 清理过期的聚合数据
            for (const [windowKey, windowData] of this.aggregatedLogs.entries()) {
                if (windowKey < cutoffTime) {
                    this.aggregatedLogs.delete(windowKey);
                }
            }

            // 清理过期的模式数据
            this.cleanupPatterns();

            console.log('📊 日志聚合完成');
            this.emit('aggregation_performed', {
                activeWindows: this.aggregatedLogs.size,
                totalPatterns: this.logPatterns.size,
                errorPatterns: this.errorPatterns.size
            });

        } catch (error) {
            console.error('❌ 执行聚合失败:', error);
        }
    }

    /**
     * 清理过期模式
     */
    cleanupPatterns() {
        const now = new Date();
        const cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24小时前

        // 清理日志模式
        for (const [key, pattern] of this.logPatterns.entries()) {
            if (new Date(pattern.lastSeen) < cutoffTime) {
                this.logPatterns.delete(key);
            }
        }

        // 清理错误模式
        for (const [key, pattern] of this.errorPatterns.entries()) {
            if (new Date(pattern.lastSeen) < cutoffTime) {
                this.errorPatterns.delete(key);
            }
        }
    }

    /**
     * 获取聚合统计
     */
    getAggregationStats() {
        const stats = {
            totalWindows: this.aggregatedLogs.size,
            totalPatterns: this.logPatterns.size,
            totalErrorPatterns: this.errorPatterns.size,
            serviceCount: this.serviceMetrics.size,
            aggregationWindow: this.aggregationWindow,
            isRunning: this.isRunning
        };

        // 最近窗口统计
        const recentWindows = Array.from(this.aggregatedLogs.values())
            .sort((a, b) => b.windowStart - a.windowStart)
            .slice(0, 5);

        stats.recentWindows = recentWindows.map(window => ({
            windowStart: window.windowStart,
            totalLogs: window.totalLogs,
            errorCount: window.errorCount,
            warnCount: window.warnCount,
            serviceCount: window.services.size
        }));

        return stats;
    }

    /**
     * 获取服务指标
     */
    getServiceMetrics(serviceName = null) {
        if (serviceName) {
            return this.serviceMetrics.get(serviceName);
        }

        const metrics = {};
        for (const [service, data] of this.serviceMetrics.entries()) {
            metrics[service] = {
                ...data,
                logHistory: data.logHistory.slice(-100) // 只返回最近100条
            };
        }

        return metrics;
    }

    /**
     * 获取日志模式
     */
    getLogPatterns(limit = 50) {
        return Array.from(this.logPatterns.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, limit)
            .map(pattern => ({
                ...pattern,
                levels: Array.from(pattern.levels)
            }));
    }

    /**
     * 获取错误模式
     */
    getErrorPatterns(limit = 20) {
        return Array.from(this.errorPatterns.values())
            .sort((a, b) => b.severity - a.severity || b.count - a.count)
            .slice(0, limit);
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return {
            isRunning: this.isRunning,
            aggregationWindow: this.aggregationWindow,
            maxAggregationSize: this.maxAggregationSize,
            aggregationStats: this.getAggregationStats(),
            serviceMetrics: Object.keys(this.getServiceMetrics()),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 清理日志聚合器
     */
    async cleanup() {
        try {
            await this.stop();
            this.aggregatedLogs.clear();
            this.logPatterns.clear();
            this.errorPatterns.clear();
            this.serviceMetrics.clear();

            console.log('🧹 日志聚合器已清理');
            this.emit('aggregator_cleaned');

            return { success: true };

        } catch (error) {
            console.error('❌ 清理日志聚合器失败:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = LogAggregator;
