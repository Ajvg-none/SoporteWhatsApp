@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM  SoporteWhatsApp - Instalar servicios Windows (NSSM)
REM  Instala y arranca:
REM    SoporteWhatsApp-API      -> backend (Express, puerto 3000)
REM    SoporteWhatsApp-Frontend -> frontend build (vite preview, puerto 5173)
REM  Ejecutar como Administrador (el script se auto-eleva).
REM ============================================================

set "SCRIPT_DIR=%~dp0"
set "ROOT=%SCRIPT_DIR%"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "TOOLS=%ROOT%\tools\nssm"
set "NSSM="
set "NODE="

REM ---------- Elevar a administrador ----------
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Solicitando permisos de administrador...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

echo ============================================
echo  SoporteWhatsApp - Instalar servicios Windows
echo ============================================
echo.

REM ---------- Verificar Node.js ----------
for /f "delims=" %%i in ('where node 2^>nul') do if not defined NODE set "NODE=%%i"
if not defined NODE (
    echo [ERROR] No se encontro node.exe en el PATH.
    echo         Instala Node.js y vuelve a ejecutar este script.
    pause
    exit /b 1
)
echo [OK] Node.js : %NODE%

REM ---------- Verificar dependencias del backend ----------
if not exist "%ROOT%\backend\node_modules" (
    echo [ERROR] No existe "%ROOT%\backend\node_modules".
    echo         Ejecuta primero: cd backend ^&^& npm install
    pause
    exit /b 1
)

REM ---------- Build del frontend (si falta) ----------
if not exist "%ROOT%\frontend\dist\index.html" (
    echo [BUILD] Generando build del frontend...
    pushd "%ROOT%\frontend"
    call npm run build
    set "BUILD_RC=!errorlevel!"
    popd
    if not "!BUILD_RC!"=="0" (
        echo [ERROR] Fallo el build del frontend.
        pause
        exit /b 1
    )
    echo [OK] Build del frontend generado.
) else (
    echo [INFO] Frontend ya tiene build en dist. Usa: npm run build en la carpeta frontend para regenerarlo.
)
echo.

REM ---------- Asegurar nssm.exe ----------
for /f "delims=" %%i in ('where nssm 2^>nul') do if not defined NSSM set "NSSM=%%i"
if not defined NSSM set "NSSM=%TOOLS%\nssm.exe"
if not exist "%NSSM%" (
    echo [NSSM] nssm no encontrado. Descargando...
    if not exist "%ROOT%\tools" mkdir "%ROOT%\tools"
    if not exist "%TOOLS%" mkdir "%TOOLS%"
    powershell -Command "$ErrorActionPreference='Stop'; $d='%TOOLS%'; Invoke-WebRequest -Uri 'https://nssm.cc/ci/nssm-2.24.zip' -OutFile \"$d\nssm.zip\"; Expand-Archive -Path \"$d\nssm.zip\" -DestinationPath \"$d\" -Force; Copy-Item -Path \"$d\nssm-2.24\win64\nssm.exe\" -Destination \"$d\nssm.exe\" -Force"
    if not exist "%NSSM%" (
        echo [ERROR] No se pudo descargar nssm.exe desde nssm.cc.
        echo         Descargalo manualmente y colocalo en %TOOLS%\nssm.exe
        pause
        exit /b 1
    )
)
echo [OK] NSSM : %NSSM%

REM ---------- Crear carpetas de logs ----------
if not exist "%ROOT%\backend\logs" mkdir "%ROOT%\backend\logs"
if not exist "%ROOT%\frontend\logs" mkdir "%ROOT%\frontend\logs"

REM ---------- Advertir puertos ocupados ----------
netstat -ano | findstr /c:":3000 " >nul 2>&1 && echo [AVISO] Puerto 3000 parece estar en uso (deten manualmente el proceso antes de iniciar).
netstat -ano | findstr /c:":5173 " >nul 2>&1 && echo [AVISO] Puerto 5173 parece estar en uso (deten manualmente el proceso antes de iniciar).
echo.

REM ============================================================
REM  Servicio API
REM ============================================================
sc query SoporteWhatsApp-API >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] SoporteWhatsApp-API ya existe. Reinstalando...
    "%NSSM%" stop SoporteWhatsApp-API >nul 2>&1
    "%NSSM%" remove SoporteWhatsApp-API confirm >nul 2>&1
)
"%NSSM%" install SoporteWhatsApp-API "%NODE%" "src\app.js" >nul
"%NSSM%" set SoporteWhatsApp-API AppDirectory "%ROOT%\backend"
"%NSSM%" set SoporteWhatsApp-API AppStdout "%ROOT%\backend\logs\api.out.log"
"%NSSM%" set SoporteWhatsApp-API AppStderr "%ROOT%\backend\logs\api.err.log"
"%NSSM%" set SoporteWhatsApp-API AppRotateFiles 1
"%NSSM%" set SoporteWhatsApp-API AppRotateBytes 10485760
"%NSSM%" set SoporteWhatsApp-API AppExit Default Restart
"%NSSM%" set SoporteWhatsApp-API DisplayName "Soporte WhatsApp - API"
"%NSSM%" set SoporteWhatsApp-API Description "Backend API de Soporte WhatsApp (Express + Prisma, puerto 3000)"
"%NSSM%" set SoporteWhatsApp-API Start SERVICE_AUTO_START
echo [OK] Servicio SoporteWhatsApp-API instalado.

REM ============================================================
REM  Servicio Frontend (vite preview del build)
REM ============================================================
if not exist "%ROOT%\frontend\node_modules\vite\bin\vite.js" (
    echo [ERROR] No existe %ROOT%\frontend\node_modules\vite\bin\vite.js
    echo         Ejecuta primero: cd frontend ^&^& npm install
    pause
    exit /b 1
)
sc query SoporteWhatsApp-Frontend >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] SoporteWhatsApp-Frontend ya existe. Reinstalando...
    "%NSSM%" stop SoporteWhatsApp-Frontend >nul 2>&1
    "%NSSM%" remove SoporteWhatsApp-Frontend confirm >nul 2>&1
)
"%NSSM%" install SoporteWhatsApp-Frontend "%NODE%" "%ROOT%\frontend\node_modules\vite\bin\vite.js" preview --host 0.0.0.0 --port 5173 --strictPort >nul
"%NSSM%" set SoporteWhatsApp-Frontend AppDirectory "%ROOT%\frontend"
"%NSSM%" set SoporteWhatsApp-Frontend AppStdout "%ROOT%\frontend\logs\preview.out.log"
"%NSSM%" set SoporteWhatsApp-Frontend AppStderr "%ROOT%\frontend\logs\preview.err.log"
"%NSSM%" set SoporteWhatsApp-Frontend AppRotateFiles 1
"%NSSM%" set SoporteWhatsApp-Frontend AppRotateBytes 10485760
"%NSSM%" set SoporteWhatsApp-Frontend AppExit Default Restart
"%NSSM%" set SoporteWhatsApp-Frontend DisplayName "Soporte WhatsApp - Frontend"
"%NSSM%" set SoporteWhatsApp-Frontend Description "Frontend Soporte WhatsApp (vite preview del build, puerto 5173)"
"%NSSM%" set SoporteWhatsApp-Frontend Start SERVICE_AUTO_START
echo [OK] Servicio SoporteWhatsApp-Frontend instalado.
echo.

REM ---------- Firewall (acceso en red local) ----------
echo [FIREWALL] Configurando reglas de entrada...
netsh advfirewall firewall delete rule name="SoporteWhatsApp-API" >nul 2>&1
netsh advfirewall firewall add rule name="SoporteWhatsApp-API" dir=in action=allow protocol=TCP localport=3000 >nul
netsh advfirewall firewall delete rule name="SoporteWhatsApp-Frontend" >nul 2>&1
netsh advfirewall firewall add rule name="SoporteWhatsApp-Frontend" dir=in action=allow protocol=TCP localport=5173 >nul
echo [OK] Reglas de firewall creadas.

REM ---------- Iniciar servicios ----------
echo.
echo [INICIO] Arrancando servicios...
"%NSSM%" start SoporteWhatsApp-API >nul 2>&1
"%NSSM%" start SoporteWhatsApp-Frontend >nul 2>&1

REM ---------- Verificar ----------
echo.
echo Verificando disponibilidad (esperando unos segundos)...
timeout /t 5 /nobreak >nul

set "API_OK=NO"
for /f "delims=" %%i in ('powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri 'http://localhost:3000/api/health' -UseBasicParsing -TimeoutSec 8).StatusCode } catch { '' }" 2^>nul') do set "API_OK=%%i"
if "%API_OK%"=="200" (
    echo [OK] API  : http://localhost:3000/api/health  ^-^> 200
) else (
    echo [ERROR] La API no respondio en :3000. Revisa backend\logs\api.err.log
)

set "FE_OK=NO"
for /f "delims=" %%i in ('powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri 'http://localhost:5173/' -UseBasicParsing -TimeoutSec 8).StatusCode } catch { '' }" 2^>nul') do set "FE_OK=%%i"
if "%FE_OK%"=="200" (
    echo [OK] Frontend : http://localhost:5173/  ^-^> 200
) else (
    echo [ERROR] El frontend no respondio en :5173. Revisa frontend\logs\preview.err.log
)

echo.
echo ============================================
echo  INSTALACION COMPLETADA
echo  Acceso: http://localhost:5173
echo  API   : http://localhost:3000/api
echo  Para detener/desinstalar: desinstalar_servicio.bat
echo ============================================
pause
endlocal
