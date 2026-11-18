import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const dbConfig = {
  host: process.env.DB_HOST || 'srv597.hstgr.io',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'u856729253_coin_hr_age',
  password: process.env.DB_PASSWORD || 'kondoz-maxnob-1cuxxI',
  database: process.env.DB_NAME || 'u856729253_coinhr',
};

async function initAdminSchema() {
  console.log('Connecting to MySQL database...');
  const conn = await mysql.createConnection(dbConfig);
  console.log('Connected!');

  // 1. Attendance table
  console.log('Creating attendance table...');
  await conn.query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      user_id INT NOT NULL,
      date DATE NOT NULL,
      check_in TIME NULL,
      check_out TIME NULL,
      mode ENUM('Office', 'WFH', '-') DEFAULT 'Office',
      status ENUM('Present', 'Late', 'On leave', 'Absent', 'Weekend', 'Holiday') DEFAULT 'Present',
      ip_address VARCHAR(50) NULL,
      notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_date (user_id, date),
      INDEX idx_comp_date (company_id, date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. Leave Requests table
  console.log('Creating leave_requests table...');
  await conn.query(`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      user_id INT NOT NULL,
      leave_type VARCHAR(50) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      days_count INT NOT NULL DEFAULT 1,
      reason TEXT NOT NULL,
      status ENUM('Pending', 'Approved', 'Rejected', 'Cancelled') DEFAULT 'Pending',
      decided_by INT NULL,
      decided_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_comp_status (company_id, status),
      INDEX idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. WFH Requests table
  console.log('Creating wfh_requests table...');
  await conn.query(`
    CREATE TABLE IF NOT EXISTS wfh_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      user_id INT NOT NULL,
      date DATE NOT NULL,
      reason TEXT NOT NULL,
      status ENUM('Pending', 'Approved', 'Rejected', 'Cancelled') DEFAULT 'Pending',
      decided_by INT NULL,
      decided_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_comp_status (company_id, status),
      INDEX idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 4. Holidays table
  console.log('Creating holidays table...');
  await conn.query(`
    CREATE TABLE IF NOT EXISTS holidays (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NULL,
      name VARCHAR(255) NOT NULL,
      date DATE NOT NULL,
      kind ENUM('Public', 'Company') DEFAULT 'Company',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_comp_date (company_id, date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 5. Company Settings table
  console.log('Creating company_settings table...');
  await conn.query(`
    CREATE TABLE IF NOT EXISTS company_settings (
      company_id INT PRIMARY KEY,
      start_time TIME DEFAULT '09:30:00',
      end_time TIME DEFAULT '18:30:00',
      grace_minutes INT DEFAULT 15,
      half_day_hours INT DEFAULT 4,
      working_days VARCHAR(50) DEFAULT '1,2,3,4,5',
      wfh_limit_monthly INT DEFAULT 4,
      allow_same_day_wfh BOOLEAN DEFAULT TRUE,
      enforce_office_ip BOOLEAN DEFAULT TRUE,
      allowed_ips TEXT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Ensure Company 1 exists
  const [companies] = await conn.query('SELECT id, name FROM companies LIMIT 1');
  if (companies.length === 0) {
    console.log('No company found to seed.');
    await conn.end();
    return;
  }
  const companyId = companies[0].id;
  console.log(`Seeding sample data for company (ID: ${companyId}, Name: ${companies[0].name})...`);

  // Seed company settings
  await conn.query(`
    INSERT INTO company_settings (company_id, start_time, end_time, grace_minutes, half_day_hours, working_days, wfh_limit_monthly, allow_same_day_wfh, enforce_office_ip, allowed_ips)
    VALUES (?, '09:30:00', '18:30:00', 15, 4, '1,2,3,4,5', 4, 1, 1, ?)
    ON DUPLICATE KEY UPDATE updated_at = NOW()
  `, [
    companyId,
    JSON.stringify([
      { id: 'n1', label: 'Pune Head Office', ip: '203.0.113.10', active: true },
      { id: 'n2', label: 'Backup Fiber Line', ip: '198.51.100.7', active: true }
    ])
  ]);

  // Seed team members for company if fewer than 6 exist
  const [userCountRes] = await conn.query('SELECT COUNT(*) as cnt FROM users WHERE company_id = ?', [companyId]);
  if (userCountRes[0].cnt < 8) {
    console.log('Adding additional team members...');
    const hashedPw = await bcrypt.hash('Password123!', 10);
    const extraPeople = [
      { code: 'ACM-021', name: 'Sneha Kulkarni', email: 'sneha@acme.com', phone: '98900 11004', dept: 'Design', title: 'Product Designer', role: 'employee' },
      { code: 'ACM-025', name: 'Vikram Joshi', email: 'vikram@acme.com', phone: '98900 11005', dept: 'Sales', title: 'Sales Executive', role: 'employee' },
      { code: 'ACM-029', name: 'Ananya Iyer', email: 'ananya@acme.com', phone: '98900 11006', dept: 'Marketing', title: 'Marketing Lead', role: 'employee' },
      { code: 'ACM-033', name: 'Karan Mehta', email: 'karan@acme.com', phone: '98900 11007', dept: 'Engineering', title: 'Software Engineer', role: 'employee' },
      { code: 'ACM-038', name: 'Neha Singh', email: 'neha@acme.com', phone: '98900 11008', dept: 'Finance', title: 'Accountant', role: 'employee' },
      { code: 'ACM-041', name: 'Rahul Verma', email: 'rahul@acme.com', phone: '98900 11009', dept: 'Support', title: 'Support Specialist', role: 'employee' },
      { code: 'ACM-047', name: 'Pooja Nair', email: 'pooja@acme.com', phone: '98900 11010', dept: 'HR', title: 'HR Executive', role: 'employee' },
      { code: 'ACM-052', name: 'Isha Gupta', email: 'isha@acme.com', phone: '98900 11011', dept: 'Engineering', title: 'QA Engineer', role: 'employee' },
    ];

    for (const p of extraPeople) {
      await conn.query(`
        INSERT INTO users (company_id, employee_code, name, email, password, role, department, title, phone, status, joined_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', CURDATE(), NOW())
        ON DUPLICATE KEY UPDATE updated_at = NOW()
      `, [companyId, p.code, p.name, p.email, hashedPw, p.role, p.dept, p.title, p.phone]);
    }
  }

  // Fetch current company users
  const [acmeUsers] = await conn.query('SELECT id, name, email FROM users WHERE company_id = ?', [companyId]);

  // Seed Holidays
  const [existingHolidays] = await conn.query('SELECT COUNT(*) as cnt FROM holidays WHERE company_id = ? OR company_id IS NULL', [companyId]);
  if (existingHolidays[0].cnt === 0) {
    console.log('Seeding holidays...');
    const holidaysList = [
      { name: 'Gandhi Jayanti', date: '2026-10-02', kind: 'Public' },
      { name: 'Dussehra', date: '2026-10-20', kind: 'Public' },
      { name: 'Diwali', date: '2026-11-08', kind: 'Public' },
      { name: 'Company Annual Day', date: '2026-11-20', kind: 'Company' },
      { name: 'Christmas', date: '2026-12-25', kind: 'Public' },
      { name: 'New Year’s Day', date: '2027-01-01', kind: 'Company' },
      { name: 'Republic Day', date: '2027-01-26', kind: 'Public' },
    ];
    for (const h of holidaysList) {
      await conn.query('INSERT INTO holidays (company_id, name, date, kind) VALUES (?, ?, ?, ?)', [companyId, h.name, h.date, h.kind]);
    }
  }

  // Seed Leave Requests if empty
  const [existingLeaves] = await conn.query('SELECT COUNT(*) as cnt FROM leave_requests WHERE company_id = ?', [companyId]);
  if (existingLeaves[0].cnt === 0 && acmeUsers.length >= 4) {
    console.log('Seeding leave requests...');
    const leaveData = [
      { user: acmeUsers[2], type: 'Casual', start: '2026-11-23', end: '2026-11-24', days: 2, reason: 'Family function', status: 'Pending' },
      { user: acmeUsers[3], type: 'Sick', start: '2026-11-18', end: '2026-11-18', days: 1, reason: 'Fever and cold', status: 'Pending' },
      { user: acmeUsers[1], type: 'Earned', start: '2026-12-01', end: '2026-12-05', days: 5, reason: 'Annual vacation', status: 'Pending' },
    ];
    for (const l of leaveData) {
      if (l.user) {
        await conn.query(
          `INSERT INTO leave_requests (company_id, user_id, leave_type, start_date, end_date, days_count, reason, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [companyId, l.user.id, l.type, l.start, l.end, l.days, l.reason, l.status]
        );
      }
    }
  }

  // Seed WFH Requests if empty
  const [existingWfh] = await conn.query('SELECT COUNT(*) as cnt FROM wfh_requests WHERE company_id = ?', [companyId]);
  if (existingWfh[0].cnt === 0 && acmeUsers.length >= 4) {
    console.log('Seeding WFH requests...');
    const wfhData = [
      { user: acmeUsers[2], date: '2026-11-19', reason: 'Internet installation at home', status: 'Pending' },
      { user: acmeUsers[3], date: '2026-11-20', reason: 'Courier delivery & home repairs', status: 'Pending' },
    ];
    for (const w of wfhData) {
      if (w.user) {
        await conn.query(
          `INSERT INTO wfh_requests (company_id, user_id, date, reason, status, created_at)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [companyId, w.user.id, w.date, w.reason, w.status]
        );
      }
    }
  }

  // Seed Attendance for today if empty
  const todayStr = new Date().toISOString().split('T')[0];
  const [existingAtt] = await conn.query('SELECT COUNT(*) as cnt FROM attendance WHERE company_id = ? AND date = ?', [companyId, todayStr]);
  if (existingAtt[0].cnt === 0) {
    console.log(`Seeding today's attendance (${todayStr})...`);
    for (let i = 0; i < acmeUsers.length; i++) {
      const u = acmeUsers[i];
      let status = 'Present';
      let mode = 'Office';
      let checkIn = '09:15:00';
      if (i === 1) { status = 'Present'; mode = 'Office'; checkIn = '09:05:00'; }
      else if (i === 2) { status = 'Present'; mode = 'WFH'; checkIn = '09:30:00'; }
      else if (i === 3) { status = 'Late'; mode = 'Office'; checkIn = '10:15:00'; }
      else if (i === 4) { status = 'On leave'; mode = '-'; checkIn = null; }

      await conn.query(`
        INSERT INTO attendance (company_id, user_id, date, check_in, mode, status, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, '203.0.113.10')
        ON DUPLICATE KEY UPDATE status = VALUES(status), check_in = VALUES(check_in)
      `, [companyId, u.id, todayStr, checkIn, mode, status]);
    }
  }

  console.log('Admin schema & initial company dataset complete!');
  await conn.end();
}

initAdminSchema().catch(console.error);
