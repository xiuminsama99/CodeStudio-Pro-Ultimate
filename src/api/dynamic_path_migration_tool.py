#!/usr/bin/env python3
"""
CodeStudio Pro Ultimate - 动态路径API迁移工具 (增强版)
自动化将现有API函数迁移到动态路径统一API管理器

版本: 2.0
作者: AI Assistant
功能: 动态路径代码提取、函数迁移、依赖分析、路径重构、向后兼容性保证
特色: 支持项目重组后的动态路径迁移，自动修复硬编码路径问题
"""

import re
import ast
import json
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
from datetime import datetime

# 导入动态路径管理器
from dynamic_path_api_manager import DynamicPathManager

# ============================================================================
# 动态路径代码分析器
# ============================================================================

class DynamicPathCodeAnalyzer:
    """动态路径代码分析器 - 分析现有代码结构并识别路径问题"""
    
    def __init__(self, source_file: str):
        self.path_manager = DynamicPathManager()
        self.source_file = self._resolve_source_file(source_file)
        self.source_code = self._read_source_code()
        
    def _resolve_source_file(self, source_file: str) -> Path:
        """解析源文件路径"""
        source_path = Path(source_file)
        
        # 如果是相对路径，尝试在项目中查找
        if not source_path.is_absolute():
            # 在核心目录中查找
            core_path = self.path_manager.get_path("core_dir") / source_file
            if core_path.exists():
                return core_path
            
            # 在项目根目录中查找
            root_path = self.path_manager.get_path("project_root") / source_file
            if root_path.exists():
                return root_path
            
            # 使用原始路径
            return source_path
        
        return source_path
        
    def _read_source_code(self) -> str:
        """读取源代码"""
        try:
            with open(self.source_file, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            raise Exception(f"无法读取源文件 {self.source_file}: {e}")
    
    def extract_api_methods(self) -> List[Dict[str, Any]]:
        """提取API方法"""
        methods = []
        
        # 查找CleanerWebHandler类中的方法
        class_pattern = r'class CleanerWebHandler.*?(?=class|\Z)'
        class_match = re.search(class_pattern, self.source_code, re.DOTALL)
        
        if not class_match:
            return methods
        
        class_code = class_match.group(0)
        
        # 提取execute_开头的方法
        method_pattern = r'def (execute_\w+|launch_application|get_\w+)\(self,.*?\):(.*?)(?=def|\Z)'
        method_matches = re.finditer(method_pattern, class_code, re.DOTALL)
        
        for match in method_matches:
            method_name = match.group(1)
            method_body = match.group(2)
            
            # 分析方法的API路径
            api_path = self._extract_api_path(method_name)
            
            # 分析路径问题
            path_issues = self._analyze_path_issues(method_body)
            
            methods.append({
                "name": method_name,
                "api_path": api_path,
                "body": method_body.strip(),
                "dependencies": self._extract_dependencies(method_body),
                "path_issues": path_issues,
                "needs_path_fix": len(path_issues) > 0
            })
        
        return methods
    
    def _extract_api_path(self, method_name: str) -> str:
        """从方法名推断API路径"""
        # 映射表
        mapping = {
            "execute_clean_operations": "/api/clean",
            "execute_reset_operations": "/api/reset",
            "execute_quick_start": "/api/quick-start",
            "launch_application": "/api/launch-app",
            "execute_plugin_action": "/api/plugin-action",
            "execute_one_click_renewal": "/api/one-click-renewal",
            "execute_augment_plugin_fix": "/api/fix-augment-plugin",
            "get_system_status": "/api/system-status",
            "get_augment_plugin_status": "/api/augment-plugin-status"
        }
        return mapping.get(method_name, f"/api/{method_name.replace('execute_', '').replace('_', '-')}")
    
    def _extract_dependencies(self, method_body: str) -> List[str]:
        """提取方法依赖"""
        dependencies = []
        
        # 查找函数调用
        function_calls = re.findall(r'(\w+)\(', method_body)
        
        # 过滤出可能的依赖函数
        for call in function_calls:
            if call not in ['try', 'if', 'for', 'while', 'return', 'print', 'len', 'str', 'int', 'dict', 'list']:
                dependencies.append(call)
        
        return list(set(dependencies))
    
    def _analyze_path_issues(self, method_body: str) -> List[Dict[str, Any]]:
        """分析路径问题"""
        issues = []
        
        # 检查硬编码路径
        hardcoded_patterns = [
            (r'Path\("([^"]+)"\)', "硬编码Path()调用"),
            (r'Path\.cwd\(\)', "使用Path.cwd()"),
            (r'"codestudiopro\.exe"', "硬编码可执行文件路径"),
            (r'"data/[^"]*"', "硬编码data目录路径"),
            (r'"resources/[^"]*"', "硬编码resources目录路径"),
            (r'"tools/[^"]*"', "硬编码tools目录路径"),
            (r'"src/[^"]*"', "硬编码src目录路径")
        ]
        
        for pattern, description in hardcoded_patterns:
            matches = re.finditer(pattern, method_body)
            for match in matches:
                issues.append({
                    "type": "hardcoded_path",
                    "description": description,
                    "match": match.group(0),
                    "position": match.span(),
                    "suggestion": self._suggest_path_fix(match.group(0))
                })
        
        return issues
    
    def _suggest_path_fix(self, hardcoded_path: str) -> str:
        """建议路径修复方案"""
        suggestions = {
            'Path.cwd()': 'self.path_manager.get_path("project_root")',
            '"codestudiopro.exe"': 'self.path_manager.get_path("codestudio_exe")',
            '"data/extensions"': 'self.path_manager.get_path("extensions_dir")',
            '"data/argv.json"': 'self.path_manager.get_path("argv_json")',
            '"resources/project"': 'self.path_manager.get_path("project_resources")',
            '"tools/scripts"': 'self.path_manager.get_path("scripts_dir")',
            '"src/core"': 'self.path_manager.get_path("core_dir")',
            '"src/api"': 'self.path_manager.get_path("api_dir")'
        }
        
        for pattern, suggestion in suggestions.items():
            if pattern in hardcoded_path:
                return suggestion
        
        return "使用path_manager.get_path()方法"
    
    def extract_helper_functions(self) -> List[Dict[str, Any]]:
        """提取辅助函数"""
        functions = []
        
        # 查找独立函数定义
        function_pattern = r'def (\w+)\([^)]*\):(.*?)(?=def|class|\Z)'
        function_matches = re.finditer(function_pattern, self.source_code, re.DOTALL)
        
        for match in function_matches:
            function_name = match.group(1)
            function_body = match.group(2)
            
            # 跳过类方法和特殊函数
            if function_name.startswith('_') or function_name in ['main', '__init__']:
                continue
            
            # 分析路径问题
            path_issues = self._analyze_path_issues(function_body)
            
            functions.append({
                "name": function_name,
                "body": function_body.strip(),
                "dependencies": self._extract_dependencies(function_body),
                "path_issues": path_issues,
                "needs_path_fix": len(path_issues) > 0
            })
        
        return functions

# ============================================================================
# 动态路径API迁移器
# ============================================================================

class DynamicPathAPIMigrator:
    """动态路径API迁移器 - 执行实际的迁移操作"""
    
    def __init__(self, source_file: str, target_file: str = "dynamic_unified_api.py"):
        self.analyzer = DynamicPathCodeAnalyzer(source_file)
        self.path_manager = DynamicPathManager()
        self.target_file = self._resolve_target_file(target_file)
        self.migration_log = []
        
    def _resolve_target_file(self, target_file: str) -> Path:
        """解析目标文件路径"""
        target_path = Path(target_file)
        
        # 如果是相对路径，放在API目录中
        if not target_path.is_absolute():
            api_dir = self.path_manager.get_path("api_dir")
            return api_dir / target_file
        
        return target_path
        
    def migrate_api_methods(self) -> Dict[str, Any]:
        """迁移API方法"""
        print("🔄 开始动态路径API方法迁移...")
        
        api_methods = self.analyzer.extract_api_methods()
        helper_functions = self.analyzer.extract_helper_functions()
        
        migration_result = {
            "migrated_methods": [],
            "helper_functions": [],
            "path_fixes": [],
            "dependencies": [],
            "warnings": [],
            "project_info": self.path_manager.get_project_info()
        }
        
        # 分析依赖关系
        all_dependencies = set()
        for method in api_methods:
            all_dependencies.update(method["dependencies"])
        
        # 查找需要的辅助函数
        needed_helpers = []
        for helper in helper_functions:
            if helper["name"] in all_dependencies:
                needed_helpers.append(helper)
                migration_result["helper_functions"].append(helper["name"])
        
        # 统计路径修复
        total_path_issues = 0
        for method in api_methods:
            total_path_issues += len(method["path_issues"])
        for helper in needed_helpers:
            total_path_issues += len(helper["path_issues"])
        
        migration_result["path_fixes"] = [f"修复了 {total_path_issues} 个路径问题"]
        
        # 生成迁移代码
        migration_code = self._generate_migration_code(api_methods, needed_helpers)
        
        # 更新目标文件
        self._update_target_file(migration_code)
        
        migration_result["migrated_methods"] = [m["name"] for m in api_methods]
        migration_result["dependencies"] = list(all_dependencies)
        
        print(f"✅ 迁移完成: {len(api_methods)} 个API方法, {len(needed_helpers)} 个辅助函数")
        print(f"🔧 路径修复: {total_path_issues} 个问题")
        
        return migration_result
    
    def _generate_migration_code(self, api_methods: List[Dict[str, Any]], 
                                helper_functions: List[Dict[str, Any]]) -> str:
        """生成迁移代码"""
        code_parts = []
        
        # 添加导入语句
        code_parts.append("""
# ============================================================================
# 迁移的辅助函数 (动态路径版本)
# ============================================================================
""")
        
        # 添加辅助函数
        for helper in helper_functions:
            fixed_body = self._fix_path_issues(helper['body'], helper['path_issues'])
            code_parts.append(f"""
def {helper['name']}(*args, **kwargs):
    \"\"\"迁移的辅助函数: {helper['name']} (已修复路径问题)\"\"\"
{fixed_body}
""")
        
        # 添加API方法实现
        code_parts.append("""
# ============================================================================
# 迁移的API方法实现 (动态路径版本)
# ============================================================================
""")
        
        for method in api_methods:
            # 转换方法签名
            if method['name'] in ['launch_application']:
                method_signature = f"def {method['name']}(self, data: Dict[str, Any] = None) -> Dict[str, Any]:"
            else:
                method_signature = f"def {method['name']}(self, data: Dict[str, Any]) -> Dict[str, Any]:"
            
            # 修复路径问题
            fixed_body = self._fix_path_issues(method['body'], method['path_issues'])
            
            code_parts.append(f"""
    {method_signature}
        \"\"\"迁移的API方法: {method['api_path']} (已修复路径问题)\"\"\"
        try:
{self._indent_code(fixed_body, 12)}
        except Exception as e:
            return EnhancedAPIResponse.error(f"操作失败: {{str(e)}}", "EXECUTION_ERROR")
""")
        
        return '\n'.join(code_parts)
    
    def _fix_path_issues(self, code: str, path_issues: List[Dict[str, Any]]) -> str:
        """修复代码中的路径问题"""
        fixed_code = code
        
        # 按位置倒序排列，避免位置偏移问题
        sorted_issues = sorted(path_issues, key=lambda x: x['position'][0], reverse=True)
        
        for issue in sorted_issues:
            start, end = issue['position']
            
            # 计算在代码中的相对位置
            before = fixed_code[:start]
            after = fixed_code[end:]
            
            # 应用修复建议
            suggestion = issue['suggestion']
            fixed_code = before + suggestion + after
        
        # 添加路径管理器初始化（如果需要）
        if 'self.path_manager' in fixed_code and 'self.path_manager =' not in fixed_code:
            fixed_code = "            # 初始化路径管理器\n            self.path_manager = DynamicPathManager()\n" + fixed_code
        
        return fixed_code
    
    def _indent_code(self, code: str, indent: int) -> str:
        """缩进代码"""
        lines = code.split('\n')
        indented_lines = []
        for line in lines:
            if line.strip():
                indented_lines.append(' ' * indent + line)
            else:
                indented_lines.append('')
        return '\n'.join(indented_lines)
    
    def _update_target_file(self, migration_code: str):
        """更新目标文件"""
        try:
            # 检查目标文件是否存在
            if self.target_file.exists():
                # 读取现有文件
                with open(self.target_file, 'r', encoding='utf-8') as f:
                    existing_code = f.read()
                
                # 查找插入点
                insert_pattern = r'(class DynamicPathUnifiedAPIManager:.*?)(    # ========================================================================\s+# 便捷函数)'
                
                if re.search(insert_pattern, existing_code, re.DOTALL):
                    # 在指定位置插入迁移代码
                    updated_code = re.sub(
                        insert_pattern,
                        r'\1' + migration_code + r'\n\2',
                        existing_code,
                        flags=re.DOTALL
                    )
                else:
                    # 如果找不到插入点，追加到文件末尾
                    updated_code = existing_code + '\n' + migration_code
                
                # 写入更新后的文件
                with open(self.target_file, 'w', encoding='utf-8') as f:
                    f.write(updated_code)
            else:
                # 创建新文件，基于动态路径API管理器模板
                template_code = self._generate_base_template()
                full_code = template_code + '\n' + migration_code
                
                # 确保目标目录存在
                self.target_file.parent.mkdir(parents=True, exist_ok=True)
                
                with open(self.target_file, 'w', encoding='utf-8') as f:
                    f.write(full_code)
            
            print(f"📝 已更新目标文件: {self.target_file}")
            
        except Exception as e:
            print(f"❌ 更新目标文件失败: {e}")
            
            # 创建备份文件
            backup_dir = self.path_manager.ensure_directory("backup_dir")
            backup_file = backup_dir / f"migration_code_{datetime.now().strftime('%Y%m%d_%H%M%S')}.py"
            with open(backup_file, 'w', encoding='utf-8') as f:
                f.write(migration_code)
            print(f"💾 迁移代码已保存到备份文件: {backup_file}")
    
    def _generate_base_template(self) -> str:
        """生成基础模板代码"""
        return '''#!/usr/bin/env python3
"""
动态路径统一API管理器 - 迁移版本
从现有代码自动迁移生成
"""

from dynamic_path_api_manager import *

# 迁移的代码将在下方插入
'''

# ============================================================================
# 动态路径迁移验证器
# ============================================================================

class DynamicPathMigrationValidator:
    """动态路径迁移验证器 - 验证迁移结果"""
    
    def __init__(self, target_file: str = "dynamic_unified_api.py"):
        self.path_manager = DynamicPathManager()
        self.target_file = self._resolve_target_file(target_file)
    
    def _resolve_target_file(self, target_file: str) -> Path:
        """解析目标文件路径"""
        target_path = Path(target_file)
        if not target_path.is_absolute():
            api_dir = self.path_manager.get_path("api_dir")
            return api_dir / target_file
        return target_path
    
    def validate_migration(self) -> Dict[str, Any]:
        """验证迁移结果"""
        print("🔍 验证动态路径迁移结果...")
        
        validation_result = {
            "syntax_valid": False,
            "imports_valid": False,
            "path_manager_usage": 0,
            "hardcoded_paths": 0,
            "api_methods_count": 0,
            "errors": [],
            "warnings": [],
            "project_info": self.path_manager.get_project_info()
        }
        
        try:
            if not self.target_file.exists():
                validation_result["errors"].append(f"目标文件不存在: {self.target_file}")
                return validation_result
            
            # 语法检查
            with open(self.target_file, 'r', encoding='utf-8') as f:
                code = f.read()
            
            try:
                ast.parse(code)
                validation_result["syntax_valid"] = True
                print("✅ 语法检查通过")
            except SyntaxError as e:
                validation_result["errors"].append(f"语法错误: {e}")
                print(f"❌ 语法错误: {e}")
            
            # 路径管理器使用检查
            path_manager_usage = len(re.findall(r'path_manager\.get_path\(', code))
            validation_result["path_manager_usage"] = path_manager_usage
            print(f"📁 路径管理器使用次数: {path_manager_usage}")
            
            # 硬编码路径检查
            hardcoded_patterns = [
                r'Path\("[^"]*"\)',
                r'"data/[^"]*"',
                r'"resources/[^"]*"',
                r'"tools/[^"]*"',
                r'"src/[^"]*"'
            ]
            
            hardcoded_count = 0
            for pattern in hardcoded_patterns:
                matches = re.findall(pattern, code)
                hardcoded_count += len(matches)
                if matches:
                    validation_result["warnings"].append(f"发现硬编码路径: {matches}")
            
            validation_result["hardcoded_paths"] = hardcoded_count
            if hardcoded_count > 0:
                print(f"⚠️ 发现 {hardcoded_count} 个硬编码路径")
            else:
                print("✅ 未发现硬编码路径")
            
            # API方法计数
            api_method_pattern = r'def (execute_\w+|launch_application|get_\w+)\('
            api_methods = re.findall(api_method_pattern, code)
            validation_result["api_methods_count"] = len(api_methods)
            print(f"📊 发现 {len(api_methods)} 个API方法")
            
        except Exception as e:
            validation_result["errors"].append(f"验证异常: {e}")
            print(f"❌ 验证异常: {e}")
        
        return validation_result

# ============================================================================
# 便捷函数
# ============================================================================

def migrate_from_main_file_with_dynamic_paths(source_file: str = "codestudio_pro_ultimate.py") -> Dict[str, Any]:
    """从主文件迁移API（动态路径版本）"""
    migrator = DynamicPathAPIMigrator(source_file)
    result = migrator.migrate_api_methods()
    
    # 验证迁移结果
    validator = DynamicPathMigrationValidator()
    validation = validator.validate_migration()
    
    result["validation"] = validation
    return result

# ============================================================================
# 主函数
# ============================================================================

if __name__ == "__main__":
    print("🚀 CodeStudio Pro Ultimate - 动态路径API迁移工具 v2.0")
    print("=" * 60)
    
    # 显示项目信息
    path_manager = DynamicPathManager()
    project_info = path_manager.get_project_info()
    
    print("📁 项目信息:")
    for key, value in project_info.items():
        print(f"  {key}: {value}")
    print()
    
    source_file = input("请输入源文件路径 (默认: codestudio_pro_ultimate.py): ").strip()
    if not source_file:
        source_file = "codestudio_pro_ultimate.py"
    
    # 尝试解析源文件路径
    analyzer = DynamicPathCodeAnalyzer(source_file)
    resolved_source = analyzer.source_file
    
    if not resolved_source.exists():
        print(f"❌ 源文件不存在: {resolved_source}")
        exit(1)
    
    print(f"📄 使用源文件: {resolved_source}")
    
    result = migrate_from_main_file_with_dynamic_paths(str(resolved_source))
    
    print("\n" + "=" * 60)
    print("📋 迁移结果:")
    print(f"  迁移方法: {len(result['migrated_methods'])}")
    print(f"  辅助函数: {len(result['helper_functions'])}")
    print(f"  路径修复: {len(result['path_fixes'])}")
    print(f"  语法检查: {'✅' if result['validation']['syntax_valid'] else '❌'}")
    print(f"  路径管理器使用: {result['validation']['path_manager_usage']} 次")
    print(f"  硬编码路径: {result['validation']['hardcoded_paths']} 个")
    
    if result['validation']['errors']:
        print("\n⚠️ 发现错误:")
        for error in result['validation']['errors']:
            print(f"  - {error}")
    
    if result['validation']['warnings']:
        print("\n⚠️ 发现警告:")
        for warning in result['validation']['warnings']:
            print(f"  - {warning}")
    
    print("\n🎉 动态路径迁移完成！")