@echo off
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
set AUGMENT_CALLBACK_PORT=8759
set AUGMENT_INSTANCE_ID=e117a770
set AUGMENT_WORKSPACE_PATH=C:\600-699_人工智能\610-系统rules\思维模型提示词\11.Ultimate版1.3工作室版
set VSCODE_AUGMENT_CALLBACK_PORT=8759

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
