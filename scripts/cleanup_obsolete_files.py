#!/usr/bin/env python3
"""
清理过时文件脚本
基于技术整合分析报告，删除不再需要的文件和目录
"""

import os
import shutil
from pathlib import Path
from datetime import datetime

class ObsoleteFileCleaner:
    """过时文件清理器"""
    
    def __init__(self, project_root="."):
        self.project_root = Path(project_root).resolve()
        self.deleted_files = []
        self.deleted_dirs = []
        self.errors = []
        
    def log_action(self, action, path, success=True, error=None):
        """记录清理操作"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        if success:
            print(f"[{timestamp}] ✅ {action}: {path}")
            if action == "删除文件":
                self.deleted_files.append(str(path))
            elif action == "删除目录":
                self.deleted_dirs.append(str(path))
        else:
            print(f"[{timestamp}] ❌ {action}失败: {path} - {error}")
            self.errors.append({"action": action, "path": str(path), "error": str(error)})
    
    def delete_obsolete_files(self):
        """删除过时文件"""
        print("🗑️ 开始删除过时文件...")
        
        # 单体架构文件（需要删除）
        obsolete_files = [
            # 巨型单体文件
            "src/core/codestudio_pro_ultimate.py",
            "src/core/codestudio_pro_ultimate.exe",
            
            # 过时的配置文件
            "config/hardcoded_limits.json",
            "config/single_instance.conf",
            
            # 过时的脚本
            "scripts/legacy_startup.bat",
            "scripts/old_cleanup.py",
            
            # 重复的Web文件
            "web/index.html",  # 如果与src/web重复
            "web/style.css",
            "web/script.js",
            
            # 过时的文档
            "README_old.md",
            "CHANGELOG_legacy.md"
        ]
        
        for file_path in obsolete_files:
            full_path = self.project_root / file_path
            if full_path.exists() and full_path.is_file():
                try:
                    full_path.unlink()
                    self.log_action("删除文件", full_path)
                except Exception as e:
                    self.log_action("删除文件", full_path, False, e)
            else:
                print(f"⏭️ 跳过不存在的文件: {full_path}")
    
    def delete_obsolete_directories(self):
        """删除过时目录"""
        print("🗑️ 开始删除过时目录...")
        
        # 需要删除的目录
        obsolete_dirs = [
            # 重复的web目录（如果确认与src/web重复）
            "web",
            
            # VS Code二进制文件目录（保留必要的，删除冗余的）
            "resources/app",
            "locales",
            
            # 过时的工具目录
            "tools/legacy",
            "tools/old_scripts",
            
            # 临时和缓存目录
            "temp",
            "cache",
            "__pycache__"
        ]
        
        for dir_path in obsolete_dirs:
            full_path = self.project_root / dir_path
            if full_path.exists() and full_path.is_dir():
                try:
                    # 检查是否为重复的web目录
                    if dir_path == "web":
                        src_web = self.project_root / "src" / "web"
                        if src_web.exists():
                            print(f"🔍 检测到重复的web目录，删除根目录下的web/")
                            shutil.rmtree(full_path)
                            self.log_action("删除目录", full_path)
                        else:
                            print(f"⏭️ 保留web目录（src/web不存在）")
                    else:
                        shutil.rmtree(full_path)
                        self.log_action("删除目录", full_path)
                except Exception as e:
                    self.log_action("删除目录", full_path, False, e)
            else:
                print(f"⏭️ 跳过不存在的目录: {full_path}")
    
    def clean_python_cache(self):
        """清理Python缓存文件"""
        print("🧹 清理Python缓存文件...")
        
        cache_patterns = [
            "**/__pycache__",
            "**/*.pyc",
            "**/*.pyo",
            "**/*.pyd"
        ]
        
        for pattern in cache_patterns:
            for cache_path in self.project_root.glob(pattern):
                try:
                    if cache_path.is_file():
                        cache_path.unlink()
                        self.log_action("删除缓存文件", cache_path)
                    elif cache_path.is_dir():
                        shutil.rmtree(cache_path)
                        self.log_action("删除缓存目录", cache_path)
                except Exception as e:
                    self.log_action("删除缓存", cache_path, False, e)
    
    def clean_node_modules(self):
        """清理node_modules目录（如果存在）"""
        print("🧹 清理node_modules目录...")
        
        node_modules_dirs = list(self.project_root.glob("**/node_modules"))
        
        for node_modules in node_modules_dirs:
            try:
                shutil.rmtree(node_modules)
                self.log_action("删除node_modules", node_modules)
            except Exception as e:
                self.log_action("删除node_modules", node_modules, False, e)
    
    def clean_log_files(self):
        """清理旧的日志文件"""
        print("🧹 清理旧日志文件...")
        
        log_patterns = [
            "**/*.log",
            "**/logs/*.txt",
            "**/logs/*.out"
        ]
        
        for pattern in log_patterns:
            for log_file in self.project_root.glob(pattern):
                try:
                    # 只删除超过7天的日志文件
                    if log_file.is_file():
                        file_age = datetime.now().timestamp() - log_file.stat().st_mtime
                        if file_age > 7 * 24 * 3600:  # 7天
                            log_file.unlink()
                            self.log_action("删除旧日志", log_file)
                except Exception as e:
                    self.log_action("删除日志", log_file, False, e)
    
    def organize_docs(self):
        """整理文档目录"""
        print("📚 整理文档目录...")
        
        # 删除已整合的旧文档
        old_docs = [
            "docs/前端/frontend_refactoring_plan.md",  # 已整合到统一文档
            "docs/前端/refactoring_summary.md"        # 已整合到统一文档
        ]
        
        for doc_path in old_docs:
            full_path = self.project_root / doc_path
            if full_path.exists():
                try:
                    full_path.unlink()
                    self.log_action("删除已整合文档", full_path)
                except Exception as e:
                    self.log_action("删除文档", full_path, False, e)
        
        # 保留重要文档
        important_docs = [
            "docs/CodeStudio_Collaborative_Design_Proposal.md",
            "docs/CodeStudio_Technical_Integration_Analysis.md", 
            "docs/CodeStudio_Collaborative_Unified_Technical_Doc.md",
            "docs/Project_Cleanup_Plan.md"
        ]
        
        print("📋 保留的重要文档:")
        for doc in important_docs:
            doc_path = self.project_root / doc
            if doc_path.exists():
                print(f"  ✅ {doc}")
            else:
                print(f"  ❌ {doc} (不存在)")
    
    def generate_cleanup_report(self):
        """生成清理报告"""
        report = {
            "cleanup_summary": {
                "timestamp": datetime.now().isoformat(),
                "deleted_files_count": len(self.deleted_files),
                "deleted_dirs_count": len(self.deleted_dirs),
                "errors_count": len(self.errors)
            },
            "deleted_files": self.deleted_files,
            "deleted_directories": self.deleted_dirs,
            "errors": self.errors
        }
        
        # 保存报告
        report_path = self.project_root / "docs" / "cleanup_report.json"
        try:
            import json
            with open(report_path, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            print(f"📊 清理报告已保存: {report_path}")
        except Exception as e:
            print(f"❌ 保存清理报告失败: {e}")
        
        return report
    
    def execute_cleanup(self):
        """执行完整清理流程"""
        print("🚀 开始执行项目清理...")
        print(f"📁 项目根目录: {self.project_root}")
        
        # 执行各种清理操作
        self.delete_obsolete_files()
        self.delete_obsolete_directories()
        self.clean_python_cache()
        self.clean_node_modules()
        self.clean_log_files()
        self.organize_docs()
        
        # 生成报告
        report = self.generate_cleanup_report()
        
        print("\n" + "="*60)
        print("🎉 清理完成！")
        print(f"📊 删除文件: {len(self.deleted_files)} 个")
        print(f"📊 删除目录: {len(self.deleted_dirs)} 个")
        print(f"📊 错误数量: {len(self.errors)} 个")
        
        if self.errors:
            print("\n⚠️ 清理过程中的错误:")
            for error in self.errors:
                print(f"  - {error['action']}: {error['path']} ({error['error']})")
        
        print("\n✨ 项目结构已优化，准备迁移到微服务架构！")
        
        return report

if __name__ == "__main__":
    cleaner = ObsoleteFileCleaner()
    cleaner.execute_cleanup()
