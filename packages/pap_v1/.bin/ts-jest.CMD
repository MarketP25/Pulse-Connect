@SETLOCAL
@IF NOT DEFINED NODE_PATH (
  @SET "NODE_PATH=C:\Users\user\Pulse-Connect\Pulse-Agent-Protocol\node_modules\.pnpm\ts-jest@29.4.6_@babel+core@_5d1bb857bef4ab152f3b0dc8cd636954\node_modules\ts-jest\node_modules;C:\Users\user\Pulse-Connect\Pulse-Agent-Protocol\node_modules\.pnpm\ts-jest@29.4.6_@babel+core@_5d1bb857bef4ab152f3b0dc8cd636954\node_modules;C:\Users\user\Pulse-Connect\Pulse-Agent-Protocol\node_modules\.pnpm\node_modules"
) ELSE (
  @SET "NODE_PATH=C:\Users\user\Pulse-Connect\Pulse-Agent-Protocol\node_modules\.pnpm\ts-jest@29.4.6_@babel+core@_5d1bb857bef4ab152f3b0dc8cd636954\node_modules\ts-jest\node_modules;C:\Users\user\Pulse-Connect\Pulse-Agent-Protocol\node_modules\.pnpm\ts-jest@29.4.6_@babel+core@_5d1bb857bef4ab152f3b0dc8cd636954\node_modules;C:\Users\user\Pulse-Connect\Pulse-Agent-Protocol\node_modules\.pnpm\node_modules;%NODE_PATH%"
)
@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "%~dp0\..\ts-jest\cli.js" %*
) ELSE (
  @SET PATHEXT=%PATHEXT:;.JS;=;%
  node  "%~dp0\..\ts-jest\cli.js" %*
)
