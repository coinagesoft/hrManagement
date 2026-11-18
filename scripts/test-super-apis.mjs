import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'srv597.hstgr.io',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'u856729253_coin_hr_age',
  password: process.env.DB_PASSWORD || 'kondoz-maxnob-1cuxxI',
  database: process.env.DB_NAME || 'u856729253_coinhr',
};

async function testSuperAdminAPIs() {
  console.log('=== Testing Super Admin Database Logic & Endpoints ===');
  const conn = await mysql.createConnection(dbConfig);

  // 1. Stats query
  console.log('1. Testing Stats query...');
  const [compCounts] = await conn.query(`
    SELECT 
      COUNT(*) AS total_companies,
      COALESCE(SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END), 0) AS active_companies,
      COALESCE(SUM(CASE WHEN status = 'Suspended' THEN 1 ELSE 0 END), 0) AS suspended_companies
    FROM companies
  `);
  console.log('Platform counts:', compCounts[0]);

  // 2. Companies list with user count
  console.log('2. Testing Companies List query...');
  const [companies] = await conn.query(`
    SELECT c.id, c.name, c.admin_name, c.status, COUNT(u.id) AS users
    FROM companies c
    LEFT JOIN users u ON u.company_id = c.id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `);
  console.log(`Fetched ${companies.length} companies from MySQL. Sample:`, companies[0]);

  // 3. Create Company & Admin
  console.log('3. Testing Company Creation...');
  const testCompName = `Super Test Inc ${Date.now()}`;
  const [createRes] = await conn.query(
    'INSERT INTO companies (name, code, email, admin_name, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
    [testCompName, 'STI', 'admin@supertest.com', 'Alex Founder', 'Active']
  );
  const testId = createRes.insertId;
  console.log(`Company created with ID: ${testId}`);

  // 4. Suspend Company
  console.log('4. Testing Company Status Toggle (Suspension)...');
  await conn.query('UPDATE companies SET status = ? WHERE id = ?', ['Suspended', testId]);
  const [checkSuspended] = await conn.query('SELECT status FROM companies WHERE id = ?', [testId]);
  console.log('Company status updated to:', checkSuspended[0].status);

  // 5. Test Audit Log insertion and retrieval
  console.log('5. Testing Audit Log insertion...');
  await conn.query(
    'INSERT INTO audit_logs (company_id, user_name, action, tone, detail, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
    [testId, 'Platform Owner', 'Company suspended', 'rose', `${testCompName} paused`]
  );
  const [logs] = await conn.query('SELECT id, user_name, action, detail FROM audit_logs ORDER BY created_at DESC LIMIT 3');
  console.log('Recent audit logs count:', logs.length, 'Latest action:', logs[0].action);

  // 6. Test User retrieval across platform
  console.log('6. Testing Users across platform query...');
  const [allUsers] = await conn.query(`
    SELECT u.id, u.name, u.email, u.role, c.name as company_name
    FROM users u
    LEFT JOIN companies c ON u.company_id = c.id
    LIMIT 5
  `);
  console.log(`Retrieved ${allUsers.length} platform users. Sample:`, allUsers[0]);

  // Cleanup
  console.log('7. Cleaning up test company and audit record...');
  await conn.query('DELETE FROM audit_logs WHERE company_id = ?', [testId]);
  await conn.query('DELETE FROM companies WHERE id = ?', [testId]);
  console.log('Cleanup completed.');

  await conn.end();
  console.log('=== All Super Admin Tests Passed Successfully! ===');
}

testSuperAdminAPIs().catch(console.error);
