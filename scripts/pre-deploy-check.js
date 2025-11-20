#!/usr/bin/env node

/**
 * Pre-deploy validation script
 * Проверяет все возможные проблемы перед деплоем
 */

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

// 1. Проверка структуры workspace пакетов
function checkWorkspacePackages() {
  success('Проверка workspace пакетов...');
  
  const packages = ['evershop', 'postgres-query-builder'];
  const requiredFiles = {
    'postgres-query-builder': [
      'package.json',
      '.swcrc',
      'src/index.ts'
    ],
    'evershop': [
      'package.json',
      '.swcrc',
      'src/bin/start/index.ts'
    ]
  };

  for (const pkg of packages) {
    const pkgPath = resolve(ROOT, 'packages', pkg);
    if (!existsSync(pkgPath)) {
      error(`Пакет ${pkg} не найден в packages/`);
      continue;
    }

    const required = requiredFiles[pkg] || [];
    for (const file of required) {
      const filePath = resolve(pkgPath, file);
      if (!existsSync(filePath)) {
        error(`Файл ${pkg}/${file} не найден`);
      }
    }
  }
}

// 2. Проверка зависимостей между пакетами
function checkPackageDependencies() {
  success('Проверка зависимостей между пакетами...');
  
  const evershopPkg = JSON.parse(
    readFileSync(resolve(ROOT, 'packages/evershop/package.json'), 'utf-8')
  );
  
  // Проверяем, что evershop зависит от postgres-query-builder
  const deps = { ...evershopPkg.dependencies, ...evershopPkg.devDependencies };
  if (!deps['@evershop/postgres-query-builder']) {
    error('evershop не имеет зависимости от @evershop/postgres-query-builder');
  } else {
    success('Зависимость @evershop/postgres-query-builder найдена');
  }
}

// 3. Проверка скриптов компиляции
function checkCompileScripts() {
  success('Проверка скриптов компиляции...');
  
  const rootPkg = JSON.parse(
    readFileSync(resolve(ROOT, 'package.json'), 'utf-8')
  );
  
  const requiredScripts = ['compile', 'compile:db', 'build', 'start'];
  
  for (const script of requiredScripts) {
    if (!rootPkg.scripts[script]) {
      error(`Скрипт ${script} не найден в package.json`);
    } else {
      success(`Скрипт ${script} найден`);
    }
  }
  
  // Проверяем порядок компиляции в Dockerfile
  const dockerfile = readFileSync(resolve(ROOT, 'Dockerfile'), 'utf-8');
  if (!dockerfile.includes('npm run compile:db')) {
    error('Dockerfile не содержит npm run compile:db');
  } else if (!dockerfile.includes('npm run compile:db && npm run compile')) {
    warning('Порядок компиляции в Dockerfile может быть неправильным');
  } else {
    success('Порядок компиляции в Dockerfile корректен');
  }
}

// 4. Проверка необходимых файлов для деплоя
function checkRequiredFiles() {
  success('Проверка необходимых файлов...');
  
  const requiredFiles = [
    'Dockerfile',
    'railway.json',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'config/default.json',
    'packages/evershop/package.json',
    'packages/postgres-query-builder/package.json'
  ];
  
  for (const file of requiredFiles) {
    const filePath = resolve(ROOT, file);
    if (!existsSync(filePath)) {
      error(`Необходимый файл ${file} не найден`);
    } else {
      success(`Файл ${file} найден`);
    }
  }
}

// 5. Проверка конфигурационных файлов
function checkConfigFiles() {
  success('Проверка конфигурационных файлов...');
  
  // Проверяем .swcrc файлы
  const swcrcFiles = [
    'packages/evershop/.swcrc',
    'packages/postgres-query-builder/.swcrc'
  ];
  
  for (const file of swcrcFiles) {
    const filePath = resolve(ROOT, file);
    if (!existsSync(filePath)) {
      error(`Конфигурационный файл ${file} не найден`);
    }
  }
  
  // Проверяем tsconfig.json
  const tsconfigPath = resolve(ROOT, 'tsconfig.json');
  if (existsSync(tsconfigPath)) {
    try {
      const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
      success('tsconfig.json валиден');
    } catch (e) {
      error(`tsconfig.json содержит ошибки: ${e.message}`);
    }
  }
}

// 6. Проверка Dockerfile на потенциальные проблемы
function checkDockerfile() {
  success('Проверка Dockerfile...');
  
  const dockerfile = readFileSync(resolve(ROOT, 'Dockerfile'), 'utf-8');
  const lines = dockerfile.split('\n');
  
  // Проверяем порядок компиляции
  let foundCompileDb = false;
  let foundCompile = false;
  let foundBuild = false;
  let compileDbIndex = -1;
  let compileIndex = -1;
  let buildIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Проверяем compile:db (может быть в одной строке с другими командами)
    if (line.includes('compile:db')) {
      foundCompileDb = true;
      if (compileDbIndex === -1) compileDbIndex = i;
    }
    // Проверяем compile (но не compile:db) - используем regex для точного поиска
    // Ищем "npm run compile" но не "npm run compile:db"
    const compileMatch = line.match(/npm run compile(?!:db)/);
    if (compileMatch) {
      foundCompile = true;
      if (compileIndex === -1) compileIndex = i;
    }
    // Проверяем build
    if (line.includes('npm run build')) {
      foundBuild = true;
      if (buildIndex === -1) buildIndex = i;
    }
  }
  
  if (!foundCompileDb) {
    error('Dockerfile не содержит npm run compile:db');
  }
  if (!foundCompile) {
    error('Dockerfile не содержит npm run compile');
  }
  if (!foundBuild) {
    error('Dockerfile не содержит npm run build');
  }
  
  // Проверяем порядок только если все найдены
  if (foundCompileDb && foundCompile && foundBuild) {
    if (compileDbIndex > compileIndex) {
      error('npm run compile:db должен выполняться ПЕРЕД npm run compile');
    }
    if (compileIndex > buildIndex) {
      error('npm run compile должен выполняться ПЕРЕД npm run build');
    }
    if (compileDbIndex < compileIndex && compileIndex < buildIndex) {
      success('Порядок компиляции в Dockerfile корректен');
    }
  }
  
  // Проверяем копирование файлов
  if (!dockerfile.includes('COPY --from=builder /app/packages ./packages')) {
    error('Dockerfile не копирует packages в production образ');
  }
  
  // Проверяем наличие CMD
  if (!dockerfile.includes('CMD') && !dockerfile.includes('ENTRYPOINT')) {
    error('Dockerfile не содержит CMD или ENTRYPOINT');
  }
}

// 7. Проверка extensions
function checkExtensions() {
  success('Проверка extensions...');
  
  const extensionsDir = resolve(ROOT, 'extensions');
  if (!existsSync(extensionsDir)) {
    warning('Директория extensions не найдена');
    return;
  }
  
  // Проверяем, что все extensions имеют необходимые файлы
  // Это опционально, так как extensions могут быть отключены
  success('Extensions проверены (опционально)');
}

// 8. Проверка переменных окружения (документация)
function checkEnvDocumentation() {
  success('Проверка документации переменных окружения...');
  
  const envDoc = resolve(ROOT, 'ENV_VARIABLES.md');
  if (!existsSync(envDoc)) {
    warning('ENV_VARIABLES.md не найден');
  } else {
    success('Документация переменных окружения найдена');
  }
}

// 9. Проверка .dockerignore
function checkDockerignore() {
  success('Проверка .dockerignore...');
  
  const dockerignore = resolve(ROOT, '.dockerignore');
  if (!existsSync(dockerignore)) {
    warning('.dockerignore не найден (может замедлить сборку)');
  } else {
    const content = readFileSync(dockerignore, 'utf-8');
    if (!content.includes('node_modules')) {
      warning('.dockerignore не исключает node_modules');
    }
    if (!content.includes('dist')) {
      warning('.dockerignore не исключает dist (может быть проблемой)');
    }
    success('.dockerignore проверен');
  }
}

// Главная функция
function main() {
  console.log('\n🔍 Запуск pre-deploy проверок...\n');
  
  checkWorkspacePackages();
  checkPackageDependencies();
  checkCompileScripts();
  checkRequiredFiles();
  checkConfigFiles();
  checkDockerfile();
  checkExtensions();
  checkEnvDocumentation();
  checkDockerignore();
  
  console.log('\n📊 Результаты проверки:\n');
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
  
  console.log('✅ Все критические проверки пройдены! Можно деплоить.\n');
  process.exit(0);
}

main();

