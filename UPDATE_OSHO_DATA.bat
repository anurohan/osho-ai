@echo off
title OSHO AI - Update Knowledge Base
setlocal

echo ========================================
echo       OSHO AI - UPDATE KNOWLEDGE
echo ========================================
echo.

set "ROOT=D:\Osho-AI"
set "PY=%ROOT%\.venv\Scripts\python.exe"
set "BUILD=%ROOT%\src\build_index.py"

if not exist "%PY%" (
    echo ERROR: Python environment not found:
    echo %PY%
    pause
    exit /b 1
)

if not exist "%BUILD%" (
    echo ERROR: build_index.py not found:
    echo %BUILD%
    pause
    exit /b 1
)

echo Checking Osho text data...
echo.

for /d %%D in ("%ROOT%\data\raw\*") do (
    echo Found series: %%~nxD
)

echo.
echo Rebuilding RAG index...
echo This may take a little while.
echo.

"%PY%" "%BUILD%"

if errorlevel 1 (
    echo.
    echo ========================================
    echo UPDATE FAILED
    echo ========================================
    echo.
    echo Check the error above.
    pause
    exit /b 1
)

echo.
echo ========================================
echo     OSHO KNOWLEDGE UPDATED SUCCESSFULLY
echo ========================================
echo.
echo New/changed .txt files are now included.
echo You can refresh the Osho AI website and test.
echo.
pause
