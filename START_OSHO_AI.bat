@echo off
title OSHO AI - Launcher
color 0A
setlocal

echo ==========================================
echo             OSHO AI - STARTING
echo ==========================================
echo.

REM ------------------------------------------
REM Environment
REM ------------------------------------------
set "ROOT=D:\Osho-AI"
set "PYTHON=%ROOT%\.venv\Scripts\python.exe"
set "LLM=llama3.2:3b"

REM Use the local Hugging Face cache so the embedding model loads
REM instantly and offline (no downloads needed).
set "HF_HOME=%ROOT%\models\huggingface"
set "HF_HUB_CACHE=%ROOT%\models\huggingface\hub"
set "TRANSFORMERS_CACHE=%ROOT%\models\huggingface\transformers"
set "HF_HUB_OFFLINE=1"
set "TRANSFORMERS_OFFLINE=1"

if not exist "%PYTHON%" (
    echo ERROR: Python environment not found:
    echo   %PYTHON%
    echo Please set up the .venv first.
    echo.
    pause
    exit /b 1
)

REM ------------------------------------------
REM 1) Ollama
REM ------------------------------------------
echo [1/4] Starting Ollama...
start "" /min ollama serve
timeout /t 3 /nobreak >nul

echo       Checking language model (%LLM%)...
ollama list 2>nul | findstr /I /C:"%LLM%" >nul 2>&1
if errorlevel 1 (
    echo       Model not found locally. Downloading %LLM% ...
    echo       ^(This happens only once and may take a few minutes.^)
    ollama pull %LLM%
    if errorlevel 1 (
        echo.
        echo WARNING: Could not pull %LLM%.
        echo Osho AI will still open, but answers need this model.
        echo Run "ollama pull %LLM%" manually once you are online.
        echo.
        timeout /t 4 /nobreak >nul
    )
) else (
    echo       Model is ready.
)

REM ------------------------------------------
REM 2) Backend
REM ------------------------------------------
echo [2/4] Starting backend (FastAPI)...
start "OSHO AI - BACKEND" cmd /k "cd /d %ROOT%\app\osho-ai-app\backend && "%PYTHON%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
timeout /t 5 /nobreak >nul

REM ------------------------------------------
REM 3) Frontend
REM ------------------------------------------
echo [3/4] Starting frontend (Vite)...
start "OSHO AI - FRONTEND" cmd /k "cd /d %ROOT%\app\osho-ai-app\frontend && npm.cmd run dev"
timeout /t 8 /nobreak >nul

REM ------------------------------------------
REM 4) Open in browser
REM ------------------------------------------
echo [4/4] Opening Osho AI...
start "" "http://localhost:5173"

echo.
echo ==========================================
echo        OSHO AI STARTED SUCCESSFULLY
echo ==========================================
echo.
echo   Website : http://localhost:5173
echo   Backend : http://127.0.0.1:8000
echo.
echo Keep the two OSHO AI terminal windows open.
echo Close them when you want to stop Osho AI.
echo.
pause
endlocal
