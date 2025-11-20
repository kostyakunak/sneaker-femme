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

# Установка всех зависимостей (включая dev для сборки)
# npm install автоматически установит зависимости всех workspace пакетов
RUN npm install

# Сборка приложения
# Сначала компилируем postgres-query-builder, затем evershop, затем собираем приложение
# Важно: postgres-query-builder должен быть скомпилирован ПЕРЕД evershop, так как evershop зависит от него
RUN npm run compile:db && npm run compile && npm run build

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
COPY --from=builder /app/.evershop ./.evershop

# Создание директорий public и media
RUN mkdir -p ./public ./media

# Создание пользователя без прав root для безопасности
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Открытие порта
EXPOSE 3000

# Запуск приложения
CMD ["npm", "run", "start"]
