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
RUN npm run compile && npm run build

# Production образ
FROM node:20-alpine AS production

WORKDIR /app

# Отключаем husky в production
ENV HUSKY=0

# Копирование корневого package.json
COPY package.json ./

# Копирование package-lock.json из builder
COPY --from=builder /app/package-lock.json ./

# Копирование package.json из workspace пакетов для production
COPY --from=builder /app/packages/evershop/package.json ./packages/evershop/
COPY --from=builder /app/packages/postgres-query-builder/package.json ./packages/postgres-query-builder/
COPY --from=builder /app/packages/create-evershop-app/package.json ./packages/create-evershop-app/

# Копирование package.json из extensions
COPY --from=builder /app/extensions/agegate/package.json ./extensions/agegate/
COPY --from=builder /app/extensions/azure_file_storage/package.json ./extensions/azure_file_storage/
COPY --from=builder /app/extensions/google_login/package.json ./extensions/google_login/
COPY --from=builder /app/extensions/product_review/package.json ./extensions/product_review/
COPY --from=builder /app/extensions/resend/package.json ./extensions/resend/
COPY --from=builder /app/extensions/s3_file_storage/package.json ./extensions/s3_file_storage/
COPY --from=builder /app/extensions/sendgrid/package.json ./extensions/sendgrid/

# Установка только production зависимостей
# npm ci с workspaces установит зависимости всех пакетов
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
