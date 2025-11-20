#!/usr/bin/env node

/**
 * Анализ зависимостей между пакетами
 * Определяет правильный порядок компиляции
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

function analyzeDependencies() {
  console.log('🔍 Анализ зависимостей между workspace пакетами...\n');
  
  const packages = {};
  const packageDirs = ['evershop', 'postgres-query-builder'];
  
  // Загружаем все package.json
  for (const pkgName of packageDirs) {
    const pkgPath = resolve(ROOT, 'packages', pkgName, 'package.json');
    if (existsSync(pkgPath)) {
      packages[pkgName] = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    }
  }
  
  // Анализируем зависимости
  const dependencies = {};
  
  for (const [pkgName, pkg] of Object.entries(packages)) {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const workspaceDeps = [];
    
    for (const [depName, depVersion] of Object.entries(deps)) {
      if (depName.startsWith('@evershop/')) {
        workspaceDeps.push(depName);
      }
    }
    
    if (workspaceDeps.length > 0) {
      dependencies[pkgName] = workspaceDeps;
      console.log(`📦 ${pkgName} зависит от:`);
      workspaceDeps.forEach(dep => console.log(`   - ${dep}`));
      console.log('');
    }
  }
  
  // Определяем порядок компиляции (топологическая сортировка)
  console.log('📋 Рекомендуемый порядок компиляции:\n');
  
  const compiled = new Set();
  const order = [];
  
  function compilePackage(pkgName) {
    if (compiled.has(pkgName)) return;
    
    const deps = dependencies[pkgName] || [];
    for (const dep of deps) {
      const depPkgName = dep.replace('@evershop/', '');
      if (packageDirs.includes(depPkgName) && !compiled.has(depPkgName)) {
        compilePackage(depPkgName);
      }
    }
    
    compiled.add(pkgName);
    order.push(pkgName);
  }
  
  for (const pkgName of packageDirs) {
    compilePackage(pkgName);
  }
  
  console.log('Порядок компиляции:');
  order.forEach((pkg, index) => {
    console.log(`  ${index + 1}. ${pkg}`);
  });
  
  console.log('\n✅ Анализ завершен\n');
  
  // Проверяем, соответствует ли Dockerfile этому порядку
  const dockerfile = readFileSync(resolve(ROOT, 'Dockerfile'), 'utf-8');
  console.log('🔍 Проверка соответствия Dockerfile:\n');
  
  if (order.includes('postgres-query-builder') && order.includes('evershop')) {
    const postgresIndex = order.indexOf('postgres-query-builder');
    const evershopIndex = order.indexOf('evershop');
    
    if (postgresIndex < evershopIndex) {
      // Ищем строку с компиляцией
      const compileLine = dockerfile.match(/RUN.*compile.*build/);
      if (compileLine) {
        const line = compileLine[0];
        const compileDbPos = line.indexOf('compile:db');
        const compilePos = line.search(/npm run compile(?!:db)/);
        
        if (compileDbPos !== -1 && compilePos !== -1 && compileDbPos < compilePos) {
          console.log('✅ Dockerfile соответствует правильному порядку компиляции');
        } else {
          console.log('❌ Dockerfile НЕ соответствует правильному порядку компиляции');
          console.log('   postgres-query-builder должен компилироваться ПЕРЕД evershop');
        }
      } else {
        console.log('⚠️  Не удалось найти строку компиляции в Dockerfile');
      }
    }
  }
}

analyzeDependencies();

