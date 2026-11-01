@echo off
rem One-click publish helper for dsh-todo-widget.
rem Using double quotes on purpose: cmd.exe does NOT treat single quotes as quotes,
rem and the workspace path contains non-ASCII characters.
setlocal
cd /d "%~dp0"
if errorlevel 1 (
  echo [publish] cannot enter plugin dir
  pause
  exit /b 1
)

echo [publish] dir      : %CD%
echo [publish] registry : https://registry.npmjs.org
echo.

rem 1) 登录检查
call npm.cmd whoami >nul 2>nul
if errorlevel 1 (
  echo [publish] not logged in.
  echo [publish] run this first:  npm.cmd login --registry https://registry.npmjs.org
  echo.
  pause
  exit /b 1
)
for /f "delims=" %%u in ('npm.cmd whoami 2^>nul') do echo [publish] account  : %%u

rem 2) 代码自检（构建 + DOM 冒烟 + 宿主端）
echo.
echo [publish] running build + smoke tests ...
call node build.mjs
if errorlevel 1 goto :fail
call node test\run-bundle-dom.cjs
if errorlevel 1 goto :fail
call node test-host.mjs
if errorlevel 1 goto :fail

rem 3) 发布前看一眼要打进去的文件
echo.
echo [publish] package contents:
call npm.cmd pack --dry-run

rem 4) 确认发布
echo.
set /p GO=[publish] type y then Enter to publish:
if /i not "%GO%"=="y" (
  echo [publish] cancelled
  pause
  exit /b 0
)

echo.
call npm.cmd publish --registry https://registry.npmjs.org
if errorlevel 1 goto :fail

echo.
echo [publish] DONE. next: create the GitHub repo, fill repository/homepage, add 3 screenshots.
pause
exit /b 0

:fail
echo.
echo [publish] FAILED (see messages above)
pause
exit /b 1
