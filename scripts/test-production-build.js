#!/usr/bin/env node

/**
 * Тестирование production сборки локально
 * Собирает Docker образ локально и проверяет, что он запускается
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

console.log('🔨 Тестирование production сборки локально...\n');
console.log('⚠️  Это займет несколько минут...\n');

try {
  // 1. Проверяем наличие Docker
  console.log('1. Проверка Docker...');
  try {
    execSync('docker --version', { stdio: 'ignore' });
    console.log('   ✅ Docker установлен\n');
  } catch (e) {
    console.error('   ❌ Docker не установлен или не доступен');
    process.exit(1);
  }
  
  // 2. Собираем образ
  console.log('2. Сборка Docker образа...');
  console.log('   (это может занять 5-10 минут)\n');
  
  const imageName = 'evershop-test-build';
  const dockerfilePath = resolve(ROOT, 'Dockerfile');
  
  try {
    execSync(
      `docker build -t ${imageName} -f ${dockerfilePath} ${ROOT}`,
      { 
        stdio: 'inherit',
        cwd: ROOT
      }
    );
    console.log('\n   ✅ Образ успешно собран\n');
  } catch (e) {
    console.error('\n   ❌ Ошибка при сборке образа');
    console.error('   Проверьте логи выше для деталей');
    process.exit(1);
  }
  
  // 3. Проверяем, что образ создан
  console.log('3. Проверка созданного образа...');
  try {
    const images = execSync(`docker images ${imageName} --format "{{.Repository}}"`, { encoding: 'utf-8' });
    if (images.trim() === imageName) {
      console.log('   ✅ Образ найден\n');
    } else {
      console.error('   ❌ Образ не найден');
      process.exit(1);
    }
  } catch (e) {
    console.error('   ❌ Ошибка при проверке образа');
    process.exit(1);
  }
  
  // 4. Тестируем запуск (без реального запуска сервера)
  console.log('4. Проверка структуры образа...');
  try {
    // Проверяем, что необходимые файлы есть в образе
    const testCommands = [
      `docker run --rm ${imageName} test -f /app/package.json`,
      `docker run --rm ${imageName} test -d /app/packages/evershop/dist`,
      `docker run --rm ${imageName} test -d /app/packages/postgres-query-builder/dist`,
      `docker run --rm ${imageName} test -f /app/packages/evershop/dist/bin/start/index.js`
    ];
    
    for (const cmd of testCommands) {
      try {
        execSync(cmd, { stdio: 'ignore' });
      } catch (e) {
        console.error(`   ❌ Проверка не прошла: ${cmd}`);
        process.exit(1);
      }
    }
    
    console.log('   ✅ Структура образа корректна\n');
  } catch (e) {
    console.error('   ❌ Ошибка при проверке структуры');
    process.exit(1);
  }
  
  console.log('✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ!\n');
  console.log('📦 Образ готов к деплою на Railway\n');
  console.log('💡 Для очистки выполните: docker rmi ${imageName}\n');
  
} catch (e) {
  console.error('\n❌ Критическая ошибка:', e.message);
  process.exit(1);
}

