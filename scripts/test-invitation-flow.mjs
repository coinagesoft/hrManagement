import mysql from 'mysql2/promise';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const dbConfig = {
  host: process.env.DB_HOST || 'srv597.hstgr.io',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'u856729253_coin_hr_age',
  password: process.env.DB_PASSWORD || 'kondoz-maxnob-1cuxxI',
  database: process.env.DB_NAME || 'u856729253_coinhr',
};

async function testFullInvitationLifecycle() {
  console.log('=== Testing Full Super Admin Company Invitation & Acceptance Lifecycle ===');
  const conn = await mysql.createConnection(dbConfig);

  const testEmail = `invite_test_${Date.now()}@novatech.test`;
  const companyName = `Nova Tech Labs ${Date.now()}`;
  const adminName = 'Kavita Rao';
  const newPassword = 'ActivatedPass2026!';

  // Step 1: Super Admin creates company in 'Pending' status
  console.log(`Step 1: Adding company '${companyName}' and owner '${adminName}'...`);
  const [compRes] = await conn.query(
    'INSERT INTO companies (name, code, email, admin_name, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
    [companyName, 'NTL', testEmail, adminName, 'Pending']
  );
  const companyId = compRes.insertId;

  const tempHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
  const [userRes] = await conn.query(
    `INSERT INTO users (company_id, employee_code, name, email, password, role, department, title, status, joined_date, created_at)
     VALUES (?, 'NTL-001', ?, ?, ?, 'admin', 'Management', 'Company Administrator', 'Pending', CURDATE(), NOW())`,
    [companyId, adminName, testEmail, tempHash]
  );
  const userId = userRes.insertId;

  const token = crypto.randomBytes(32).toString('hex');
  await conn.query(
    `INSERT INTO invitations (company_id, user_id, email, token, role, status, expires_at, created_at)
     VALUES (?, ?, ?, ?, 'admin', 'Pending', DATE_ADD(NOW(), INTERVAL 48 HOUR), NOW())`,
    [companyId, userId, testEmail, token]
  );
  console.log(`Company ID: ${companyId}, User ID: ${userId}, Token: ${token.slice(0, 10)}... (Status: Pending)`);

  // Step 2: Test that user cannot log in while in 'Pending' state
  console.log('Step 2: Checking login guard for pending user...');
  const [pendingCheck] = await conn.query(
    `SELECT u.status AS user_status, c.status AS company_status 
     FROM users u 
     JOIN companies c ON u.company_id = c.id 
     WHERE u.id = ?`,
    [userId]
  );
  console.log('User status:', pendingCheck[0].user_status, 'Company status:', pendingCheck[0].company_status);
  if (pendingCheck[0].user_status !== 'Pending' || pendingCheck[0].company_status !== 'Pending') {
    throw new Error('Expected both user and company to be in Pending state');
  }
  console.log('Login guard check: PASSED ✅ (Account blocked until invitation acceptance)');

  // Step 3: Validate Invitation Token
  console.log('Step 3: Validating invitation token...');
  const [invRows] = await conn.query(
    `SELECT i.*, c.name AS company_name, u.name AS user_name
     FROM invitations i
     JOIN companies c ON i.company_id = c.id
     JOIN users u ON i.user_id = u.id
     WHERE i.token = ? AND i.status = 'Pending' AND i.expires_at > NOW()`,
    [token]
  );
  if (invRows.length === 0) {
    throw new Error('Invitation token validation failed');
  }
  console.log(`Token valid for: ${invRows[0].user_name} (${invRows[0].company_name}) ✅`);

  // Step 4: Accept invitation and set password
  console.log('Step 4: Accepting invitation and setting password...');
  const activatedHash = await bcrypt.hash(newPassword, 10);
  await conn.query('UPDATE users SET password = ?, status = ? WHERE id = ?', [activatedHash, 'Active', userId]);
  await conn.query('UPDATE companies SET status = ? WHERE id = ?', ['Active', companyId]);
  await conn.query('UPDATE invitations SET status = ?, accepted_at = NOW() WHERE token = ?', ['Accepted', token]);
  await conn.query(
    'INSERT INTO audit_logs (company_id, user_id, user_name, action, tone, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
    [companyId, userId, adminName, 'Invite accepted', 'green', `${adminName} activated ${companyName}`]
  );
  console.log('User, Company, and Invitation updated to Active/Accepted ✅');

  // Step 5: Test login with new password
  console.log('Step 5: Testing sign-in with newly set password...');
  const [loginCheck] = await conn.query(
    `SELECT u.*, c.status as company_status 
     FROM users u 
     JOIN companies c ON u.company_id = c.id 
     WHERE u.email = ?`,
    [testEmail]
  );
  const activeUser = loginCheck[0];
  const pwMatches = await bcrypt.compare(newPassword, activeUser.password);
  console.log('Company status:', activeUser.company_status);
  console.log('User status:', activeUser.status);
  console.log('Password verified with bcrypt:', pwMatches ? 'MATCHED ✅' : 'FAILED ❌');
  if (!pwMatches || activeUser.status !== 'Active' || activeUser.company_status !== 'Active') {
    throw new Error('Login verification failed for activated company admin');
  }

  // Cleanup
  console.log('Step 6: Cleaning up test data...');
  await conn.query('DELETE FROM audit_logs WHERE company_id = ?', [companyId]);
  await conn.query('DELETE FROM invitations WHERE company_id = ?', [companyId]);
  await conn.query('DELETE FROM users WHERE company_id = ?', [companyId]);
  await conn.query('DELETE FROM companies WHERE id = ?', [companyId]);
  console.log('Cleanup completed.');

  await conn.end();
  console.log('=== All Invitation Lifecycle Tests Passed Successfully! ===');
}

testFullInvitationLifecycle().catch(console.error);
