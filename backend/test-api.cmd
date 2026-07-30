@echo off
echo === Testing Campus Grievance API ===
echo.

REM 1. Health check
echo [1] Health Check
curl -s http://localhost:3000/api/health
echo.
echo.

REM 2. Login as Super Admin
echo [2] Login as Super Admin
curl -s -X POST http://localhost:3000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@vitbhopal.ac.in\",\"password\":\"admin123\"}" ^
  -c cookies.txt
echo.
echo.

REM 3. Auth /me
echo [3] Auth - Who Am I?
curl -s http://localhost:3000/api/auth/me -b cookies.txt
echo.
echo.

REM 4. Student login
echo [4] Login as Student
curl -s -X POST http://localhost:3000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"21BCE0001@vitbhopal.ac.in\",\"password\":\"student123\"}" ^
  -c student_cookies.txt
echo.
echo.

REM 5. Get my tickets (student)
echo [5] Student My Tickets
curl -s http://localhost:3000/api/tickets/my -b student_cookies.txt
echo.
echo.

REM 6. Get categories
echo [6] Get Categories
curl -s http://localhost:3000/api/admin/categories -b cookies.txt
echo.
echo.

REM 7. Get single ticket with timeline
echo [7] Get Ticket #1 with Timeline
curl -s http://localhost:3000/api/tickets/1 -b student_cookies.txt
echo.
echo.

REM 8. Get notifications
echo [8] Notifications
curl -s http://localhost:3000/api/notifications -b student_cookies.txt
echo.
echo.

REM 9. Admin dashboard
echo [9] Admin Dashboard
curl -s http://localhost:3000/api/admin/dashboard -b cookies.txt
echo.
echo.

REM 10. Super admin overview
echo [10] Super Admin Overview
curl -s http://localhost:3000/api/admin/super -b cookies.txt
echo.
echo.

echo === Tests Complete ===
