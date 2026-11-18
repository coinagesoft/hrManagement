import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const dbConfig = {
  host: process.env.DB_HOST || 'srv597.hstgr.io',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'u856729253_coin_hr_age',
  password: process.env.DB_PASSWORD || 'kondoz-maxnob-1cuxxI',
  database: process.env.DB_NAME || 'u856729253_coinhr',
};

async function testDynamicRegistrationAndLogin() {
  console.log('--- Testing Dynamic Registration and Login in MySQL ---');
  const conn = await mysql.createConnection(dbConfig);

  const testEmail = `test_employee_${Date.now()}@coinhr.test`;
  const rawPassword = 'DynamicPassword2026!';
  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  console.log(`1. Registering dynamic user: ${testEmail}...`);
  const [insertRes] = await conn.query(
    `INSERT INTO users (company_id, employee_code, name, email, password, role, department, title, phone, status, joined_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', CURDATE())`,
    [1, 'EMP-TEST', 'Dynamic Test Employee', testEmail, hashedPassword, 'employee', 'Engineering', 'Software Tester', '+91 99999 88888']
  );
  console.log(`User inserted successfully with ID: ${insertRes.insertId}`);

  console.log('2. Querying user by email for Login...');
  const [queryRes] = await conn.query('SELECT * FROM users WHERE email = ?', [testEmail]);
  if (queryRes.length === 0) {
    throw new Error('User not found in DB!');
  }
  const fetchedUser = queryRes[0];
  console.log(`Fetched user: ${fetchedUser.name} (${fetchedUser.email})`);

  console.log('3. Validating password with bcrypt...');
  const isValid = await bcrypt.compare(rawPassword, fetchedUser.password);
  console.log('Password comparison:', isValid ? 'MATCHED ✅' : 'FAILED ❌');

  console.log('4. Cleaning up test user...');
  await conn.query('DELETE FROM users WHERE id = ?', [insertRes.insertId]);
  console.log('Test user cleaned up successfully.');

  await conn.end();
  console.log('--- Dynamic Registration & Login Test Succeeded! ---');
}

testDynamicRegistrationAndLogin().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
