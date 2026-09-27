@echo off
title SignBridge - Standalone Live Camera
echo ============================================================
echo      SignBridge Live Camera Window (Direct OpenCV 30+ FPS)
echo ============================================================
echo.

set PYTHON_CMD=python
if exist "C:\Users\vaibh\miniconda3\python.exe" (
    set PYTHON_CMD=C:\Users\vaibh\miniconda3\python.exe
)

%PYTHON_CMD% backend\live_camera.py
pause
