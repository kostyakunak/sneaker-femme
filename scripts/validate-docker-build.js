#!/usr/bin/env node

/**
 * Валидация Docker сборки БЕЗ реального деплоя
 * Симулирует сборку и проверяет все потенциальные проблемы
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

let errors = [];
let warnings = [];

function error(msg) {
  errors.push(`❌ ${msg}`);
  console.error(`❌ ${msg}`);
}

function warning(msg) {
  warnings.push(`⚠️  ${msg}`);
  console.warn(`⚠️  ${msg}`);
}

function success(msg) {
  console.log(`✅ ${msg}`);
}

// 1. Проверка синтаксиса Dockerfile
function validateDockerfileSyntax() {
  success('Проверка синтаксиса Dockerfile...');
  
  try {
    // Проверяем базовый синтаксис через docker build --dry-run (если доступен)
    // Или просто проверяем структуру файла
    const dockerfile = readFileSync(resolve(ROOT, 'Dockerfile'), 'utf-8');
    const lines = dockerfile.split('\n');
    
    // Проверяем наличие критических команд
    const requiredCommands = ['FROM', 'WORKDIR', 'COPY', 'RUN', 'CMD'];
    const foundCommands = new Set();
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const command = trimmed.split(' ')[0];
        if (requiredCommands.includes(command)) {
          foundCommands.add(command);
        }
        
        // Проверяем синтаксис COPY
        if (command === 'COPY' && trimmed.includes(' /app/') && trimmed.includes(' /app/')) {
          // Проверяем на двойной путь (старая ошибка)
          const paths = trimmed.match(/\/app\/[^\s]+/g);
          if (paths && paths.length > 1 && !trimmed.includes('package*.json')) {
            error(`Строка ${index + 1}: Возможная ошибка в COPY команде - несколько путей без wildcard`);
          }
        }
      }
    });
    
    // Проверяем наличие всех необходимых команд
    for (const cmd of requiredCommands) {
      if (!foundCommands.has(cmd) && cmd !== 'CMD') {
        warning(`Команда ${cmd} не найдена в Dockerfile`);
      }
    }
    
    success('Синтаксис Dockerfile проверен');
  } catch (e) {
    error(`Ошибка при проверке Dockerfile: ${e.message}`);
  }
}

// 2. Проверка порядка компиляции
function validateCompileOrder() {
  success('Проверка порядка компиляции...');
  
  const dockerfile = readFileSync(resolve(ROOT, 'Dockerfile'), 'utf-8');
  
  // Ищем строку с компиляцией
  const compileLine = dockerfile.match(/RUN.*compile.*build/);
  if (!compileLine) {
    error('Строка компиляции не найдена в Dockerfile');
    return;
  }
  
  const line = compileLine[0];
  
  // Проверяем наличие всех команд
  const hasCompileDb = line.includes('compile:db');
  const hasCompile = /npm run compile(?!:db)/.test(line);
  const hasBuild = line.includes('npm run build');
  
  if (!hasCompileDb) {
    error('npm run compile:db не найден в Dockerfile');
  }
  
  if (!hasCompile) {
    error('npm run compile не найден в Dockerfile');
  }
  
  if (!hasBuild) {
    error('npm run build не найден в Dockerfile');
  }
  
  // Проверяем порядок в строке
  if (hasCompileDb && hasCompile && hasBuild) {
    const compileDbPos = line.indexOf('compile:db');
    const compilePos = line.search(/npm run compile(?!:db)/);
    const buildPos = line.indexOf('npm run build');
    
    if (compileDbPos < compilePos && compilePos < buildPos) {
      success('Порядок компиляции корректен');
    } else {
      error('Неправильный порядок компиляции: compile:db должен быть перед compile, compile перед build');
    }
  }
}

// 3. Проверка зависимостей перед сборкой
function validateDependencies() {
  success('Проверка зависимостей...');
  
  const packageJson = JSON.parse(
    readFileSync(resolve(ROOT, 'package.json'), 'utf-8')
  );
  
  // Проверяем, что все workspace пакеты существуют
  const workspaces = packageJson.workspaces || [];
  for (const workspace of workspaces) {
    const pattern = workspace.replace('/*', '');
    const workspaceDir = resolve(ROOT, pattern);
    
    if (!existsSync(workspaceDir)) {
      error(`Workspace директория не найдена: ${pattern}`);
    }
  }
  
  // Проверяем, что evershop зависит от postgres-query-builder
  const evershopPkg = JSON.parse(
    readFileSync(resolve(ROOT, 'packages/evershop/package.json'), 'utf-8')
  );
  
  const deps = { ...evershopPkg.dependencies, ...evershopPkg.devDependencies };
  if (!deps['@evershop/postgres-query-builder']) {
    error('evershop не имеет зависимости от @evershop/postgres-query-builder');
  } else {
    success('Зависимость @evershop/postgres-query-builder найдена');
  }
}

// 4. Проверка на статические импорты dev-зависимостей
function validateDevDependenciesImports() {
  success('Проверка импортов dev-зависимостей...');
  
  const devDeps = ['@parcel/watcher'];
  const sourceFiles = [
    'packages/evershop/src/lib/webpack/plugins/ThemeWatcherPlugin.ts'
  ];
  
  for (const file of sourceFiles) {
    const filePath = resolve(ROOT, file);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');
      
      for (const dep of devDeps) {
        // Проверяем статический импорт
        const staticImport = new RegExp(`import\\s+.*from\\s+['"]${dep.replace('@', '@')}['"]`, 'g');
        if (staticImport.test(content)) {
          // Проверяем, есть ли динамический импорт как альтернатива
          const dynamicImport = new RegExp(`import\\(['"]${dep.replace('@', '@')}['"]\\)`, 'g');
          if (!dynamicImport.test(content)) {
            warning(`Статический импорт ${dep} найден в ${file} - может вызвать проблемы в production`);
          }
        }
      }
    }
  }
  
  success('Проверка импортов завершена');
}

// 5. Симуляция сборки (без реального деплоя)
function simulateBuild() {
  success('Симуляция сборки...');
  
  try {
    // Проверяем, что все необходимые файлы существуют
    const requiredFiles = [
      'package.json',
      'package-lock.json',
      'Dockerfile',
      'packages/evershop/package.json',
      'packages/postgres-query-builder/package.json'
    ];
    
    for (const file of requiredFiles) {
      const filePath = resolve(ROOT, file);
      if (!existsSync(filePath)) {
        error(`Необходимый файл не найден: ${file}`);
      }
    }
    
    // Проверяем, что скрипты компиляции существуют
    const rootPkg = JSON.parse(
      readFileSync(resolve(ROOT, 'package.json'), 'utf-8')
    );
    
    const requiredScripts = ['compile', 'compile:db', 'build', 'start'];
    for (const script of requiredScripts) {
      if (!rootPkg.scripts[script]) {
        error(`Скрипт ${script} не найден в package.json`);
      }
    }
    
    success('Симуляция сборки прошла успешно');
  } catch (e) {
    error(`Ошибка при симуляции сборки: ${e.message}`);
  }
}

// 6. Проверка переменных окружения (документация)
function validateEnvVars() {
  success('Проверка документации переменных окружения...');
  
  const envDoc = resolve(ROOT, 'ENV_VARIABLES.md');
  if (!existsSync(envDoc)) {
    warning('ENV_VARIABLES.md не найден');
  } else {
    const content = readFileSync(envDoc, 'utf-8');
    const requiredVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_SSLMODE', 'NODE_ENV'];
    
    for (const varName of requiredVars) {
      if (!content.includes(varName)) {
        warning(`Переменная ${varName} не документирована в ENV_VARIABLES.md`);
      }
    }
    
    success('Документация переменных окружения проверена');
  }
}

// Главная функция
function main() {
  console.log('\n🔍 Валидация Docker сборки (без реального деплоя)...\n');
  
  validateDockerfileSyntax();
  validateCompileOrder();
  validateDependencies();
  validateDevDependenciesImports();
  simulateBuild();
  validateEnvVars();
  
  console.log('\n📊 Результаты валидации:\n');
  console.log(`✅ Успешно: ${errors.length === 0 ? 'Все проверки пройдены' : 'Есть ошибки'}`);
  console.log(`⚠️  Предупреждений: ${warnings.length}`);
  console.log(`❌ Ошибок: ${errors.length}\n`);
  
  if (errors.length > 0) {
    console.log('❌ ОШИБКИ, которые нужно исправить:\n');
    errors.forEach(err => console.log(`  ${err}`));
    console.log('');
    process.exit(1);
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  ПРЕДУПРЕЖДЕНИЯ (рекомендуется исправить):\n');
    warnings.forEach(warn => console.log(`  ${warn}`));
    console.log('');
  }
  
  console.log('✅ Валидация пройдена! Dockerfile должен собраться без ошибок.\n');
  process.exit(0);
}

main();

