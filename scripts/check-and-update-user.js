import { Pool } from 'pg';
import { select, update } from '@evershop/postgres-query-builder';

// Подключение к базе данных через переменные окружения Railway
const pool = new Pool({
  host: process.env.PGHOST || process.env.DB_HOST,
  port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432'),
  user: process.env.PGUSER || process.env.DB_USER || 'postgres',
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
  database: process.env.PGDATABASE || process.env.DB_NAME,
  ssl: (process.env.DB_SSLMODE || 'require') !== 'disable' ? {
    rejectUnauthorized: false
  } : false
});

const email = 'kostyakunak@gmail.com';

async function checkAndUpdateUser() {
  try {
    // Проверяем структуру таблицы
    const checkColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'admin_user'
      ORDER BY ordinal_position;
    `);
    
    console.log('Структура таблицы admin_user:');
    checkColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // Проверяем, есть ли поле roles
    const hasRoles = checkColumns.rows.some(col => col.column_name === 'roles');
    
    if (!hasRoles) {
      console.log('\n⚠ Поле "roles" отсутствует. Добавляю...');
      await pool.query(`
        ALTER TABLE admin_user 
        ADD COLUMN IF NOT EXISTS roles VARCHAR DEFAULT '*';
      `);
      console.log('✓ Поле "roles" добавлено');
    }

    // Ищем пользователя
    const user = await select()
      .from('admin_user')
      .where('email', '=', email)
      .load(pool);

    if (!user) {
      console.log(`\n❌ Пользователь с email ${email} не найден!`);
      process.exit(1);
    }

    console.log(`\n📋 Текущий статус пользователя ${email}:`);
    console.log(`   - ID: ${user.admin_user_id}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Имя: ${user.full_name || 'не указано'}`);
    console.log(`   - Status: ${user.status ? 'Активен' : 'Неактивен'}`);
    console.log(`   - Roles: ${user.roles || 'NULL (будет установлено в *)'}`);

    // Обновляем пользователя до супер-админа
    await update('admin_user')
      .given({
        status: true,
        roles: '*'
      })
      .where('email', '=', email)
      .execute(pool);

    console.log('\n✅ Пользователь обновлен:');
    console.log('   - Status: Активен (true)');
    console.log('   - Roles: * (супер-админ, все права)');

    // Проверяем результат
    const updatedUser = await select()
      .from('admin_user')
      .where('email', '=', email)
      .load(pool);

    console.log('\n📋 Финальный статус:');
    console.log(`   - Status: ${updatedUser.status ? '✓ Активен' : '✗ Неактивен'}`);
    console.log(`   - Roles: ${updatedUser.roles || 'NULL'}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkAndUpdateUser();

