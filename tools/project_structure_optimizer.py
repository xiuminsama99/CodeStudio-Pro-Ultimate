#!/usr/bin/env python3
"""
CodeStudio Pro Ultimate V2.1 - 项目结构优化器
自动化项目文件组织和结构优化工具

版本: 1.0
作者: AI Assistant
功能: 项目结构整理、文件分类归档、命名规范化、依赖关系管理
"""

import os
import shutil
import json
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

# ============================================================================
# 项目结构配置
# ============================================================================

class ProjectStructureConfig:
    """项目结构配置类"""
    
    # 推荐的目录结构
    RECOMMENDED_STRUCTURE = {
        "src/": {
            "description": "源代码目录",
            "subdirs": {
                "core/": "核心功能模块",
                "api/": "API接口模块", 
                "web/": "Web界面文件",
                "plugins/": "插件相关代码",
                "utils/": "工具函数库"
            }
        },
        "config/": {
            "description": "配置文件目录",
            "subdirs": {
                "templates/": "配置模板",
                "defaults/": "默认配置"
            }
        },
        "tests/": {
            "description": "测试文件目录",
            "subdirs": {
                "unit/": "单元测试",
                "integration/": "集成测试",
                "api/": "API测试"
            }
        },
        "docs/": {
            "description": "文档目录",
            "subdirs": {
                "api/": "API文档",
                "user/": "用户文档",
                "dev/": "开发文档"
            }
        },
        "tools/": {
            "description": "开发工具目录",
            "subdirs": {
                "scripts/": "脚本工具",
                "migration/": "迁移工具"
            }
        },
        "backup/": {
            "description": "备份目录",
            "subdirs": {
                "config/": "配置备份",
                "data/": "数据备份"
            }
        },
        "logs/": {
            "description": "日志目录",
            "subdirs": {
                "api/": "API日志",
                "system/": "系统日志",
                "error/": "错误日志"
            }
        }
    }
    
    # 文件分类规则
    FILE_CATEGORIES = {
        "core_python": {
            "pattern": ["codestudio_pro_ultimate.py"],
            "target": "src/core/",
            "description": "核心Python文件"
        },
        "api_files": {
            "pattern": ["unified_api*.py", "api_*.py"],
            "target": "src/api/",
            "description": "API相关文件"
        },
        "web_files": {
            "pattern": ["*.html", "*.css", "*.js"],
            "target": "src/web/",
            "description": "Web界面文件"
        },
        "plugin_files": {
            "pattern": ["*plugin*.py", "augment*.py"],
            "target": "src/plugins/",
            "description": "插件相关文件"
        },
        "config_files": {
            "pattern": ["*.json", "*.ini", "*.conf"],
            "target": "config/",
            "description": "配置文件"
        },
        "test_files": {
            "pattern": ["*test*.py", "*_test.py", "test_*.py"],
            "target": "tests/",
            "description": "测试文件"
        },
        "doc_files": {
            "pattern": ["*.md", "*.txt", "*.rst"],
            "target": "docs/",
            "description": "文档文件"
        },
        "tool_files": {
            "pattern": ["*tool*.py", "*migration*.py", "*optimizer*.py"],
            "target": "tools/",
            "description": "工具文件"
        },
        "batch_files": {
            "pattern": ["*.bat", "*.cmd", "*.ps1"],
            "target": "tools/scripts/",
            "description": "批处理脚本"
        }
    }

# ============================================================================
# 项目结构优化器
# ============================================================================

class ProjectStructureOptimizer:
    """项目结构优化器"""
    
    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root).resolve()
        self.config = ProjectStructureConfig()
        self.optimization_log = []
        
    def analyze_current_structure(self) -> Dict[str, Any]:
        """分析当前项目结构"""
        print("🔍 分析当前项目结构...")
        
        analysis = {
            "total_files": 0,
            "file_types": {},
            "large_files": [],
            "categorized_files": {},
            "issues": []
        }
        
        # 扫描所有文件
        for file_path in self.project_root.rglob("*"):
            if file_path.is_file():
                analysis["total_files"] += 1
                
                # 统计文件类型
                suffix = file_path.suffix.lower()
                analysis["file_types"][suffix] = analysis["file_types"].get(suffix, 0) + 1
                
                # 检查大文件
                try:
                    size_mb = file_path.stat().st_size / (1024 * 1024)
                    if size_mb > 1:  # 大于1MB的文件
                        analysis["large_files"].append({
                            "path": str(file_path.relative_to(self.project_root)),
                            "size_mb": round(size_mb, 2)
                        })
                except:
                    pass
                
                # 文件分类
                self._categorize_file(file_path, analysis["categorized_files"])
        
        # 检查结构问题
        self._check_structure_issues(analysis)
        
        print(f"✅ 结构分析完成: {analysis['total_files']} 个文件")
        return analysis
    
    def _categorize_file(self, file_path: Path, categorized_files: Dict):
        """文件分类"""
        relative_path = file_path.relative_to(self.project_root)
        file_name = file_path.name
        
        for category, config in self.config.FILE_CATEGORIES.items():
            for pattern in config["pattern"]:
                if self._match_pattern(file_name, pattern):
                    if category not in categorized_files:
                        categorized_files[category] = []
                    categorized_files[category].append(str(relative_path))
                    return
        
        # 未分类文件
        if "uncategorized" not in categorized_files:
            categorized_files["uncategorized"] = []
        categorized_files["uncategorized"].append(str(relative_path))
    
    def _match_pattern(self, filename: str, pattern: str) -> bool:
        """模式匹配"""
        import fnmatch
        return fnmatch.fnmatch(filename.lower(), pattern.lower())
    
    def _check_structure_issues(self, analysis: Dict):
        """检查结构问题"""
        issues = analysis["issues"]
        
        # 检查是否有过大的文件
        for large_file in analysis["large_files"]:
            if large_file["size_mb"] > 5:
                issues.append(f"超大文件: {large_file['path']} ({large_file['size_mb']}MB)")
        
        # 检查是否缺少重要目录
        important_dirs = ["src", "tests", "docs", "config"]
        for dir_name in important_dirs:
            if not (self.project_root / dir_name).exists():
                issues.append(f"缺少重要目录: {dir_name}/")
        
        # 检查根目录文件过多
        root_files = [f for f in self.project_root.iterdir() if f.is_file()]
        if len(root_files) > 10:
            issues.append(f"根目录文件过多: {len(root_files)} 个文件")
    
    def create_optimized_structure(self, dry_run: bool = True) -> Dict[str, Any]:
        """创建优化的项目结构"""
        print("🏗️ 创建优化的项目结构...")
        
        result = {
            "created_dirs": [],
            "moved_files": [],
            "warnings": [],
            "dry_run": dry_run
        }
        
        # 创建推荐的目录结构
        for dir_path, config in self.config.RECOMMENDED_STRUCTURE.items():
            full_path = self.project_root / dir_path
            if not dry_run:
                full_path.mkdir(parents=True, exist_ok=True)
            result["created_dirs"].append(dir_path)
            
            # 创建子目录
            for subdir, desc in config.get("subdirs", {}).items():
                sub_path = full_path / subdir
                if not dry_run:
                    sub_path.mkdir(parents=True, exist_ok=True)
                result["created_dirs"].append(f"{dir_path}{subdir}")
        
        print(f"✅ 目录结构创建完成: {len(result['created_dirs'])} 个目录")
        return result
    
    def organize_files(self, dry_run: bool = True) -> Dict[str, Any]:
        """组织文件到合适的目录"""
        print("📁 组织文件到合适的目录...")
        
        result = {
            "moved_files": [],
            "skipped_files": [],
            "errors": [],
            "dry_run": dry_run
        }
        
        # 分析当前文件
        analysis = self.analyze_current_structure()
        
        # 移动文件到合适的目录
        for category, files in analysis["categorized_files"].items():
            if category == "uncategorized":
                continue
                
            category_config = self.config.FILE_CATEGORIES.get(category)
            if not category_config:
                continue
                
            target_dir = self.project_root / category_config["target"]
            
            for file_path_str in files:
                source_path = self.project_root / file_path_str
                target_path = target_dir / source_path.name
                
                # 检查是否需要移动
                if source_path.parent == target_dir:
                    result["skipped_files"].append(f"{file_path_str} (已在目标目录)")
                    continue
                
                # 检查目标文件是否已存在
                if target_path.exists():
                    result["skipped_files"].append(f"{file_path_str} (目标已存在)")
                    continue
                
                try:
                    if not dry_run:
                        target_dir.mkdir(parents=True, exist_ok=True)
                        shutil.move(str(source_path), str(target_path))
                    
                    result["moved_files"].append({
                        "from": file_path_str,
                        "to": str(target_path.relative_to(self.project_root)),
                        "category": category
                    })
                    
                except Exception as e:
                    result["errors"].append(f"移动失败 {file_path_str}: {e}")
        
        print(f"✅ 文件组织完成: {len(result['moved_files'])} 个文件移动")
        return result
    
    def generate_structure_report(self) -> str:
        """生成项目结构报告"""
        print("📊 生成项目结构报告...")
        
        analysis = self.analyze_current_structure()
        
        report = f"""# CodeStudio Pro Ultimate V2.1 - 项目结构报告

生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## 📊 项目概览

- **总文件数**: {analysis['total_files']}
- **文件类型**: {len(analysis['file_types'])} 种
- **大文件数**: {len(analysis['large_files'])}
- **结构问题**: {len(analysis['issues'])}

## 📁 文件类型分布

"""
        
        for file_type, count in sorted(analysis['file_types'].items()):
            report += f"- `{file_type or '无扩展名'}`: {count} 个文件\n"
        
        report += "\n## 📂 文件分类统计\n\n"
        
        for category, files in analysis['categorized_files'].items():
            category_config = self.config.FILE_CATEGORIES.get(category, {})
            desc = category_config.get('description', '未分类文件')
            report += f"- **{desc}** ({category}): {len(files)} 个文件\n"
        
        if analysis['large_files']:
            report += "\n## 📦 大文件列表\n\n"
            for large_file in analysis['large_files']:
                report += f"- `{large_file['path']}`: {large_file['size_mb']}MB\n"
        
        if analysis['issues']:
            report += "\n## ⚠️ 结构问题\n\n"
            for issue in analysis['issues']:
                report += f"- {issue}\n"
        
        report += "\n## 🎯 优化建议\n\n"
        report += "1. 创建标准化的目录结构\n"
        report += "2. 将文件按功能分类组织\n"
        report += "3. 建立统一的命名规范\n"
        report += "4. 设置项目管理工具\n"
        
        return report
    
    def save_report(self, report: str, filename: str = "project_structure_report.md"):
        """保存结构报告"""
        report_path = self.project_root / filename
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"📄 报告已保存: {report_path}")

# ============================================================================
# 便捷函数
# ============================================================================

def analyze_project_structure(project_root: str = ".") -> Dict[str, Any]:
    """分析项目结构的便捷函数"""
    optimizer = ProjectStructureOptimizer(project_root)
    return optimizer.analyze_current_structure()

def optimize_project_structure(project_root: str = ".", dry_run: bool = True) -> Dict[str, Any]:
    """优化项目结构的便捷函数"""
    optimizer = ProjectStructureOptimizer(project_root)
    
    # 创建目录结构
    dir_result = optimizer.create_optimized_structure(dry_run)
    
    # 组织文件
    file_result = optimizer.organize_files(dry_run)
    
    # 生成报告
    report = optimizer.generate_structure_report()
    if not dry_run:
        optimizer.save_report(report)
    
    return {
        "directories": dir_result,
        "files": file_result,
        "report": report
    }

# ============================================================================
# 主函数
# ============================================================================

if __name__ == "__main__":
    print("🚀 CodeStudio Pro Ultimate V2.1 - 项目结构优化器")
    print("=" * 60)
    
    # 分析当前结构
    analysis = analyze_project_structure()
    
    print("\n" + "=" * 60)
    print("选择操作:")
    print("1. 仅分析项目结构")
    print("2. 预览优化方案 (dry-run)")
    print("3. 执行结构优化")
    
    choice = input("请输入选择 (1-3): ").strip()
    
    if choice == "1":
        optimizer = ProjectStructureOptimizer()
        report = optimizer.generate_structure_report()
        print("\n" + report)
        
    elif choice == "2":
        print("\n🔍 预览优化方案...")
        result = optimize_project_structure(dry_run=True)
        print("\n📋 优化预览完成")
        
    elif choice == "3":
        confirm = input("\n⚠️ 确认执行结构优化? (y/N): ").strip().lower()
        if confirm == 'y':
            print("\n🚀 执行结构优化...")
            result = optimize_project_structure(dry_run=False)
            print("\n🎉 结构优化完成!")
        else:
            print("❌ 操作已取消")
    
    else:
        print("❌ 无效选择")
