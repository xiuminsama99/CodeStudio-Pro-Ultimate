/**
 * Path Service - 动态路径管理核心逻辑
 * 基于原有Python实现，升级为Node.js微服务版本
 * 保留核心路径计算逻辑，适配容器化环境
 */

const path = require('path');
const fs = require('fs').promises;
const { promisify } = require('util');

class DynamicPathManager {
    /**
     * 动态路径管理器 - 升级为微服务版本
     * 保留原有核心逻辑，适配容器化环境
     */
    constructor(containerRoot = '/app') {
        this.containerRoot = containerRoot;
        this.scriptDir = __dirname;
        this.projectRoot = this._calculateProjectRoot();
        this.paths = this._initializePaths();
    }

    /**
     * 动态计算项目根目录 - 保留原有逻辑
     * 适配容器化环境和微服务架构
     */
    _calculateProjectRoot() {
        // 在容器环境中，使用容器根目录
        if (process.env.NODE_ENV === 'production' || process.env.CONTAINER_ENV) {
            return this.containerRoot;
        }

        // 开发环境中，从脚本位置向上查找
        let current = path.dirname(this.scriptDir);
        const rootIndicators = [
            'package.json',
            'services',
            'frontend',
            'infrastructure'
        ];

        // 最多向上查找5级目录
        for (let i = 0; i < 5; i++) {
            let indicatorsFound = 0;

            for (const indicator of rootIndicators) {
                try {
                    const indicatorPath = path.join(current, indicator);
                    if (require('fs').existsSync(indicatorPath)) {
                        indicatorsFound++;
                    }
                } catch (error) {
                    // 忽略访问错误
                }
            }

            // 如果找到至少2个标志性文件/目录，认为是项目根目录
            if (indicatorsFound >= 2) {
                return current;
            }

            // 向上一级目录
            const parent = path.dirname(current);
            if (parent === current) { // 已到达文件系统根目录
                break;
            }
            current = parent;
        }

        // 如果没找到，使用默认路径
        return this.containerRoot;
    }

    /**
     * 初始化所有路径 - 升级为微服务架构路径
     */
    _initializePaths() {
        const root = this.projectRoot;

        return {
            // 核心路径
            project_root: root,
            script_dir: this.scriptDir,

            // 微服务路径
            services_dir: path.join(root, 'services'),
            instance_service: path.join(root, 'services', 'instance-service'),
            path_service: path.join(root, 'services', 'path-service'),
            resource_service: path.join(root, 'services', 'resource-service'),
            collaboration_service: path.join(root, 'services', 'collaboration-service'),
            config_service: path.join(root, 'services', 'config-service'),

            // 前端路径
            frontend_dir: path.join(root, 'frontend'),
            frontend_src: path.join(root, 'frontend', 'src'),
            frontend_components: path.join(root, 'frontend', 'src', 'components'),

            // 基础设施路径
            infrastructure_dir: path.join(root, 'infrastructure'),
            kubernetes_dir: path.join(root, 'infrastructure', 'kubernetes'),
            docker_dir: path.join(root, 'infrastructure', 'docker'),
            monitoring_dir: path.join(root, 'infrastructure', 'monitoring'),

            // 配置路径
            config_dir: path.join(root, 'config'),
            config_base: path.join(root, 'config', 'base'),
            config_development: path.join(root, 'config', 'development'),
            config_production: path.join(root, 'config', 'production'),

            // 文档路径
            docs_dir: path.join(root, 'docs'),
            api_docs: path.join(root, 'docs', 'api'),
            deployment_docs: path.join(root, 'docs', 'deployment'),

            // 实例相关路径（容器化版本）
            instances_dir: path.join(root, 'instances'),
            logs_dir: path.join(root, 'logs'),
            temp_dir: path.join(root, 'temp')
        };
    }

    /**
     * 获取指定路径 - 保留原有接口
     */
    getPath(pathKey) {
        if (!(pathKey in this.paths)) {
            throw new Error(`未知的路径键: ${pathKey}`);
        }
        return this.paths[pathKey];
    }

    /**
     * 获取相对路径 - 保留原有逻辑
     */
    getRelativePath(targetPath, basePath = 'project_root') {
        const base = this.getPath(basePath);
        return path.relative(base, targetPath);
    }

    /**
     * 动态路径解析 - 将相对路径解析为绝对路径
     * 支持多种路径格式：相对路径、路径键、绝对路径
     */
    resolveDynamicPath(inputPath, basePath = 'project_root') {
        try {
            // 如果输入为空或null，返回基础路径
            if (!inputPath) {
                return this.getPath(basePath);
            }

            // 如果是路径键（在paths中存在），直接返回对应路径
            if (typeof inputPath === 'string' && inputPath in this.paths) {
                return this.getPath(inputPath);
            }

            // 如果已经是绝对路径，直接返回
            if (path.isAbsolute(inputPath)) {
                return path.normalize(inputPath);
            }

            // 处理相对路径
            const baseDir = this.getPath(basePath);
            const resolvedPath = path.resolve(baseDir, inputPath);

            return path.normalize(resolvedPath);

        } catch (error) {
            throw new Error(`路径解析失败 "${inputPath}": ${error.message}`);
        }
    }

    /**
     * 路径安全验证 - 防止目录遍历攻击
     * 检测恶意路径输入，确保路径安全性
     */
    validatePath(inputPath, allowedBasePaths = ['project_root']) {
        try {
            if (!inputPath || typeof inputPath !== 'string') {
                return {
                    valid: false,
                    reason: 'INVALID_INPUT',
                    message: '路径输入无效或为空'
                };
            }

            // 检测目录遍历攻击模式
            const dangerousPatterns = [
                /\.\./,           // 父目录遍历
                /~\//,            // 用户目录访问
                /\/\//,           // 双斜杠
                /\0/,             // 空字节注入
                /%2e%2e/i,        // URL编码的..
                /%2f/i,           // URL编码的/
                /\\/,             // 反斜杠（在Unix系统中可能有问题）
            ];

            for (const pattern of dangerousPatterns) {
                if (pattern.test(inputPath)) {
                    return {
                        valid: false,
                        reason: 'DIRECTORY_TRAVERSAL',
                        message: `检测到目录遍历攻击模式: ${pattern.source}`,
                        detected_pattern: pattern.source
                    };
                }
            }

            // 检测绝对路径访问（可能不安全）
            if (path.isAbsolute(inputPath)) {
                // 检查是否在允许的基础路径内
                let withinAllowedPath = false;
                for (const basePathKey of allowedBasePaths) {
                    try {
                        const basePath = this.getPath(basePathKey);
                        const resolvedInput = path.resolve(inputPath);
                        const relativePath = path.relative(basePath, resolvedInput);

                        // 如果相对路径不以..开头，说明在允许的路径内
                        if (!relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
                            withinAllowedPath = true;
                            break;
                        }
                    } catch (error) {
                        // 忽略单个基础路径的错误，继续检查其他路径
                    }
                }

                if (!withinAllowedPath) {
                    return {
                        valid: false,
                        reason: 'OUTSIDE_ALLOWED_PATHS',
                        message: '绝对路径超出允许的基础路径范围',
                        input_path: inputPath,
                        allowed_base_paths: allowedBasePaths
                    };
                }
            }

            // 检测路径长度（防止过长路径攻击）
            const maxPathLength = process.platform === 'win32' ? 260 : 4096;
            if (inputPath.length > maxPathLength) {
                return {
                    valid: false,
                    reason: 'PATH_TOO_LONG',
                    message: `路径长度超过限制 (${inputPath.length} > ${maxPathLength})`,
                    max_length: maxPathLength,
                    actual_length: inputPath.length
                };
            }

            // 检测非法字符
            const illegalChars = process.platform === 'win32'
                ? /[<>:"|?*\x00-\x1f]/
                : /[\x00]/;

            if (illegalChars.test(inputPath)) {
                return {
                    valid: false,
                    reason: 'ILLEGAL_CHARACTERS',
                    message: '路径包含非法字符',
                    illegal_pattern: illegalChars.source
                };
            }

            // 解析路径并进行最终验证
            try {
                const resolvedPath = this.resolveDynamicPath(inputPath);

                return {
                    valid: true,
                    reason: 'VALID_PATH',
                    message: '路径验证通过',
                    original_path: inputPath,
                    resolved_path: resolvedPath,
                    is_absolute: path.isAbsolute(resolvedPath),
                    platform: process.platform
                };
            } catch (error) {
                return {
                    valid: false,
                    reason: 'RESOLUTION_FAILED',
                    message: `路径解析失败: ${error.message}`,
                    original_path: inputPath
                };
            }

        } catch (error) {
            return {
                valid: false,
                reason: 'VALIDATION_ERROR',
                message: `路径验证过程出错: ${error.message}`,
                original_path: inputPath
            };
        }
    }

    /**
     * 确保目录存在 - 保留原有逻辑，增加安全验证
     */
    async ensureDirectory(pathKey) {
        // 先进行路径安全验证
        const validation = this.validatePath(pathKey);
        if (!validation.valid) {
            throw new Error(`路径安全验证失败: ${validation.message}`);
        }

        const dirPath = this.getPath(pathKey);
        try {
            await fs.mkdir(dirPath, { recursive: true });
            return dirPath;
        } catch (error) {
            throw new Error(`创建目录失败 ${pathKey}: ${error.message}`);
        }
    }

    /**
     * 计算实例路径 - 升级为容器化版本
     * 保留原有核心逻辑，适配Kubernetes部署
     */
    calculateInstancePaths(instanceId) {
        const basePath = path.join(this.getPath('instances_dir'), instanceId);

        return {
            instance_id: instanceId,
            base_path: basePath,
            user_data: path.join(basePath, 'user-data'),
            extensions: path.join(basePath, 'extensions'),
            workspace: path.join(basePath, 'workspace'),
            logs: path.join(basePath, 'logs'),
            temp: path.join(basePath, 'temp'),
            config: path.join(basePath, 'config')
        };
    }

    /**
     * 确保实例路径存在 - 新增功能
     */
    async ensureInstancePaths(instanceId) {
        const paths = this.calculateInstancePaths(instanceId);

        try {
            for (const [pathType, pathValue] of Object.entries(paths)) {
                if (pathType !== 'instance_id') {
                    await fs.mkdir(pathValue, { recursive: true });
                }
            }
            return paths;
        } catch (error) {
            throw new Error(`创建实例路径失败 ${instanceId}: ${error.message}`);
        }
    }

    /**
     * 验证路径完整性 - 保留原有逻辑
     */
    async validatePaths() {
        const results = {};

        for (const [key, pathValue] of Object.entries(this.paths)) {
            try {
                const stats = await fs.stat(pathValue);
                results[key] = {
                    path: pathValue,
                    exists: true,
                    is_file: stats.isFile(),
                    is_directory: stats.isDirectory(),
                    accessible: true,
                    status: '✅'
                };
            } catch (error) {
                results[key] = {
                    path: pathValue,
                    exists: false,
                    is_file: false,
                    is_directory: false,
                    accessible: false,
                    status: '❌',
                    error: error.message
                };
            }
        }

        // 计算验证统计
        const totalPaths = Object.keys(results).length;
        const validPaths = Object.values(results).filter(r => r.exists).length;
        const validationRate = Math.round((validPaths / totalPaths) * 100 * 100) / 100;

        return {
            validation_results: results,
            statistics: {
                total_paths: totalPaths,
                valid_paths: validPaths,
                validation_rate: validationRate
            }
        };
    }

    /**
     * 获取项目信息 - 保留原有逻辑，升级为微服务版本
     */
    async getProjectInfo() {
        const validation = await this.validatePaths();

        return {
            project_root: this.projectRoot,
            script_location: this.scriptDir,
            container_root: this.containerRoot,
            environment: process.env.NODE_ENV || 'development',
            microservices_architecture: true,
            services_available: [
                'instance-service',
                'path-service',
                'resource-service',
                'collaboration-service',
                'config-service'
            ],
            total_paths: Object.keys(this.paths).length,
            validation_rate: validation.statistics.validation_rate,
            calculation_method: 'dynamic_microservice_aware'
        };
    }

    /**
     * 查找文件 - 保留原有逻辑
     */
    async findFiles(pattern, searchDirs = ['project_root']) {
        const foundFiles = [];

        for (const dirKey of searchDirs) {
            try {
                const searchDir = this.getPath(dirKey);
                const glob = require('glob');
                const files = await promisify(glob)(pattern, { cwd: searchDir });
                foundFiles.push(...files.map(file => path.join(searchDir, file)));
            } catch (error) {
                // 忽略搜索错误，继续其他目录
            }
        }

        return foundFiles;
    }

    /**
     * 获取目录结构 - 保留原有逻辑
     */
    async getDirectoryStructure(directoryKey, maxDepth = 2, currentDepth = 0) {
        if (currentDepth >= maxDepth) {
            return { exists: false, max_depth_reached: true };
        }

        const directoryPath = this.getPath(directoryKey);

        try {
            const stats = await fs.stat(directoryPath);
            if (!stats.isDirectory()) {
                return { exists: true, is_file: true };
            }

            const structure = {
                exists: true,
                is_directory: true,
                files: [],
                directories: {}
            };

            const items = await fs.readdir(directoryPath);

            for (const item of items) {
                const itemPath = path.join(directoryPath, item);
                const itemStats = await fs.stat(itemPath);

                if (itemStats.isFile()) {
                    structure.files.push(item);
                } else if (itemStats.isDirectory()) {
                    // 递归获取子目录结构
                    const subStructure = await this.getDirectoryStructure(
                        itemPath, maxDepth, currentDepth + 1
                    );
                    structure.directories[item] = subStructure;
                }
            }

            return structure;

        } catch (error) {
            return {
                exists: false,
                error: error.message,
                path: directoryPath
            };
        }
    }
}

module.exports = DynamicPathManager;
