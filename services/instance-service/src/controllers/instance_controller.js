/**
 * Instance Controller - 实例管理控制器
 * 基于原有实例管理逻辑，升级为微服务架构
 * 支持50+实例的大规模管理
 * 使用HTTP API调用其他微服务，实现真正的服务解耦
 */

const ServiceClient = require('../services/service_client');

class InstanceController {
    constructor() {
        this.serviceClient = new ServiceClient();
        this.instances = new Map();
        this.initializeController();
    }

    async initializeController() {
        try {
            // 检查依赖服务的健康状态
            const healthCheck = await this.serviceClient.checkAllServicesHealth();

            if (healthCheck.all_healthy) {
                console.log('✅ 实例控制器初始化完成 - 所有依赖服务正常');
            } else {
                console.warn('⚠️ 实例控制器初始化完成 - 部分依赖服务不可用，将使用降级模式');
                console.warn('服务状态:', healthCheck.services);
            }
        } catch (error) {
            console.error('❌ 实例控制器初始化失败:', error.message);
            console.warn('⚠️ 将使用降级模式运行');
        }
    }

    /**
     * 创建新实例 - 升级自原有实例创建逻辑
     */
    async createInstance(req, res) {
        try {
            const { config = {} } = req.body;
            const instanceId = config.id || this.generateInstanceId();

            // 检查实例是否已存在
            if (this.instances.has(instanceId)) {
                return res.status(409).json({
                    success: false,
                    error: {
                        code: 'INSTANCE_EXISTS',
                        message: `实例 ${instanceId} 已存在`
                    }
                });
            }

            // 分配资源（通过HTTP API调用）
            let portAllocation, resourceAllocation, instancePaths;

            try {
                portAllocation = await this.serviceClient.allocatePortRange(instanceId);
            } catch (error) {
                console.warn(`端口分配API调用失败，使用降级方案: ${error.message}`);
                portAllocation = this.serviceClient.getFallbackPortAllocation(instanceId);
            }

            try {
                resourceAllocation = await this.serviceClient.allocateKubernetesResources(instanceId, config.resources);
            } catch (error) {
                console.warn(`Kubernetes资源分配API调用失败: ${error.message}`);
                // 使用默认资源配置作为降级
                resourceAllocation = {
                    instance_id: instanceId,
                    namespace: `codestudio-${instanceId}`,
                    resources: config.resources || {},
                    fallback: true
                };
            }

            // 创建实例路径（通过HTTP API调用）
            try {
                instancePaths = await this.serviceClient.createInstancePaths(instanceId);
            } catch (error) {
                console.warn(`实例路径创建API调用失败，使用降级方案: ${error.message}`);
                instancePaths = this.serviceClient.getFallbackInstancePaths(instanceId);
            }

            // 创建实例对象
            const instance = {
                id: instanceId,
                status: 'created',
                created_at: new Date().toISOString(),
                config: config,
                ports: portAllocation,
                resources: resourceAllocation,
                paths: instancePaths,
                metadata: {
                    version: '1.0.0',
                    architecture: 'microservice',
                    managed_by: 'instance-service'
                }
            };

            // 存储实例信息
            this.instances.set(instanceId, instance);

            res.status(201).json({
                success: true,
                message: '实例创建成功',
                data: {
                    instance: instance,
                    next_steps: [
                        '调用 /api/instances/{id}/start 启动实例',
                        '通过 /api/instances/{id}/status 监控状态'
                    ]
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'INSTANCE_CREATION_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 获取实例信息
     */
    async getInstance(req, res) {
        try {
            const { id } = req.params;

            if (!this.instances.has(id)) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'INSTANCE_NOT_FOUND',
                        message: `实例 ${id} 不存在`
                    }
                });
            }

            const instance = this.instances.get(id);

            res.json({
                success: true,
                data: {
                    instance: instance,
                    resource_usage: await this.getInstanceResourceUsage(id)
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'GET_INSTANCE_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 启动实例 - 升级为异步启动，支持大规模并发
     */
    async startInstance(req, res) {
        try {
            const { id } = req.params;

            if (!this.instances.has(id)) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'INSTANCE_NOT_FOUND',
                        message: `实例 ${id} 不存在`
                    }
                });
            }

            const instance = this.instances.get(id);

            if (instance.status === 'running') {
                return res.json({
                    success: true,
                    message: '实例已在运行中',
                    data: { instance: instance }
                });
            }

            // 更新状态为启动中
            instance.status = 'starting';
            instance.started_at = new Date().toISOString();

            // 异步启动实例（避免阻塞）
            this.startInstanceAsync(id).catch(error => {
                console.error(`实例 ${id} 启动失败:`, error.message);
                instance.status = 'failed';
                instance.error = error.message;
            });

            res.json({
                success: true,
                message: '实例启动中',
                data: {
                    instance: instance,
                    estimated_startup_time: '30-60秒'
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'START_INSTANCE_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 异步启动实例
     */
    async startInstanceAsync(instanceId) {
        const instance = this.instances.get(instanceId);

        try {
            // 模拟Kubernetes部署过程
            await this.deployToKubernetes(instance);

            // 等待实例就绪
            await this.waitForInstanceReady(instanceId);

            // 更新状态
            instance.status = 'running';
            instance.ready_at = new Date().toISOString();

            console.log(`✅ 实例 ${instanceId} 启动成功`);

        } catch (error) {
            instance.status = 'failed';
            instance.error = error.message;
            throw error;
        }
    }

    /**
     * 停止实例
     */
    async stopInstance(req, res) {
        try {
            const { id } = req.params;

            if (!this.instances.has(id)) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'INSTANCE_NOT_FOUND',
                        message: `实例 ${id} 不存在`
                    }
                });
            }

            const instance = this.instances.get(id);

            // 更新状态
            instance.status = 'stopping';
            instance.stopped_at = new Date().toISOString();

            // 异步停止实例
            this.stopInstanceAsync(id);

            res.json({
                success: true,
                message: '实例停止中',
                data: { instance: instance }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'STOP_INSTANCE_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 删除实例
     */
    async deleteInstance(req, res) {
        try {
            const { id } = req.params;

            if (!this.instances.has(id)) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'INSTANCE_NOT_FOUND',
                        message: `实例 ${id} 不存在`
                    }
                });
            }

            const instance = this.instances.get(id);

            // 如果实例正在运行，先停止
            if (instance.status === 'running') {
                await this.stopInstanceAsync(id);
            }

            // 释放资源（通过HTTP API调用）
            try {
                await this.serviceClient.deallocatePorts(id);
            } catch (error) {
                console.warn(`端口释放API调用失败: ${error.message}`);
            }

            try {
                await this.serviceClient.deallocateKubernetesResources(id);
            } catch (error) {
                console.warn(`Kubernetes资源释放API调用失败: ${error.message}`);
            }

            // 删除实例
            this.instances.delete(id);

            res.json({
                success: true,
                message: '实例删除成功',
                data: {
                    deleted_instance_id: id,
                    deleted_at: new Date().toISOString()
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'DELETE_INSTANCE_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 列出所有实例
     */
    async listInstances(req, res) {
        try {
            const { status, limit = 50, offset = 0 } = req.query;

            let instances = Array.from(this.instances.values());

            // 状态过滤
            if (status) {
                instances = instances.filter(instance => instance.status === status);
            }

            // 分页
            const total = instances.length;
            const paginatedInstances = instances.slice(offset, offset + parseInt(limit));

            // 获取资源使用统计（通过HTTP API调用）
            let resourceUsage;
            try {
                resourceUsage = await this.serviceClient.getResourceUsage();
            } catch (error) {
                console.warn(`资源使用统计API调用失败: ${error.message}`);
                resourceUsage = {
                    total_instances: this.instances.size,
                    fallback: true,
                    message: '资源统计服务不可用'
                };
            }

            res.json({
                success: true,
                data: {
                    instances: paginatedInstances,
                    pagination: {
                        total: total,
                        limit: parseInt(limit),
                        offset: parseInt(offset),
                        has_more: offset + parseInt(limit) < total
                    },
                    resource_usage: resourceUsage
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'LIST_INSTANCES_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 批量创建实例 - 新增功能，支持大规模部署
     */
    async batchCreateInstances(req, res) {
        try {
            const { count = 1, config = {} } = req.body;

            if (count > 20) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'BATCH_SIZE_EXCEEDED',
                        message: '单次批量创建不能超过20个实例'
                    }
                });
            }

            const createdInstances = [];
            const errors = [];

            // 并发创建实例
            const createPromises = Array.from({ length: count }, async (_, index) => {
                try {
                    const instanceId = this.generateInstanceId();
                    const instanceConfig = { ...config, id: instanceId };

                    // 通过HTTP API调用创建实例资源
                    let portAllocation, resourceAllocation, instancePaths;

                    try {
                        portAllocation = await this.serviceClient.allocatePortRange(instanceId);
                    } catch (error) {
                        portAllocation = this.serviceClient.getFallbackPortAllocation(instanceId);
                    }

                    try {
                        resourceAllocation = await this.serviceClient.allocateKubernetesResources(instanceId, config.resources);
                    } catch (error) {
                        resourceAllocation = { instance_id: instanceId, fallback: true };
                    }

                    try {
                        instancePaths = await this.serviceClient.createInstancePaths(instanceId);
                    } catch (error) {
                        instancePaths = this.serviceClient.getFallbackInstancePaths(instanceId);
                    }

                    const instance = {
                        id: instanceId,
                        status: 'created',
                        created_at: new Date().toISOString(),
                        config: instanceConfig,
                        ports: portAllocation,
                        resources: resourceAllocation,
                        paths: instancePaths,
                        batch_index: index
                    };

                    this.instances.set(instanceId, instance);
                    createdInstances.push(instance);

                } catch (error) {
                    errors.push({
                        index: index,
                        error: error.message
                    });
                }
            });

            await Promise.all(createPromises);

            res.status(201).json({
                success: true,
                message: `批量创建完成，成功: ${createdInstances.length}, 失败: ${errors.length}`,
                data: {
                    created_instances: createdInstances,
                    errors: errors,
                    summary: {
                        requested: count,
                        created: createdInstances.length,
                        failed: errors.length
                    }
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'BATCH_CREATE_FAILED',
                    message: error.message
                }
            });
        }
    }

    // 辅助方法

    generateInstanceId() {
        return `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    async deployToKubernetes(instance) {
        // 模拟Kubernetes部署
        return new Promise(resolve => setTimeout(resolve, 2000));
    }

    async waitForInstanceReady(instanceId) {
        // 模拟等待实例就绪
        return new Promise(resolve => setTimeout(resolve, 3000));
    }

    async stopInstanceAsync(instanceId) {
        const instance = this.instances.get(instanceId);
        if (instance) {
            instance.status = 'stopped';
        }
    }

    async getInstanceResourceUsage(instanceId) {
        // 模拟获取实例资源使用情况
        return {
            cpu_usage: Math.random() * 100,
            memory_usage: Math.random() * 100,
            network_io: Math.random() * 1000,
            disk_io: Math.random() * 500
        };
    }
}

module.exports = InstanceController;
