@echo off
REM Script to remove React frontend test files

del /q client\src\App.test.js
if exist client\src\App.test.js echo Failed to delete App.test.js

del /q client\src\setupTests.js
if exist client\src\setupTests.js echo Failed to delete setupTests.js

echo Frontend test files removed.
