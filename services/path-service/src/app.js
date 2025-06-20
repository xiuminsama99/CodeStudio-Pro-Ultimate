/**
 * Path Service - Express应用主文件
 * 提供动态路径管理的REST API接口
 * 支持路径解析、验证、实例路径管理等功能
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const DynamicPathManager = require('./core/path_manager');

class PathServiceApp {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3002;
        this.pathManager = new DynamicPathManager();
        
        this.initializeMiddleware();
        this.initializeRoutes();
        this.initializeErrorHandling();
        
        console.log('✅ Path Service 应用初始化完成');
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
                service: 'path-service',
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            });
        });

        // API路由前缀
        const apiRouter = express.Router();
        
        // 路径解析相关API
        apiRouter.post('/resolve', this.resolvePath.bind(this));
        apiRouter.post('/validate', this.validatePath.bind(this));
        apiRouter.get('/info', this.getProjectInfo.bind(this));
        
        // 实例路径管理API
        apiRouter.post('/instances/:instanceId/paths', this.createInstancePaths.bind(this));
        apiRouter.get('/instances/:instanceId/paths', this.getInstancePaths.bind(this));
        apiRouter.delete('/instances/:instanceId/paths', this.deleteInstancePaths.bind(this));
        
        // 路径验证和查询API
        apiRouter.post('/paths/validate-all', this.validateAllPaths.bind(this));
        apiRouter.get('/paths/:pathKey', this.getPathByKey.bind(this));
        apiRouter.get('/paths', this.listAllPaths.bind(this));
        
        // 目录操作API
        apiRouter.post('/directories/ensure', this.ensureDirectory.bind(this));
        apiRouter.get('/directories/:pathKey/structure', this.getDirectoryStructure.bind(this));
        apiRouter.post('/files/search', this.searchFiles.bind(this));
        
        this.app.use('/api/v1', apiRouter);
        
        // 根路径
        this.app.get('/', (req, res) => {
            res.json({
                message: 'CodeStudio Path Service',
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
     * 解析路径
     */
    async resolvePath(req, res) {
        try {
            const { inputPath, basePath } = req.body;
            
            if (!inputPath) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_INPUT_PATH',
                        message: '输入路径不能为空'
                    }
                });
            }

            const resolvedPath = this.pathManager.resolveDynamicPath(inputPath, basePath);
            
            res.json({
                success: true,
                message: '路径解析成功',
                data: {
                    input_path: inputPath,
                    base_path: basePath || 'project_root',
                    resolved_path: resolvedPath
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'PATH_RESOLUTION_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 验证路径安全性
     */
    async validatePath(req, res) {
        try {
            const { inputPath, allowedBasePaths } = req.body;
            
            if (!inputPath) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_INPUT_PATH',
                        message: '输入路径不能为空'
                    }
                });
            }

            const validation = this.pathManager.validatePath(inputPath, allowedBasePaths);
            
            res.json({
                success: true,
                message: '路径验证完成',
                data: validation
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'PATH_VALIDATION_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 获取项目信息
     */
    async getProjectInfo(req, res) {
        try {
            const projectInfo = await this.pathManager.getProjectInfo();
            
            res.json({
                success: true,
                data: projectInfo
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'GET_PROJECT_INFO_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 创建实例路径
     */
    async createInstancePaths(req, res) {
        try {
            const { instanceId } = req.params;
            
            if (!instanceId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_INSTANCE_ID',
                        message: '实例ID不能为空'
                    }
                });
            }

            const instancePaths = await this.pathManager.ensureInstancePaths(instanceId);
            
            res.status(201).json({
                success: true,
                message: '实例路径创建成功',
                data: instancePaths
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'CREATE_INSTANCE_PATHS_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 获取实例路径信息
     */
    async getInstancePaths(req, res) {
        try {
            const { instanceId } = req.params;
            
            const instancePaths = this.pathManager.calculateInstancePaths(instanceId);
            
            res.json({
                success: true,
                data: instancePaths
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'GET_INSTANCE_PATHS_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 删除实例路径（逻辑删除，实际不删除文件）
     */
    async deleteInstancePaths(req, res) {
        try {
            const { instanceId } = req.params;
            
            // 这里只是返回路径信息，实际的文件删除应该由其他服务处理
            const instancePaths = this.pathManager.calculateInstancePaths(instanceId);
            
            res.json({
                success: true,
                message: '实例路径信息已获取，请使用文件管理服务进行实际删除',
                data: {
                    instance_id: instanceId,
                    paths_to_delete: instancePaths,
                    note: '此API仅提供路径信息，不执行实际删除操作'
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'DELETE_INSTANCE_PATHS_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 验证所有路径
     */
    async validateAllPaths(req, res) {
        try {
            const validation = await this.pathManager.validatePaths();
            
            res.json({
                success: true,
                data: validation
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'VALIDATE_ALL_PATHS_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 根据键获取路径
     */
    async getPathByKey(req, res) {
        try {
            const { pathKey } = req.params;
            
            const pathValue = this.pathManager.getPath(pathKey);
            
            res.json({
                success: true,
                data: {
                    key: pathKey,
                    path: pathValue
                }
            });

        } catch (error) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'PATH_KEY_NOT_FOUND',
                    message: error.message
                }
            });
        }
    }

    /**
     * 列出所有路径
     */
    async listAllPaths(req, res) {
        try {
            const allPaths = this.pathManager.paths;
            
            res.json({
                success: true,
                data: {
                    total_paths: Object.keys(allPaths).length,
                    paths: allPaths
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'LIST_PATHS_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 确保目录存在
     */
    async ensureDirectory(req, res) {
        try {
            const { pathKey } = req.body;
            
            if (!pathKey) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_PATH_KEY',
                        message: '路径键不能为空'
                    }
                });
            }

            const dirPath = await this.pathManager.ensureDirectory(pathKey);
            
            res.status(201).json({
                success: true,
                message: '目录创建成功',
                data: {
                    path_key: pathKey,
                    directory_path: dirPath
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'ENSURE_DIRECTORY_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 获取目录结构
     */
    async getDirectoryStructure(req, res) {
        try {
            const { pathKey } = req.params;
            const { maxDepth = 2 } = req.query;
            
            const structure = await this.pathManager.getDirectoryStructure(pathKey, parseInt(maxDepth));
            
            res.json({
                success: true,
                data: {
                    path_key: pathKey,
                    max_depth: parseInt(maxDepth),
                    structure: structure
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'GET_DIRECTORY_STRUCTURE_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 搜索文件
     */
    async searchFiles(req, res) {
        try {
            const { pattern, searchDirs = ['project_root'] } = req.body;
            
            if (!pattern) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_SEARCH_PATTERN',
                        message: '搜索模式不能为空'
                    }
                });
            }

            const foundFiles = await this.pathManager.findFiles(pattern, searchDirs);
            
            res.json({
                success: true,
                data: {
                    pattern: pattern,
                    search_directories: searchDirs,
                    found_files: foundFiles,
                    total_found: foundFiles.length
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'SEARCH_FILES_FAILED',
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
            // 启动HTTP服务器
            this.server = this.app.listen(this.port, () => {
                console.log(`✅ Path Service 启动成功`);
                console.log(`🌐 服务地址: http://localhost:${this.port}`);
                console.log(`📋 健康检查: http://localhost:${this.port}/health`);
                console.log(`📚 API文档: http://localhost:${this.port}/api/v1`);
            });

            return this.server;

        } catch (error) {
            console.error('❌ Path Service 启动失败:', error.message);
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
            
            console.log('✅ Path Service 已停止');

        } catch (error) {
            console.error('❌ Path Service 停止失败:', error.message);
            throw error;
        }
    }
}

module.exports = PathServiceApp;

// 如果直接运行此文件，启动服务器
if (require.main === module) {
    const app = new PathServiceApp();
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
