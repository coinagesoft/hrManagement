import mysql from 'mysql2/promise';

async function init() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
  });

  console.log('Connected to MySQL. Creating tables...');

  // 1. salary_structures
  await conn.query(`
    CREATE TABLE IF NOT EXISTS salary_structures (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      user_id INT NOT NULL,
      basic DECIMAL(10,2) NOT NULL DEFAULT 35000.00,
      hra DECIMAL(10,2) NOT NULL DEFAULT 15000.00,
      other DECIMAL(10,2) NOT NULL DEFAULT 10000.00,
      fixed DECIMAL(10,2) NOT NULL DEFAULT 2000.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_comp_user_salary (company_id, user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('salary_structures table ready.');

  // 2. payroll_runs
  await conn.query(`
    CREATE TABLE IF NOT EXISTS payroll_runs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      month VARCHAR(50) NOT NULL,
      status ENUM('Draft', 'Finalised', 'Paid') NOT NULL DEFAULT 'Draft',
      total_gross DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      total_deductions DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      total_net DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      paid_on DATE NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_comp_month (company_id, month)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('payroll_runs table ready.');

  // 3. payroll_items
  await conn.query(`
    CREATE TABLE IF NOT EXISTS payroll_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      payroll_run_id INT NOT NULL,
      user_id INT NOT NULL,
      basic DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      hra DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      other DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      gross DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      unpaid_days INT NOT NULL DEFAULT 0,
      unpaid_deduction DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      fixed_deduction DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      net DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      status ENUM('Draft', 'Finalised', 'Paid') NOT NULL DEFAULT 'Draft',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_run (payroll_run_id),
      INDEX idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('payroll_items table ready.');

  // 4. leave_policies
  await conn.query(`
    CREATE TABLE IF NOT EXISTS leave_policies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL UNIQUE,
      casual_per_month DECIMAL(4,1) NOT NULL DEFAULT 1.0,
      sick_per_month DECIMAL(4,1) NOT NULL DEFAULT 1.0,
      paid_per_year INT NOT NULL DEFAULT 12,
      working_days_per_month INT NOT NULL DEFAULT 22,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('leave_policies table ready.');

  // 5. documents
  await conn.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      user_id INT NOT NULL,
      kind VARCHAR(100) NOT NULL,
      requested_by ENUM('admin', 'hr', 'employee') NOT NULL DEFAULT 'hr',
      status ENUM('Requested', 'Pending', 'Received', 'Issued', 'Rejected') NOT NULL DEFAULT 'Requested',
      date DATE NOT NULL,
      note TEXT NULL,
      file_name VARCHAR(255) NULL,
      file_url LONGTEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_comp_user (company_id, user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('documents table ready.');

  // 6. messages
  await conn.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      thread_id VARCHAR(100) NOT NULL,
      sender_id INT NOT NULL,
      sender_role VARCHAR(20) NOT NULL,
      text TEXT NOT NULL,
      is_note BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_comp_thread (company_id, thread_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('messages table ready.');

  // Now seed initial records for company 1 (Acme Technologies)
  const [users] = await conn.query('SELECT id, employee_code, name, department, title, role FROM users WHERE company_id = 1');
  console.log(`Found ${users.length} users for company 1.`);

  // Seed default salary structures if not exist
  for (const u of users) {
    let basic = 40000;
    let hra = 18000;
    let other = 12000;
    let fixed = 2000;

    if (u.role === 'admin') {
      basic = 90000; hra = 40000; other = 30000; fixed = 5000;
    } else if (u.role === 'hr') {
      basic = 50000; hra = 22000; other = 15000; fixed = 3000;
    } else if (u.department === 'Engineering') {
      basic = 60000; hra = 25000; other = 15000; fixed = 2500;
    }

    await conn.query(`
      INSERT INTO salary_structures (company_id, user_id, basic, hra, other, fixed)
      VALUES (1, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE basic = VALUES(basic), hra = VALUES(hra), other = VALUES(other), fixed = VALUES(fixed)
    `, [u.id, basic, hra, other, fixed]);
  }
  console.log('salary_structures seeded.');

  // Seed default leave policy
  await conn.query(`
    INSERT INTO leave_policies (company_id, casual_per_month, sick_per_month, paid_per_year, working_days_per_month)
    VALUES (1, 1.0, 1.0, 12, 22)
    ON DUPLICATE KEY UPDATE company_id = company_id
  `);
  console.log('leave_policies seeded.');

  // Seed initial documents
  const sampleDocs = [
    { user_id: 3, kind: 'Identity proof', requested_by: 'hr', status: 'Received', date: '2026-11-01', note: 'Aadhaar / Passport', file_name: 'priya_aadhaar.pdf' },
    { user_id: 2, kind: 'Address proof', requested_by: 'admin', status: 'Received', date: '2026-11-02', note: 'Utility bill or rent agreement', file_name: 'aarav_rent_agreement.pdf' },
  ];
  if (users.length > 3) {
    sampleDocs.push(
      { user_id: users[3].id, kind: 'Experience letter', requested_by: 'employee', status: 'Pending', date: '2026-11-10', note: 'Required for bank loan verification', file_name: null },
      { user_id: users[3].id, kind: 'Degree certificate', requested_by: 'hr', status: 'Requested', date: '2026-11-12', note: 'Graduation convocation certificate', file_name: null }
    );
  }

  const [existingDocs] = await conn.query('SELECT COUNT(*) AS c FROM documents WHERE company_id = 1');
  if (existingDocs[0].c === 0) {
    for (const d of sampleDocs) {
      await conn.query(`
        INSERT INTO documents (company_id, user_id, kind, requested_by, status, date, note, file_name)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?)
      `, [d.user_id, d.kind, d.requested_by, d.status, d.date, d.note, d.file_name]);
    }
    console.log('documents seeded.');
  }

  // Seed initial messages
  const [existingMsgs] = await conn.query('SELECT COUNT(*) AS c FROM messages WHERE company_id = 1');
  if (existingMsgs[0].c === 0) {
    const threadId = 'emp_3:admin'; // Priya & Aarav
    await conn.query(`
      INSERT INTO messages (company_id, thread_id, sender_id, sender_role, text, is_note, created_at)
      VALUES 
      (1, ?, 3, 'hr', 'Hi Aarav, November payroll preparations are in draft status.', FALSE, '2026-11-17 10:00:00'),
      (1, ?, 2, 'admin', 'Thanks Priya! Please review unpaid leave days before finalising.', FALSE, '2026-11-17 10:15:00'),
      (1, ?, 3, 'hr', 'Reviewing leave requests from engineering team now.', FALSE, '2026-11-17 10:20:00')
    `, [threadId, threadId, threadId]);
    console.log('messages seeded.');
  }

  await conn.end();
  console.log('All HR database tables and seed data created successfully!');
}

init().catch(err => {
  console.error('Error initializing HR tables:', err);
  process.exit(1);
});
