/**
 * 监控服务主应用
 * 提供Prometheus指标收集和暴露功能
 */

const express = require('express');
const cors = require('cors');
const PrometheusMetrics = require('./metrics/prometheus_metrics');
const DashboardManager = require('./grafana/dashboard_manager');
const LogCollector = require('./logging/log_collector');
const LogAggregator = require('./logging/log_aggregator');
const AlertManager = require('./alerting/alert_manager');

const app = express();
const PORT = process.env.PORT || 3008;

// 中间件
app.use(cors());
app.use(express.json());

// 创建Prometheus指标收集器
const prometheusMetrics = new PrometheusMetrics();

// 创建Grafana仪表板管理器
const dashboardManager = new DashboardManager({
    grafanaUrl: process.env.GRAFANA_URL || 'http://localhost:3000',
    apiKey: process.env.GRAFANA_API_KEY || ''
});

// 创建日志收集器
const logCollector = new LogCollector({
    logDir: process.env.LOG_DIR || './logs',
    flushInterval: 5000
});

// 创建日志聚合器
const logAggregator = new LogAggregator({
    aggregationWindow: 60000 // 1分钟聚合窗口
});

// 创建告警管理器
const alertManager = new AlertManager({
    checkInterval: 30000, // 30秒检查间隔
    maxHistorySize: 1000
});

// 初始化所有组件
Promise.all([
    dashboardManager.initialize(),
    logCollector.start(),
    logAggregator.start(),
    alertManager.start()
]).then(results => {
    const [dashboardResult, collectorResult, aggregatorResult, alertResult] = results;

    if (dashboardResult.success && collectorResult.success && aggregatorResult.success && alertResult.success) {
        console.log('✅ 所有监控组件初始化成功');

        // 注册默认服务
        logCollector.registerService('monitoring-service', { logLevel: 'info' });
        logCollector.registerService('api-gateway', { logLevel: 'info' });
        logCollector.registerService('instance-service', { logLevel: 'info' });
        logCollector.registerService('resource-service', { logLevel: 'info' });
        logCollector.registerService('user-service', { logLevel: 'info' });
        logCollector.registerService('collaboration-service', { logLevel: 'info' });
        logCollector.registerService('config-service', { logLevel: 'info' });

        // 添加默认告警规则
        alertManager.addRule('high_cpu_usage', {
            name: 'CPU使用率过高',
            description: '服务CPU使用率超过80%',
            condition: 'cpu_usage > threshold',
            level: 'warning',
            threshold: 80,
            duration: 300,
            actions: [{ type: 'log' }]
        });

        alertManager.addRule('high_error_rate', {
            name: 'HTTP错误率过高',
            description: '服务HTTP错误率超过5%',
            condition: 'error_rate > threshold',
            level: 'critical',
            threshold: 5,
            duration: 120,
            actions: [{ type: 'log' }, { type: 'webhook', url: '/api/alerts/webhook' }]
        });

    } else {
        console.error('❌ 监控组件初始化失败:', {
            dashboard: dashboardResult.error,
            collector: collectorResult.error,
            aggregator: aggregatorResult.error,
            alert: alertResult.error
        });
    }
});

// 连接日志收集器和聚合器
logCollector.on('log_collected', ({ logEntry }) => {
    logAggregator.processLogEntry(logEntry);
});

// 添加指标中间件
app.use(prometheusMetrics.createExpressMiddleware('monitoring-service'));

// 健康检查端点
app.get('/health', (req, res) => {
    const healthStatus = {
        status: 'healthy',
        service: 'monitoring-service',
        timestamp: new Date().toISOString(),
        metrics: prometheusMetrics.getMetricsStats(),
        dashboards: dashboardManager.getStats(),
        logCollector: logCollector.getStats(),
        logAggregator: logAggregator.getStats(),
        alertManager: alertManager.getStats()
    };

    // 更新健康状态指标
    prometheusMetrics.setSystemHealth('monitoring-service', 'health_endpoint', true);

    res.json(healthStatus);
});

// Prometheus指标端点
app.get('/metrics', async (req, res) => {
    try {
        const metrics = await prometheusMetrics.getMetrics();
        res.set('Content-Type', prometheusMetrics.getRegister().contentType);
        res.end(metrics);
    } catch (error) {
        console.error('❌ 获取指标失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 指标管理API

// 获取指标统计
app.get('/api/metrics/stats', (req, res) => {
    try {
        const stats = prometheusMetrics.getMetricsStats();
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

// 获取指标JSON格式
app.get('/api/metrics/json', async (req, res) => {
    try {
        const metrics = await prometheusMetrics.getMetricsJSON();
        res.json({
            success: true,
            data: metrics
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 记录自定义事件
app.post('/api/metrics/event', (req, res) => {
    try {
        const { type, service, operation, status, value } = req.body;

        switch (type) {
            case 'config_operation':
                prometheusMetrics.recordConfigOperation(operation, status);
                break;
            case 'instance_operation':
                prometheusMetrics.recordInstanceOperation(operation, status);
                break;
            case 'collaboration_event':
                prometheusMetrics.recordCollaborationEvent(operation, service);
                break;
            case 'resource_usage':
                prometheusMetrics.setResourceUsage(operation, service, value);
                break;
            case 'system_health':
                prometheusMetrics.setSystemHealth(service, operation, value);
                break;
            case 'active_connections':
                prometheusMetrics.setActiveConnections(service, operation, value);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: '未知的事件类型'
                });
        }

        res.json({
            success: true,
            message: '事件已记录'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 批量更新系统指标
app.post('/api/metrics/system/:serviceName', (req, res) => {
    try {
        const { serviceName } = req.params;
        const metrics = req.body;

        prometheusMetrics.updateSystemMetrics(serviceName, metrics);

        res.json({
            success: true,
            message: `系统指标已更新: ${serviceName}`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 清除指标
app.delete('/api/metrics', (req, res) => {
    try {
        prometheusMetrics.clearMetrics();
        res.json({
            success: true,
            message: '指标已清除'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 创建自定义指标
app.post('/api/metrics/custom', (req, res) => {
    try {
        const { name, type, help, labelNames, buckets } = req.body;

        if (!name || !type || !help) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数: name, type, help'
            });
        }

        let metric;
        switch (type) {
            case 'counter':
                metric = prometheusMetrics.createCustomCounter(name, help, labelNames);
                break;
            case 'gauge':
                metric = prometheusMetrics.createCustomGauge(name, help, labelNames);
                break;
            case 'histogram':
                metric = prometheusMetrics.createCustomHistogram(name, help, labelNames, buckets);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: '不支持的指标类型'
                });
        }

        res.status(201).json({
            success: true,
            message: `自定义指标已创建: ${name}`,
            metricName: `codestudio_${name}`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Grafana仪表板管理API

// 获取所有仪表板
app.get('/api/dashboards', (req, res) => {
    try {
        const result = dashboardManager.getAllDashboards();

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

// 获取特定仪表板
app.get('/api/dashboards/:dashboardId', (req, res) => {
    try {
        const { dashboardId } = req.params;
        const result = dashboardManager.getDashboard(dashboardId);

        if (result.success) {
            res.json({
                success: true,
                data: result.dashboard
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

// 创建仪表板
app.post('/api/dashboards', async (req, res) => {
    try {
        const { dashboardId, config } = req.body;

        if (!dashboardId || !config) {
            return res.status(400).json({
                success: false,
                error: '缺少仪表板ID或配置'
            });
        }

        // 验证配置
        const validation = dashboardManager.validateDashboard(config);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: '仪表板配置无效',
                validationErrors: validation.errors
            });
        }

        const result = await dashboardManager.createDashboard(dashboardId, config);

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

// 更新仪表板
app.put('/api/dashboards/:dashboardId', async (req, res) => {
    try {
        const { dashboardId } = req.params;
        const { config } = req.body;

        if (!config) {
            return res.status(400).json({
                success: false,
                error: '缺少仪表板配置'
            });
        }

        // 验证配置
        const validation = dashboardManager.validateDashboard(config);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: '仪表板配置无效',
                validationErrors: validation.errors
            });
        }

        const result = await dashboardManager.updateDashboard(dashboardId, config);

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

// 删除仪表板
app.delete('/api/dashboards/:dashboardId', async (req, res) => {
    try {
        const { dashboardId } = req.params;
        const result = await dashboardManager.deleteDashboard(dashboardId);

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

// 生成仪表板URL
app.post('/api/dashboards/:dashboardId/url', (req, res) => {
    try {
        const { dashboardId } = req.params;
        const params = req.body;

        const result = dashboardManager.generateDashboardUrl(dashboardId, params);

        if (result.success) {
            res.json({
                success: true,
                data: { url: result.url }
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

// 获取仪表板模板
app.get('/api/dashboards/templates/:templateType', (req, res) => {
    try {
        const { templateType } = req.params;
        const template = dashboardManager.getDashboardTemplate(templateType);

        res.json({
            success: true,
            data: template
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取仪表板统计
app.get('/api/dashboards/stats', (req, res) => {
    try {
        const stats = dashboardManager.getStats();
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

// 分布式日志收集API

// 收集单个日志
app.post('/api/logs/collect', (req, res) => {
    try {
        const { serviceName, level, message, metadata } = req.body;

        if (!serviceName || !level || !message) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数: serviceName, level, message'
            });
        }

        const result = logCollector.collectLog(serviceName, level, message, metadata);

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

// 批量收集日志
app.post('/api/logs/collect-batch', (req, res) => {
    try {
        const { serviceName, logs } = req.body;

        if (!serviceName || !logs || !Array.isArray(logs)) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数: serviceName, logs (array)'
            });
        }

        const result = logCollector.collectLogs(serviceName, logs);

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

// 查询日志
app.get('/api/logs/:serviceName', async (req, res) => {
    try {
        const { serviceName } = req.params;
        const { level, from, to, search, limit } = req.query;

        const options = {};
        if (level) options.level = level;
        if (from) options.from = from;
        if (to) options.to = to;
        if (search) options.search = search;
        if (limit) options.limit = parseInt(limit);

        const result = await logCollector.queryLogs(serviceName, options);

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

// 注册服务
app.post('/api/logs/services', (req, res) => {
    try {
        const { serviceName, config } = req.body;

        if (!serviceName) {
            return res.status(400).json({
                success: false,
                error: '缺少服务名称'
            });
        }

        const result = logCollector.registerService(serviceName, config);

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

// 获取服务配置
app.get('/api/logs/services/:serviceName', (req, res) => {
    try {
        const { serviceName } = req.params;
        const config = logCollector.getServiceConfig(serviceName);

        if (config) {
            res.json({
                success: true,
                data: config
            });
        } else {
            res.status(404).json({
                success: false,
                error: '服务未注册'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取所有服务配置
app.get('/api/logs/services', (req, res) => {
    try {
        const configs = logCollector.getAllServiceConfigs();
        res.json({
            success: true,
            data: configs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 更新服务配置
app.put('/api/logs/services/:serviceName', (req, res) => {
    try {
        const { serviceName } = req.params;
        const { config } = req.body;

        if (!config) {
            return res.status(400).json({
                success: false,
                error: '缺少配置信息'
            });
        }

        const result = logCollector.updateServiceConfig(serviceName, config);

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

// 日志聚合API

// 获取聚合统计
app.get('/api/logs/aggregation/stats', (req, res) => {
    try {
        const stats = logAggregator.getAggregationStats();
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

// 获取服务指标
app.get('/api/logs/metrics/:serviceName?', (req, res) => {
    try {
        const { serviceName } = req.params;
        const metrics = logAggregator.getServiceMetrics(serviceName);

        res.json({
            success: true,
            data: metrics
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取日志模式
app.get('/api/logs/patterns', (req, res) => {
    try {
        const { limit } = req.query;
        const patterns = logAggregator.getLogPatterns(limit ? parseInt(limit) : 50);

        res.json({
            success: true,
            data: patterns
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取错误模式
app.get('/api/logs/error-patterns', (req, res) => {
    try {
        const { limit } = req.query;
        const patterns = logAggregator.getErrorPatterns(limit ? parseInt(limit) : 20);

        res.json({
            success: true,
            data: patterns
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取日志收集器统计
app.get('/api/logs/collector/stats', (req, res) => {
    try {
        const stats = logCollector.getStats();
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

// 告警管理API

// 获取所有告警规则
app.get('/api/alerts/rules', (req, res) => {
    try {
        const rules = alertManager.getAllRules();
        res.json({
            success: true,
            data: rules
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取特定告警规则
app.get('/api/alerts/rules/:ruleId', (req, res) => {
    try {
        const { ruleId } = req.params;
        const rule = alertManager.getRule(ruleId);

        if (rule) {
            res.json({
                success: true,
                data: rule
            });
        } else {
            res.status(404).json({
                success: false,
                error: '告警规则不存在'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 添加告警规则
app.post('/api/alerts/rules', (req, res) => {
    try {
        const { ruleId, rule } = req.body;

        if (!ruleId || !rule) {
            return res.status(400).json({
                success: false,
                error: '缺少规则ID或规则配置'
            });
        }

        const result = alertManager.addRule(ruleId, rule);

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

// 更新告警规则
app.put('/api/alerts/rules/:ruleId', (req, res) => {
    try {
        const { ruleId } = req.params;
        const { updates } = req.body;

        if (!updates) {
            return res.status(400).json({
                success: false,
                error: '缺少更新配置'
            });
        }

        const result = alertManager.updateRule(ruleId, updates);

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

// 删除告警规则
app.delete('/api/alerts/rules/:ruleId', (req, res) => {
    try {
        const { ruleId } = req.params;
        const result = alertManager.removeRule(ruleId);

        if (result.success) {
            res.json({
                success: true,
                message: '告警规则已删除'
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

// 获取活跃告警
app.get('/api/alerts/active', (req, res) => {
    try {
        const alerts = alertManager.getActiveAlerts();
        res.json({
            success: true,
            data: alerts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取告警历史
app.get('/api/alerts/history', (req, res) => {
    try {
        const { limit } = req.query;
        const history = alertManager.getAlertHistory(limit ? parseInt(limit) : 100);

        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 解决告警
app.post('/api/alerts/:alertId/resolve', (req, res) => {
    try {
        const { alertId } = req.params;
        const { reason } = req.body;

        const result = alertManager.resolveAlert(alertId, reason || 'manual');

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

// 手动触发告警检查
app.post('/api/alerts/check', async (req, res) => {
    try {
        await alertManager.checkAlerts();
        res.json({
            success: true,
            message: '告警检查已触发'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取告警统计
app.get('/api/alerts/stats', (req, res) => {
    try {
        const stats = alertManager.getStats();
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

// Webhook接收端点（用于测试）
app.post('/api/alerts/webhook', (req, res) => {
    try {
        console.log('📨 收到告警Webhook:', req.body);
        res.json({
            success: true,
            message: 'Webhook已接收'
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
    console.error('❌ 监控服务错误:', error);

    // 记录错误指标
    prometheusMetrics.recordHttpRequest(
        req.method,
        req.path,
        500,
        'monitoring-service'
    );

    res.status(500).json({
        success: false,
        error: '内部服务器错误',
        message: error.message
    });
});

// 404处理
app.use((req, res) => {
    prometheusMetrics.recordHttpRequest(
        req.method,
        req.path,
        404,
        'monitoring-service'
    );

    res.status(404).json({
        success: false,
        error: '接口不存在',
        path: req.path
    });
});

// 定期更新系统指标
const updateSystemMetrics = () => {
    try {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();

        // 更新内存使用情况
        prometheusMetrics.setResourceUsage('memory_rss', 'monitoring-service', memUsage.rss);
        prometheusMetrics.setResourceUsage('memory_heap_used', 'monitoring-service', memUsage.heapUsed);
        prometheusMetrics.setResourceUsage('memory_heap_total', 'monitoring-service', memUsage.heapTotal);

        // 更新系统健康状态
        prometheusMetrics.setSystemHealth('monitoring-service', 'overall', true);

        console.log('📊 系统指标已更新');
    } catch (error) {
        console.error('❌ 更新系统指标失败:', error);
        prometheusMetrics.setSystemHealth('monitoring-service', 'overall', false);
    }
};

// 启动定期指标更新
const metricsInterval = setInterval(updateSystemMetrics, 30000); // 每30秒更新一次

// 启动HTTP服务器
const server = app.listen(PORT, () => {
    console.log(`🚀 监控服务启动成功:`);
    console.log(`   HTTP服务: http://localhost:${PORT}`);
    console.log(`   健康检查: http://localhost:${PORT}/health`);
    console.log(`   Prometheus指标: http://localhost:${PORT}/metrics`);
    console.log(`   指标管理API: http://localhost:${PORT}/api/metrics`);

    // 记录服务启动事件
    prometheusMetrics.recordCollaborationEvent('service_started', 'monitoring-service');
    prometheusMetrics.setSystemHealth('monitoring-service', 'startup', true);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('📡 收到SIGTERM信号，开始优雅关闭...');

    clearInterval(metricsInterval);
    prometheusMetrics.setSystemHealth('monitoring-service', 'overall', false);

    server.close(() => {
        console.log('✅ 监控服务已关闭');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('📡 收到SIGINT信号，开始优雅关闭...');

    clearInterval(metricsInterval);
    prometheusMetrics.setSystemHealth('monitoring-service', 'overall', false);

    server.close(() => {
        console.log('✅ 监控服务已关闭');
        process.exit(0);
    });
});

module.exports = { app, prometheusMetrics };
