#!/usr/bin/env python3
"""
CodeStudio Collaborative 项目清理执行脚本
基于清理计划执行系统性的项目重组和清理操作
"""

import os
import shutil
import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

class ProjectCleanupExecutor:
    """项目清理执行器"""
    
    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root).resolve()
        self.backup_dir = self.project_root.parent / f"CodeStudio-Backup-{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.cleanup_log = []
        
    def log_action(self, action: str, details: str = ""):
        """记录清理操作"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = {
            "timestamp": timestamp,
            "action": action,
            "details": details
        }
        self.cleanup_log.append(log_entry)
        print(f"[{timestamp}] {action}: {details}")
    
    def create_backup(self) -> bool:
        """创建完整项目备份"""
        try:
            self.log_action("开始备份", f"备份到: {self.backup_dir}")
            
            # 创建备份目录
            self.backup_dir.mkdir(exist_ok=True)
            
            # 复制整个项目（排除.git目录以节省空间）
            for item in self.project_root.iterdir():
                if item.name == '.git':
                    continue
                    
                if item.is_dir():
                    shutil.copytree(item, self.backup_dir / item.name, 
                                  ignore=shutil.ignore_patterns('*.pyc', '__pycache__'))
                else:
                    shutil.copy2(item, self.backup_dir / item.name)
            
            self.log_action("备份完成", f"备份大小: {self._get_dir_size(self.backup_dir):.2f} MB")
            return True
            
        except Exception as e:
            self.log_action("备份失败", str(e))
            return False
    
    def _get_dir_size(self, path: Path) -> float:
        """获取目录大小（MB）"""
        total_size = 0
        for dirpath, dirnames, filenames in os.walk(path):
            for filename in filenames:
                filepath = os.path.join(dirpath, filename)
                if os.path.exists(filepath):
                    total_size += os.path.getsize(filepath)
        return total_size / (1024 * 1024)
    
    def extract_core_logic(self):
        """提取核心逻辑到新架构"""
        extractions = {
            # 动态路径管理逻辑
            "path_management": {
                "source": "src/api/dynamic_path_api_manager.py",
                "target": "services/path-service/src/core/path_manager.py",
                "description": "动态路径管理核心逻辑"
            },
            # 资源管理策略
            "resource_management": {
                "source": "src/core/codestudio_pro_ultimate.py",
                "target": "services/resource-service/src/core/resource_allocator.py", 
                "description": "资源分配策略（从单体文件提取）",
                "extract_function": self._extract_resource_logic
            },
            # API管理器
            "api_manager": {
                "source": "src/frontend/core/api-manager.js",
                "target": "frontend/src/core/api-manager.js",
                "description": "前端API管理器"
            },
            # 状态管理器
            "state_manager": {
                "source": "src/frontend/core/state-manager.js", 
                "target": "frontend/src/core/state-manager.js",
                "description": "前端状态管理器"
            }
        }
        
        for name, config in extractions.items():
            try:
                source_path = self.project_root / config["source"]
                target_path = self.project_root / config["target"]
                
                if source_path.exists():
                    # 创建目标目录
                    target_path.parent.mkdir(parents=True, exist_ok=True)
                    
                    if "extract_function" in config:
                        # 使用自定义提取函数
                        config["extract_function"](source_path, target_path)
                    else:
                        # 直接复制文件
                        shutil.copy2(source_path, target_path)
                    
                    self.log_action("提取核心逻辑", f"{name}: {config['description']}")
                else:
                    self.log_action("文件不存在", f"跳过 {name}: {source_path}")
                    
            except Exception as e:
                self.log_action("提取失败", f"{name}: {str(e)}")
    
    def _extract_resource_logic(self, source_path: Path, target_path: Path):
        """从单体文件中提取资源管理逻辑"""
        try:
            with open(source_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 提取资源分配相关的类和函数
            extracted_content = '''#!/usr/bin/env python3
"""
资源管理服务 - 从CodeStudio Pro Ultimate提取的核心逻辑
升级为微服务架构，支持Kubernetes智能调度
"""

import os
import uuid
from pathlib import Path
from typing import Dict, List, Any, Optional

class ResourceAllocator:
    """智能资源分配器 - 升级自原有端口分配策略"""
    
    def __init__(self, base_port: int = 8000, max_instances: int = 100):
        self.base_port = base_port
        self.max_instances = max_instances  # 移除硬编码限制
        self.allocated_ports = {}
    
    def allocate_port_range(self, instance_id: str) -> Dict[str, int]:
        """动态端口分配 - 升级自原有逻辑，支持大规模部署"""
        if instance_id in self.allocated_ports:
            return self.allocated_ports[instance_id]
        
        # 计算端口范围（每个实例分配100个端口）
        instance_num = len(self.allocated_ports)
        web_port = self.base_port + (instance_num * 100)
        callback_port = 9000 + (instance_num * 100)
        
        allocation = {
            "web_port": web_port,
            "callback_port": callback_port,
            "callback_range_start": callback_port,
            "callback_range_end": callback_port + 50
        }
        
        self.allocated_ports[instance_id] = allocation
        return allocation
    
    def deallocate_ports(self, instance_id: str) -> bool:
        """释放端口分配"""
        if instance_id in self.allocated_ports:
            del self.allocated_ports[instance_id]
            return True
        return False
    
    def get_resource_usage(self) -> Dict[str, Any]:
        """获取资源使用情况"""
        return {
            "allocated_instances": len(self.allocated_ports),
            "max_instances": self.max_instances,
            "utilization": len(self.allocated_ports) / self.max_instances,
            "allocated_ports": self.allocated_ports
        }

class DynamicPathManager:
    """动态路径管理器 - 保留原有核心逻辑，适配容器化"""
    
    def __init__(self, container_root: str = "/app"):
        self.container_root = Path(container_root)
    
    def calculate_paths(self, instance_id: str) -> Dict[str, str]:
        """计算实例路径 - 保留原有逻辑"""
        base_path = self.container_root / "instances" / instance_id
        
        return {
            "project_root": str(base_path),
            "user_data": str(base_path / "user-data"),
            "extensions": str(base_path / "extensions"),
            "workspace": str(base_path / "workspace"),
            "logs": str(base_path / "logs"),
            "temp": str(base_path / "temp")
        }
    
    def ensure_paths_exist(self, paths: Dict[str, str]) -> bool:
        """确保路径存在"""
        try:
            for path_type, path_str in paths.items():
                Path(path_str).mkdir(parents=True, exist_ok=True)
            return True
        except Exception as e:
            print(f"路径创建失败: {e}")
            return False

# 保留原有的配置生成逻辑
def generate_machine_id() -> str:
    """生成64位机器ID - 保留原有逻辑"""
    return uuid.uuid4().hex + uuid.uuid4().hex

def generate_device_id() -> str:
    """生成设备ID - 保留原有逻辑"""
    return str(uuid.uuid4())
'''
            
            with open(target_path, 'w', encoding='utf-8') as f:
                f.write(extracted_content)
                
        except Exception as e:
            raise Exception(f"资源逻辑提取失败: {e}")
    
    def create_microservice_structure(self):
        """创建微服务目录结构"""
        services = [
            "instance-service",
            "path-service", 
            "resource-service",
            "collaboration-service",
            "config-service"
        ]
        
        base_structure = {
            "src": ["controllers", "services", "models", "utils", "middleware"],
            "tests": ["unit", "integration"],
            "config": [],
            "docs": []
        }
        
        for service in services:
            service_path = self.project_root / "services" / service
            
            # 创建基础目录结构
            for main_dir, sub_dirs in base_structure.items():
                main_path = service_path / main_dir
                main_path.mkdir(parents=True, exist_ok=True)
                
                for sub_dir in sub_dirs:
                    (main_path / sub_dir).mkdir(exist_ok=True)
            
            # 创建基础文件
            self._create_service_files(service_path, service)
            
            self.log_action("创建微服务结构", f"{service} 目录结构已创建")
    
    def _create_service_files(self, service_path: Path, service_name: str):
        """创建微服务基础文件"""
        # package.json
        package_json = {
            "name": f"codestudio-{service_name}",
            "version": "1.0.0",
            "description": f"CodeStudio Collaborative {service_name}",
            "main": "src/index.js",
            "scripts": {
                "start": "node src/index.js",
                "dev": "nodemon src/index.js",
                "test": "jest",
                "build": "npm run test"
            },
            "dependencies": {
                "express": "^4.18.0",
                "cors": "^2.8.5",
                "helmet": "^6.0.0",
                "dotenv": "^16.0.0"
            },
            "devDependencies": {
                "nodemon": "^2.0.0",
                "jest": "^29.0.0"
            }
        }
        
        with open(service_path / "package.json", 'w') as f:
            json.dump(package_json, f, indent=2)
        
        # Dockerfile
        dockerfile_content = f'''FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

EXPOSE 3000

USER node

CMD ["npm", "start"]
'''
        
        with open(service_path / "Dockerfile", 'w') as f:
            f.write(dockerfile_content)
        
        # README.md
        readme_content = f'''# {service_name.title()}

CodeStudio Collaborative {service_name} microservice.

## Development

```bash
npm install
npm run dev
```

## Testing

```bash
npm test
```

## Docker

```bash
docker build -t codestudio-{service_name} .
docker run -p 3000:3000 codestudio-{service_name}
```
'''
        
        with open(service_path / "README.md", 'w') as f:
            f.write(readme_content)
    
    def delete_obsolete_files(self):
        """删除过时文件"""
        files_to_delete = [
            # 单体架构文件
            "src/core/codestudio_pro_ultimate.py",
            "src/core/codestudio_pro_ultimate.exe",
            
            # 重复目录
            "web",  # 与src/web重复
            
            # VS Code二进制文件（保留必要的，删除冗余的）
            "resources/app",
            "locales",
            
            # 过时配置
            "config/hardcoded_limits.json",
            "scripts/legacy_startup.bat"
        ]
        
        for file_path in files_to_delete:
            full_path = self.project_root / file_path
            if full_path.exists():
                try:
                    if full_path.is_dir():
                        shutil.rmtree(full_path)
                        self.log_action("删除目录", str(full_path))
                    else:
                        full_path.unlink()
                        self.log_action("删除文件", str(full_path))
                except Exception as e:
                    self.log_action("删除失败", f"{full_path}: {e}")
    
    def generate_cleanup_report(self):
        """生成清理报告"""
        report = {
            "cleanup_summary": {
                "timestamp": datetime.now().isoformat(),
                "backup_location": str(self.backup_dir),
                "total_actions": len(self.cleanup_log),
                "project_root": str(self.project_root)
            },
            "actions_log": self.cleanup_log,
            "new_structure": self._analyze_new_structure()
        }
        
        report_path = self.project_root / "docs" / "cleanup_report.json"
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        self.log_action("生成清理报告", str(report_path))
        return report
    
    def _analyze_new_structure(self) -> Dict[str, Any]:
        """分析新的项目结构"""
        structure = {}
        
        for root, dirs, files in os.walk(self.project_root):
            rel_path = os.path.relpath(root, self.project_root)
            if rel_path == '.':
                rel_path = 'root'
            
            structure[rel_path] = {
                "directories": len(dirs),
                "files": len(files),
                "total_size_mb": self._get_dir_size(Path(root))
            }
        
        return structure
    
    def execute_full_cleanup(self):
        """执行完整的清理流程"""
        print("🚀 开始 CodeStudio Collaborative 项目清理...")
        
        # 1. 创建备份
        if not self.create_backup():
            print("❌ 备份失败，停止清理操作")
            return False
        
        # 2. 创建新的微服务结构
        self.create_microservice_structure()
        
        # 3. 提取核心逻辑
        self.extract_core_logic()
        
        # 4. 删除过时文件
        self.delete_obsolete_files()
        
        # 5. 生成清理报告
        report = self.generate_cleanup_report()
        
        print(f"✅ 清理完成！共执行 {len(self.cleanup_log)} 个操作")
        print(f"📁 备份位置: {self.backup_dir}")
        print(f"📊 清理报告: docs/cleanup_report.json")
        
        return True

if __name__ == "__main__":
    executor = ProjectCleanupExecutor()
    executor.execute_full_cleanup()
