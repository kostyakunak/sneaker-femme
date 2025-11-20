# Как добавить тестовые данные в базу данных

## Способ 1: Через локальный запуск (рекомендуется)

### Шаг 1: Установите переменные окружения

Создайте файл `.env` в корне проекта или экспортируйте переменные:

```bash
export PGHOST=yamanote.proxy.rlwy.net
export PGPORT=37892
export PGDATABASE=railway
export PGUSER=postgres
export PGPASSWORD=OlimuVYdWqMbLnpZfhArkVkvwgTkXZxK
export DB_SSLMODE=require
export NODE_ENV=production
```

### Шаг 2: Скомпилируйте проект (если еще не скомпилирован)

```bash
npm run compile:db && npm run compile
```

### Шаг 3: Запустите seed скрипт

**Все данные сразу:**
```bash
npm run seed -- --all
```

**Или по отдельности:**
```bash
# Атрибуты (цвет, размер и т.д.)
npm run seed -- --attributes

# Категории
npm run seed -- --categories

# Коллекции
npm run seed -- --collections

# Товары (нужны атрибуты и категории)
npm run seed -- --products

# Виджеты (слайдеры на главной)
npm run seed -- --widgets

# CMS страницы
npm run seed -- --pages
```

## Способ 2: Через Railway CLI

### Шаг 1: Установите Railway CLI

```bash
npm i -g @railway/cli
```

### Шаг 2: Войдите в Railway

```bash
railway login
```

### Шаг 3: Подключитесь к проекту

```bash
railway link
```

### Шаг 4: Запустите seed в контейнере Railway

```bash
railway run npm run compile:db && npm run compile && npm run seed -- --all
```

## Способ 3: Через psql (только для прямых SQL запросов)

Если нужно выполнить прямые SQL запросы:

```bash
PGPASSWORD=OlimuVYdWqMbLnpZfhArkVkvwgTkXZxK psql -h yamanote.proxy.rlwy.net -U postgres -p 37892 -d railway
```

Но для добавления тестовых данных лучше использовать seed скрипты (Способ 1), так как они правильно создают все связи и структуру.

## Что добавляет seed --all

- **Атрибуты**: Цвет, Размер (для вариантов товаров)
- **Категории**: Accessories, Home & Living, Office
- **Коллекции**: Homepage, Best Sellers
- **Товары**: 13 демо-товаров (чашки, вазы, термосы и т.д.)
- **Виджеты**: Слайдеры для главной страницы
- **CMS страницы**: О нас, Контакты и т.д.

## Проверка

После запуска seed откройте ваш сайт:
- Главная: `https://sneaker-femme-production.up.railway.app`
- Админка: `https://sneaker-femme-production.up.railway.app/admin`

Товары должны появиться на главной странице.

