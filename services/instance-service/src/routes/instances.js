/**
 * Instance Routes - 实例管理路由定义
 * 将API路由映射到InstanceController的方法
 * 遵循RESTful API设计原则
 */

const express = require('express');
const router = express.Router();

/**
 * 初始化实例路由
 * @param {InstanceController} instanceController - 实例控制器实例
 * @returns {express.Router} 配置好的路由器
 */
function initializeInstanceRoutes(instanceController) {
    // 参数验证中间件
    const validateInstanceId = (req, res, next) => {
        const { id } = req.params;
        if (!id || typeof id !== 'string' || id.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INSTANCE_ID',
                    message: '实例ID不能为空且必须为字符串'
                }
            });
        }
        next();
    };

    // 请求体验证中间件
    const validateCreateInstanceBody = (req, res, next) => {
        const { config } = req.body;
        if (config && typeof config !== 'object') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_CONFIG',
                    message: '配置参数必须为对象类型'
                }
            });
        }
        next();
    };

    const validateBatchCreateBody = (req, res, next) => {
        const { count, config } = req.body;
        if (count && (typeof count !== 'number' || count < 1 || count > 20)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_BATCH_COUNT',
                    message: '批量创建数量必须在1-20之间'
                }
            });
        }
        if (config && typeof config !== 'object') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_CONFIG',
                    message: '配置参数必须为对象类型'
                }
            });
        }
        next();
    };

    // ==================== 实例管理路由 ====================

    /**
     * POST /api/v1/instances
     * 创建新实例
     */
    router.post('/', 
        validateCreateInstanceBody,
        instanceController.createInstance.bind(instanceController)
    );

    /**
     * GET /api/v1/instances/:id
     * 获取指定实例信息
     */
    router.get('/:id', 
        validateInstanceId,
        instanceController.getInstance.bind(instanceController)
    );

    /**
     * GET /api/v1/instances
     * 列出所有实例（支持分页和过滤）
     */
    router.get('/', 
        instanceController.listInstances.bind(instanceController)
    );

    /**
     * DELETE /api/v1/instances/:id
     * 删除指定实例
     */
    router.delete('/:id', 
        validateInstanceId,
        instanceController.deleteInstance.bind(instanceController)
    );

    // ==================== 实例操作路由 ====================

    /**
     * POST /api/v1/instances/:id/start
     * 启动指定实例
     */
    router.post('/:id/start', 
        validateInstanceId,
        instanceController.startInstance.bind(instanceController)
    );

    /**
     * POST /api/v1/instances/:id/stop
     * 停止指定实例
     */
    router.post('/:id/stop', 
        validateInstanceId,
        instanceController.stopInstance.bind(instanceController)
    );

    /**
     * POST /api/v1/instances/:id/restart
     * 重启指定实例
     */
    router.post('/:id/restart', 
        validateInstanceId,
        async (req, res) => {
            try {
                // 先停止实例
                await new Promise((resolve, reject) => {
                    const stopReq = { ...req };
                    const stopRes = {
                        status: () => ({ json: resolve }),
                        json: resolve
                    };
                    instanceController.stopInstance(stopReq, stopRes).catch(reject);
                });

                // 等待停止完成
                await new Promise(resolve => setTimeout(resolve, 2000));

                // 再启动实例
                await instanceController.startInstance(req, res);

            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: {
                        code: 'RESTART_INSTANCE_FAILED',
                        message: error.message
                    }
                });
            }
        }
    );

    // ==================== 批量操作路由 ====================

    /**
     * POST /api/v1/instances/batch
     * 批量创建实例
     */
    router.post('/batch', 
        validateBatchCreateBody,
        instanceController.batchCreateInstances.bind(instanceController)
    );

    /**
     * POST /api/v1/instances/batch/start
     * 批量启动实例
     */
    router.post('/batch/start', async (req, res) => {
        try {
            const { instance_ids } = req.body;
            
            if (!Array.isArray(instance_ids) || instance_ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_INSTANCE_IDS',
                        message: '实例ID列表不能为空'
                    }
                });
            }

            const results = [];
            const errors = [];

            // 并发启动实例
            const startPromises = instance_ids.map(async (id) => {
                try {
                    const mockReq = { params: { id } };
                    const mockRes = {
                        json: (data) => data,
                        status: () => ({ json: (data) => data })
                    };
                    
                    const result = await instanceController.startInstance(mockReq, mockRes);
                    results.push({ instance_id: id, result: 'success' });
                } catch (error) {
                    errors.push({ instance_id: id, error: error.message });
                }
            });

            await Promise.all(startPromises);

            res.json({
                success: true,
                message: `批量启动完成，成功: ${results.length}, 失败: ${errors.length}`,
                data: {
                    successful: results,
                    failed: errors,
                    summary: {
                        total: instance_ids.length,
                        successful: results.length,
                        failed: errors.length
                    }
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'BATCH_START_FAILED',
                    message: error.message
                }
            });
        }
    });

    /**
     * POST /api/v1/instances/batch/stop
     * 批量停止实例
     */
    router.post('/batch/stop', async (req, res) => {
        try {
            const { instance_ids } = req.body;
            
            if (!Array.isArray(instance_ids) || instance_ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_INSTANCE_IDS',
                        message: '实例ID列表不能为空'
                    }
                });
            }

            const results = [];
            const errors = [];

            // 并发停止实例
            const stopPromises = instance_ids.map(async (id) => {
                try {
                    const mockReq = { params: { id } };
                    const mockRes = {
                        json: (data) => data,
                        status: () => ({ json: (data) => data })
                    };
                    
                    const result = await instanceController.stopInstance(mockReq, mockRes);
                    results.push({ instance_id: id, result: 'success' });
                } catch (error) {
                    errors.push({ instance_id: id, error: error.message });
                }
            });

            await Promise.all(stopPromises);

            res.json({
                success: true,
                message: `批量停止完成，成功: ${results.length}, 失败: ${errors.length}`,
                data: {
                    successful: results,
                    failed: errors,
                    summary: {
                        total: instance_ids.length,
                        successful: results.length,
                        failed: errors.length
                    }
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'BATCH_STOP_FAILED',
                    message: error.message
                }
            });
        }
    });

    // ==================== 实例状态和监控路由 ====================

    /**
     * GET /api/v1/instances/:id/status
     * 获取实例状态
     */
    router.get('/:id/status', 
        validateInstanceId,
        async (req, res) => {
            try {
                const { id } = req.params;
                
                if (!instanceController.instances.has(id)) {
                    return res.status(404).json({
                        success: false,
                        error: {
                            code: 'INSTANCE_NOT_FOUND',
                            message: `实例 ${id} 不存在`
                        }
                    });
                }

                const instance = instanceController.instances.get(id);
                
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
    );

    /**
     * GET /api/v1/instances/:id/metrics
     * 获取实例性能指标
     */
    router.get('/:id/metrics', 
        validateInstanceId,
        async (req, res) => {
            try {
                const { id } = req.params;
                
                if (!instanceController.instances.has(id)) {
                    return res.status(404).json({
                        success: false,
                        error: {
                            code: 'INSTANCE_NOT_FOUND',
                            message: `实例 ${id} 不存在`
                        }
                    });
                }

                const metrics = await instanceController.getInstanceResourceUsage(id);
                
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
    );

    return router;
}

module.exports = initializeInstanceRoutes;
