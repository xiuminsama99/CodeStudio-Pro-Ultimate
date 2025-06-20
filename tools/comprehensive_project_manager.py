#!/usr/bin/env python3
"""
CodeStudio Pro Ultimate V2.1 - 综合项目管理工具
整合所有管理功能的统一入口，提供完整的项目管理解决方案

版本: 1.0
作者: AI Assistant
功能: 统一管理入口、自动化流程、报告生成、一键操作
"""

import os
import sys
import json
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

# 导入各个管理模块
try:
    from project_structure_optimizer import ProjectStructureOptimizer
    from code_management_system import CodeManagementSystem
    from functionality_integrity_validator import FunctionalityIntegrityValidator
    from risk_assessment_system import RiskIdentifier, EmergencyRollbackManager, MonitoringSystem
    from api_test_framework import run_full_tests
except ImportError as e:
    print(f"⚠️ 警告: 部分模块导入失败 - {e}")

# ============================================================================
# 综合项目管理器
# ============================================================================

class ComprehensiveProjectManager:
    """综合项目管理器"""

    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root).resolve()
        self.config_file = self.project_root / "config/project_management_config.json"

        # 初始化各个管理器
        try:
            self.structure_optimizer = ProjectStructureOptimizer(project_root)
            self.code_manager = CodeManagementSystem(project_root)
            self.integrity_validator = FunctionalityIntegrityValidator(project_root)
            self.risk_identifier = RiskIdentifier(project_root)
            self.rollback_manager = EmergencyRollbackManager(project_root)
            self.monitoring_system = MonitoringSystem(project_root)
        except Exception as e:
            print(f"⚠️ 管理器初始化警告: {e}")

        # 加载配置
        self.config = self.load_config()

    def load_config(self) -> Dict[str, Any]:
        """加载项目管理配置"""
        default_config = {
            "auto_backup": True,
            "monitoring_enabled": True,
            "risk_assessment_frequency": "daily",
            "quality_check_enabled": True,
            "last_maintenance": None,
            "project_version": "2.1.0"
        }

        if self.config_file.exists():
            try:
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    # 合并默认配置
                    for key, value in default_config.items():
                        if key not in config:
                            config[key] = value
                    return config
            except:
                pass

        return default_config

    def save_config(self):
        """保存项目管理配置"""
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"⚠️ 配置保存失败: {e}")

    def run_comprehensive_check(self) -> Dict[str, Any]:
        """运行综合检查"""
        print("🔍 执行综合项目检查...")

        results = {
            "timestamp": datetime.now().isoformat(),
            "overall_status": "pass",
            "checks": {}
        }

        # 1. API功能测试
        print("  🔗 API功能测试...")
        try:
            if 'run_full_tests' in globals():
                api_result = run_full_tests()
                results["checks"]["api_tests"] = {
                    "status": "pass" if api_result["summary"]["success_rate"] == 100 else "fail",
                    "details": api_result["summary"]
                }
            else:
                results["checks"]["api_tests"] = {
                    "status": "warning",
                    "details": {"message": "API测试模块未导入"}
                }
        except Exception as e:
            results["checks"]["api_tests"] = {
                "status": "error",
                "details": {"error": str(e)}
            }

        # 2. 功能完整性验证
        print("  ✅ 功能完整性验证...")
        try:
            integrity_result = self.integrity_validator.validate_all_functionality()
            results["checks"]["functionality"] = {
                "status": integrity_result["overall_status"],
                "details": integrity_result["summary"]
            }
        except Exception as e:
            results["checks"]["functionality"] = {
                "status": "error",
                "details": {"error": str(e)}
            }

        # 3. 风险评估
        print("  ⚠️ 风险评估...")
        try:
            risk_result = self.risk_identifier.assess_all_risks()
            results["checks"]["risks"] = {
                "status": "pass" if risk_result["overall_risk_level"] in ["low", "medium"] else "warning",
                "details": {
                    "risk_level": risk_result["overall_risk_level"],
                    "total_risks": risk_result["total_risks"],
                    "risk_counts": risk_result["risk_counts"]
                }
            }
        except Exception as e:
            results["checks"]["risks"] = {
                "status": "error",
                "details": {"error": str(e)}
            }

        # 4. 代码质量检查
        print("  📊 代码质量检查...")
        try:
            quality_result = self.code_manager.quality_checker.check_project_quality()
            results["checks"]["code_quality"] = {
                "status": "pass" if quality_result["average_score"] >= 80 else "warning",
                "details": {
                    "average_score": quality_result["average_score"],
                    "total_issues": quality_result["total_issues"],
                    "checked_files": quality_result["checked_files"]
                }
            }
        except Exception as e:
            results["checks"]["code_quality"] = {
                "status": "error",
                "details": {"error": str(e)}
            }

        # 5. 系统健康检查
        print("  💓 系统健康检查...")
        try:
            health_result = self.monitoring_system.check_system_health()
            results["checks"]["system_health"] = {
                "status": health_result["overall_status"],
                "details": health_result["checks"]
            }
        except Exception as e:
            results["checks"]["system_health"] = {
                "status": "error",
                "details": {"error": str(e)}
            }

        # 计算总体状态
        failed_checks = sum(1 for check in results["checks"].values() if check["status"] == "error")
        warning_checks = sum(1 for check in results["checks"].values() if check["status"] in ["warning", "fail"])

        if failed_checks > 0:
            results["overall_status"] = "error"
        elif warning_checks > 0:
            results["overall_status"] = "warning"

        print(f"✅ 综合检查完成: {results['overall_status']}")
        return results

    def run_maintenance_routine(self) -> Dict[str, Any]:
        """运行维护例程"""
        print("🔧 执行项目维护例程...")

        maintenance_results = {
            "timestamp": datetime.now().isoformat(),
            "operations": {}
        }

        # 1. 创建备份
        if self.config.get("auto_backup", True):
            print("  💾 创建自动备份...")
            try:
                backup_result = self.rollback_manager.create_emergency_backup()
                maintenance_results["operations"]["backup"] = backup_result
            except Exception as e:
                maintenance_results["operations"]["backup"] = {"error": str(e)}

        # 2. 代码质量检查和维护
        if self.config.get("quality_check_enabled", True):
            print("  📊 代码质量维护...")
            try:
                quality_result = self.code_manager.daily_maintenance()
                maintenance_results["operations"]["quality_maintenance"] = quality_result
            except Exception as e:
                maintenance_results["operations"]["quality_maintenance"] = {"error": str(e)}

        # 3. 系统健康监控
        if self.config.get("monitoring_enabled", True):
            print("  💓 系统健康监控...")
            try:
                health_result = self.monitoring_system.check_system_health()
                maintenance_results["operations"]["health_check"] = health_result
            except Exception as e:
                maintenance_results["operations"]["health_check"] = {"error": str(e)}

        # 4. 清理旧文件
        print("  🧹 清理临时文件...")
        try:
            cleanup_result = self._cleanup_temporary_files()
            maintenance_results["operations"]["cleanup"] = cleanup_result
        except Exception as e:
            maintenance_results["operations"]["cleanup"] = {"error": str(e)}

        # 更新维护时间
        self.config["last_maintenance"] = datetime.now().isoformat()
        self.save_config()

        print("✅ 维护例程完成")
        return maintenance_results

    def _cleanup_temporary_files(self) -> Dict[str, Any]:
        """清理临时文件"""
        cleanup_patterns = [
            "*.tmp", "*.temp", "*.log", "*~", "*.bak",
            "__pycache__", "*.pyc", "*.pyo"
        ]

        cleaned_files = []
        cleaned_size = 0

        for pattern in cleanup_patterns:
            for file_path in self.project_root.rglob(pattern):
                try:
                    if file_path.is_file():
                        size = file_path.stat().st_size
                        file_path.unlink()
                        cleaned_files.append(str(file_path.relative_to(self.project_root)))
                        cleaned_size += size
                    elif file_path.is_dir() and pattern == "__pycache__":
                        import shutil
                        shutil.rmtree(file_path)
                        cleaned_files.append(str(file_path.relative_to(self.project_root)) + "/")
                except:
                    pass

        return {
            "cleaned_files": len(cleaned_files),
            "cleaned_size_mb": round(cleaned_size / (1024 * 1024), 2),
            "files": cleaned_files[:10]  # 只显示前10个
        }

    def generate_comprehensive_report(self) -> str:
        """生成综合项目报告"""
        print("📊 生成综合项目报告...")

        # 运行综合检查
        check_results = self.run_comprehensive_check()

        report = f"""# CodeStudio Pro Ultimate V2.1 - 综合项目报告

生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
项目版本: {self.config.get('project_version', '2.1.0')}
项目路径: {self.project_root}

## 📋 总体状态

**状态**: {check_results['overall_status'].upper()}

## 🔍 检查结果详情

"""

        # 检查结果统计
        status_icons = {
            "pass": "✅",
            "warning": "⚠️",
            "fail": "❌",
            "error": "🔴"
        }

        for check_name, check_result in check_results["checks"].items():
            status = check_result["status"]
            icon = status_icons.get(status, "❓")
            report += f"### {icon} {check_name.replace('_', ' ').title()}\n\n"
            report += f"**状态**: {status}\n\n"

            if "details" in check_result:
                details = check_result["details"]
                if isinstance(details, dict):
                    for key, value in details.items():
                        if isinstance(value, (int, float, str)):
                            report += f"- **{key}**: {value}\n"

            report += "\n"

        # 配置信息
        report += "## ⚙️ 项目配置\n\n"
        for key, value in self.config.items():
            if key != "last_maintenance":
                report += f"- **{key}**: {value}\n"

        if self.config.get("last_maintenance"):
            last_maintenance = self.config["last_maintenance"][:19]
            report += f"- **last_maintenance**: {last_maintenance}\n"

        # 建议和下一步
        report += "\n## 🎯 建议和下一步\n\n"

        # 根据检查结果生成建议
        if check_results["overall_status"] == "error":
            report += "- 🚨 **紧急**: 发现严重问题，建议立即处理\n"
        elif check_results["overall_status"] == "warning":
            report += "- ⚠️ **注意**: 发现潜在问题，建议及时处理\n"
        else:
            report += "- ✅ **良好**: 项目状态正常，继续保持\n"

        report += "- 🔄 定期运行维护例程\n"
        report += "- 📊 监控项目健康状态\n"
        report += "- 💾 保持备份习惯\n"
        report += "- 📈 持续改进代码质量\n"

        return report

    def save_report(self, report: str, filename: str = None):
        """保存报告"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"comprehensive_project_report_{timestamp}.md"

        report_path = self.project_root / filename
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"📄 报告已保存: {report_path}")

    def quick_health_check(self) -> str:
        """快速健康检查"""
        print("⚡ 快速健康检查...")

        # 检查关键文件
        critical_files = [
            "src/core/codestudio_pro_ultimate.py",
            "src/web/codestudio_smart_launcher.html",
            "src/api/unified_api_clean.py"
        ]

        missing_files = []
        for file_path in critical_files:
            if not (self.project_root / file_path).exists():
                missing_files.append(file_path)

        # 检查API状态
        api_status = "unknown"
        try:
            if 'run_full_tests' in globals():
                api_result = run_full_tests()
                api_status = "ok" if api_result["summary"]["success_rate"] == 100 else "issues"
        except:
            api_status = "error"

        # 生成快速报告
        if missing_files:
            return f"🔴 健康状态: 异常\n缺少关键文件: {', '.join(missing_files)}"
        elif api_status == "error":
            return f"🟠 健康状态: 警告\nAPI测试失败"
        elif api_status == "issues":
            return f"🟡 健康状态: 部分问题\nAPI部分功能异常"
        else:
            return f"🟢 健康状态: 良好\n所有关键组件正常"

# ============================================================================
# 便捷函数
# ============================================================================

def run_comprehensive_check(project_root: str = ".") -> Dict[str, Any]:
    """运行综合检查的便捷函数"""
    manager = ComprehensiveProjectManager(project_root)
    return manager.run_comprehensive_check()

def run_maintenance_routine(project_root: str = ".") -> Dict[str, Any]:
    """运行维护例程的便捷函数"""
    manager = ComprehensiveProjectManager(project_root)
    return manager.run_maintenance_routine()

def generate_project_report(project_root: str = ".") -> str:
    """生成项目报告的便捷函数"""
    manager = ComprehensiveProjectManager(project_root)
    return manager.generate_comprehensive_report()

def quick_health_check(project_root: str = ".") -> str:
    """快速健康检查的便捷函数"""
    manager = ComprehensiveProjectManager(project_root)
    return manager.quick_health_check()

# ============================================================================
# 主函数
# ============================================================================

if __name__ == "__main__":
    print("🚀 CodeStudio Pro Ultimate V2.1 - 综合项目管理工具")
    print("=" * 60)

    manager = ComprehensiveProjectManager()

    print("选择操作:")
    print("1. 快速健康检查")
    print("2. 综合项目检查")
    print("3. 运行维护例程")
    print("4. 生成综合报告")
    print("5. 项目配置管理")

    choice = input("请输入选择 (1-5): ").strip()

    if choice == "1":
        result = manager.quick_health_check()
        print(f"\n{result}")

    elif choice == "2":
        result = manager.run_comprehensive_check()
        print(f"\n🔍 综合检查完成: {result['overall_status']}")

    elif choice == "3":
        result = manager.run_maintenance_routine()
        print(f"\n🔧 维护例程完成")

    elif choice == "4":
        report = manager.generate_comprehensive_report()
        print("\n" + report)
        manager.save_report(report)

    elif choice == "5":
        print(f"\n⚙️ 当前配置:")
        for key, value in manager.config.items():
            print(f"  {key}: {value}")

        print("\n可修改的配置项:")
        print("- auto_backup (True/False)")
        print("- monitoring_enabled (True/False)")
        print("- quality_check_enabled (True/False)")

        config_key = input("要修改的配置项 (回车跳过): ").strip()
        if config_key and config_key in manager.config:
            new_value = input(f"新值 (当前: {manager.config[config_key]}): ").strip()
            if new_value.lower() in ['true', 'false']:
                manager.config[config_key] = new_value.lower() == 'true'
                manager.save_config()
                print("✅ 配置已更新")

    else:
        print("❌ 无效选择")
