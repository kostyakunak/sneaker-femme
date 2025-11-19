# 🚀 Быстрый старт: Развертывание на Railway

## Краткая инструкция

### 1. Подготовка (5 минут)

```bash
cd evershop-dev

# Проверьте, что .gitignore настроен правильно
cat .gitignore

# Инициализируйте Git (если еще не сделано)
git init
git add .
git commit -m "Initial commit for Railway"

# Создайте репозиторий на GitHub и запушьте
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Railway (10 минут)

1. **Создайте проект:**
   - Зайдите на [railway.app](https://railway.app)
   - "New Project" → "Deploy from GitHub repo"
   - Выберите ваш репозиторий

2. **Добавьте PostgreSQL:**
   - В проекте: "+ New" → "Database" → "Add PostgreSQL"
   - Railway автоматически создаст переменные `PG*`

3. **Настройте переменные окружения:**
   - Откройте сервис приложения → "Variables"
   - Добавьте:
     ```
     DB_HOST=<скопируйте из PGHOST>
     DB_PORT=<скопируйте из PGPORT>
     DB_NAME=<скопируйте из PGDATABASE>
     DB_USER=<скопируйте из PGUSER>
     DB_PASSWORD=<скопируйте из PGPASSWORD>
     DB_SSLMODE=require
     NODE_ENV=production
     ```

4. **Дождитесь развертывания:**
   - Railway автоматически соберет и запустит приложение
   - Проверьте логи на ошибки

5. **Получите домен:**
   - Settings → Networking → "Generate Domain"

### 3. Готово! ✅

Ваше приложение доступно по адресу Railway домена.

## 📚 Подробные инструкции

- **Полная инструкция**: См. `RAILWAY_SETUP.md`
- **Переменные окружения**: См. `ENV_VARIABLES.md`
- **Структура репозитория**: См. `REPOSITORY_STRUCTURE.md`
- **Общая документация**: См. `DEPLOYMENT.md`

## ⚠️ Важно о Netlify

EverShop - это **SSR приложение**, которое не может быть разделено на фронтенд и бэкенд без серьезной переработки. 

**Рекомендация:** Разверните все на Railway. Это правильный подход для SSR приложений.

## 🆘 Проблемы?

1. Проверьте логи в Railway
2. Убедитесь, что все переменные окружения установлены
3. Проверьте подключение к базе данных
4. См. раздел Troubleshooting в `DEPLOYMENT.md`

