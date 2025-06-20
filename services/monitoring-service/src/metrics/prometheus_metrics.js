/**
 * Prometheus指标收集器
 * 负责收集和暴露各种系统指标
 */

const promClient = require('prom-client');

class PrometheusMetrics {
    constructor() {
        // 创建注册表
        this.register = new promClient.Registry();
        
        // 添加默认指标
        promClient.collectDefaultMetrics({ 
            register: this.register,
            prefix: 'codestudio_'
        });

        // 自定义指标
        this.httpRequestsTotal = new promClient.Counter({
            name: 'codestudio_http_requests_total',
            help: 'Total number of HTTP requests',
            labelNames: ['method', 'route', 'status_code', 'service']
        });

        this.httpRequestDuration = new promClient.Histogram({
            name: 'codestudio_http_request_duration_seconds',
            help: 'Duration of HTTP requests in seconds',
            labelNames: ['method', 'route', 'service'],
            buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
        });

        this.activeConnections = new promClient.Gauge({
            name: 'codestudio_active_connections',
            help: 'Number of active connections',
            labelNames: ['service', 'type']
        });

        this.configOperations = new promClient.Counter({
            name: 'codestudio_config_operations_total',
            help: 'Total number of configuration operations',
            labelNames: ['operation', 'status']
        });

        this.instanceOperations = new promClient.Counter({
            name: 'codestudio_instance_operations_total',
            help: 'Total number of instance operations',
            labelNames: ['operation', 'status']
        });

        this.collaborationEvents = new promClient.Counter({
            name: 'codestudio_collaboration_events_total',
            help: 'Total number of collaboration events',
            labelNames: ['event_type', 'service']
        });

        this.systemHealth = new promClient.Gauge({
            name: 'codestudio_system_health',
            help: 'System health status (1 = healthy, 0 = unhealthy)',
            labelNames: ['service', 'component']
        });

        this.resourceUsage = new promClient.Gauge({
            name: 'codestudio_resource_usage',
            help: 'Resource usage metrics',
            labelNames: ['resource_type', 'service']
        });

        // 注册所有指标
        this.register.registerMetric(this.httpRequestsTotal);
        this.register.registerMetric(this.httpRequestDuration);
        this.register.registerMetric(this.activeConnections);
        this.register.registerMetric(this.configOperations);
        this.register.registerMetric(this.instanceOperations);
        this.register.registerMetric(this.collaborationEvents);
        this.register.registerMetric(this.systemHealth);
        this.register.registerMetric(this.resourceUsage);

        console.log('✅ Prometheus指标收集器初始化完成');
    }

    /**
     * 记录HTTP请求
     */
    recordHttpRequest(method, route, statusCode, service, duration) {
        this.httpRequestsTotal.inc({
            method,
            route,
            status_code: statusCode,
            service
        });

        if (duration !== undefined) {
            this.httpRequestDuration.observe({
                method,
                route,
                service
            }, duration);
        }
    }

    /**
     * 设置活跃连接数
     */
    setActiveConnections(service, type, count) {
        this.activeConnections.set({
            service,
            type
        }, count);
    }

    /**
     * 记录配置操作
     */
    recordConfigOperation(operation, status) {
        this.configOperations.inc({
            operation,
            status
        });
    }

    /**
     * 记录实例操作
     */
    recordInstanceOperation(operation, status) {
        this.instanceOperations.inc({
            operation,
            status
        });
    }

    /**
     * 记录协作事件
     */
    recordCollaborationEvent(eventType, service) {
        this.collaborationEvents.inc({
            event_type: eventType,
            service
        });
    }

    /**
     * 设置系统健康状态
     */
    setSystemHealth(service, component, isHealthy) {
        this.systemHealth.set({
            service,
            component
        }, isHealthy ? 1 : 0);
    }

    /**
     * 设置资源使用情况
     */
    setResourceUsage(resourceType, service, value) {
        this.resourceUsage.set({
            resource_type: resourceType,
            service
        }, value);
    }

    /**
     * 创建Express中间件
     */
    createExpressMiddleware(serviceName) {
        return (req, res, next) => {
            const start = Date.now();
            
            res.on('finish', () => {
                const duration = (Date.now() - start) / 1000;
                this.recordHttpRequest(
                    req.method,
                    req.route ? req.route.path : req.path,
                    res.statusCode,
                    serviceName,
                    duration
                );
            });
            
            next();
        };
    }

    /**
     * 获取指标数据
     */
    async getMetrics() {
        return await this.register.metrics();
    }

    /**
     * 获取指标的JSON格式
     */
    async getMetricsJSON() {
        const metrics = await this.register.getMetricsAsJSON();
        return metrics;
    }

    /**
     * 清除所有指标
     */
    clearMetrics() {
        this.register.clear();
        console.log('🧹 Prometheus指标已清除');
    }

    /**
     * 获取注册表
     */
    getRegister() {
        return this.register;
    }

    /**
     * 批量更新系统指标
     */
    updateSystemMetrics(serviceName, metrics) {
        try {
            // 更新系统健康状态
            if (metrics.health !== undefined) {
                this.setSystemHealth(serviceName, 'overall', metrics.health);
            }

            // 更新资源使用情况
            if (metrics.cpu !== undefined) {
                this.setResourceUsage('cpu', serviceName, metrics.cpu);
            }

            if (metrics.memory !== undefined) {
                this.setResourceUsage('memory', serviceName, metrics.memory);
            }

            if (metrics.disk !== undefined) {
                this.setResourceUsage('disk', serviceName, metrics.disk);
            }

            // 更新连接数
            if (metrics.connections !== undefined) {
                this.setActiveConnections(serviceName, 'total', metrics.connections);
            }

            console.log(`📊 更新系统指标: ${serviceName}`);
        } catch (error) {
            console.error(`❌ 更新系统指标失败 (${serviceName}):`, error);
        }
    }

    /**
     * 创建自定义指标
     */
    createCustomCounter(name, help, labelNames = []) {
        const counter = new promClient.Counter({
            name: `codestudio_${name}`,
            help,
            labelNames
        });
        
        this.register.registerMetric(counter);
        return counter;
    }

    /**
     * 创建自定义计量器
     */
    createCustomGauge(name, help, labelNames = []) {
        const gauge = new promClient.Gauge({
            name: `codestudio_${name}`,
            help,
            labelNames
        });
        
        this.register.registerMetric(gauge);
        return gauge;
    }

    /**
     * 创建自定义直方图
     */
    createCustomHistogram(name, help, labelNames = [], buckets = undefined) {
        const histogram = new promClient.Histogram({
            name: `codestudio_${name}`,
            help,
            labelNames,
            buckets
        });
        
        this.register.registerMetric(histogram);
        return histogram;
    }

    /**
     * 获取指标统计信息
     */
    getMetricsStats() {
        const metricNames = this.register.getMetricsAsArray().map(metric => metric.name);
        
        return {
            totalMetrics: metricNames.length,
            metricNames,
            defaultMetricsEnabled: true,
            customMetricsCount: metricNames.filter(name => name.startsWith('codestudio_')).length,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = PrometheusMetrics;
