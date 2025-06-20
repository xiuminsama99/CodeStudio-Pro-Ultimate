#!/usr/bin/env python3
"""
CodeStudio Pro Ultimate - API测试框架
提供完整的API回归测试和验证功能

版本: 1.0
作者: AI Assistant
功能: API端点测试、回归测试、性能测试、错误处理验证
"""

import json
import time
import unittest
from typing import Dict, Any, List, Optional
from pathlib import Path
from datetime import datetime

# 导入统一API管理器
from unified_api_clean import api_manager, APIResponse

# ============================================================================
# 测试用例基类
# ============================================================================

class APITestCase:
    """API测试用例基类"""

    def __init__(self, name: str, endpoint: str, method: str, data: Dict[str, Any] = None):
        self.name = name
        self.endpoint = endpoint
        self.method = method
        self.data = data
        self.expected_success = True
        self.expected_error_code = None
        self.timeout = 30.0

    def set_expected_error(self, error_code: str):
        """设置期望的错误代码"""
        self.expected_success = False
        self.expected_error_code = error_code
        return self

    def set_timeout(self, timeout: float):
        """设置超时时间"""
        self.timeout = timeout
        return self

# ============================================================================
# API测试执行器
# ============================================================================

class APITestRunner:
    """API测试执行器"""

    def __init__(self):
        self.test_cases: List[APITestCase] = []
        self.results: List[Dict[str, Any]] = []

    def add_test_case(self, test_case: APITestCase):
        """添加测试用例"""
        self.test_cases.append(test_case)

    def run_all_tests(self) -> Dict[str, Any]:
        """运行所有测试用例"""
        print("🧪 开始API回归测试...")
        print("=" * 60)

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
            "results": self.results,
            "timestamp": datetime.now().isoformat()
        }

        print("=" * 60)
        print(f"🎯 测试完成: {passed}/{len(self.test_cases)} 通过 ({report['summary']['success_rate']}%)")
        print(f"⏱️ 总耗时: {total_time:.2f}秒")

        # 保存测试报告
        self._save_test_report(report)

        return report

    def _run_single_test(self, test_case: APITestCase) -> Dict[str, Any]:
        """运行单个测试用例"""
        start_time = time.time()

        try:
            # 执行API调用
            response = api_manager.handle_request(
                test_case.endpoint,
                test_case.method,
                test_case.data
            )

            duration = time.time() - start_time

            # 验证响应
            if test_case.expected_success:
                # 期望成功
                if response.get("success", False):
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

    def _save_test_report(self, report: Dict[str, Any]):
        """保存测试报告"""
        try:
            report_file = Path(f"api_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            print(f"📄 测试报告已保存: {report_file}")
        except Exception as e:
            print(f"⚠️ 测试报告保存失败: {e}")

# ============================================================================
# 预定义测试套件
# ============================================================================

def create_basic_test_suite() -> APITestRunner:
    """创建基础测试套件"""
    runner = APITestRunner()

    # 基础状态测试
    runner.add_test_case(APITestCase(
        "基础状态检查",
        "/api/status",
        "GET"
    ))

    # 系统状态测试
    runner.add_test_case(APITestCase(
        "系统状态检查",
        "/api/system-status",
        "GET"
    ))

    # 插件状态测试
    runner.add_test_case(APITestCase(
        "插件状态检查",
        "/api/augment-plugin-status",
        "GET"
    ))

    # 不存在的端点测试
    runner.add_test_case(APITestCase(
        "不存在的端点",
        "/api/nonexistent",
        "GET"
    ).set_expected_error("ENDPOINT_NOT_FOUND"))

    # 不支持的方法测试
    runner.add_test_case(APITestCase(
        "不支持的HTTP方法",
        "/api/status",
        "DELETE"
    ).set_expected_error("METHOD_NOT_ALLOWED"))

    return runner

def create_full_test_suite() -> APITestRunner:
    """创建完整测试套件"""
    runner = create_basic_test_suite()

    # POST端点测试（当前都是NOT_IMPLEMENTED状态）
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
        if endpoint == "/api/clean":
            # 清理操作需要特殊处理 - 测试无选项的情况
            runner.add_test_case(APITestCase(
                f"{name} - 无选项",
                endpoint,
                "POST",
                {}
            ).set_expected_error("NO_OPTIONS_SELECTED"))

            # 清理操作 - 正常情况
            runner.add_test_case(APITestCase(
                f"{name} - 正常",
                endpoint,
                "POST",
                {"smart_clean_database": True}
            ))
        else:
            # 其他端点正常测试
            runner.add_test_case(APITestCase(
                name,
                endpoint,
                "POST",
                {"test": True}
            ))

    return runner

# ============================================================================
# 便捷函数
# ============================================================================

def run_basic_tests() -> Dict[str, Any]:
    """运行基础测试"""
    runner = create_basic_test_suite()
    return runner.run_all_tests()

def run_full_tests() -> Dict[str, Any]:
    """运行完整测试"""
    runner = create_full_test_suite()
    return runner.run_all_tests()

# ============================================================================
# 主函数
# ============================================================================

if __name__ == "__main__":
    print("🚀 CodeStudio Pro Ultimate - API测试框架")
    print("选择测试模式:")
    print("1. 基础测试")
    print("2. 完整测试")

    choice = input("请输入选择 (1-2): ").strip()

    if choice == "1":
        run_basic_tests()
    elif choice == "2":
        run_full_tests()
    else:
        print("❌ 无效选择")
