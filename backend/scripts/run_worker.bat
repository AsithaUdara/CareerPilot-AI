@echo off
cd /d %~dp0\..
call .venv\Scripts\activate
celery -A app.workers.celery_app.celery_app worker --loglevel=INFO --pool=solo
