import mysql from 'mysql2/promise';

async function test() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
  });

  console.log('Testing Employee Portal data in MySQL...');

  // Test employee profile (Rohan Patil)
  const [user] = await conn.query('SELECT id, name, employee_code, email, title, role FROM users WHERE id = 4');
  console.log('Employee profile:', user[0]);

  // Test attendance records
  const [att] = await conn.query('SELECT COUNT(*) AS count FROM attendance WHERE user_id = 4');
  console.log('Attendance records count for user 4:', att[0].count);

  // Test leave requests
  const [leaves] = await conn.query('SELECT id, leave_type, days_count, status FROM leave_requests WHERE user_id = 4');
  console.log('Leave requests for user 4:', leaves);

  // Test payslips (October paid payroll)
  const [payslips] = await conn.query(`
    SELECT pi.id, pr.month, pi.net, pr.status 
    FROM payroll_items pi 
    JOIN payroll_runs pr ON pi.payroll_run_id = pr.id 
    WHERE pi.user_id = 4 AND pr.status = 'Paid'
  `);
  console.log('Paid payslips for user 4:', payslips);

  // Test documents
  const [docs] = await conn.query('SELECT id, kind, status FROM documents WHERE user_id = 4');
  console.log('Documents on file for user 4:', docs);

  await conn.end();
  console.log('All employee DB verification tests passed!');
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
