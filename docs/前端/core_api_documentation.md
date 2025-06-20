# CodeStudio Pro Ultimate 核心API接口文档

## 📋 目录
- [动态路径管理API](#动态路径管理api)
- [路径验证API](#路径验证api)
- [项目结构API](#项目结构api)
- [路径测试API](#路径测试api)
- [系统管理API](#系统管理api)
- [应用控制API](#应用控制api)

---

## 🗂️ 动态路径管理API

### 1. 获取路径信息
**接口地址**: `GET /api/path-info`  
**功能描述**: 查看项目路径结构，验证路径完整性，诊断路径问题

#### 请求参数
```json
{
  "include_details": true,      // 是否包含详细信息
  "check_existence": true,      // 是否检查文件存在性
  "instance_id": "1"           // 实例ID（可选）
}
```

#### 返回值结构
```json
{
  "success": true,
  "data": {
    "project_root": "C:\\Users\\XM\\Downloads\\v.12Ultimate版1.3工作室精酿版",
    "instance_root": "C:\\Users\\XM\\Downloads\\v.12Ultimate版1.3工作室精酿版\\instances\\instance_1",
    "paths": {
      "src": {
        "path": "src/",
        "exists": true,
        "type": "directory",
        "children": ["core", "api", "web", "plugins"]
      },
      "config": {
        "path": "config/",
        "exists": true,
        "type": "directory",
        "files": ["codestudio_ultimate_state.json", "project.registry.json"]
      },
      "data": {
        "path": "data/",
        "exists": true,
        "type": "directory",
        "subdirs": ["user-data-ultimate", "extensions-ultimate"]
      },
      "tools": {
        "path": "tools/",
        "exists": true,
        "type": "directory",
        "scripts": ["启动Web界面.bat", "清理系统.bat"]
      }
    },
    "validation": {
      "total_paths": 15,
      "valid_paths": 14,
      "missing_paths": 1,
      "issues": ["tools/missing_script.bat not found"]
    }
  },
  "message": "路径信息获取成功",
  "timestamp": "2024-01-20T10:30:00Z"
}
```

#### 状态码
- `200`: 成功获取路径信息
- `404`: 项目根目录不存在
- `500`: 路径扫描失败

#### 使用示例
```javascript
// 获取基本路径信息
const pathInfo = await fetch('/api/path-info');
const result = await pathInfo.json();

// 获取详细路径信息
const detailedInfo = await fetch('/api/path-info?include_details=true&check_existence=true');
```

---

### 2. 路径信息详细查询
**接口地址**: `POST /api/path-info/detailed`  
**功能描述**: 获取指定路径的详细信息和统计数据

#### 请求参数
```json
{
  "target_paths": ["src/core", "config", "tools/scripts"],
  "scan_depth": 3,
  "include_file_stats": true,
  "check_permissions": true
}
```

#### 返回值结构
```json
{
  "success": true,
  "data": {
    "scan_results": {
      "src/core": {
        "total_files": 25,
        "total_size": "2.5MB",
        "file_types": {".py": 20, ".json": 3, ".md": 2},
        "permissions": "read-write",
        "last_modified": "2024-01-20T09:15:00Z"
      }
    },
    "summary": {
      "total_directories": 8,
      "total_files": 156,
      "total_size": "45.2MB",
      "health_score": 95
    }
  }
}
```

---

## ✅ 路径验证API

### 1. 验证关键路径
**接口地址**: `POST /api/path-validate`  
**功能描述**: 验证关键路径，检查文件存在性，生成验证报告

#### 请求参数
```json
{
  "validation_type": "full",        // full | quick | custom
  "target_paths": [                 // 自定义路径（validation_type为custom时）
    "src/core/codestudio_pro_ultimate.py",
    "config/codestudio_ultimate_state.json",
    "tools/scripts/启动Web界面.bat"
  ],
  "check_permissions": true,        // 检查文件权限
  "check_integrity": true,          // 检查文件完整性
  "generate_report": true           // 生成详细报告
}
```

#### 返回值结构
```json
{
  "success": true,
  "data": {
    "validation_id": "val_20240120_103000",
    "validation_type": "full",
    "results": {
      "critical_paths": {
        "total": 12,
        "valid": 11,
        "invalid": 1,
        "details": [
          {
            "path": "src/core/codestudio_pro_ultimate.py",
            "status": "valid",
            "exists": true,
            "readable": true,
            "writable": true,
            "size": "45.2KB",
            "checksum": "a1b2c3d4e5f6"
          },
          {
            "path": "config/missing_config.json",
            "status": "invalid",
            "exists": false,
            "error": "File not found"
          }
        ]
      },
      "optional_paths": {
        "total": 8,
        "valid": 7,
        "invalid": 1
      }
    },
    "report": {
      "overall_health": "good",
      "health_score": 92,
      "issues": [
        {
          "severity": "warning",
          "path": "config/missing_config.json",
          "message": "Optional configuration file missing",
          "suggestion": "Create default configuration file"
        }
      ],
      "recommendations": [
        "Update missing configuration files",
        "Check file permissions for write access"
      ]
    }
  },
  "message": "路径验证完成",
  "timestamp": "2024-01-20T10:30:00Z"
}
```

#### 状态码
- `200`: 验证完成
- `400`: 验证参数错误
- `500`: 验证过程失败

#### 使用示例
```javascript
// 快速验证
const quickValidation = await fetch('/api/path-validate', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    validation_type: 'quick',
    generate_report: false
  })
});

// 完整验证
const fullValidation = await fetch('/api/path-validate', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    validation_type: 'full',
    check_permissions: true,
    check_integrity: true,
    generate_report: true
  })
});
```

---

## 🏗️ 项目结构API

### 1. 获取项目结构
**接口地址**: `GET /api/project-structure`  
**功能描述**: 查看目录结构，分析文件分布，检查组织完整性

#### 请求参数
```json
{
  "depth": 3,                      // 扫描深度
  "include_hidden": false,         // 是否包含隐藏文件
  "include_stats": true,           // 是否包含统计信息
  "format": "tree",                // tree | flat | json
  "filter": {
    "extensions": [".py", ".json", ".bat"],
    "exclude_dirs": ["__pycache__", ".git"],
    "min_size": 0,
    "max_size": "10MB"
  }
}
```

#### 返回值结构
```json
{
  "success": true,
  "data": {
    "structure": {
      "name": "v.12Ultimate版1.3工作室精酿版",
      "type": "directory",
      "path": "C:\\Users\\XM\\Downloads\\v.12Ultimate版1.3工作室精酿版",
      "children": [
        {
          "name": "src",
          "type": "directory",
          "children": [
            {
              "name": "core",
              "type": "directory",
              "children": [
                {
                  "name": "codestudio_pro_ultimate.py",
                  "type": "file",
                  "size": "45.2KB",
                  "modified": "2024-01-20T09:15:00Z"
                }
              ]
            }
          ]
        }
      ]
    },
    "statistics": {
      "total_directories": 15,
      "total_files": 156,
      "total_size": "45.2MB",
      "file_types": {
        ".py": 45,
        ".json": 12,
        ".bat": 8,
        ".md": 5,
        ".html": 3
      },
      "largest_files": [
        {
          "path": "src/core/codestudio_pro_ultimate.py",
          "size": "45.2KB"
        }
      ]
    },
    "analysis": {
      "organization_score": 88,
      "structure_health": "good",
      "recommendations": [
        "Consider organizing large files into subdirectories",
        "Add documentation for core modules"
      ]
    }
  }
}
```

#### 状态码
- `200`: 成功获取项目结构
- `400`: 参数错误
- `404`: 项目目录不存在
- `500`: 结构分析失败

---

## 🧪 路径测试API

### 1. 运行动态路径测试
**接口地址**: `POST /api/path-test`  
**功能描述**: 运行动态路径测试，验证API功能，生成测试报告

#### 请求参数
```json
{
  "test_type": "comprehensive",     // comprehensive | basic | custom
  "test_suites": [                  // 自定义测试套件
    "path_existence",
    "permission_check",
    "api_functionality",
    "performance_test"
  ],
  "test_config": {
    "timeout": 30000,               // 测试超时时间（毫秒）
    "retry_count": 3,               // 重试次数
    "parallel": true                // 是否并行执行
  },
  "output_format": "detailed"       // detailed | summary | json
}
```

#### 返回值结构
```json
{
  "success": true,
  "data": {
    "test_session": {
      "id": "test_20240120_103000",
      "start_time": "2024-01-20T10:30:00Z",
      "end_time": "2024-01-20T10:32:15Z",
      "duration": "2m 15s",
      "test_type": "comprehensive"
    },
    "results": {
      "summary": {
        "total_tests": 25,
        "passed": 23,
        "failed": 2,
        "skipped": 0,
        "success_rate": 92
      },
      "test_suites": {
        "path_existence": {
          "status": "passed",
          "tests": 8,
          "passed": 8,
          "failed": 0,
          "duration": "0.5s"
        },
        "permission_check": {
          "status": "passed",
          "tests": 6,
          "passed": 6,
          "failed": 0,
          "duration": "0.3s"
        },
        "api_functionality": {
          "status": "failed",
          "tests": 8,
          "passed": 6,
          "failed": 2,
          "duration": "1.2s",
          "failures": [
            {
              "test": "test_path_validation_api",
              "error": "Connection timeout",
              "details": "API endpoint /api/path-validate did not respond within 5 seconds"
            }
          ]
        },
        "performance_test": {
          "status": "passed",
          "tests": 3,
          "passed": 3,
          "failed": 0,
          "duration": "0.5s",
          "metrics": {
            "avg_response_time": "150ms",
            "max_response_time": "300ms",
            "throughput": "45 req/s"
          }
        }
      }
    },
    "report": {
      "health_assessment": "good",
      "performance_score": 88,
      "reliability_score": 92,
      "issues": [
        {
          "severity": "medium",
          "category": "api_functionality",
          "message": "Path validation API timeout",
          "recommendation": "Check network connectivity and API server status"
        }
      ],
      "recommendations": [
        "Optimize API response times",
        "Add retry mechanism for failed requests",
        "Monitor API endpoint availability"
      ]
    }
  }
}
```

#### 状态码
- `200`: 测试完成
- `400`: 测试参数错误
- `500`: 测试执行失败
- `503`: 测试服务不可用

#### 使用示例
```javascript
// 基础测试
const basicTest = await fetch('/api/path-test', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    test_type: 'basic',
    output_format: 'summary'
  })
});

// 综合测试
const comprehensiveTest = await fetch('/api/path-test', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    test_type: 'comprehensive',
    test_config: {
      timeout: 60000,
      retry_count: 3,
      parallel: true
    },
    output_format: 'detailed'
  })
});
```

---

## 🔧 系统管理API

### 1. 系统状态检查
**接口地址**: `GET /api/system-status`  
**功能描述**: 获取系统运行状态和健康信息

#### 返回值结构
```json
{
  "success": true,
  "data": {
    "system": {
      "status": "running",
      "uptime": "2h 15m 30s",
      "version": "v2.1.0",
      "instance_id": "1"
    },
    "components": {
      "web_server": {
        "status": "active",
        "port": 8180,
        "requests_handled": 1250
      },
      "plugin_system": {
        "status": "active",
        "augment_plugin": "loaded",
        "callback_port": 9100
      },
      "file_system": {
        "status": "healthy",
        "disk_usage": "15.2GB / 500GB",
        "available_space": "484.8GB"
      }
    },
    "health": {
      "overall_score": 95,
      "issues": [],
      "last_check": "2024-01-20T10:30:00Z"
    }
  }
}
```

### 2. 清理操作API
**接口地址**: `POST /api/clean`  
**功能描述**: 执行系统清理操作

#### 请求参数
```json
{
  "clean_type": "light",           // light | deep | complete
  "targets": [                     // 清理目标
    "temp_files",
    "cache",
    "logs",
    "user_data"
  ],
  "preserve": [                    // 保留项目
    "settings",
    "plugins",
    "projects"
  ],
  "confirm": true                  // 确认执行
}
```

---

## 🚀 应用控制API

### 1. 启动应用
**接口地址**: `POST /api/launch-app`  
**功能描述**: 启动CodeStudio Pro应用

#### 请求参数
```json
{
  "launch_mode": "normal",         // normal | safe | debug
  "skip_checks": false,            // 跳过启动前检查
  "preserve_settings": true,       // 保留用户设置
  "instance_id": "1"              // 实例ID
}
```

#### 返回值结构
```json
{
  "success": true,
  "data": {
    "process_id": 12345,
    "launch_time": "2024-01-20T10:30:00Z",
    "application_url": "http://localhost:8180",
    "status": "running"
  },
  "message": "应用启动成功"
}
```

### 2. 插件修复
**接口地址**: `POST /api/fix-plugin`  
**功能描述**: 检查并修复Augment插件

#### 请求参数
```json
{
  "plugin_name": "augment",        // 插件名称
  "fix_mode": "auto",              // auto | manual | reinstall
  "backup_settings": true         // 备份插件设置
}
```

#### 返回值结构
```json
{
  "success": true,
  "data": {
    "plugin_status": "fixed",
    "actions_taken": [
      "Reinstalled plugin files",
      "Updated configuration",
      "Restored settings"
    ],
    "backup_location": "backups/plugin_backup_20240120.zip"
  },
  "message": "插件修复完成"
}
```

---

## 🔒 错误处理和安全

### 通用错误格式
```json
{
  "success": false,
  "error": {
    "code": "PATH_NOT_FOUND",
    "message": "指定的路径不存在",
    "details": "Path 'C:\\invalid\\path' does not exist",
    "timestamp": "2024-01-20T10:30:00Z",
    "request_id": "req_12345"
  }
}
```

### 常见错误码
- `PATH_NOT_FOUND`: 路径不存在
- `PERMISSION_DENIED`: 权限不足
- `VALIDATION_FAILED`: 验证失败
- `API_TIMEOUT`: API调用超时
- `INVALID_PARAMETER`: 参数无效
- `SERVICE_UNAVAILABLE`: 服务不可用

### 安全考虑
- 所有路径操作都限制在项目目录内
- 敏感信息在日志中自动脱敏
- API调用需要实例ID验证
- 文件操作需要权限检查

---

*本文档版本: v1.0 | 最后更新: 2024年1月20日*
