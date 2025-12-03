@echo off
REM Backup database before reset
REM Date: 2025-12-03 15:30

echo Creating database backup...

REM Get database credentials from .env
cd talkplatform-backend

REM Create backup directory
if not exist "backups" mkdir backups

REM Backup command (you need to fill in your credentials)
echo Please run this command manually with your database credentials:
echo.
echo mysqldump -u YOUR_USERNAME -p YOUR_DATABASE_NAME > backups/backup_before_reset_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.sql
echo.
echo After backup, press any key to continue with git reset...
pause

cd ..
