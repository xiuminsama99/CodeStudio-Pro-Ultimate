# Web界面启动器技术文档

## 📋 目录
- [启动流程分析](#启动流程分析)
- [环境配置说明](#环境配置说明)
- [API接口清单](#api接口清单)
- [功能实现逻辑](#功能实现逻辑)
- [接口规范定义](#接口规范定义)
- [界面逻辑理清](#界面逻辑理清)

---

## 🚀 启动流程分析

### 完整启动流程
```
用户双击启动脚本
        ↓
检查Python环境
        ↓
设置实例特定环境变量
        ↓
切换到核心目录
        ↓
启动Web服务器
        ↓
初始化系统状态
        ↓
加载界面组件
        ↓
系统就绪
```

### 详细启动步骤

#### 1. 环境检查阶段
```batch
@echo off
title CodeStudio Pro Ultimate - Instance {instance_id} Web Interface
chcp 65001 >nul 2>&1

REM 检查Python环境
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found
    pause
    exit /b 1
)
```

#### 2. 环境变量设置阶段
```batch
REM 设置实例特定的环境变量
set "CODESTUDIO_INSTANCE_ID={instance_id}"
set "CODESTUDIO_WEB_PORT={web_port}"
set "CODESTUDIO_CALLBACK_PORT={callback_port}"
set "CODESTUDIO_INSTANCE_ROOT={instance_root}"
set "CODESTUDIO_NAMESPACE={namespace}"
```

#### 3. 服务启动阶段
```batch
REM 启动实例特定的Web服务器
cd /d "%~dp0src\core"
python codestudio_pro_ultimate.py --web --port {web_port} --instance-id {instance_id}
```

### 启动时序图
```
时间轴    启动脚本         Python服务器        Web界面
  |         |                 |                |
  0s    启动检查              |                |
  |         |                 |                |
  1s    设置环境变量           |                |
  |         |                 |                |
  2s    启动Python服务    →   服务器初始化      |
  |         |                 |                |
  3s        |              加载配置文件         |
  |         |                 |                |
  4s        |              启动Web服务     →   界面加载
  |         |                 |                |
  5s        |              系统就绪       →   显示界面
```

---

## ⚙️ 环境配置说明

### 必需环境变量

#### 实例标识变量
```bash
CODESTUDIO_INSTANCE_ID=1                    # 实例唯一标识
CODESTUDIO_NAMESPACE=codestudio_instance_1   # 实例命名空间
CODESTUDIO_UNIQUE_ID=uuid-string            # 全局唯一标识符
```

#### 网络配置变量
```bash
CODESTUDIO_WEB_PORT=8180                    # Web服务端口
CODESTUDIO_CALLBACK_PORT=9100               # 回调服务端口
AUGMENT_CALLBACK_PORT=9100                  # Augment插件回调端口
AUGMENT_CALLBACK_URL=http://localhost:9100  # 回调完整URL
```

#### 路径配置变量
```bash
CODESTUDIO_INSTANCE_ROOT=C:\...\instance_1  # 实例根目录
ELECTRON_USER_DATA=C:\...\user-data-ultimate # 用户数据目录
ELECTRON_EXTENSIONS=C:\...\extensions-ultimate # 扩展目录
VSCODE_PORTABLE=1                           # 便携模式
```

#### 隔离配置变量
```bash
VSCODE_INSTANCE_ID=1                        # VS Code实例ID
ELECTRON_PROCESS_NAME=codestudiopro_inst1   # 进程名称
AUGMENT_SESSION_ID=session-uuid             # 会话标识
AUGMENT_STORAGE_KEY=storage-key             # 存储键
```

### 配置文件依赖

#### 1. 实例配置文件 (`instance_config.json`)
```json
{
  "id": "1",
  "name": "实例名称",
  "ports": {
    "web_port": 8180,
    "callback_port": 9100
  },
  "environment": {
    "instance_id": "1",
    "namespace": "codestudio_instance_1"
  }
}
```

#### 2. 系统状态文件 (`codestudio_ultimate_state.json`)
```json
{
  "last_startup": "2024-01-20T10:30:00Z",
  "plugin_status": "active",
  "configuration_valid": true,
  "instance_id": "1"
}
```

---

## 📡 API接口清单

### 核心管理API

#### 1. 系统状态API
```
GET  /api/system-status          # 获取系统状态
POST /api/system-check           # 执行系统检查
GET  /api/plugin-status          # 获取插件状态
POST /api/plugin-check           # 检查插件状态
```

#### 2. 路径管理API
```
GET  /api/path-info              # 获取路径信息
POST /api/path-validate          # 验证路径完整性
GET  /api/project-structure      # 获取项目结构
POST /api/path-test              # 执行路径测试
```

#### 3. 应用控制API
```
POST /api/launch-app             # 启动应用
POST /api/open-project           # 打开项目
POST /api/clear-cookies          # 清理Cookies
POST /api/fix-plugin             # 修复插件
```

#### 4. 清理管理API
```
POST /api/light-clean            # 轻度清理
POST /api/deep-clean             # 深度清理
POST /api/complete-reset         # 完全重置
POST /api/quick-start            # 快速启动
POST /api/direct-launch          # 直接启动
POST /api/one-click-refill       # 一键续杯
```

### 实用工具API
```
GET  /api/temp-email             # 临时邮箱服务
GET  /api/quota-check            # 额度查看
GET  /api/system-info            # 系统信息
POST /api/log-operation          # 记录操作日志
```

---

## 🔧 功能实现逻辑

### 界面核心功能分析

#### 1. 系统状态监控
```javascript
// 状态检查逻辑
async function checkSystemStatus() {
    try {
        const response = await fetch('/api/system-status');
        const status = await response.json();
        
        updateStatusIndicators(status);
        updateLastOperation(status.last_operation);
        
        // 状态指示器更新
        document.getElementById('system-status').textContent = 
            status.system_running ? '正常运行' : '异常';
        document.getElementById('plugin-status').textContent = 
            status.plugin_status || '检查中';
            
    } catch (error) {
        console.error('状态检查失败:', error);
        showErrorMessage('无法获取系统状态');
    }
}
```

#### 2. 核心功能按钮逻辑
```javascript
// 直接启动功能
async function directLaunch() {
    addLog('INFO', '开始直接启动...');
    
    try {
        const response = await fetch('/api/direct-launch', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                skip_checks: true,
                instance_id: getInstanceId()
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            addLog('SUCCESS', '直接启动成功');
            updateSystemStatus('running');
        } else {
            addLog('ERROR', `启动失败: ${result.message}`);
        }
    } catch (error) {
        addLog('ERROR', `启动异常: ${error.message}`);
    }
}

// 快速启动功能
async function quickStart() {
    addLog('INFO', '开始快速启动...');
    
    try {
        // 1. 智能配置检查
        const configCheck = await fetch('/api/config-check');
        const configResult = await configCheck.json();
        
        // 2. 保留设置清理限制
        if (configResult.needs_cleanup) {
            await fetch('/api/light-clean', {method: 'POST'});
            addLog('INFO', '执行轻度清理');
        }
        
        // 3. 启动应用
        const launchResponse = await fetch('/api/launch-app', {
            method: 'POST',
            body: JSON.stringify({
                preserve_settings: true,
                clear_limits: true
            })
        });
        
        const launchResult = await launchResponse.json();
        
        if (launchResult.success) {
            addLog('SUCCESS', '快速启动完成');
        }
        
    } catch (error) {
        addLog('ERROR', `快速启动失败: ${error.message}`);
    }
}

// 一键续杯功能
async function oneClickRefill() {
    addLog('INFO', '开始一键续杯...');
    
    try {
        // 1. 完整重置环境
        await fetch('/api/complete-reset', {method: 'POST'});
        addLog('INFO', '环境重置完成');
        
        // 2. 恢复正常状态
        await fetch('/api/restore-normal', {method: 'POST'});
        addLog('INFO', '状态恢复完成');
        
        // 3. 重新启动
        await fetch('/api/launch-app', {method: 'POST'});
        addLog('SUCCESS', '一键续杯完成');
        
    } catch (error) {
        addLog('ERROR', `一键续杯失败: ${error.message}`);
    }
}
```

#### 3. 动态路径管理逻辑
```javascript
// 路径信息获取
async function getPathInfo() {
    addLog('INFO', '开始获取路径信息');
    
    try {
        const response = await fetch('/api/path-info');
        const pathInfo = await response.json();
        
        displayPathInfo(pathInfo);
        addLog('SUCCESS', '路径信息获取成功');
        
    } catch (error) {
        addLog('ERROR', `路径信息获取失败: ${error.message}`);
    }
}

// 路径验证功能
async function validatePaths() {
    addLog('INFO', '开始路径验证...');
    
    try {
        const response = await fetch('/api/path-validate', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                check_existence: true,
                generate_report: true
            })
        });
        
        const validationResult = await response.json();
        
        displayValidationReport(validationResult);
        addLog('SUCCESS', '路径验证完成');
        
    } catch (error) {
        addLog('ERROR', `路径验证失败: ${error.message}`);
    }
}
```

#### 4. 日志管理逻辑
```javascript
// 日志系统
class LogManager {
    constructor() {
        this.logs = [];
        this.maxLogs = 100;
        this.logContainer = document.getElementById('log-content');
    }
    
    addLog(level, message) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            time: timestamp,
            level: level,
            message: message
        };
        
        this.logs.unshift(logEntry);
        
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }
        
        this.updateDisplay();
    }
    
    updateDisplay() {
        const filteredLogs = this.getFilteredLogs();
        
        this.logContainer.innerHTML = filteredLogs.map(log => 
            `<div class="log-entry">
                <span class="log-time">[${log.time}]</span>
                <span class="log-${log.level.toLowerCase()}">[${log.level}]</span>
                ${log.message}
            </div>`
        ).join('');
    }
    
    getFilteredLogs() {
        const filter = document.getElementById('log-filter').value;
        
        if (filter === '全部') {
            return this.logs;
        } else {
            return this.logs.filter(log => 
                log.level.toLowerCase() === filter.toLowerCase()
            );
        }
    }
    
    clearLogs() {
        this.logs = [];
        this.updateDisplay();
    }
}
```

---

## 📋 接口规范定义

### 请求格式规范

#### 标准请求头
```http
Content-Type: application/json
Accept: application/json
X-Instance-ID: {instance_id}
X-Request-ID: {unique_request_id}
```

#### 请求体格式
```json
{
  "action": "operation_name",
  "parameters": {
    "param1": "value1",
    "param2": "value2"
  },
  "options": {
    "timeout": 30000,
    "retry": true
  }
}
```

### 响应格式规范

#### 成功响应
```json
{
  "success": true,
  "data": {
    "result": "operation_result",
    "details": {}
  },
  "message": "操作成功",
  "timestamp": "2024-01-20T10:30:00Z",
  "request_id": "req_12345"
}
```

#### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": "详细错误信息"
  },
  "timestamp": "2024-01-20T10:30:00Z",
  "request_id": "req_12345"
}
```

### 状态码定义
```
200 - 操作成功
400 - 请求参数错误
401 - 未授权访问
403 - 操作被禁止
404 - 资源不存在
500 - 服务器内部错误
503 - 服务不可用
```

### 错误处理规范

#### 前端错误处理
```javascript
async function handleApiCall(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'X-Instance-ID': getInstanceId(),
                ...options.headers
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error.message);
        }
        
        return result.data;
        
    } catch (error) {
        console.error('API调用失败:', error);
        showErrorMessage(`操作失败: ${error.message}`);
        throw error;
    }
}
```

---

## 🎨 界面逻辑理清

### 界面组件结构
```
CodeStudio Pro Ultimate 智能化管理控制台
├── 顶部状态栏
│   ├── 系统状态指示器
│   ├── 插件状态显示
│   └── 最后操作时间
├── 运行日志面板
│   ├── 日志过滤器 (全部/错误)
│   ├── 日志清理按钮
│   └── 日志内容区域
├── 核心功能区
│   ├── 直接启动 (系统正常时使用)
│   ├── 快速启动 (首次使用推荐)
│   └── 一键续杯 (遇到故障时使用)
├── 系统管理区
│   ├── 轻度清理 (清理temp文件夹、使用记录)
│   ├── 深度清理 (清理缓存、日志、配置文件)
│   └── 完全重置 (删除所有数据、设置、插件)
├── 应用操作区
│   ├── 启动应用 (直接启动CodeStudio Pro)
│   ├── 打开项目 (打开项目文件夹)
│   ├── 清理Cookies (清除浏览器存储)
│   └── 插件修复 (检查并修复Augment插件)
├── 动态路径管理区
│   ├── 路径信息 (查看项目路径结构)
│   ├── 路径验证 (验证关键路径)
│   ├── 项目结构 (查看目录结构)
│   └── 路径测试 (运行动态路径测试)
└── 实用工具区
    ├── 临时邮箱服务
    └── 额度查看功能
```

### 状态管理逻辑
```javascript
// 全局状态管理
const AppState = {
    systemStatus: 'checking',
    pluginStatus: 'checking',
    configStatus: 'checking',
    lastOperation: null,
    instanceId: null,
    
    // 状态更新方法
    updateSystemStatus(status) {
        this.systemStatus = status;
        this.notifyStateChange('systemStatus', status);
    },
    
    updatePluginStatus(status) {
        this.pluginStatus = status;
        this.notifyStateChange('pluginStatus', status);
    },
    
    // 状态变化通知
    notifyStateChange(key, value) {
        document.dispatchEvent(new CustomEvent('stateChange', {
            detail: { key, value }
        }));
    }
};

// 状态监听器
document.addEventListener('stateChange', (event) => {
    const { key, value } = event.detail;
    
    switch (key) {
        case 'systemStatus':
            updateSystemStatusDisplay(value);
            break;
        case 'pluginStatus':
            updatePluginStatusDisplay(value);
            break;
    }
});
```

### 用户交互流程
```
用户进入界面
        ↓
系统自动检查状态
        ↓
显示当前系统状态
        ↓
用户选择操作
        ↓
执行相应功能
        ↓
更新界面状态
        ↓
记录操作日志
        ↓
等待下一次操作
```

---

*本文档版本: v1.0 | 最后更新: 2024年1月20日*
