/**
 * Resource Service - Express应用主文件
 * 提供资源分配的REST API接口
 * 支持端口分配、Kubernetes资源分配等功能
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const ResourceAllocator = require('./core/resource_allocator');

class ResourceServiceApp {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3001;
        this.resourceAllocator = new ResourceAllocator();
        
        this.initializeMiddleware();
        this.initializeRoutes();
        this.initializeErrorHandling();
        
        console.log('✅ Resource Service 应用初始化完成');
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
        
        // 请求日志
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
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
                service: 'resource-service',
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            });
        });

        // API路由前缀
        const apiRouter = express.Router();
        
        // 端口分配相关API
        apiRouter.post('/ports/allocate', this.allocatePorts.bind(this));
        apiRouter.delete('/ports/:instanceId', this.deallocatePorts.bind(this));
        apiRouter.get('/ports/:instanceId', this.getPortAllocation.bind(this));
        
        // Kubernetes资源分配API
        apiRouter.post('/kubernetes/allocate', this.allocateKubernetesResources.bind(this));
        apiRouter.delete('/kubernetes/:instanceId', this.deallocateKubernetesResources.bind(this));
        apiRouter.get('/kubernetes/:instanceId', this.getKubernetesAllocation.bind(this));
        
        // 资源使用统计API
        apiRouter.get('/usage', this.getResourceUsage.bind(this));
        apiRouter.get('/optimization', this.getOptimizationSuggestions.bind(this));
        
        // 工具API
        apiRouter.get('/ports/check/:port', this.checkPortAvailability.bind(this));
        apiRouter.post('/ids/generate', this.generateIds.bind(this));
        
        this.app.use('/api/v1', apiRouter);
        
        // 根路径
        this.app.get('/', (req, res) => {
            res.json({
                message: 'CodeStudio Resource Service',
                version: '1.0.0',
                endpoints: {
                    health: '/health',
                    api: '/api/v1',
                    docs: '/api/v1/docs'
                }
            });
        });
    }

    /**
     * 分配端口范围
     */
    async allocatePorts(req, res) {
        try {
            const { instanceId, portCount } = req.body;
            
            if (!instanceId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_INSTANCE_ID',
                        message: '实例ID不能为空'
                    }
                });
            }

            const allocation = await this.resourceAllocator.allocatePortRange(instanceId, portCount);
            
            res.status(201).json({
                success: true,
                message: '端口分配成功',
                data: allocation
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'PORT_ALLOCATION_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 释放端口分配
     */
    async deallocatePorts(req, res) {
        try {
            const { instanceId } = req.params;
            
            const success = await this.resourceAllocator.deallocatePorts(instanceId);
            
            res.json({
                success: true,
                message: success ? '端口释放成功' : '实例未分配端口',
                data: {
                    instanceId: instanceId,
                    deallocated: success
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'PORT_DEALLOCATION_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 获取端口分配信息
     */
    async getPortAllocation(req, res) {
        try {
            const { instanceId } = req.params;
            
            const allocation = this.resourceAllocator.allocatedPorts.get(instanceId);
            
            if (!allocation) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'ALLOCATION_NOT_FOUND',
                        message: `实例 ${instanceId} 未分配端口`
                    }
                });
            }

            res.json({
                success: true,
                data: allocation
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'GET_ALLOCATION_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 分配Kubernetes资源
     */
    async allocateKubernetesResources(req, res) {
        try {
            const { instanceId, requirements } = req.body;
            
            if (!instanceId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_INSTANCE_ID',
                        message: '实例ID不能为空'
                    }
                });
            }

            const allocation = await this.resourceAllocator.allocateKubernetesResources(instanceId, requirements);
            
            res.status(201).json({
                success: true,
                message: 'Kubernetes资源分配成功',
                data: allocation
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'K8S_ALLOCATION_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 释放Kubernetes资源
     */
    async deallocateKubernetesResources(req, res) {
        try {
            const { instanceId } = req.params;
            
            const success = await this.resourceAllocator.deallocateResources(instanceId);
            
            res.json({
                success: true,
                message: success ? 'Kubernetes资源释放成功' : '实例未分配资源',
                data: {
                    instanceId: instanceId,
                    deallocated: success
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'K8S_DEALLOCATION_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 获取Kubernetes资源分配信息
     */
    async getKubernetesAllocation(req, res) {
        try {
            const { instanceId } = req.params;
            
            const allocation = this.resourceAllocator.allocatedResources.get(instanceId);
            
            if (!allocation) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'ALLOCATION_NOT_FOUND',
                        message: `实例 ${instanceId} 未分配Kubernetes资源`
                    }
                });
            }

            res.json({
                success: true,
                data: allocation
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'GET_K8S_ALLOCATION_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 获取资源使用统计
     */
    async getResourceUsage(req, res) {
        try {
            const usage = await this.resourceAllocator.getResourceUsage();
            
            res.json({
                success: true,
                data: usage
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'GET_USAGE_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 获取优化建议
     */
    async getOptimizationSuggestions(req, res) {
        try {
            const suggestions = await this.resourceAllocator.optimizeResourceAllocation();
            
            res.json({
                success: true,
                data: suggestions
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'GET_OPTIMIZATION_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 检查端口可用性
     */
    async checkPortAvailability(req, res) {
        try {
            const { port } = req.params;
            const portNumber = parseInt(port);
            
            if (isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_PORT',
                        message: '端口号必须在1-65535之间'
                    }
                });
            }

            const available = await this.resourceAllocator.isPortAvailable(portNumber);
            
            res.json({
                success: true,
                data: {
                    port: portNumber,
                    available: available
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'CHECK_PORT_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 生成ID
     */
    async generateIds(req, res) {
        try {
            const { type, count = 1 } = req.body;
            
            const ids = [];
            for (let i = 0; i < count; i++) {
                if (type === 'machine') {
                    ids.push(this.resourceAllocator.generateMachineId());
                } else if (type === 'device') {
                    ids.push(this.resourceAllocator.generateDeviceId());
                } else {
                    return res.status(400).json({
                        success: false,
                        error: {
                            code: 'INVALID_ID_TYPE',
                            message: 'ID类型必须是 machine 或 device'
                        }
                    });
                }
            }
            
            res.json({
                success: true,
                data: {
                    type: type,
                    count: count,
                    ids: ids
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'GENERATE_IDS_FAILED',
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
                    message: `路径 ${req.originalUrl} 不存在`
                }
            });
        });

        // 全局错误处理
        this.app.use((error, req, res, next) => {
            console.error('未处理的错误:', error);
            
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: '服务器内部错误'
                }
            });
        });
    }

    /**
     * 启动服务器
     */
    async start() {
        try {
            // 初始化ResourceAllocator
            await this.resourceAllocator.initializeRedis();
            
            // 启动HTTP服务器
            this.server = this.app.listen(this.port, () => {
                console.log(`✅ Resource Service 启动成功`);
                console.log(`🌐 服务地址: http://localhost:${this.port}`);
                console.log(`📋 健康检查: http://localhost:${this.port}/health`);
                console.log(`📚 API文档: http://localhost:${this.port}/api/v1`);
            });

            return this.server;

        } catch (error) {
            console.error('❌ Resource Service 启动失败:', error.message);
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
            
            await this.resourceAllocator.close();
            console.log('✅ Resource Service 已停止');

        } catch (error) {
            console.error('❌ Resource Service 停止失败:', error.message);
            throw error;
        }
    }
}

module.exports = ResourceServiceApp;

// 如果直接运行此文件，启动服务器
if (require.main === module) {
    const app = new ResourceServiceApp();
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
