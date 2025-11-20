FROM node:20-alpine AS builder

# Установка рабочей директории
WORKDIR /app

# Обновление npm до последней версии
RUN npm install -g npm@9

# Отключаем husky (не нужен в production/build окружении)
ENV HUSKY=0

# Копирование корневого package.json и package-lock.json
COPY package.json package-lock.json ./

# Копирование ВСЕХ packages и extensions ПЕРЕД установкой зависимостей
# Это необходимо для правильного разрешения зависимостей workspace
COPY packages ./packages
COPY extensions ./extensions
COPY config ./config
COPY translations ./translations
COPY tsconfig.json ./

# Копирование папки media (media уже добавлена в Git)
COPY media ./media

# Установка всех зависимостей (включая dev для сборки)
# npm install автоматически установит зависимости всех workspace пакетов
RUN npm install

# Сборка приложения
# Сначала компилируем postgres-query-builder, затем evershop, затем собираем приложение
# Важно: postgres-query-builder должен быть скомпилирован ПЕРЕД evershop, так как evershop зависит от него
RUN npm run compile:db && npm run compile && npm run build

# Проверяем, что сборка прошла успешно - директория .evershop/build должна существовать
# И проверяем наличие критических файлов
RUN echo "=== Checking build results ===" && \
    test -d .evershop/build || (echo "ERROR: .evershop/build directory not found after build!" && exit 1) && \
    echo "Build directory exists. Checking structure..." && \
    find .evershop/build -type d | head -20 && \
    echo "Checking for JSON files..." && \
    find .evershop/build -type f -name "*.json" | head -20 && \
    echo "Checking for critical files..." && \
    (test -f .evershop/build/frontStore/homepage/client/index.json && echo "✓ frontStore/homepage/client/index.json found") || \
     (echo "ERROR: frontStore/homepage/client/index.json not found!" && \
      echo "Available files in .evershop/build:" && \
      find .evershop/build -type f | head -50 && \
      echo "Available directories:" && \
      find .evershop/build -type d && \
      exit 1)

# Удаляем dev-зависимости после сборки, чтобы не таскать их дальше
# Workspace пакеты остаются, так как они нужны для работы приложения
RUN npm prune --omit=dev

# Production образ
FROM node:20-alpine AS production

WORKDIR /app

# Отключаем husky в production
ENV HUSKY=0

# Копируем готовое дерево зависимостей из builder
COPY --from=builder /app/node_modules ./node_modules

# Копирование package.json и package-lock.json (необходимо для npm run start)
COPY --from=builder /app/package*.json ./

# Копирование собранного кода из builder
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/extensions ./extensions
COPY --from=builder /app/config ./config
COPY --from=builder /app/translations ./translations

# Копирование директории сборки (.evershop/build) - критически важно для работы приложения
# Проверяем, что директория существует перед копированием
COPY --from=builder /app/.evershop ./.evershop

# Создание директорий public и media
RUN mkdir -p ./public ./media

# Копирование медиа файлов из builder
COPY --from=builder /app/media ./media

# Создание пользователя без прав root для безопасности
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Открытие порта
EXPOSE 3000

# Запуск приложения
CMD ["npm", "run", "start"]
