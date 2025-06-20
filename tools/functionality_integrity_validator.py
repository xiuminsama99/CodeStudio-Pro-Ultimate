#!/usr/bin/env python3
"""
CodeStudio Pro Ultimate V2.1 - 功能完整性验证器
验证重构后所有原有功能是否完整保留，确保四层隔离机制有效

版本: 1.0
作者: AI Assistant
功能: 功能完整性验证、四层隔离检查、前后端兼容性测试、回归测试
"""

import os
import sys
import json
import sqlite3
import subprocess
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime

# 导入API测试框架
try:
    from api_test_framework import run_full_tests
    from unified_api_clean import api_manager
except ImportError:
    print("⚠️ 警告: 无法导入API测试模块")
    run_full_tests = None

# ============================================================================
# 四层隔离机制验证器
# ============================================================================

class IsolationLayerValidator:
    """四层隔离机制验证器"""

    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root).resolve()
        self.isolation_config = {
            "layer1_filesystem": {
                "data_dir": "data",
                "required_subdirs": ["user-data", "extensions", "logs"],
                "isolation_files": ["argv.json"]
            },
            "layer2_startup": {
                "argv_file": "data/argv.json",
                "required_args": ["--user-data-dir", "--extensions-dir"]
            },
            "layer3_settings": {
                "settings_file": "data/user-data/User/settings.json",
                "required_settings": ["augment.skipLogin", "augment.freeMode"]
            },
            "layer4_environment": {
                "required_vars": [
                    "SKIP_AUGMENT_LOGIN", "DISABLE_USAGE_LIMIT", "AUGMENT_FREE_MODE",
                    "CODESTUDIO_AUTO_CLEAN", "CODESTUDIO_AUTO_INSTALL",
                    "VSCODE_DISABLE_CRASH_REPORTER", "ELECTRON_DISABLE_SECURITY_WARNINGS"
                ]
            }
        }

    def validate_layer1_filesystem(self) -> Dict[str, Any]:
        """验证第一层：文件系统隔离"""
        print("🔍 验证第一层：文件系统隔离...")

        result = {
            "layer": "filesystem",
            "status": "pass",
            "issues": [],
            "details": {}
        }

        config = self.isolation_config["layer1_filesystem"]

        # 检查data目录
        data_dir = self.project_root / config["data_dir"]
        if not data_dir.exists():
            result["issues"].append("data目录不存在")
            result["status"] = "fail"
        else:
            result["details"]["data_dir"] = str(data_dir)

        # 检查必需的子目录
        for subdir in config["required_subdirs"]:
            subdir_path = data_dir / subdir
            if not subdir_path.exists():
                result["issues"].append(f"缺少子目录: {subdir}")
                result["status"] = "fail"
            else:
                result["details"][f"{subdir}_exists"] = True

        # 检查隔离文件
        for iso_file in config["isolation_files"]:
            file_path = data_dir / iso_file
            if not file_path.exists():
                result["issues"].append(f"缺少隔离文件: {iso_file}")
                result["status"] = "fail"
            else:
                result["details"][f"{iso_file}_exists"] = True

        return result

    def validate_layer2_startup(self) -> Dict[str, Any]:
        """验证第二层：启动参数隔离"""
        print("🔍 验证第二层：启动参数隔离...")

        result = {
            "layer": "startup",
            "status": "pass",
            "issues": [],
            "details": {}
        }

        config = self.isolation_config["layer2_startup"]
        argv_file = self.project_root / config["argv_file"]

        if not argv_file.exists():
            result["issues"].append("argv.json文件不存在")
            result["status"] = "fail"
            return result

        try:
            with open(argv_file, 'r', encoding='utf-8') as f:
                argv_data = json.load(f)

            result["details"]["argv_content"] = argv_data

            # 检查必需的启动参数
            for required_arg in config["required_args"]:
                # 移除--前缀来匹配argv.json中的键名
                arg_key = required_arg.replace("--", "")
                if arg_key in argv_data:
                    result["details"][f"{required_arg}_present"] = True
                else:
                    result["issues"].append(f"缺少启动参数: {required_arg}")
                    result["status"] = "fail"

        except Exception as e:
            result["issues"].append(f"读取argv.json失败: {e}")
            result["status"] = "fail"

        return result

    def validate_layer3_settings(self) -> Dict[str, Any]:
        """验证第三层：用户设置隔离"""
        print("🔍 验证第三层：用户设置隔离...")

        result = {
            "layer": "settings",
            "status": "pass",
            "issues": [],
            "details": {}
        }

        config = self.isolation_config["layer3_settings"]
        settings_file = self.project_root / config["settings_file"]

        if not settings_file.exists():
            result["issues"].append("settings.json文件不存在")
            result["status"] = "warning"  # 设置文件可能在首次运行时创建
            return result

        try:
            with open(settings_file, 'r', encoding='utf-8') as f:
                settings_data = json.load(f)

            result["details"]["settings_count"] = len(settings_data)

            # 检查关键设置
            augment_settings = 0
            for key in settings_data:
                if "augment" in key.lower():
                    augment_settings += 1
                    result["details"][f"augment_setting_{key}"] = settings_data[key]

            result["details"]["augment_settings_count"] = augment_settings

            if augment_settings == 0:
                result["issues"].append("未找到Augment相关设置")
                result["status"] = "warning"

        except Exception as e:
            result["issues"].append(f"读取settings.json失败: {e}")
            result["status"] = "fail"

        return result

    def validate_layer4_environment(self) -> Dict[str, Any]:
        """验证第四层：环境变量隔离"""
        print("🔍 验证第四层：环境变量隔离...")

        result = {
            "layer": "environment",
            "status": "pass",
            "issues": [],
            "details": {}
        }

        config = self.isolation_config["layer4_environment"]

        # 检查环境变量（从配置文件推断）
        env_vars_set = 0
        for var_name in config["required_vars"]:
            # 这里我们检查是否在代码中定义了这些变量
            if var_name in os.environ:
                result["details"][f"{var_name}_set"] = os.environ[var_name]
                env_vars_set += 1
            else:
                result["details"][f"{var_name}_set"] = False

        result["details"]["env_vars_configured"] = env_vars_set
        result["details"]["total_required"] = len(config["required_vars"])

        if env_vars_set < len(config["required_vars"]):
            result["issues"].append(f"环境变量配置不完整: {env_vars_set}/{len(config['required_vars'])}")
            result["status"] = "warning"  # 环境变量可能在运行时设置

        return result

    def validate_all_layers(self) -> Dict[str, Any]:
        """验证所有四层隔离机制"""
        print("🛡️ 验证四层隔离机制...")

        results = {
            "overall_status": "pass",
            "layers": {},
            "summary": {
                "total_layers": 4,
                "passed": 0,
                "warnings": 0,
                "failed": 0
            }
        }

        # 验证各层
        layer_validators = [
            ("layer1", self.validate_layer1_filesystem),
            ("layer2", self.validate_layer2_startup),
            ("layer3", self.validate_layer3_settings),
            ("layer4", self.validate_layer4_environment)
        ]

        for layer_name, validator in layer_validators:
            layer_result = validator()
            results["layers"][layer_name] = layer_result

            if layer_result["status"] == "pass":
                results["summary"]["passed"] += 1
            elif layer_result["status"] == "warning":
                results["summary"]["warnings"] += 1
            else:
                results["summary"]["failed"] += 1
                results["overall_status"] = "fail"

        if results["summary"]["warnings"] > 0 and results["overall_status"] == "pass":
            results["overall_status"] = "warning"

        print(f"✅ 四层隔离验证完成: {results['summary']['passed']}/4 通过")
        return results

# ============================================================================
# 功能完整性验证器
# ============================================================================

class FunctionalityIntegrityValidator:
    """功能完整性验证器"""

    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root).resolve()
        self.isolation_validator = IsolationLayerValidator(project_root)

        # 核心功能清单
        self.core_functions = {
            "api_endpoints": {
                "description": "API端点功能",
                "test_method": self.test_api_endpoints
            },
            "database_operations": {
                "description": "数据库操作功能",
                "test_method": self.test_database_operations
            },
            "plugin_management": {
                "description": "插件管理功能",
                "test_method": self.test_plugin_management
            },
            "configuration_management": {
                "description": "配置管理功能",
                "test_method": self.test_configuration_management
            },
            "web_interface": {
                "description": "Web界面功能",
                "test_method": self.test_web_interface
            }
        }

    def test_api_endpoints(self) -> Dict[str, Any]:
        """测试API端点功能"""
        print("🔗 测试API端点功能...")

        try:
            if run_full_tests is None:
                return {
                    "status": "warning",
                    "details": {},
                    "issues": ["API测试模块未导入"]
                }

            # 运行API测试
            test_result = run_full_tests()

            return {
                "status": "pass" if test_result["summary"]["success_rate"] == 100 else "fail",
                "details": test_result["summary"],
                "issues": [] if test_result["summary"]["success_rate"] == 100 else ["部分API测试失败"]
            }
        except Exception as e:
            return {
                "status": "fail",
                "details": {},
                "issues": [f"API测试执行失败: {e}"]
            }

    def test_database_operations(self) -> Dict[str, Any]:
        """测试数据库操作功能"""
        print("🗄️ 测试数据库操作功能...")

        result = {
            "status": "pass",
            "details": {},
            "issues": []
        }

        # 检查数据库文件
        db_paths = [
            "data/user-data/User/globalStorage/state.vscdb",
            "data/user-data/User/workspaceStorage"
        ]

        existing_dbs = 0
        for db_path in db_paths:
            full_path = self.project_root / db_path
            if full_path.exists():
                existing_dbs += 1
                result["details"][f"{db_path}_exists"] = True

                # 如果是SQLite数据库，尝试连接
                if str(full_path).endswith('.vscdb'):
                    try:
                        conn = sqlite3.connect(str(full_path))
                        cursor = conn.cursor()
                        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                        tables = cursor.fetchall()
                        conn.close()
                        result["details"][f"{db_path}_tables"] = len(tables)
                    except Exception as e:
                        result["issues"].append(f"数据库连接失败: {db_path} - {e}")
                        result["status"] = "warning"
            else:
                result["details"][f"{db_path}_exists"] = False

        result["details"]["existing_databases"] = existing_dbs

        if existing_dbs == 0:
            result["status"] = "warning"
            result["issues"].append("未找到数据库文件（可能是首次运行）")

        return result

    def test_plugin_management(self) -> Dict[str, Any]:
        """测试插件管理功能"""
        print("🔌 测试插件管理功能...")

        result = {
            "status": "pass",
            "details": {},
            "issues": []
        }

        # 检查插件目录
        extensions_dir = self.project_root / "data/extensions"
        if not extensions_dir.exists():
            result["status"] = "fail"
            result["issues"].append("插件目录不存在")
            return result

        # 检查Augment插件
        augment_plugins = list(extensions_dir.glob("*augment*"))
        result["details"]["augment_plugins_found"] = len(augment_plugins)

        if augment_plugins:
            for plugin_dir in augment_plugins:
                package_json = plugin_dir / "package.json"
                if package_json.exists():
                    try:
                        with open(package_json, 'r', encoding='utf-8') as f:
                            package_data = json.load(f)
                        result["details"][f"{plugin_dir.name}_version"] = package_data.get("version", "unknown")
                    except:
                        result["issues"].append(f"插件配置读取失败: {plugin_dir.name}")
        else:
            result["status"] = "warning"
            result["issues"].append("未找到Augment插件")

        # 检查插件注册文件
        extensions_json = extensions_dir / "extensions.json"
        if extensions_json.exists():
            try:
                with open(extensions_json, 'r', encoding='utf-8') as f:
                    extensions_data = json.load(f)
                result["details"]["registered_extensions"] = len(extensions_data)
            except:
                result["issues"].append("插件注册文件读取失败")

        return result

    def test_configuration_management(self) -> Dict[str, Any]:
        """测试配置管理功能"""
        print("⚙️ 测试配置管理功能...")

        result = {
            "status": "pass",
            "details": {},
            "issues": []
        }

        # 检查状态文件
        state_file = self.project_root / "config/codestudio_ultimate_state.json"
        if state_file.exists():
            try:
                with open(state_file, 'r', encoding='utf-8') as f:
                    state_data = json.load(f)
                result["details"]["state_keys"] = list(state_data.keys())
                result["details"]["initialized"] = state_data.get("initialized", False)
            except Exception as e:
                result["issues"].append(f"状态文件读取失败: {e}")
                result["status"] = "fail"
        else:
            result["status"] = "warning"
            result["issues"].append("状态文件不存在")

        # 检查配置文件
        config_files = ["data/argv.json"]
        for config_file in config_files:
            file_path = self.project_root / config_file
            if file_path.exists():
                result["details"][f"{config_file}_exists"] = True
            else:
                result["issues"].append(f"配置文件缺失: {config_file}")
                result["status"] = "fail"

        return result

    def test_web_interface(self) -> Dict[str, Any]:
        """测试Web界面功能"""
        print("🌐 测试Web界面功能...")

        result = {
            "status": "pass",
            "details": {},
            "issues": []
        }

        # 检查HTML文件
        html_files = list(self.project_root.glob("src/web/*.html"))
        result["details"]["html_files_count"] = len(html_files)

        if html_files:
            for html_file in html_files:
                try:
                    with open(html_file, 'r', encoding='utf-8') as f:
                        content = f.read()

                    # 检查关键元素
                    if "api/" in content:
                        result["details"][f"{html_file.name}_has_api_calls"] = True
                    if "fetch(" in content:
                        result["details"][f"{html_file.name}_has_fetch"] = True

                    result["details"][f"{html_file.name}_size"] = len(content)

                except Exception as e:
                    result["issues"].append(f"HTML文件读取失败: {html_file.name} - {e}")
                    result["status"] = "warning"
        else:
            result["status"] = "fail"
            result["issues"].append("未找到HTML文件")

        return result

    def validate_all_functionality(self) -> Dict[str, Any]:
        """验证所有功能完整性"""
        print("🔍 验证功能完整性...")

        results = {
            "overall_status": "pass",
            "functions": {},
            "isolation_layers": {},
            "summary": {
                "total_functions": len(self.core_functions),
                "passed": 0,
                "warnings": 0,
                "failed": 0
            }
        }

        # 验证核心功能
        for func_name, func_config in self.core_functions.items():
            print(f"  测试: {func_config['description']}")
            func_result = func_config["test_method"]()
            results["functions"][func_name] = func_result

            if func_result["status"] == "pass":
                results["summary"]["passed"] += 1
            elif func_result["status"] == "warning":
                results["summary"]["warnings"] += 1
            else:
                results["summary"]["failed"] += 1
                results["overall_status"] = "fail"

        # 验证四层隔离机制
        isolation_result = self.isolation_validator.validate_all_layers()
        results["isolation_layers"] = isolation_result

        if isolation_result["overall_status"] == "fail":
            results["overall_status"] = "fail"
        elif isolation_result["overall_status"] == "warning" and results["overall_status"] == "pass":
            results["overall_status"] = "warning"

        print(f"✅ 功能完整性验证完成: {results['summary']['passed']}/{results['summary']['total_functions']} 通过")
        return results

# ============================================================================
# 便捷函数
# ============================================================================

def validate_project_integrity(project_root: str = ".") -> Dict[str, Any]:
    """验证项目完整性的便捷函数"""
    validator = FunctionalityIntegrityValidator(project_root)
    return validator.validate_all_functionality()

def validate_isolation_layers(project_root: str = ".") -> Dict[str, Any]:
    """验证四层隔离机制的便捷函数"""
    validator = IsolationLayerValidator(project_root)
    return validator.validate_all_layers()

# ============================================================================
# 主函数
# ============================================================================

if __name__ == "__main__":
    print("🚀 CodeStudio Pro Ultimate V2.1 - 功能完整性验证器")
    print("=" * 60)

    print("选择验证模式:")
    print("1. 验证四层隔离机制")
    print("2. 验证功能完整性")
    print("3. 完整验证")

    choice = input("请输入选择 (1-3): ").strip()

    if choice == "1":
        result = validate_isolation_layers()
        print(f"\n🛡️ 四层隔离验证结果: {result['overall_status']}")

    elif choice == "2":
        validator = FunctionalityIntegrityValidator()
        result = validator.validate_all_functionality()
        print(f"\n🔍 功能完整性验证结果: {result['overall_status']}")

    elif choice == "3":
        result = validate_project_integrity()
        print(f"\n✅ 完整验证结果: {result['overall_status']}")

        # 保存验证报告
        report_file = Path("functionality_validation_report.json")
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"📄 验证报告已保存: {report_file}")

    else:
        print("❌ 无效选择")
