/**
 * Service Client - 微服务间HTTP通信客户端
 * 提供与Resource Service和Path Service的HTTP API通信
 * 实现真正的微服务架构，替代直接模块引用
 */

const http = require('http');
const https = require('https');

class ServiceClient {
    constructor() {
        this.services = {
            resource: {
                host: process.env.RESOURCE_SERVICE_HOST || 'localhost',
                port: process.env.RESOURCE_SERVICE_PORT || 3001,
                protocol: process.env.RESOURCE_SERVICE_PROTOCOL || 'http'
            },
            path: {
                host: process.env.PATH_SERVICE_HOST || 'localhost',
                port: process.env.PATH_SERVICE_PORT || 3002,
                protocol: process.env.PATH_SERVICE_PROTOCOL || 'http'
            }
        };
        
        this.timeout = parseInt(process.env.SERVICE_TIMEOUT || '10000');
        console.log('✅ ServiceClient 初始化完成');
    }

    /**
     * 发送HTTP请求的通用方法
     */
    async makeRequest(service, path, method = 'GET', data = null) {
        return new Promise((resolve, reject) => {
            const serviceConfig = this.services[service];
            if (!serviceConfig) {
                return reject(new Error(`未知的服务: ${service}`));
            }

            const options = {
                hostname: serviceConfig.host,
                port: serviceConfig.port,
                path: path,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'instance-service/1.0.0'
                },
                timeout: this.timeout
            };

            if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                const jsonData = JSON.stringify(data);
                options.headers['Content-Length'] = Buffer.byteLength(jsonData);
            }

            const client = serviceConfig.protocol === 'https' ? https : http;
            const req = client.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const parsedData = JSON.parse(responseData);
                        
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(parsedData);
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}: ${parsedData.error?.message || 'Unknown error'}`));
                        }
                    } catch (parseError) {
                        reject(new Error(`JSON解析失败: ${parseError.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`请求失败: ${error.message}`));
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error(`请求超时 (${this.timeout}ms)`));
            });

            if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    // ==================== Resource Service API 调用 ====================

    /**
     * 分配端口范围
     */
    async allocatePortRange(instanceId, portCount = 10) {
        try {
            const response = await this.makeRequest('resource', '/api/v1/ports/allocate', 'POST', {
                instanceId: instanceId,
                portCount: portCount
            });
            
            return response.data;
        } catch (error) {
            throw new Error(`端口分配失败: ${error.message}`);
        }
    }

    /**
     * 分配Kubernetes资源
     */
    async allocateKubernetesResources(instanceId, requirements = {}) {
        try {
            const response = await this.makeRequest('resource', '/api/v1/kubernetes/allocate', 'POST', {
                instanceId: instanceId,
                requirements: requirements
            });
            
            return response.data;
        } catch (error) {
            throw new Error(`Kubernetes资源分配失败: ${error.message}`);
        }
    }

    /**
     * 释放端口分配
     */
    async deallocatePorts(instanceId) {
        try {
            const response = await this.makeRequest('resource', `/api/v1/ports/${instanceId}`, 'DELETE');
            return response.data;
        } catch (error) {
            throw new Error(`端口释放失败: ${error.message}`);
        }
    }

    /**
     * 释放Kubernetes资源
     */
    async deallocateKubernetesResources(instanceId) {
        try {
            const response = await this.makeRequest('resource', `/api/v1/kubernetes/${instanceId}`, 'DELETE');
            return response.data;
        } catch (error) {
            throw new Error(`Kubernetes资源释放失败: ${error.message}`);
        }
    }

    /**
     * 获取资源使用统计
     */
    async getResourceUsage() {
        try {
            const response = await this.makeRequest('resource', '/api/v1/usage', 'GET');
            return response.data;
        } catch (error) {
            throw new Error(`获取资源使用统计失败: ${error.message}`);
        }
    }

    // ==================== Path Service API 调用 ====================

    /**
     * 创建实例路径
     */
    async createInstancePaths(instanceId) {
        try {
            const response = await this.makeRequest('path', `/api/v1/instances/${instanceId}/paths`, 'POST');
            return response.data;
        } catch (error) {
            throw new Error(`实例路径创建失败: ${error.message}`);
        }
    }

    /**
     * 获取实例路径信息
     */
    async getInstancePaths(instanceId) {
        try {
            const response = await this.makeRequest('path', `/api/v1/instances/${instanceId}/paths`, 'GET');
            return response.data;
        } catch (error) {
            throw new Error(`获取实例路径失败: ${error.message}`);
        }
    }

    /**
     * 解析动态路径
     */
    async resolvePath(inputPath, basePath = 'project_root') {
        try {
            const response = await this.makeRequest('path', '/api/v1/resolve', 'POST', {
                inputPath: inputPath,
                basePath: basePath
            });
            return response.data;
        } catch (error) {
            throw new Error(`路径解析失败: ${error.message}`);
        }
    }

    /**
     * 验证路径安全性
     */
    async validatePath(inputPath, allowedBasePaths = ['project_root']) {
        try {
            const response = await this.makeRequest('path', '/api/v1/validate', 'POST', {
                inputPath: inputPath,
                allowedBasePaths: allowedBasePaths
            });
            return response.data;
        } catch (error) {
            throw new Error(`路径验证失败: ${error.message}`);
        }
    }

    // ==================== 服务健康检查 ====================

    /**
     * 检查Resource Service健康状态
     */
    async checkResourceServiceHealth() {
        try {
            const response = await this.makeRequest('resource', '/health', 'GET');
            return response.status === 'healthy';
        } catch (error) {
            console.warn(`Resource Service健康检查失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 检查Path Service健康状态
     */
    async checkPathServiceHealth() {
        try {
            const response = await this.makeRequest('path', '/health', 'GET');
            return response.status === 'healthy';
        } catch (error) {
            console.warn(`Path Service健康检查失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 检查所有依赖服务的健康状态
     */
    async checkAllServicesHealth() {
        const results = {
            resource_service: await this.checkResourceServiceHealth(),
            path_service: await this.checkPathServiceHealth()
        };

        const allHealthy = Object.values(results).every(status => status === true);
        
        return {
            all_healthy: allHealthy,
            services: results,
            timestamp: new Date().toISOString()
        };
    }

    // ==================== 降级处理 ====================

    /**
     * 获取降级的端口分配（本地实现）
     */
    getFallbackPortAllocation(instanceId) {
        const basePort = 8000 + (instanceId.hashCode() % 1000);
        return {
            instance_id: instanceId,
            web_port: basePort,
            callback_port: basePort + 1,
            debug_port: basePort + 2,
            allocated_at: new Date().toISOString(),
            fallback: true
        };
    }

    /**
     * 获取降级的路径配置（本地实现）
     */
    getFallbackInstancePaths(instanceId) {
        const basePath = `./instances/${instanceId}`;
        return {
            instance_id: instanceId,
            base_path: basePath,
            user_data: `${basePath}/user-data`,
            workspace: `${basePath}/workspace`,
            extensions: `${basePath}/extensions`,
            logs: `${basePath}/logs`,
            temp: `${basePath}/temp`,
            config: `${basePath}/config`,
            fallback: true
        };
    }
}

// 为字符串添加hashCode方法（用于降级处理）
String.prototype.hashCode = function() {
    let hash = 0;
    if (this.length === 0) return hash;
    for (let i = 0; i < this.length; i++) {
        const char = this.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash);
};

module.exports = ServiceClient;
