FROM node:18-alpine AS builder

# Установка рабочей директории
WORKDIR /app

# Обновление npm до последней версии
RUN npm install -g npm@9

# Копирование файлов зависимостей
COPY package.json package-lock.json ./

# Установка всех зависимостей (включая dev для сборки)
RUN npm ci

# Копирование исходного кода
COPY packages ./packages
COPY extensions ./extensions
COPY config ./config
COPY translations ./translations
COPY tsconfig.json ./

# Сборка приложения
RUN npm run compile && npm run build

# Production образ
FROM node:18-alpine AS production

WORKDIR /app

# Копирование package файлов
COPY package.json package-lock.json ./

# Установка только production зависимостей
RUN npm ci --omit=dev && npm cache clean --force

# Копирование собранного кода из builder
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/extensions ./extensions
COPY --from=builder /app/config ./config
COPY --from=builder /app/translations ./translations

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
