@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM  SoporteWhatsApp - Desinstalar servicios Windows (NSSM)
REM  Detiene y elimina:
REM    SoporteWhatsApp-API
REM    SoporteWhatsApp-Frontend
REM  Ademas elimina las reglas de firewall asociadas.
REM  Los archivos de log se conservan.
REM ============================================================

set "SCRIPT_DIR=%~dp0"
set "ROOT=%SCRIPT_DIR%"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "TOOLS=%ROOT%\tools\nssm"
set "NSSM="

REM ---------- Elevar a administrador ----------
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Solicitando permisos de administrador...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

echo ============================================
echo  SoporteWhatsApp - Desinstalar servicios
echo ============================================
echo.

REM ---------- Localizar nssm.exe (si esta disponible) ----------
for /f "delims=" %%i in ('where nssm 2^>nul') do if not defined NSSM set "NSSM=%%i"
if not defined NSSM set "NSSM=%TOOLS%\nssm.exe"

REM ---------- Eliminar reglas de firewall ----------
echo [FIREWALL] Eliminando reglas de entrada...
netsh advfirewall firewall delete rule name="SoporteWhatsApp-API" >nul 2>&1
netsh advfirewall firewall delete rule name="SoporteWhatsApp-Frontend" >nul 2>&1
echo [OK] Reglas de firewall eliminadas.

REM ---------- Detener y eliminar SoporteWhatsApp-API ----------
call :remover_servicio SoporteWhatsApp-API

REM ---------- Detener y eliminar SoporteWhatsApp-Frontend ----------
call :remover_servicio SoporteWhatsApp-Frontend

echo.
echo ============================================
echo  DESINSTALACION COMPLETADA
echo  Logs conservados en:
echo    %ROOT%\backend\logs
echo    %ROOT%\frontend\logs
echo ============================================
pause
endlocal
exit /b


REM ============================================================
REM  Subrutina: detener y eliminar un servicio por nombre
REM ============================================================
:remover_servicio
set "SVC=%~1"
sc query "%SVC%" >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] El servicio %SVC% no existe. Se omite.
    exit /b 0
)

echo [STOP] Deteniendo %SVC%...
if exist "%NSSM%" (
    "%NSSM%" stop "%SVC%" >nul 2>&1
) else (
    sc stop "%SVC%" >nul 2>&1
)
timeout /t 2 /nobreak >nul

echo [REMOVE] Eliminando %SVC%...
if exist "%NSSM%" (
    "%NSSM%" remove "%SVC%" confirm >nul 2>&1
) else (
    sc delete "%SVC%" >nul 2>&1
)

sc query "%SVC%" >nul 2>&1
if %errorlevel% equ 0 (
    echo [ERROR] No se pudo eliminar %SVC%. Revisa si esta en uso.
) else (
    echo [OK] %SVC% eliminado.
)
exit /b 0
