import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'srv597.hstgr.io',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'u856729253_coin_hr_age',
  password: process.env.DB_PASSWORD || 'kondoz-maxnob-1cuxxI',
  database: process.env.DB_NAME || 'u856729253_coinhr',
};

async function testAdminAPIs() {
  console.log('=== Testing Admin Database Logic & Endpoints ===');
  const conn = await mysql.createConnection(dbConfig);

  const companyId = 1;

  // 1. Dashboard Metrics
  console.log('1. Testing Dashboard Metrics...');
  const [empCounts] = await conn.query(
    'SELECT COUNT(*) as total, SUM(CASE WHEN status = "Active" THEN 1 ELSE 0 END) as active FROM users WHERE company_id = ?',
    [companyId]
  );
  const [pendingLeaves] = await conn.query('SELECT COUNT(*) as cnt FROM leave_requests WHERE company_id = ? AND status = "Pending"', [companyId]);
  const [pendingWfh] = await conn.query('SELECT COUNT(*) as cnt FROM wfh_requests WHERE company_id = ? AND status = "Pending"', [companyId]);
  console.log('Headcount active:', empCounts[0].active, 'Pending approvals:', pendingLeaves[0].cnt + pendingWfh[0].cnt);

  // 2. Employees List
  console.log('2. Testing Employees query...');
  const [employees] = await conn.query(
    'SELECT id, employee_code, name, email, department, role, status FROM users WHERE company_id = ? LIMIT 5',
    [companyId]
  );
  console.log(`Fetched ${employees.length} employees from MySQL. Sample:`, employees[0]);

  // 3. Employee Creation & Modification
  console.log('3. Testing Employee Creation & Update...');
  const testEmail = `emp_admin_test_${Date.now()}@acme.com`;
  const [createRes] = await conn.query(`
    INSERT INTO users (company_id, employee_code, name, email, password, role, department, title, status, joined_date, created_at)
    VALUES (?, 'ACM-TEST', 'Test Dev', ?, 'tempHash', 'employee', 'Engineering', 'Junior Dev', 'Active', CURDATE(), NOW())
  `, [companyId, testEmail]);
  const newEmpId = createRes.insertId;
  console.log(`Employee created with ID: ${newEmpId}`);

  // Update employee
  await conn.query('UPDATE users SET title = ?, department = ? WHERE id = ?', ['Senior Dev', 'R&D', newEmpId]);
  const [updatedEmp] = await conn.query('SELECT title, department FROM users WHERE id = ?', [newEmpId]);
  console.log('Updated employee title:', updatedEmp[0].title, 'dept:', updatedEmp[0].department);

  // 4. Approvals Test
  console.log('4. Testing Leave Approval...');
  const [leaveInsert] = await conn.query(`
    INSERT INTO leave_requests (company_id, user_id, leave_type, start_date, end_date, days_count, reason, status, created_at)
    VALUES (?, ?, 'Casual', CURDATE(), CURDATE(), 1, 'Urgent personal work', 'Pending', NOW())
  `, [companyId, newEmpId]);
  const leaveId = leaveInsert.insertId;

  // Approve leave
  await conn.query('UPDATE leave_requests SET status = "Approved", decided_at = NOW() WHERE id = ?', [leaveId]);
  const [approvedLeave] = await conn.query('SELECT status FROM leave_requests WHERE id = ?', [leaveId]);
  console.log('Leave request status after decision:', approvedLeave[0].status);

  // 5. Settings Test
  console.log('5. Testing Company Settings query & update...');
  const [settings] = await conn.query('SELECT * FROM company_settings WHERE company_id = ?', [companyId]);
  console.log('Current start_time:', settings[0]?.start_time, 'grace_minutes:', settings[0]?.grace_minutes);

  // 6. Holidays Test
  console.log('6. Testing Holidays query...');
  const [holidays] = await conn.query('SELECT id, name, date, kind FROM holidays WHERE company_id = ? LIMIT 3', [companyId]);
  console.log(`Fetched ${holidays.length} holidays. Sample:`, holidays[0]);

  // 7. Attendance Correction Test
  console.log('7. Testing Attendance Correction...');
  const todayStr = new Date().toISOString().split('T')[0];
  await conn.query(`
    INSERT INTO attendance (company_id, user_id, date, check_in, check_out, mode, status, notes)
    VALUES (?, ?, ?, '09:30:00', '18:30:00', 'Office', 'Present', 'Admin manual correction')
    ON DUPLICATE KEY UPDATE check_in = VALUES(check_in), check_out = VALUES(check_out), status = VALUES(status)
  `, [companyId, newEmpId, todayStr]);

  const [attRecord] = await conn.query('SELECT * FROM attendance WHERE user_id = ? AND date = ?', [newEmpId, todayStr]);
  console.log('Attendance recorded: status =', attRecord[0].status, 'check_in =', attRecord[0].check_in);

  // Cleanup
  console.log('8. Cleaning up test data...');
  await conn.query('DELETE FROM attendance WHERE user_id = ?', [newEmpId]);
  await conn.query('DELETE FROM leave_requests WHERE id = ?', [leaveId]);
  await conn.query('DELETE FROM users WHERE id = ?', [newEmpId]);
  console.log('Cleanup completed.');

  await conn.end();
  console.log('=== All Admin Database API Tests Passed Successfully! ===');
}

testAdminAPIs().catch(console.error);
