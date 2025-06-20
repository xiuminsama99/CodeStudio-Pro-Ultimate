/**
 * Grafana仪表板管理器
 * 负责管理和配置Grafana仪表板
 */

const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class DashboardManager extends EventEmitter {
    constructor(options = {}) {
        super();
        this.grafanaUrl = options.grafanaUrl || 'http://localhost:3000';
        this.apiKey = options.apiKey || '';
        this.dashboardsDir = options.dashboardsDir || path.join(__dirname, '../config/grafana/dashboards');
        this.datasourcesDir = options.datasourcesDir || path.join(__dirname, '../config/grafana/datasources');
        this.dashboards = new Map();
        this.isInitialized = false;
        
        console.log('✅ Grafana仪表板管理器初始化完成');
    }

    /**
     * 初始化仪表板管理器
     */
    async initialize() {
        try {
            // 加载仪表板配置
            await this.loadDashboards();
            
            this.isInitialized = true;
            console.log('🚀 Grafana仪表板管理器初始化成功');
            this.emit('dashboard_manager_initialized');
            
            return { success: true };
        } catch (error) {
            console.error('❌ Grafana仪表板管理器初始化失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 加载仪表板配置
     */
    async loadDashboards() {
        try {
            const files = await fs.readdir(this.dashboardsDir);
            const dashboardFiles = files.filter(file => file.endsWith('.json'));
            
            for (const file of dashboardFiles) {
                const filePath = path.join(this.dashboardsDir, file);
                const data = await fs.readFile(filePath, 'utf8');
                const dashboard = JSON.parse(data);
                
                const dashboardId = path.basename(file, '.json');
                this.dashboards.set(dashboardId, {
                    id: dashboardId,
                    title: dashboard.dashboard.title,
                    config: dashboard,
                    filePath: filePath,
                    lastModified: new Date()
                });
            }
            
            console.log(`📊 加载了 ${dashboardFiles.length} 个仪表板配置`);
        } catch (error) {
            console.error('❌ 加载仪表板配置失败:', error);
            throw error;
        }
    }

    /**
     * 获取仪表板配置
     */
    getDashboard(dashboardId) {
        try {
            const dashboard = this.dashboards.get(dashboardId);
            
            if (!dashboard) {
                return {
                    success: false,
                    error: '仪表板不存在'
                };
            }

            console.log(`📊 获取仪表板: ${dashboardId}`);
            this.emit('dashboard_retrieved', { dashboardId });

            return {
                success: true,
                dashboard: dashboard
            };

        } catch (error) {
            console.error(`❌ 获取仪表板失败 (${dashboardId}):`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 获取所有仪表板
     */
    getAllDashboards() {
        try {
            const dashboards = {};
            for (const [id, dashboard] of this.dashboards.entries()) {
                dashboards[id] = {
                    id: dashboard.id,
                    title: dashboard.title,
                    lastModified: dashboard.lastModified
                };
            }

            console.log(`📊 获取所有仪表板: ${this.dashboards.size} 个`);
            this.emit('all_dashboards_retrieved', { count: this.dashboards.size });

            return {
                success: true,
                dashboards,
                count: this.dashboards.size
            };

        } catch (error) {
            console.error('❌ 获取所有仪表板失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 创建仪表板配置
     */
    async createDashboard(dashboardId, config) {
        try {
            if (!this.isInitialized) {
                throw new Error('仪表板管理器未初始化');
            }

            if (this.dashboards.has(dashboardId)) {
                return {
                    success: false,
                    error: '仪表板已存在'
                };
            }

            // 保存到文件
            const filePath = path.join(this.dashboardsDir, `${dashboardId}.json`);
            await fs.writeFile(filePath, JSON.stringify(config, null, 2), 'utf8');

            // 添加到内存
            this.dashboards.set(dashboardId, {
                id: dashboardId,
                title: config.dashboard.title,
                config: config,
                filePath: filePath,
                lastModified: new Date()
            });

            console.log(`✅ 创建仪表板: ${dashboardId}`);
            this.emit('dashboard_created', { dashboardId });

            return {
                success: true,
                dashboardId
            };

        } catch (error) {
            console.error(`❌ 创建仪表板失败 (${dashboardId}):`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 更新仪表板配置
     */
    async updateDashboard(dashboardId, config) {
        try {
            if (!this.isInitialized) {
                throw new Error('仪表板管理器未初始化');
            }

            const dashboard = this.dashboards.get(dashboardId);
            if (!dashboard) {
                return {
                    success: false,
                    error: '仪表板不存在'
                };
            }

            // 更新文件
            await fs.writeFile(dashboard.filePath, JSON.stringify(config, null, 2), 'utf8');

            // 更新内存
            dashboard.config = config;
            dashboard.title = config.dashboard.title;
            dashboard.lastModified = new Date();

            console.log(`🔄 更新仪表板: ${dashboardId}`);
            this.emit('dashboard_updated', { dashboardId });

            return {
                success: true,
                dashboardId
            };

        } catch (error) {
            console.error(`❌ 更新仪表板失败 (${dashboardId}):`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 删除仪表板
     */
    async deleteDashboard(dashboardId) {
        try {
            if (!this.isInitialized) {
                throw new Error('仪表板管理器未初始化');
            }

            const dashboard = this.dashboards.get(dashboardId);
            if (!dashboard) {
                return {
                    success: false,
                    error: '仪表板不存在'
                };
            }

            // 删除文件
            await fs.unlink(dashboard.filePath);

            // 从内存删除
            this.dashboards.delete(dashboardId);

            console.log(`🗑️ 删除仪表板: ${dashboardId}`);
            this.emit('dashboard_deleted', { dashboardId });

            return {
                success: true,
                message: '仪表板已删除'
            };

        } catch (error) {
            console.error(`❌ 删除仪表板失败 (${dashboardId}):`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 生成仪表板URL
     */
    generateDashboardUrl(dashboardId, params = {}) {
        try {
            const dashboard = this.dashboards.get(dashboardId);
            if (!dashboard) {
                return {
                    success: false,
                    error: '仪表板不存在'
                };
            }

            let url = `${this.grafanaUrl}/d/${dashboardId}/${dashboard.title.toLowerCase().replace(/\s+/g, '-')}`;
            
            // 添加查询参数
            const queryParams = new URLSearchParams();
            if (params.from) queryParams.append('from', params.from);
            if (params.to) queryParams.append('to', params.to);
            if (params.refresh) queryParams.append('refresh', params.refresh);
            if (params.variables) {
                Object.entries(params.variables).forEach(([key, value]) => {
                    queryParams.append(`var-${key}`, value);
                });
            }

            if (queryParams.toString()) {
                url += `?${queryParams.toString()}`;
            }

            return {
                success: true,
                url
            };

        } catch (error) {
            console.error(`❌ 生成仪表板URL失败 (${dashboardId}):`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 验证仪表板配置
     */
    validateDashboard(config) {
        const errors = [];

        if (!config.dashboard) {
            errors.push('缺少dashboard配置');
        } else {
            if (!config.dashboard.title) {
                errors.push('缺少仪表板标题');
            }
            if (!config.dashboard.panels || !Array.isArray(config.dashboard.panels)) {
                errors.push('缺少或无效的panels配置');
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 获取仪表板模板
     */
    getDashboardTemplate(templateType) {
        const templates = {
            basic: {
                dashboard: {
                    title: "新仪表板",
                    tags: ["codestudio"],
                    style: "dark",
                    timezone: "browser",
                    refresh: "30s",
                    time: {
                        from: "now-1h",
                        to: "now"
                    },
                    panels: []
                }
            },
            service: {
                dashboard: {
                    title: "服务监控",
                    tags: ["codestudio", "service"],
                    style: "dark",
                    timezone: "browser",
                    refresh: "30s",
                    templating: {
                        list: [
                            {
                                name: "service",
                                type: "query",
                                query: "label_values(codestudio_http_requests_total, service)",
                                refresh: 1
                            }
                        ]
                    },
                    time: {
                        from: "now-1h",
                        to: "now"
                    },
                    panels: []
                }
            }
        };

        return templates[templateType] || templates.basic;
    }

    /**
     * 获取统计信息
     */
    getStats() {
        const dashboardTypes = {};
        for (const dashboard of this.dashboards.values()) {
            const tags = dashboard.config.dashboard.tags || [];
            tags.forEach(tag => {
                dashboardTypes[tag] = (dashboardTypes[tag] || 0) + 1;
            });
        }

        return {
            totalDashboards: this.dashboards.size,
            dashboardTypes,
            grafanaUrl: this.grafanaUrl,
            dashboardsDir: this.dashboardsDir,
            isInitialized: this.isInitialized,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 清理仪表板管理器
     */
    async cleanup() {
        try {
            this.dashboards.clear();
            this.isInitialized = false;

            console.log('🧹 Grafana仪表板管理器已清理');
            this.emit('dashboard_manager_cleaned');

            return { success: true };

        } catch (error) {
            console.error('❌ 清理仪表板管理器失败:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = DashboardManager;
