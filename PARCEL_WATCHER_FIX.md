# 🔧 Исправление проблемы с @parcel/watcher

## ❌ Проблема

```
Error: No prebuild or local build of @parcel/watcher found. Tried @parcel/watcher-linux-x64-musl.
```

**Причина:** `@parcel/watcher` - это dev-зависимость, которая используется только в development режиме, но импортируется на верхнем уровне файла `ThemeWatcherPlugin.ts`, что приводит к попытке загрузки в production.

## ✅ Решение

1. **Убран статический импорт** `@parcel/watcher` из верхней части файла
2. **Добавлен динамический импорт** внутри метода `initializeGlobalWatcher()`
3. **Добавлена проверка** `isDevelopmentMode()` перед инициализацией
4. **Ранний выход** из метода `apply()` если не в development режиме

## 📝 Изменения

### ThemeWatcherPlugin.ts

**Было:**
```typescript
import watcher from '@parcel/watcher';  // ❌ Статический импорт

private initializeGlobalWatcher(): void {
  watcher.subscribe(...)  // ❌ Используется напрямую
}
```

**Стало:**
```typescript
// ✅ Импорт убран

private async initializeGlobalWatcher(): Promise<void> {
  if (!isDevelopmentMode()) {
    return;  // ✅ Ранний выход для production
  }
  
  const watcher = await import('@parcel/watcher');  // ✅ Динамический импорт
  watcher.default.subscribe(...)
}
```

## 🎯 Результат

- ✅ `@parcel/watcher` не загружается в production
- ✅ Нет ошибок при запуске приложения
- ✅ Плагин работает только в development режиме

## ⚠️ Важно

После этого исправления нужно:
1. Перекомпилировать код: `npm run compile`
2. Пересобрать приложение: `npm run build`
3. Закоммитить изменения
4. Задеплоить

