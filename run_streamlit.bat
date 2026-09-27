@echo off
title SignBridge - Streamlit Local Test
echo ============================================================
echo      SignBridge Streamlit Community App (Local Test)
echo ============================================================
echo.

set PYTHON_CMD=python
if exist "C:\Users\vaibh\miniconda3\python.exe" (
    set PYTHON_CMD=C:\Users\vaibh\miniconda3\python.exe
)

%PYTHON_CMD% -m streamlit run streamlit_app.py
pause
