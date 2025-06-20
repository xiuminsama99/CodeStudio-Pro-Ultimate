/**
 * Resource Service - 智能资源分配器
 * 基于原有Python实现的端口分配策略，升级为Kubernetes智能调度
 * 移除硬编码限制，支持50+实例的大规模部署
 */

const { v4: uuidv4 } = require('uuid');
const Redis = require('redis');

class ResourceAllocator {
    /**
     * 智能资源分配器 - 升级自原有端口分配策略
     * 移除硬编码限制，支持动态扩展
     */
    constructor(options = {}) {
        this.basePort = options.basePort || 8000;
        this.maxInstances = options.maxInstances || 100; // 移除硬编码限制
        this.portRangeSize = options.portRangeSize || 100;
        this.allocatedPorts = new Map();
        this.allocatedResources = new Map();
        
        // Redis客户端用于分布式状态管理
        this.redisClient = options.redisClient || null;
        this.initializeRedis();
    }

    /**
     * 初始化Redis连接 - 支持分布式状态管理
     */
    async initializeRedis() {
        if (process.env.REDIS_URL && !this.redisClient) {
            try {
                this.redisClient = Redis.createClient({
                    url: process.env.REDIS_URL
                });
                await this.redisClient.connect();
                console.log('✅ Redis连接成功 - 分布式资源管理已启用');
            } catch (error) {
                console.warn('⚠️ Redis连接失败，使用本地内存管理:', error.message);
                this.redisClient = null;
            }
        }
    }

    /**
     * 动态端口分配 - 升级自原有逻辑，支持大规模部署
     * 保留核心算法，移除实例数量限制
     */
    async allocatePortRange(instanceId) {
        if (this.allocatedPorts.has(instanceId)) {
            return this.allocatedPorts.get(instanceId);
        }

        // 获取当前已分配的实例数量
        const allocatedCount = await this.getAllocatedInstancesCount();
        
        // 检查是否超过最大实例限制（动态可调整）
        if (allocatedCount >= this.maxInstances) {
            throw new Error(`已达到最大实例限制: ${this.maxInstances}`);
        }

        // 计算端口范围（每个实例分配portRangeSize个端口）
        const webPort = this.basePort + (allocatedCount * this.portRangeSize);
        const callbackPortStart = 9000 + (allocatedCount * this.portRangeSize);

        const allocation = {
            instance_id: instanceId,
            web_port: webPort,
            callback_port: callbackPortStart,
            callback_range_start: callbackPortStart,
            callback_range_end: callbackPortStart + 50,
            allocated_at: new Date().toISOString(),
            port_range_size: this.portRangeSize
        };

        // 存储分配信息
        this.allocatedPorts.set(instanceId, allocation);
        
        // 如果有Redis，同步到分布式存储
        if (this.redisClient) {
            await this.redisClient.hSet(
                `port_allocations:${instanceId}`,
                allocation
            );
        }

        return allocation;
    }

    /**
     * 智能资源分配 - 基于Kubernetes调度
     * 升级自原有资源管理策略
     */
    async allocateKubernetesResources(instanceId, requirements = {}) {
        const defaultRequirements = {
            cpu_request: '500m',
            memory_request: '1Gi',
            cpu_limit: '2',
            memory_limit: '4Gi',
            storage: '10Gi'
        };

        const finalRequirements = { ...defaultRequirements, ...requirements };

        // 生成Kubernetes部署配置
        const deployment = {
            apiVersion: 'apps/v1',
            kind: 'Deployment',
            metadata: {
                name: `codestudio-instance-${instanceId}`,
                namespace: 'codestudio',
                labels: {
                    app: 'codestudio-instance',
                    instance_id: instanceId,
                    managed_by: 'resource-service'
                }
            },
            spec: {
                replicas: 1,
                selector: {
                    matchLabels: {
                        app: 'codestudio-instance',
                        instance_id: instanceId
                    }
                },
                template: {
                    metadata: {
                        labels: {
                            app: 'codestudio-instance',
                            instance_id: instanceId
                        }
                    },
                    spec: {
                        containers: [{
                            name: 'vscode',
                            image: 'codestudio/vscode:latest',
                            resources: {
                                requests: {
                                    cpu: finalRequirements.cpu_request,
                                    memory: finalRequirements.memory_request
                                },
                                limits: {
                                    cpu: finalRequirements.cpu_limit,
                                    memory: finalRequirements.memory_limit
                                }
                            },
                            env: [
                                {
                                    name: 'INSTANCE_ID',
                                    value: instanceId
                                },
                                {
                                    name: 'CONTAINER_ROOT',
                                    value: '/app'
                                },
                                {
                                    name: 'NODE_ENV',
                                    value: 'production'
                                }
                            ],
                            volumeMounts: [{
                                name: 'instance-storage',
                                mountPath: '/app/instances'
                            }]
                        }],
                        volumes: [{
                            name: 'instance-storage',
                            persistentVolumeClaim: {
                                claimName: `instance-pvc-${instanceId}`
                            }
                        }]
                    }
                }
            }
        };

        // 存储资源分配信息
        const resourceAllocation = {
            instance_id: instanceId,
            kubernetes_deployment: deployment,
            requirements: finalRequirements,
            allocated_at: new Date().toISOString(),
            status: 'allocated'
        };

        this.allocatedResources.set(instanceId, resourceAllocation);

        // 同步到Redis
        if (this.redisClient) {
            await this.redisClient.hSet(
                `resource_allocations:${instanceId}`,
                JSON.stringify(resourceAllocation)
            );
        }

        return resourceAllocation;
    }

    /**
     * 释放端口分配 - 保留原有逻辑
     */
    async deallocatePorts(instanceId) {
        const existed = this.allocatedPorts.has(instanceId);
        
        if (existed) {
            this.allocatedPorts.delete(instanceId);
            
            // 从Redis中删除
            if (this.redisClient) {
                await this.redisClient.del(`port_allocations:${instanceId}`);
            }
        }
        
        return existed;
    }

    /**
     * 释放资源分配
     */
    async deallocateResources(instanceId) {
        const existed = this.allocatedResources.has(instanceId);
        
        if (existed) {
            this.allocatedResources.delete(instanceId);
            
            // 从Redis中删除
            if (this.redisClient) {
                await this.redisClient.del(`resource_allocations:${instanceId}`);
            }
        }
        
        return existed;
    }

    /**
     * 获取资源使用情况 - 升级为分布式版本
     */
    async getResourceUsage() {
        let allocatedInstances = this.allocatedPorts.size;
        
        // 如果有Redis，从分布式存储获取准确数据
        if (this.redisClient) {
            try {
                const keys = await this.redisClient.keys('port_allocations:*');
                allocatedInstances = keys.length;
            } catch (error) {
                console.warn('获取Redis数据失败，使用本地数据:', error.message);
            }
        }

        return {
            allocated_instances: allocatedInstances,
            max_instances: this.maxInstances,
            utilization: allocatedInstances / this.maxInstances,
            available_instances: this.maxInstances - allocatedInstances,
            port_range_size: this.portRangeSize,
            base_port: this.basePort
        };
    }

    /**
     * 获取已分配实例数量
     */
    async getAllocatedInstancesCount() {
        if (this.redisClient) {
            try {
                const keys = await this.redisClient.keys('port_allocations:*');
                return keys.length;
            } catch (error) {
                console.warn('获取Redis实例数量失败:', error.message);
            }
        }
        
        return this.allocatedPorts.size;
    }

    /**
     * 检查端口是否可用
     */
    async isPortAvailable(port) {
        // 检查本地分配
        for (const allocation of this.allocatedPorts.values()) {
            if (port >= allocation.callback_range_start && 
                port <= allocation.callback_range_end) {
                return false;
            }
            if (port === allocation.web_port) {
                return false;
            }
        }

        // 如果有Redis，检查分布式分配
        if (this.redisClient) {
            try {
                const keys = await this.redisClient.keys('port_allocations:*');
                for (const key of keys) {
                    const allocation = await this.redisClient.hGetAll(key);
                    const rangeStart = parseInt(allocation.callback_range_start);
                    const rangeEnd = parseInt(allocation.callback_range_end);
                    const webPort = parseInt(allocation.web_port);
                    
                    if ((port >= rangeStart && port <= rangeEnd) || port === webPort) {
                        return false;
                    }
                }
            } catch (error) {
                console.warn('检查Redis端口状态失败:', error.message);
            }
        }

        return true;
    }

    /**
     * 优化资源分配 - 新增智能优化功能
     */
    async optimizeResourceAllocation() {
        const usage = await this.getResourceUsage();
        const optimizations = [];

        // 如果利用率过高，建议扩容
        if (usage.utilization > 0.8) {
            optimizations.push({
                type: 'scale_up',
                current_max: this.maxInstances,
                recommended_max: Math.ceil(this.maxInstances * 1.5),
                reason: '实例利用率过高，建议扩容'
            });
        }

        // 如果利用率过低，建议缩容
        if (usage.utilization < 0.3 && this.maxInstances > 20) {
            optimizations.push({
                type: 'scale_down',
                current_max: this.maxInstances,
                recommended_max: Math.max(20, Math.ceil(this.maxInstances * 0.7)),
                reason: '实例利用率过低，建议缩容以节省资源'
            });
        }

        return {
            current_usage: usage,
            optimizations: optimizations,
            estimated_improvement: this._calculateImprovement(optimizations)
        };
    }

    /**
     * 计算优化改进效果
     */
    _calculateImprovement(optimizations) {
        if (optimizations.length === 0) {
            return { resource_savings: 0, performance_improvement: 0 };
        }

        let resourceSavings = 0;
        let performanceImprovement = 0;

        for (const opt of optimizations) {
            if (opt.type === 'scale_down') {
                const reduction = opt.current_max - opt.recommended_max;
                resourceSavings += (reduction / opt.current_max) * 100;
            } else if (opt.type === 'scale_up') {
                const increase = opt.recommended_max - opt.current_max;
                performanceImprovement += (increase / opt.current_max) * 100;
            }
        }

        return {
            resource_savings: Math.round(resourceSavings),
            performance_improvement: Math.round(performanceImprovement)
        };
    }

    /**
     * 生成机器ID - 保留原有逻辑
     */
    generateMachineId() {
        return uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
    }

    /**
     * 生成设备ID - 保留原有逻辑
     */
    generateDeviceId() {
        return uuidv4();
    }

    /**
     * 关闭资源分配器
     */
    async close() {
        if (this.redisClient) {
            await this.redisClient.quit();
        }
    }
}

module.exports = ResourceAllocator;
