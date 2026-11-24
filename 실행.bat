@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo CyberPi 3D 기기 탐색
echo 아래 주소를 브라우저에서 열어 주세요.
echo http://127.0.0.1:8791
echo 종료: Ctrl+C
node tools\serve.mjs
pause
