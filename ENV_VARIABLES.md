# Переменные окружения для Railway

## Обязательные переменные окружения

Railway автоматически создает эти переменные для PostgreSQL сервиса. Вам нужно создать их в настройках вашего приложения:

### База данных PostgreSQL

```bash
DB_HOST=${PGHOST}           # Или скопируйте значение из PGHOST
DB_PORT=${PGPORT}           # Или скопируйте значение из PGPORT  
DB_NAME=${PGDATABASE}       # Или скопируйте значение из PGDATABASE
DB_USER=${PGUSER}           # Или скопируйте значение из PGUSER
DB_PASSWORD=${PGPASSWORD}   # Или скопируйте значение из PGPASSWORD
DB_SSLMODE=require          # Для безопасного подключения
```

**Важно:** Railway автоматически создает переменные `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` для PostgreSQL сервиса. Вы можете либо:
1. Использовать их напрямую (если приложение поддерживает)
2. Создать переменные `DB_*` со значениями из `PG*` переменных

### Приложение

```bash
NODE_ENV=production
PORT=3000                    # Railway автоматически устанавливает, но можно указать явно
```

## Опциональные переменные (в зависимости от расширений)

### AWS S3 Storage (расширение s3_file_storage)

```bash
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your_bucket_name
```

### Azure Storage (расширение azure_file_storage)

```bash
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_STORAGE_CONTAINER_NAME=your_container_name
```

### Email Service - Resend (расширение resend)

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

### Email Service - SendGrid (расширение sendgrid)

```bash
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
```

### Google Login (расширение google_login)

```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## Как установить переменные в Railway

1. Откройте ваш проект на Railway
2. Выберите сервис приложения (не PostgreSQL)
3. Перейдите в "Variables" вкладку
4. Нажмите "+ New Variable"
5. Добавьте переменную и её значение
6. Для переменных из PostgreSQL сервиса, вы можете использовать синтаксис `${PGHOST}` или скопировать значение

## Проверка переменных

После установки переменных, перезапустите сервис. Проверьте логи, чтобы убедиться, что все переменные загружены правильно.

