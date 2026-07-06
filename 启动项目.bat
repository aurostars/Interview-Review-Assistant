@echo off
chcp 65001 >nul
echo 正在启动面试复盘助手...
echo.

cd /d "%~dp0app"

echo 启动服务器在 http://localhost:8080
echo 按 Ctrl+C 可停止服务器
echo.

start http://localhost:8080

python server.py
