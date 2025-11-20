# 🔍 Полный анализ потенциальных проблем деплоя

## 📊 Категории проблем

### 1. 🔴 Критические проблемы (блокируют деплой)

#### 1.1. Проблемы с компиляцией workspace пакетов

**Проблема:** Пакеты не компилируются в правильном порядке
- ❌ `postgres-query-builder` не компилируется перед `evershop`
- ❌ Отсутствует скрипт `compile:db` в package.json
- ❌ Dockerfile не содержит правильный порядок компиляции

**Решение:**
```dockerfile
RUN npm run compile:db && npm run compile && npm run build
```

**Проверка:**
```bash
npm run pre-deploy-check
```

#### 1.2. Отсутствие необходимых файлов

**Проблема:** Критические файлы не копируются в Docker образ
- ❌ `.swcrc` файлы не копируются
- ❌ `tsconfig.json` отсутствует
- ❌ `config/default.json` не копируется

**Решение:**
```dockerfile
COPY packages ./packages  # Копирует все, включая .swcrc
COPY config ./config
COPY tsconfig.json ./
```

**Проверка:**
```bash
# Проверить наличие файлов
ls packages/evershop/.swcrc
ls packages/postgres-query-builder/.swcrc
ls config/default.json
```

#### 1.3. Проблемы с зависимостями

**Проблема:** Неправильные или отсутствующие зависимости
- ❌ `evershop` не имеет зависимости от `@evershop/postgres-query-builder`
- ❌ Версии пакетов не совпадают
- ❌ Workspace пакеты не линкуются правильно

**Решение:**
```json
{
  "dependencies": {
    "@evershop/postgres-query-builder": "^2.0.1"
  }
}
```

**Проверка:**
```bash
npm run analyze-deps
```

#### 1.4. Проблемы с копированием в production образ

**Проблема:** Скомпилированные файлы не копируются
- ❌ `packages/*/dist` не копируется
- ❌ `node_modules` не содержит workspace пакеты
- ❌ Симлинки workspace пакетов не работают

**Решение:**
```dockerfile
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules
```

**Проверка:**
```bash
# Проверить, что dist директории существуют после сборки
ls packages/postgres-query-builder/dist
ls packages/evershop/dist
```

### 2. 🟡 Проблемы с производительностью

#### 2.1. Медленная сборка Docker образа

**Проблема:** Сборка занимает слишком много времени
- ⚠️ `.dockerignore` не настроен правильно
- ⚠️ Копируются ненужные файлы
- ⚠️ Не используется кэш слоев Docker

**Решение:**
```dockerignore
node_modules
dist
.evershop
*.log
.git
```

**Проверка:**
```bash
# Проверить размер контекста сборки
docker build --no-cache -t test . 2>&1 | grep "Sending build context"
```

#### 2.2. Большой размер образа

**Проблема:** Production образ слишком большой
- ⚠️ Dev-зависимости не удаляются
- ⚠️ Копируются исходники вместо только dist
- ⚠️ Не используется multi-stage build правильно

**Решение:**
```dockerfile
RUN npm prune --omit=dev
# Копируем только dist, а не src
```

### 3. 🟠 Проблемы с переменными окружения

#### 3.1. Отсутствие обязательных переменных

**Проблема:** Приложение не может подключиться к БД
- ❌ `DB_HOST`, `DB_PORT`, `DB_NAME` не установлены
- ❌ `DB_SSLMODE=require` отсутствует
- ❌ `NODE_ENV=production` не установлен

**Решение:**
Проверить в Railway Variables:
- `DB_HOST=${PGHOST}`
- `DB_PORT=${PGPORT}`
- `DB_NAME=${PGDATABASE}`
- `DB_USER=${PGUSER}`
- `DB_PASSWORD=${PGPASSWORD}`
- `DB_SSLMODE=require`
- `NODE_ENV=production`

**Проверка:**
```bash
# В Railway проверить Variables
railway variables
```

#### 3.2. Неправильные значения переменных

**Проблема:** Переменные установлены, но значения неправильные
- ❌ Значения скопированы с лишними пробелами
- ❌ Используются переменные из другого сервиса
- ❌ Переменные не обновлены после изменения БД

**Решение:**
Всегда копировать значения напрямую из PostgreSQL сервиса в Railway.

### 4. 🔵 Проблемы с расширениями (extensions)

#### 4.1. Расширения не компилируются

**Проблема:** Extensions требуют компиляции, но не компилируются
- ⚠️ Extensions используют TypeScript
- ⚠️ Extensions не включены в процесс сборки
- ⚠️ Extensions требуют дополнительные зависимости

**Решение:**
Extensions компилируются автоматически при `npm run build`, если они включены в config.

**Проверка:**
```bash
# Проверить, что extensions включены
cat config/default.json | grep extensions
```

#### 4.2. Расширения требуют переменные окружения

**Проблема:** Extensions не работают без переменных
- ⚠️ S3/Azure storage требует ключи
- ⚠️ Email сервисы требуют API ключи
- ⚠️ Google Login требует credentials

**Решение:**
Установить все необходимые переменные для используемых extensions.

### 5. 🟣 Проблемы с портами и сетью

#### 5.1. Неправильный порт

**Проблема:** Приложение слушает не тот порт
- ❌ Приложение слушает порт 3000, но Railway использует другой
- ❌ Переменная `PORT` не установлена
- ❌ Приложение не читает `PORT` из окружения

**Решение:**
```dockerfile
EXPOSE 3000
# Приложение должно читать PORT из process.env.PORT
```

**Проверка:**
```javascript
// В коде должно быть
const port = process.env.PORT || 3000;
```

#### 5.2. Проблемы с подключением к БД

**Проблема:** Не может подключиться к PostgreSQL
- ❌ SSL режим не установлен
- ❌ Хост/порт неправильные
- ❌ Credentials неправильные

**Решение:**
```bash
DB_SSLMODE=require  # Обязательно для Railway PostgreSQL
```

## 🛠️ Инструменты для проверки

### Автоматические проверки

```bash
# Полная проверка перед деплоем
npm run pre-deploy-check

# Анализ зависимостей
npm run analyze-deps
```

### Ручные проверки

```bash
# Проверить структуру пакетов
ls -la packages/*/dist

# Проверить зависимости
npm ls @evershop/postgres-query-builder

# Проверить Dockerfile синтаксис
docker build --dry-run .

# Проверить размер образа
docker images | grep evershop
```

## 📋 Чек-лист перед каждым деплоем

### Обязательные проверки

- [ ] Запустить `npm run pre-deploy-check`
- [ ] Проверить, что все workspace пакеты компилируются
- [ ] Проверить порядок компиляции в Dockerfile
- [ ] Проверить, что все необходимые файлы копируются
- [ ] Проверить переменные окружения в Railway

### Рекомендуемые проверки

- [ ] Запустить `npm run analyze-deps`
- [ ] Проверить размер Docker образа
- [ ] Проверить время сборки
- [ ] Проверить документацию

## 🎯 Преимущества проактивного подхода

1. **Экономия времени** - находим проблемы до деплоя
2. **Меньше стресса** - не нужно ждать ошибок из логов
3. **Автоматизация** - можно добавить в CI/CD
4. **Документация** - явно видно, что проверяется

## 📚 Связанные документы

- `PROACTIVE_CHECKS.md` - Система проактивных проверок
- `DEPLOY_CHECKLIST.md` - Чек-лист перед деплоем
- `CRITICAL_FIX.md` - Критические исправления
- `scripts/pre-deploy-check.js` - Скрипт проверки
- `scripts/analyze-dependencies.js` - Анализ зависимостей

