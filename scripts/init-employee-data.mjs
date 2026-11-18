import mysql from 'mysql2/promise';

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
  });

  console.log('Seeding employee data...');

  // 1. Seed November attendance records for Rohan Patil (user_id = 4)
  const novRecords = [
    { date: '2026-11-02', in: '09:12:00', out: '18:15:00', mode: 'Office', status: 'Present' },
    { date: '2026-11-03', in: '09:05:00', out: '18:10:00', mode: 'Office', status: 'Present' },
    { date: '2026-11-04', in: '09:20:00', out: '18:30:00', mode: 'Office', status: 'Present' },
    { date: '2026-11-05', in: '09:42:00', out: '18:45:00', mode: 'Office', status: 'Late' },
    { date: '2026-11-06', in: '09:10:00', out: '18:05:00', mode: 'Office', status: 'Present' },
    { date: '2026-11-09', in: '09:15:00', out: '18:15:00', mode: 'Office', status: 'Present' },
    { date: '2026-11-10', in: '09:30:00', out: '18:00:00', mode: 'WFH', status: 'Present' },
    { date: '2026-11-11', in: '09:08:00', out: '18:20:00', mode: 'Office', status: 'Present' },
    { date: '2026-11-12', in: '09:14:00', out: '18:12:00', mode: 'Office', status: 'Present' },
    { date: '2026-11-13', in: null, out: null, mode: '-', status: 'On leave' },
    { date: '2026-11-16', in: '09:11:00', out: '18:18:00', mode: 'Office', status: 'Present' },
    { date: '2026-11-17', in: '09:25:00', out: '18:10:00', mode: 'Office', status: 'Present' },
  ];

  for (const r of novRecords) {
    await conn.query(`
      INSERT INTO attendance (company_id, user_id, date, check_in, check_out, mode, status, ip_address)
      VALUES (1, 4, ?, ?, ?, ?, ?, '203.0.113.24')
      ON DUPLICATE KEY UPDATE check_in = VALUES(check_in), check_out = VALUES(check_out), mode = VALUES(mode), status = VALUES(status)
    `, [r.date, r.in, r.out, r.mode, r.status]);
  }
  console.log('November attendance records seeded for Rohan Patil.');

  // 2. Seed leave requests for Rohan Patil (user_id = 4)
  await conn.query(`
    INSERT INTO leave_requests (company_id, user_id, leave_type, start_date, end_date, days_count, reason, status, decided_by, decided_at)
    VALUES 
    (1, 4, 'Casual', '2026-11-13', '2026-11-13', 1, 'Family wedding ceremony', 'Approved', 3, '2026-11-10 10:00:00'),
    (1, 4, 'Sick', '2026-10-14', '2026-10-15', 2, 'Viral fever recovery', 'Approved', 3, '2026-10-14 09:30:00'),
    (1, 4, 'Casual', '2026-11-27', '2026-11-27', 1, 'Personal errand', 'Pending', NULL, NULL)
  `);
  console.log('Leave requests seeded.');

  // 3. Seed October 2026 Paid Payroll Run and Items
  const [existingOctRun] = await conn.query("SELECT id FROM payroll_runs WHERE company_id = 1 AND month = 'October 2026'");
  if (existingOctRun.length === 0) {
    const [users] = await conn.query(`
      SELECT u.id, s.basic, s.hra, s.other, s.fixed
      FROM users u
      LEFT JOIN salary_structures s ON s.user_id = u.id AND s.company_id = u.company_id
      WHERE u.company_id = 1 AND u.status = 'Active' AND u.role != 'super'
    `);

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    const items = users.map(u => {
      const basic = Number(u.basic) || 40000;
      const hra = Number(u.hra) || 18000;
      const other = Number(u.other) || 12000;
      const fixed = Number(u.fixed) || 2000;
      const gross = basic + hra + other;
      const unpaidDays = 0;
      const unpaidDed = 0;
      const deductions = fixed;
      const net = gross - deductions;

      totalGross += gross;
      totalDeductions += deductions;
      totalNet += net;

      return { userId: u.id, basic, hra, other, gross, fixed, unpaidDays, unpaidDed, net };
    });

    const [runRes] = await conn.query(`
      INSERT INTO payroll_runs (company_id, month, status, total_gross, total_deductions, total_net, paid_on)
      VALUES (1, 'October 2026', 'Paid', ?, ?, ?, '2026-10-31')
    `, [totalGross, totalDeductions, totalNet]);

    for (const item of items) {
      await conn.query(`
        INSERT INTO payroll_items (payroll_run_id, user_id, basic, hra, other, gross, unpaid_days, unpaid_deduction, fixed_deduction, net, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Paid')
      `, [runRes.insertId, item.userId, item.basic, item.hra, item.other, item.gross, item.unpaidDays, item.unpaidDed, item.fixed, item.net]);
    }
    console.log('October 2026 Paid Payroll Run & Payslips seeded.');
  }

  // 4. Ensure document request exists for Rohan Patil (user_id = 4)
  await conn.query(`
    INSERT INTO documents (company_id, user_id, kind, requested_by, status, date, note)
    VALUES (1, 4, 'Degree certificate', 'hr', 'Requested', '2026-11-12', 'Please upload scanned copy of your B.Tech Degree certificate.')
  `);
  console.log('Document request for Rohan Patil seeded.');

  await conn.end();
  console.log('All employee seed data completed successfully!');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
