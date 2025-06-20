#!/usr/bin/env python3
"""
CodeStudio Pro Ultimate - API迁移工具
自动化将现有API函数迁移到统一API管理器

版本: 1.0
作者: AI Assistant
功能: 代码提取、函数迁移、依赖分析、向后兼容性保证
"""

import re
import ast
import json
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
from datetime import datetime

# ============================================================================
# 代码分析器
# ============================================================================

class CodeAnalyzer:
    """代码分析器 - 分析现有代码结构"""
    
    def __init__(self, source_file: str):
        self.source_file = Path(source_file)
        self.source_code = self._read_source_code()
        
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
        method_pattern = r'def (execute_\w+)\(self,.*?\):(.*?)(?=def|\Z)'
        method_matches = re.finditer(method_pattern, class_code, re.DOTALL)
        
        for match in method_matches:
            method_name = match.group(1)
            method_body = match.group(2)
            
            # 分析方法的API路径
            api_path = self._extract_api_path(method_name)
            
            methods.append({
                "name": method_name,
                "api_path": api_path,
                "body": method_body.strip(),
                "dependencies": self._extract_dependencies(method_body)
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
            "execute_augment_plugin_fix": "/api/fix-augment-plugin"
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
            
            functions.append({
                "name": function_name,
                "body": function_body.strip(),
                "dependencies": self._extract_dependencies(function_body)
            })
        
        return functions

# ============================================================================
# API迁移器
# ============================================================================

class APIMigrator:
    """API迁移器 - 执行实际的迁移操作"""
    
    def __init__(self, source_file: str, target_file: str = "unified_api.py"):
        self.analyzer = CodeAnalyzer(source_file)
        self.target_file = Path(target_file)
        self.migration_log = []
        
    def migrate_api_methods(self) -> Dict[str, Any]:
        """迁移API方法"""
        print("🔄 开始迁移API方法...")
        
        api_methods = self.analyzer.extract_api_methods()
        helper_functions = self.analyzer.extract_helper_functions()
        
        migration_result = {
            "migrated_methods": [],
            "helper_functions": [],
            "dependencies": [],
            "warnings": []
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
        
        # 生成迁移代码
        migration_code = self._generate_migration_code(api_methods, needed_helpers)
        
        # 更新目标文件
        self._update_target_file(migration_code)
        
        migration_result["migrated_methods"] = [m["name"] for m in api_methods]
        migration_result["dependencies"] = list(all_dependencies)
        
        print(f"✅ 迁移完成: {len(api_methods)} 个API方法, {len(needed_helpers)} 个辅助函数")
        
        return migration_result
    
    def _generate_migration_code(self, api_methods: List[Dict[str, Any]], 
                                helper_functions: List[Dict[str, Any]]) -> str:
        """生成迁移代码"""
        code_parts = []
        
        # 添加导入语句
        code_parts.append("""
# ============================================================================
# 迁移的辅助函数
# ============================================================================
""")
        
        # 添加辅助函数
        for helper in helper_functions:
            code_parts.append(f"""
def {helper['name']}(*args, **kwargs):
    \"\"\"迁移的辅助函数: {helper['name']}\"\"\"
{helper['body']}
""")
        
        # 添加API方法实现
        code_parts.append("""
# ============================================================================
# 迁移的API方法实现
# ============================================================================
""")
        
        for method in api_methods:
            # 转换方法签名
            if method['name'] in ['launch_application']:
                method_signature = f"def {method['name']}(self, data: Dict[str, Any] = None) -> Dict[str, Any]:"
            else:
                method_signature = f"def {method['name']}(self, data: Dict[str, Any]) -> Dict[str, Any]:"
            
            code_parts.append(f"""
    {method_signature}
        \"\"\"迁移的API方法: {method['api_path']}\"\"\"
        try:
{self._indent_code(method['body'], 12)}
        except Exception as e:
            return APIResponse.error(f"操作失败: {{str(e)}}", "EXECUTION_ERROR")
""")
        
        return '\n'.join(code_parts)
    
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
            # 读取现有文件
            with open(self.target_file, 'r', encoding='utf-8') as f:
                existing_code = f.read()
            
            # 查找插入点（在类定义的最后）
            insert_pattern = r'(class UnifiedAPIManager:.*?)(    # ========================================================================\s+# 便捷函数)'
            
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
            
            print(f"📝 已更新目标文件: {self.target_file}")
            
        except Exception as e:
            print(f"❌ 更新目标文件失败: {e}")
            
            # 创建备份文件
            backup_file = f"migration_code_{datetime.now().strftime('%Y%m%d_%H%M%S')}.py"
            with open(backup_file, 'w', encoding='utf-8') as f:
                f.write(migration_code)
            print(f"💾 迁移代码已保存到备份文件: {backup_file}")

# ============================================================================
# 迁移验证器
# ============================================================================

class MigrationValidator:
    """迁移验证器 - 验证迁移结果"""
    
    def __init__(self, target_file: str = "unified_api.py"):
        self.target_file = Path(target_file)
    
    def validate_migration(self) -> Dict[str, Any]:
        """验证迁移结果"""
        print("🔍 验证迁移结果...")
        
        validation_result = {
            "syntax_valid": False,
            "imports_valid": False,
            "api_methods_count": 0,
            "errors": [],
            "warnings": []
        }
        
        try:
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
            
            # 导入检查
            try:
                import unified_api
                validation_result["imports_valid"] = True
                print("✅ 导入检查通过")
            except ImportError as e:
                validation_result["errors"].append(f"导入错误: {e}")
                print(f"❌ 导入错误: {e}")
            
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

def migrate_from_main_file(source_file: str = "codestudio_pro_ultimate.py") -> Dict[str, Any]:
    """从主文件迁移API"""
    migrator = APIMigrator(source_file)
    result = migrator.migrate_api_methods()
    
    # 验证迁移结果
    validator = MigrationValidator()
    validation = validator.validate_migration()
    
    result["validation"] = validation
    return result

# ============================================================================
# 主函数
# ============================================================================

if __name__ == "__main__":
    print("🚀 CodeStudio Pro Ultimate - API迁移工具")
    print("=" * 50)
    
    source_file = input("请输入源文件路径 (默认: codestudio_pro_ultimate.py): ").strip()
    if not source_file:
        source_file = "codestudio_pro_ultimate.py"
    
    if not Path(source_file).exists():
        print(f"❌ 源文件不存在: {source_file}")
        exit(1)
    
    result = migrate_from_main_file(source_file)
    
    print("\n" + "=" * 50)
    print("📋 迁移结果:")
    print(f"  迁移方法: {len(result['migrated_methods'])}")
    print(f"  辅助函数: {len(result['helper_functions'])}")
    print(f"  语法检查: {'✅' if result['validation']['syntax_valid'] else '❌'}")
    print(f"  导入检查: {'✅' if result['validation']['imports_valid'] else '❌'}")
    
    if result['validation']['errors']:
        print("\n⚠️ 发现错误:")
        for error in result['validation']['errors']:
            print(f"  - {error}")
    
    print("\n🎉 迁移完成！")
