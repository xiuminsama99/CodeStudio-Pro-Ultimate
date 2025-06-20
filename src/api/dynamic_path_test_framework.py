#!/usr/bin/env python3
"""
CodeStudio Pro Ultimate - 动态路径API测试框架 (增强版)
提供完整的动态路径API回归测试和验证功能

版本: 2.0
作者: AI Assistant
功能: 动态路径测试、API端点测试、回归测试、性能测试、路径验证
特色: 支持项目重组后的动态路径测试，无需硬编码路径
"""

import json
import time
import unittest
from typing import Dict, Any, List, Optional
from pathlib import Path
from datetime import datetime

# 导入动态路径API管理器
from dynamic_path_api_manager import dynamic_api_manager, EnhancedAPIResponse, DynamicPathManager

# ============================================================================
# 动态路径测试用例基类
# ============================================================================

class DynamicPathAPITestCase:
    """动态路径API测试用例基类"""

    def __init__(self, name: str, endpoint: str, method: str, data: Dict[str, Any] = None):
        self.name = name
        self.endpoint = endpoint
        self.method = method
        self.data = data
        self.expected_success = True
        self.expected_error_code = None
        self.timeout = 30.0
        self.validate_paths = False
        self.required_paths = []

    def set_expected_error(self, error_code: str):
        """设置期望的错误代码"""
        self.expected_success = False
        self.expected_error_code = error_code
        return self

    def set_timeout(self, timeout: float):
        """设置超时时间"""
        self.timeout = timeout
        return self

    def enable_path_validation(self, required_paths: List[str] = None):
        """启用路径验证"""
        self.validate_paths = True
        self.required_paths = required_paths or []
        return self

# ============================================================================
# 动态路径API测试执行器
# ============================================================================

class DynamicPathAPITestRunner:
    """动态路径API测试执行器"""

    def __init__(self):
        self.test_cases: List[DynamicPathAPITestCase] = []
        self.results: List[Dict[str, Any]] = []
        self.path_manager = DynamicPathManager()

    def add_test_case(self, test_case: DynamicPathAPITestCase):
        """添加测试用例"""
        self.test_cases.append(test_case)

    def run_all_tests(self) -> Dict[str, Any]:
        """运行所有测试用例"""
        print("🧪 开始动态路径API回归测试...")
        print("=" * 60)
        
        # 首先验证项目路径
        self._validate_project_setup()

        start_time = time.time()
        passed = 0
        failed = 0

        for i, test_case in enumerate(self.test_cases, 1):
            print(f"[{i}/{len(self.test_cases)}] 测试: {test_case.name}")

            result = self._run_single_test(test_case)
            self.results.append(result)

            if result["passed"]:
                passed += 1
                print(f"  ✅ 通过 ({result['duration']:.2f}s)")
                if result.get("path_validation"):
                    print(f"    📁 路径验证: {result['path_validation']}")
            else:
                failed += 1
                print(f"  ❌ 失败: {result['error']}")

        total_time = time.time() - start_time

        # 生成测试报告
        report = {
            "summary": {
                "total": len(self.test_cases),
                "passed": passed,
                "failed": failed,
                "success_rate": round(passed / len(self.test_cases) * 100, 2),
                "total_duration": round(total_time, 2)
            },
            "project_info": self.path_manager.get_project_info(),
            "results": self.results,
            "timestamp": datetime.now().isoformat()
        }

        print("=" * 60)
        print(f"🎯 测试完成: {passed}/{len(self.test_cases)} 通过 ({report['summary']['success_rate']}%)")
        print(f"⏱️ 总耗时: {total_time:.2f}秒")
        print(f"📁 项目根目录: {self.path_manager.project_root}")

        # 保存测试报告
        self._save_test_report(report)

        return report

    def _validate_project_setup(self):
        """验证项目设置"""
        print("🔍 验证项目设置...")
        project_info = self.path_manager.get_project_info()
        
        print(f"  📁 项目根目录: {project_info['project_root']}")
        print(f"  📄 脚本位置: {project_info['script_location']}")
        print(f"  🎯 CodeStudio存在: {'✅' if project_info['codestudio_exe_exists'] else '❌'}")
        print(f"  📂 数据目录存在: {'✅' if project_info['data_dir_exists'] else '❌'}")
        print(f"  🏗️ 源码结构存在: {'✅' if project_info['src_structure_exists'] else '❌'}")
        print(f"  🔧 路径计算方法: {project_info['calculation_method']}")
        print()

    def _run_single_test(self, test_case: DynamicPathAPITestCase) -> Dict[str, Any]:
        """运行单个测试用例"""
        start_time = time.time()

        try:
            # 路径验证（如果启用）
            path_validation_result = None
            if test_case.validate_paths:
                path_validation_result = self._validate_test_paths(test_case.required_paths)

            # 执行API调用
            response = dynamic_api_manager.handle_request(
                test_case.endpoint,
                test_case.method,
                test_case.data
            )

            duration = time.time() - start_time

            # 验证响应
            if test_case.expected_success:
                # 期望成功
                if response.get("success", False):
                    result = {
                        "test_name": test_case.name,
                        "endpoint": test_case.endpoint,
                        "method": test_case.method,
                        "passed": True,
                        "duration": duration,
                        "response": response
                    }
                    
                    if path_validation_result:
                        result["path_validation"] = path_validation_result
                    
                    return result
                else:
                    return {
                        "test_name": test_case.name,
                        "endpoint": test_case.endpoint,
                        "method": test_case.method,
                        "passed": False,
                        "duration": duration,
                        "error": f"期望成功但失败: {response.get('error', {}).get('message', '未知错误')}",
                        "response": response
                    }
            else:
                # 期望失败
                if not response.get("success", True):
                    error_code = response.get("error", {}).get("code", "")
                    if test_case.expected_error_code and error_code != test_case.expected_error_code:
                        return {
                            "test_name": test_case.name,
                            "endpoint": test_case.endpoint,
                            "method": test_case.method,
                            "passed": False,
                            "duration": duration,
                            "error": f"错误代码不匹配: 期望 {test_case.expected_error_code}, 实际 {error_code}",
                            "response": response
                        }
                    else:
                        return {
                            "test_name": test_case.name,
                            "endpoint": test_case.endpoint,
                            "method": test_case.method,
                            "passed": True,
                            "duration": duration,
                            "response": response
                        }
                else:
                    return {
                        "test_name": test_case.name,
                        "endpoint": test_case.endpoint,
                        "method": test_case.method,
                        "passed": False,
                        "duration": duration,
                        "error": "期望失败但成功了",
                        "response": response
                    }

        except Exception as e:
            duration = time.time() - start_time
            return {
                "test_name": test_case.name,
                "endpoint": test_case.endpoint,
                "method": test_case.method,
                "passed": False,
                "duration": duration,
                "error": f"测试执行异常: {str(e)}"
            }

    def _validate_test_paths(self, required_paths: List[str]) -> str:
        """验证测试所需的路径"""
        if not required_paths:
            return "无需验证"
        
        validation_results = []
        for path_key in required_paths:
            try:
                path = self.path_manager.get_path(path_key)
                exists = path.exists()
                validation_results.append(f"{path_key}:{'✅' if exists else '❌'}")
            except ValueError:
                validation_results.append(f"{path_key}:❓")
        
        return ", ".join(validation_results)

    def _save_test_report(self, report: Dict[str, Any]):
        """保存测试报告"""
        try:
            # 使用动态路径管理器确定报告保存位置
            logs_dir = self.path_manager.ensure_directory("logs_dir")
            report_file = logs_dir / f"dynamic_api_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            print(f"📄 测试报告已保存: {report_file}")
        except Exception as e:
            print(f"⚠️ 测试报告保存失败: {e}")

# ============================================================================
# 动态路径预定义测试套件
# ============================================================================

def create_dynamic_path_basic_test_suite() -> DynamicPathAPITestRunner:
    """创建动态路径基础测试套件"""
    runner = DynamicPathAPITestRunner()

    # 基础状态测试
    runner.add_test_case(DynamicPathAPITestCase(
        "基础状态检查",
        "/api/status",
        "GET"
    ))

    # 系统状态测试
    runner.add_test_case(DynamicPathAPITestCase(
        "系统状态检查",
        "/api/system-status",
        "GET"
    ).enable_path_validation(["codestudio_exe", "data_dir"]))

    # 路径信息测试
    runner.add_test_case(DynamicPathAPITestCase(
        "路径信息获取",
        "/api/path-info",
        "GET"
    ))

    # 项目结构测试
    runner.add_test_case(DynamicPathAPITestCase(
        "项目结构获取",
        "/api/project-structure",
        "GET"
    ).enable_path_validation(["src_dir", "data_dir", "resources_dir"]))

    # 插件状态测试
    runner.add_test_case(DynamicPathAPITestCase(
        "插件状态检查",
        "/api/augment-plugin-status",
        "GET"
    ).enable_path_validation(["extensions_dir"]))

    # 路径验证测试
    runner.add_test_case(DynamicPathAPITestCase(
        "路径验证",
        "/api/validate-paths",
        "POST",
        {}
    ))

    # 不存在的端点测试
    runner.add_test_case(DynamicPathAPITestCase(
        "不存在的端点",
        "/api/nonexistent",
        "GET"
    ).set_expected_error("ENDPOINT_NOT_FOUND"))

    # 不支持的方法测试
    runner.add_test_case(DynamicPathAPITestCase(
        "不支持的HTTP方法",
        "/api/status",
        "DELETE"
    ).set_expected_error("METHOD_NOT_ALLOWED"))

    return runner

def create_dynamic_path_full_test_suite() -> DynamicPathAPITestRunner:
    """创建动态路径完整测试套件"""
    runner = create_dynamic_path_basic_test_suite()

    # POST端点测试
    post_endpoints = [
        ("清理操作", "/api/clean"),
        ("重置操作", "/api/reset"),
        ("快速启动", "/api/quick-start"),
        ("启动应用", "/api/launch-app"),
        ("插件操作", "/api/plugin-action"),
        ("一键续杯", "/api/one-click-renewal"),
        ("插件修复", "/api/fix-augment-plugin")
    ]

    for name, endpoint in post_endpoints:
        test_case = DynamicPathAPITestCase(
            name,
            endpoint,
            "POST",
            {"test": True}
        )
        
        # 为启动应用测试添加路径验证
        if endpoint == "/api/launch-app":
            test_case.enable_path_validation(["codestudio_exe"])
        
        runner.add_test_case(test_case)

    return runner

def create_path_stress_test_suite() -> DynamicPathAPITestRunner:
    """创建路径压力测试套件"""
    runner = DynamicPathAPITestRunner()
    
    # 大量路径信息请求
    for i in range(10):
        runner.add_test_case(DynamicPathAPITestCase(
            f"路径信息压力测试 #{i+1}",
            "/api/path-info",
            "GET"
        ))
    
    # 大量路径验证请求
    for i in range(5):
        runner.add_test_case(DynamicPathAPITestCase(
            f"路径验证压力测试 #{i+1}",
            "/api/validate-paths",
            "POST",
            {}
        ))
    
    return runner

# ============================================================================
# 便捷函数
# ============================================================================

def run_dynamic_basic_tests() -> Dict[str, Any]:
    """运行动态路径基础测试"""
    runner = create_dynamic_path_basic_test_suite()
    return runner.run_all_tests()

def run_dynamic_full_tests() -> Dict[str, Any]:
    """运行动态路径完整测试"""
    runner = create_dynamic_path_full_test_suite()
    return runner.run_all_tests()

def run_path_stress_tests() -> Dict[str, Any]:
    """运行路径压力测试"""
    runner = create_path_stress_test_suite()
    return runner.run_all_tests()

# ============================================================================
# 主函数
# ============================================================================

if __name__ == "__main__":
    print("🚀 CodeStudio Pro Ultimate - 动态路径API测试框架 v2.0")
    print("选择测试模式:")
    print("1. 基础测试")
    print("2. 完整测试")
    print("3. 路径压力测试")
    print("4. 所有测试")

    choice = input("请输入选择 (1-4): ").strip()

    if choice == "1":
        run_dynamic_basic_tests()
    elif choice == "2":
        run_dynamic_full_tests()
    elif choice == "3":
        run_path_stress_tests()
    elif choice == "4":
        print("\n🔄 运行所有测试...")
        print("\n" + "="*60)
        print("📋 基础测试")
        print("="*60)
        run_dynamic_basic_tests()
        
        print("\n" + "="*60)
        print("📋 完整测试")
        print("="*60)
        run_dynamic_full_tests()
        
        print("\n" + "="*60)
        print("📋 路径压力测试")
        print("="*60)
        run_path_stress_tests()
        
        print("\n🎉 所有测试完成！")
    else:
        print("❌ 无效选择")