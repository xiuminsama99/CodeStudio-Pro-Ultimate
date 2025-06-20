/**
 * Instance Service - Express应用主文件
 * 提供实例管理的REST API接口
 * 集成Resource Service和Path Service功能
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const InstanceController = require('./controllers/instance_controller');

class InstanceServiceApp {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3003;
        this.instanceController = new InstanceController();
        
        this.initializeMiddleware();
        this.initializeRoutes();
        this.initializeErrorHandling();
        
        console.log('✅ Instance Service 应用初始化完成');
    }

    /**
     * 初始化中间件
     */
    initializeMiddleware() {
        // 安全中间件
        this.app.use(helmet());
        
        // CORS配置
        this.app.use(cors({
            origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
            credentials: true
        }));
        
        // 请求解析
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));
        
        // 请求日志中间件
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });

        // 请求ID中间件（用于追踪）
        this.app.use((req, res, next) => {
            req.requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            res.setHeader('X-Request-ID', req.requestId);
            next();
        });
    }

    /**
     * 初始化路由
     */
    initializeRoutes() {
        // 健康检查
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                service: 'instance-service',
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                dependencies: {
                    resource_service: 'integrated',
                    path_service: 'integrated'
                }
            });
        });

        // 服务状态检查
        this.app.get('/status', async (req, res) => {
            try {
                const instanceCount = this.instanceController.instances.size;
                const resourceUsage = await this.instanceController.resourceAllocator.getResourceUsage();
                
                res.json({
                    status: 'operational',
                    service: 'instance-service',
                    timestamp: new Date().toISOString(),
                    statistics: {
                        total_instances: instanceCount,
                        resource_usage: resourceUsage
                    }
                });
            } catch (error) {
                res.status(500).json({
                    status: 'error',
                    service: 'instance-service',
                    error: error.message
                });
            }
        });

        // API路由前缀
        const apiRouter = express.Router();
        
        // 实例管理API
        apiRouter.post('/instances', this.instanceController.createInstance.bind(this.instanceController));
        apiRouter.get('/instances/:id', this.instanceController.getInstance.bind(this.instanceController));
        apiRouter.get('/instances', this.instanceController.listInstances.bind(this.instanceController));
        apiRouter.delete('/instances/:id', this.instanceController.deleteInstance.bind(this.instanceController));
        
        // 实例操作API
        apiRouter.post('/instances/:id/start', this.instanceController.startInstance.bind(this.instanceController));
        apiRouter.post('/instances/:id/stop', this.instanceController.stopInstance.bind(this.instanceController));
        
        // 批量操作API
        apiRouter.post('/instances/batch', this.instanceController.batchCreateInstances.bind(this.instanceController));
        
        // 实例状态API
        apiRouter.get('/instances/:id/status', this.getInstanceStatus.bind(this));
        apiRouter.get('/instances/:id/logs', this.getInstanceLogs.bind(this));
        apiRouter.get('/instances/:id/metrics', this.getInstanceMetrics.bind(this));
        
        this.app.use('/api/v1', apiRouter);
        
        // 根路径
        this.app.get('/', (req, res) => {
            res.json({
                message: 'CodeStudio Instance Service',
                version: '1.0.0',
                description: '实例管理微服务 - 支持50+实例的大规模管理',
                endpoints: {
                    health: '/health',
                    status: '/status',
                    api: '/api/v1',
                    docs: '/api/v1/docs'
                },
                features: [
                    '实例生命周期管理',
                    '资源分配和释放',
                    '路径管理集成',
                    '批量操作支持',
                    '实时状态监控'
                ]
            });
        });
    }

    /**
     * 获取实例状态（简化版）
     */
    async getInstanceStatus(req, res) {
        try {
            const { id } = req.params;
            
            if (!this.instanceController.instances.has(id)) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'INSTANCE_NOT_FOUND',
                        message: `实例 ${id} 不存在`
                    }
                });
            }

            const instance = this.instanceController.instances.get(id);
            
            res.json({
                success: true,
                data: {
                    instance_id: id,
                    status: instance.status,
                    created_at: instance.created_at,
                    started_at: instance.started_at,
                    ready_at: instance.ready_at,
                    stopped_at: instance.stopped_at,
                    uptime: instance.ready_at ? 
                        Math.floor((Date.now() - new Date(instance.ready_at).getTime()) / 1000) : 0
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'GET_STATUS_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 获取实例日志（模拟）
     */
    async getInstanceLogs(req, res) {
        try {
            const { id } = req.params;
            const { lines = 100, follow = false } = req.query;
            
            if (!this.instanceController.instances.has(id)) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'INSTANCE_NOT_FOUND',
                        message: `实例 ${id} 不存在`
                    }
                });
            }

            // 模拟日志数据
            const logs = Array.from({ length: parseInt(lines) }, (_, index) => ({
                timestamp: new Date(Date.now() - (parseInt(lines) - index) * 1000).toISOString(),
                level: ['INFO', 'DEBUG', 'WARN', 'ERROR'][Math.floor(Math.random() * 4)],
                message: `实例 ${id} 日志消息 ${index + 1}`,
                source: 'vscode-server'
            }));

            res.json({
                success: true,
                data: {
                    instance_id: id,
                    logs: logs,
                    total_lines: parseInt(lines),
                    follow: follow === 'true'
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'GET_LOGS_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 获取实例指标（模拟）
     */
    async getInstanceMetrics(req, res) {
        try {
            const { id } = req.params;
            
            if (!this.instanceController.instances.has(id)) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'INSTANCE_NOT_FOUND',
                        message: `实例 ${id} 不存在`
                    }
                });
            }

            const metrics = await this.instanceController.getInstanceResourceUsage(id);
            
            res.json({
                success: true,
                data: {
                    instance_id: id,
                    timestamp: new Date().toISOString(),
                    metrics: {
                        cpu: {
                            usage_percent: metrics.cpu_usage,
                            cores_used: (metrics.cpu_usage / 100 * 2).toFixed(2)
                        },
                        memory: {
                            usage_percent: metrics.memory_usage,
                            used_mb: Math.floor(metrics.memory_usage / 100 * 512),
                            total_mb: 512
                        },
                        network: {
                            bytes_in: metrics.network_io,
                            bytes_out: metrics.network_io * 0.8
                        },
                        disk: {
                            read_iops: metrics.disk_io,
                            write_iops: metrics.disk_io * 0.6
                        }
                    }
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'GET_METRICS_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 初始化错误处理
     */
    initializeErrorHandling() {
        // 404处理
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: `路径 ${req.originalUrl} 不存在`,
                    request_id: req.requestId
                }
            });
        });

        // 全局错误处理
        this.app.use((error, req, res, next) => {
            console.error(`[${req.requestId}] 未处理的错误:`, error);
            
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: '服务器内部错误',
                    request_id: req.requestId
                }
            });
        });
    }

    /**
     * 启动服务器
     */
    async start() {
        try {
            // 启动HTTP服务器
            this.server = this.app.listen(this.port, () => {
                console.log(`✅ Instance Service 启动成功`);
                console.log(`🌐 服务地址: http://localhost:${this.port}`);
                console.log(`📋 健康检查: http://localhost:${this.port}/health`);
                console.log(`📊 服务状态: http://localhost:${this.port}/status`);
                console.log(`📚 API文档: http://localhost:${this.port}/api/v1`);
            });

            return this.server;

        } catch (error) {
            console.error('❌ Instance Service 启动失败:', error.message);
            throw error;
        }
    }

    /**
     * 停止服务器
     */
    async stop() {
        try {
            if (this.server) {
                await new Promise((resolve) => {
                    this.server.close(resolve);
                });
            }
            
            // 清理资源
            if (this.instanceController && this.instanceController.resourceAllocator) {
                await this.instanceController.resourceAllocator.close();
            }
            
            console.log('✅ Instance Service 已停止');

        } catch (error) {
            console.error('❌ Instance Service 停止失败:', error.message);
            throw error;
        }
    }
}

module.exports = InstanceServiceApp;

// 如果直接运行此文件，启动服务器
if (require.main === module) {
    const app = new InstanceServiceApp();
    app.start().catch(error => {
        console.error('启动失败:', error.message);
        process.exit(1);
    });
    
    // 优雅关闭
    process.on('SIGTERM', async () => {
        console.log('收到SIGTERM信号，正在关闭服务...');
        await app.stop();
        process.exit(0);
    });
    
    process.on('SIGINT', async () => {
        console.log('收到SIGINT信号，正在关闭服务...');
        await app.stop();
        process.exit(0);
    });
}
