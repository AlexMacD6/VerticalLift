Write-Host "Starting Tray Optimizer MVP servers..." -ForegroundColor Green

Write-Host "`nStarting Backend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList 'cd backend; uvicorn app:app --reload'

Write-Host "`nStarting Frontend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList 'cd frontend; npm run dev'

Write-Host "`nBoth servers are starting..." -ForegroundColor Green
Write-Host "Backend will be at: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Frontend will be at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "`nPress Enter to continue..."
Read-Host 