# 📋 Краткая инструкция по деплою

## ⚠️ Важно: Про Netlify

Это **SSR (Server-Side Rendering)** приложение - фронтенд и бэкенд работают вместе. React компоненты рендерятся на сервере.

**Разделение на Netlify (фронт) и Railway (бэкенд) невозможно** без серьезной переработки архитектуры.

**Рекомендация:** Разверните всё на Railway - это правильный подход для SSR приложений.

## 📦 Что выгружать в Git

### Один репозиторий (рекомендуется)

Выгрузите весь каталог `evershop-dev/` в **один репозиторий** на GitHub.

**Исключить из Git:**
- `node_modules/`
- `.env`
- `.evershop/`
- `dist/`
- `media/` (если генерируется)
- `public/` (если генерируется)

## 🚀 Быстрый старт

### 1. Подготовка репозитория

```bash
cd evershop-dev
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main
```

### 2. Создание проекта на Railway

1. Зайдите на [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo**
3. Выберите ваш репозиторий
4. Railway автоматически начнет деплой

### 3. Добавление PostgreSQL

1. В проекте Railway: **+ New** → **Database** → **Add PostgreSQL**
2. Railway автоматически создаст переменные `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`

### 4. Настройка переменных окружения

В настройках приложения (не PostgreSQL) добавьте:

```
DB_HOST=<значение из PGHOST>
DB_PORT=<значение из PGPORT>
DB_NAME=<значение из PGDATABASE>
DB_USER=<значение из PGUSER>
DB_PASSWORD=<значение из PGPASSWORD>
DB_SSLMODE=require
NODE_ENV=production
PORT=3000
```

### 5. Получение домена

1. **Settings** → **Networking** → **Generate Domain**
2. Получите домен вида: `your-app.up.railway.app`

### 6. Создание администратора

После первого запуска:

```bash
railway run npm run user:create -- --name "Admin" --email "admin@example.com" --password "secure_password"
```

## 📚 Подробная инструкция

См. файл `DEPLOY_RAILWAY.md` для детальной инструкции.

## ✅ Чеклист перед деплоем

- [ ] Код закоммичен в Git
- [ ] Репозиторий создан на GitHub
- [ ] Проект создан на Railway
- [ ] PostgreSQL сервис добавлен
- [ ] Переменные окружения настроены
- [ ] Домен сгенерирован
- [ ] Администратор создан

## 🆘 Проблемы?

См. раздел "Troubleshooting" в `DEPLOY_RAILWAY.md`

