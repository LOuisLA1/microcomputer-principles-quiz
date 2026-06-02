@echo off
chcp 65001 >nul
title Claude Code Web 界面启动器
echo ============================================
echo      Claude Code Web 界面启动器
echo ============================================
echo.
echo 正在启动 Claude Code Web 界面...

REM 检查HTML文件是否存在
if not exist "claude-web-interface.html" (
    echo 错误: 找不到 claude-web-interface.html 文件！
    pause
    exit /b 1
)

REM 使用默认浏览器打开HTML文件
start "" "claude-web-interface-enhanced.html"

echo.
echo Web界面已启动！请在浏览器中：
echo 1. 选择工作目录
echo 2. 选择一个技能
echo 3. 点击"执行技能"按钮
echo 4. 在终端中查看完整交互过程
echo.
echo ============================================
echo 按任意键返回Claude Code终端...
pause >nul