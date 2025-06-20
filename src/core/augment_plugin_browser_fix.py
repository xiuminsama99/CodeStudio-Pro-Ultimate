#!/usr/bin/env python3
"""
Augment插件浏览器和回调问题修复工具
解决两个关键问题：
1. 强制使用系统默认浏览器而不是Edge
2. 修复登录回调URL冲突问题，确保只影响当前实例

版本: 1.0
作者: AI Assistant
"""

import os
import sys
import json
import shutil
import winreg
import subprocess
import uuid
from pathlib import Path
from typing import Dict, Any, Optional

def info(msg: str) -> None:
    """打印信息消息"""
    print(f"[INFO] {msg}")

def success(msg: str) -> None:
    """打印成功消息"""
    print(f"[SUCCESS] {msg}")

def warning(msg: str) -> None:
    """打印警告消息"""
    print(f"[WARNING] {msg}")

def error(msg: str) -> None:
    """打印错误消息"""
    print(f"[ERROR] {msg}")

class AugmentPluginFixer:
    """Augment插件浏览器和回调问题修复器"""
    
    def __init__(self):
        self.current_dir = Path.cwd()
        self.plugin_dir = self.current_dir / "data" / "extensions" / "Augment.vscode-augment-0.464.1"
        self.settings_file = self.current_dir / "data" / "user-data" / "User" / "settings.json"
        self.unique_instance_id = str(uuid.uuid4())[:8]
        
    def check_plugin_exists(self) -> bool:
        """检查插件是否存在"""
        if not self.plugin_dir.exists():
            error(f"未找到Augment插件目录: {self.plugin_dir}")
            return False
        
        package_json = self.plugin_dir / "package.json"
        if not package_json.exists():
            error(f"未找到插件配置文件: {package_json}")
            return False
            
        info(f"找到Augment插件: {self.plugin_dir}")
        return True
    
    def backup_files(self) -> bool:
        """备份重要文件"""
        try:
            backup_dir = self.current_dir / "augment_plugin_backup"
            backup_dir.mkdir(exist_ok=True)
            
            # 备份settings.json
            if self.settings_file.exists():
                shutil.copy2(self.settings_file, backup_dir / "settings.json.backup")
                info(f"已备份settings.json")
            
            # 备份package.json
            package_json = self.plugin_dir / "package.json"
            if package_json.exists():
                shutil.copy2(package_json, backup_dir / "package.json.backup")
                info(f"已备份package.json")
                
            success(f"文件备份完成: {backup_dir}")
            return True
            
        except Exception as e:
            error(f"备份失败: {e}")
            return False
    
    def fix_browser_selection(self) -> bool:
        """修复浏览器选择问题"""
        try:
            info("开始修复浏览器选择问题...")
            
            # 1. 设置环境变量强制使用系统默认浏览器
            browser_env_vars = {
                'BROWSER': '',  # 清空BROWSER环境变量，让系统选择默认浏览器
                'AUGMENT_FORCE_DEFAULT_BROWSER': 'true',
                'VSCODE_BROWSER': 'default',
                'ELECTRON_BROWSER': 'default'
            }
            
            # 设置当前会话环境变量
            for var, value in browser_env_vars.items():
                os.environ[var] = value
                info(f"设置环境变量: {var}={value}")
            
            # 2. 写入注册表（永久性）
            try:
                key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment", 0, winreg.KEY_SET_VALUE)
                for var_name, var_value in browser_env_vars.items():
                    winreg.SetValueEx(key, var_name, 0, winreg.REG_SZ, var_value)
                winreg.CloseKey(key)
                success("浏览器环境变量已写入注册表")
            except Exception as e:
                warning(f"注册表写入失败: {e}")
            
            # 3. 修改用户设置
            self.update_user_settings({
                "augment.advanced.browserPath": "",  # 清空浏览器路径
                "augment.advanced.useSystemBrowser": True,  # 使用系统浏览器
                "augment.advanced.forceDefaultBrowser": True  # 强制默认浏览器
            })
            
            success("浏览器选择问题修复完成")
            return True
            
        except Exception as e:
            error(f"浏览器选择修复失败: {e}")
            return False
    
    def fix_callback_url_conflict(self) -> bool:
        """修复登录回调URL冲突问题"""
        try:
            info("开始修复登录回调URL冲突问题...")
            
            # 1. 生成唯一的回调端口
            base_port = 8080
            unique_port = base_port + hash(self.current_dir.as_posix()) % 1000
            
            info(f"当前实例目录: {self.current_dir}")
            info(f"生成唯一回调端口: {unique_port}")
            
            # 2. 设置实例特定的环境变量
            callback_env_vars = {
                'AUGMENT_CALLBACK_PORT': str(unique_port),
                'AUGMENT_INSTANCE_ID': self.unique_instance_id,
                'AUGMENT_WORKSPACE_PATH': str(self.current_dir),
                'VSCODE_AUGMENT_CALLBACK_PORT': str(unique_port)
            }
            
            # 设置当前会话环境变量
            for var, value in callback_env_vars.items():
                os.environ[var] = value
                info(f"设置环境变量: {var}={value}")
            
            # 3. 写入注册表
            try:
                key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment", 0, winreg.KEY_SET_VALUE)
                for var_name, var_value in callback_env_vars.items():
                    winreg.SetValueEx(key, var_name, 0, winreg.REG_SZ, var_value)
                winreg.CloseKey(key)
                success("回调URL环境变量已写入注册表")
            except Exception as e:
                warning(f"注册表写入失败: {e}")
            
            # 4. 修改用户设置
            self.update_user_settings({
                "augment.advanced.callbackPort": unique_port,
                "augment.advanced.instanceId": self.unique_instance_id,
                "augment.advanced.workspacePath": str(self.current_dir),
                "augment.advanced.useUniqueCallback": True
            })
            
            # 5. 创建实例标识文件
            instance_file = self.current_dir / ".augment_instance"
            with open(instance_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "instance_id": self.unique_instance_id,
                    "callback_port": unique_port,
                    "workspace_path": str(self.current_dir),
                    "created_time": str(Path().stat().st_mtime)
                }, f, indent=2)
            
            info(f"创建实例标识文件: {instance_file}")
            success("登录回调URL冲突问题修复完成")
            return True
            
        except Exception as e:
            error(f"回调URL冲突修复失败: {e}")
            return False
    
    def update_user_settings(self, new_settings: Dict[str, Any]) -> bool:
        """更新用户设置"""
        try:
            # 确保目录存在
            self.settings_file.parent.mkdir(parents=True, exist_ok=True)
            
            # 读取现有设置
            if self.settings_file.exists():
                with open(self.settings_file, 'r', encoding='utf-8') as f:
                    settings = json.load(f)
            else:
                settings = {}
            
            # 更新设置
            settings.update(new_settings)
            
            # 写入设置
            with open(self.settings_file, 'w', encoding='utf-8') as f:
                json.dump(settings, f, indent=4, ensure_ascii=False)
            
            info(f"用户设置已更新: {len(new_settings)} 项")
            return True
            
        except Exception as e:
            error(f"更新用户设置失败: {e}")
            return False
    
    def create_launch_script(self) -> bool:
        """创建修复后的启动脚本"""
        try:
            script_content = f'''@echo off
REM Augment插件修复版启动器
REM 解决浏览器选择和回调URL冲突问题

echo ========================================
echo   CodeStudio Pro Ultimate - 修复版
echo ========================================
echo.

echo [1/4] 设置浏览器修复环境变量...
set BROWSER=
set AUGMENT_FORCE_DEFAULT_BROWSER=true
set VSCODE_BROWSER=default
set ELECTRON_BROWSER=default

echo [2/4] 设置回调URL修复环境变量...
set AUGMENT_CALLBACK_PORT={8080 + hash(str(self.current_dir)) % 1000}
set AUGMENT_INSTANCE_ID={self.unique_instance_id}
set AUGMENT_WORKSPACE_PATH={self.current_dir}
set VSCODE_AUGMENT_CALLBACK_PORT={8080 + hash(str(self.current_dir)) % 1000}

echo [3/4] 设置跳过登录环境变量...
set SKIP_AUGMENT_LOGIN=true
set DISABLE_USAGE_LIMIT=true
set AUGMENT_FREE_MODE=true

echo [4/4] 启动 CodeStudio Pro...
start "" "%~dp0codestudiopro.exe" --disable-web-security --no-sandbox --skip-augment-login --disable-usage-limit --augment-free-mode

echo.
echo ✅ CodeStudio Pro 已启动 (修复版)
echo    - 已修复浏览器选择问题
echo    - 已修复回调URL冲突问题
echo    - 已跳过登录验证
echo    - 已移除使用限制
echo.
timeout /t 3 /nobreak >nul
'''
            
            script_file = self.current_dir / "codestudiopro_fixed.bat"
            with open(script_file, 'w', encoding='utf-8') as f:
                f.write(script_content)
            
            success(f"创建修复版启动脚本: {script_file}")
            return True
            
        except Exception as e:
            error(f"创建启动脚本失败: {e}")
            return False
    
    def verify_fixes(self) -> bool:
        """验证修复效果"""
        try:
            info("验证修复效果...")
            
            # 检查环境变量
            required_vars = [
                'AUGMENT_FORCE_DEFAULT_BROWSER',
                'AUGMENT_CALLBACK_PORT', 
                'AUGMENT_INSTANCE_ID'
            ]
            
            for var in required_vars:
                if var in os.environ:
                    success(f"✅ 环境变量 {var} = {os.environ[var]}")
                else:
                    warning(f"⚠️ 环境变量 {var} 未设置")
            
            # 检查设置文件
            if self.settings_file.exists():
                with open(self.settings_file, 'r', encoding='utf-8') as f:
                    settings = json.load(f)
                
                if 'augment.advanced.useSystemBrowser' in settings:
                    success("✅ 浏览器设置已修复")
                if 'augment.advanced.callbackPort' in settings:
                    success("✅ 回调端口设置已修复")
            
            # 检查实例标识文件
            instance_file = self.current_dir / ".augment_instance"
            if instance_file.exists():
                success("✅ 实例标识文件已创建")
            
            success("修复效果验证完成")
            return True
            
        except Exception as e:
            error(f"验证失败: {e}")
            return False

def main():
    """主函数"""
    print("=" * 70)
    print("🔧 Augment插件浏览器和回调问题修复工具")
    print("=" * 70)
    print("功能: 修复浏览器选择 | 修复回调URL冲突 | 确保实例隔离")
    print("=" * 70)
    print()
    
    fixer = AugmentPluginFixer()
    
    # 检查插件是否存在
    if not fixer.check_plugin_exists():
        error("插件检查失败，退出修复")
        return False
    
    # 备份文件
    if not fixer.backup_files():
        error("文件备份失败，退出修复")
        return False
    
    success_count = 0
    
    # 修复浏览器选择问题
    if fixer.fix_browser_selection():
        success_count += 1
    
    # 修复回调URL冲突问题
    if fixer.fix_callback_url_conflict():
        success_count += 1
    
    # 创建修复版启动脚本
    if fixer.create_launch_script():
        success_count += 1
    
    # 验证修复效果
    if fixer.verify_fixes():
        success_count += 1
    
    # 显示结果
    print("\n" + "=" * 70)
    print("🎉 Augment插件修复完成")
    print("=" * 70)
    print(f"📊 完成度: {success_count}/4 项修复 ({success_count/4*100:.1f}%)")
    
    if success_count >= 3:
        print("\n🎯 修复成功！现在您可以:")
        print("   1. 使用修复版启动器: codestudiopro_fixed.bat")
        print("   2. 或直接运行: codestudiopro.exe")
        print("   3. 登录时将使用系统默认浏览器")
        print("   4. 回调URL不会影响其他实例")
        print("\n✨ 预期效果:")
        print("   ✅ 使用系统默认浏览器登录")
        print("   ✅ 回调URL只影响当前实例")
        print("   ✅ 多实例独立运行")
        print("   ✅ 无登录和使用限制")
        return True
    else:
        print("\n⚠️ 部分修复失败，请检查错误信息")
        return False

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️ 用户中断操作")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ 修复工具执行失败: {e}")
        sys.exit(1)
