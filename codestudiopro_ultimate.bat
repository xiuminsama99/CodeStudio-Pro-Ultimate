@echo off
chcp 65001 >nul 2>&1
REM CodeStudio Pro Ultimate Launcher v2.1
REM 终极版一键启动器 - 自动跳过登录和限制

echo ========================================
echo   CodeStudio Pro Ultimate Launcher
echo ========================================
echo.

echo [1/3] 设置环境变量...
set SKIP_AUGMENT_LOGIN=true
set DISABLE_USAGE_LIMIT=true
set AUGMENT_FREE_MODE=true
set CODESTUDIO_AUTO_CLEAN=true
set CODESTUDIO_AUTO_INSTALL=true
set VSCODE_DISABLE_CRASH_REPORTER=true
set ELECTRON_DISABLE_SECURITY_WARNINGS=true

echo [2/3] 检查主程序...
if not exist "codestudiopro.exe" (
    echo 错误: 未找到 codestudiopro.exe
    pause
    exit /b 1
)

echo [3/3] 启动 CodeStudio Pro...
start "" "%~dp0codestudiopro.exe" --disable-web-security --disable-features=VizDisplayCompositor --no-sandbox --skip-augment-login --disable-usage-limit --augment-free-mode --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows

echo.
echo ✅ CodeStudio Pro 已启动 (Ultimate模式)
echo    - 已跳过登录验证
echo    - 已移除使用限制
echo    - 所有功能完全可用
echo.
timeout /t 3 /nobreak >nul
