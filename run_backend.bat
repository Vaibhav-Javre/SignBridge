@echo off
title SignBridge - Python ML Backend
echo ============================================================
echo           SignBridge AI - High-Speed ML Backend
echo ============================================================
echo.

set PYTHON_CMD=python
if exist "C:\Users\vaibh\miniconda3\python.exe" (
    set PYTHON_CMD=C:\Users\vaibh\miniconda3\python.exe
)

echo Starting Flask Inference Server using %PYTHON_CMD%...
%PYTHON_CMD% backend\app.py
pause
