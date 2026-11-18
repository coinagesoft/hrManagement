import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const dbConfig = {
  host: process.env.DB_HOST || 'srv597.hstgr.io',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'u856729253_coin_hr_age',
  password: process.env.DB_PASSWORD || 'kondoz-maxnob-1cuxxI',
  database: process.env.DB_NAME || 'u856729253_coinhr',
};

const JWT_SECRET = new TextEncoder().encode('coinhr_super_secret_jwt_key_2026_x87!');

async function runAuthTests() {
  console.log('--- Testing Database and Auth End-to-End ---');
  const conn = await mysql.createConnection(dbConfig);

  // 1. Check existing users
  const [users] = await conn.query('SELECT id, name, email, role, password FROM users LIMIT 3');
  console.log(`Found ${users.length} users in DB.`);

  // 2. Test Login verification for seeded user
  const testUser = users.find((u) => u.email === 'aarav@acme.com');
  if (testUser) {
    const isPwCorrect = await bcrypt.compare('Password123!', testUser.password);
    console.log('Login verification for aarav@acme.com with Password123!:', isPwCorrect ? 'PASSED ✅' : 'FAILED ❌');
    
    const isWrongPwRejected = !(await bcrypt.compare('WrongPassword', testUser.password));
    console.log('Rejecting wrong password:', isWrongPwRejected ? 'PASSED ✅' : 'FAILED ❌');
  }

  // 3. Test JWT signing and verification
  const token = await new SignJWT({
    id: 999,
    email: 'test@example.com',
    role: 'admin',
    name: 'Test User'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(JWT_SECRET);

  const { payload } = await jwtVerify(token, JWT_SECRET);
  console.log('JWT Sign & Verify:', payload.email === 'test@example.com' ? 'PASSED ✅' : 'FAILED ❌');

  await conn.end();
  console.log('--- All DB and Auth Logic Checks Completed ---');
}

runAuthTests().catch(console.error);
