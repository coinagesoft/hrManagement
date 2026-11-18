import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const dbConfig = {
  host: process.env.DB_HOST || 'srv597.hstgr.io',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'u856729253_coin_hr_age',
  password: process.env.DB_PASSWORD || 'kondoz-maxnob-1cuxxI',
  database: process.env.DB_NAME || 'u856729253_coinhr',
};

async function initSuperData() {
  console.log('Connecting to database...');
  const conn = await mysql.createConnection(dbConfig);
  console.log('Connected!');

  // Create audit_logs table
  console.log('Creating audit_logs table...');
  await conn.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NULL,
      user_id INT NULL,
      user_name VARCHAR(255) NOT NULL,
      action VARCHAR(100) NOT NULL,
      tone VARCHAR(50) DEFAULT 'blue',
      detail TEXT NULL,
      ip_address VARCHAR(50) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_company (company_id),
      INDEX idx_user (user_id),
      INDEX idx_action (action)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Seed sample companies if fewer than 3 companies exist
  const [existingCompanies] = await conn.query('SELECT COUNT(*) as cnt FROM companies');
  const count = existingCompanies[0].cnt;
  console.log(`Current companies count: ${count}`);

  if (count <= 1) {
    console.log('Seeding additional companies for platform overview...');
    const hashedPw = await bcrypt.hash('Password123!', 10);

    const companiesToSeed = [
      { name: 'Brightpath Logistics', code: 'BPL', email: 'meera@brightpath.in', admin: 'Meera Rao', status: 'Active', created: '2026-02-03' },
      { name: 'Nimbus Retail', code: 'NR', email: 'sanjay@nimbusretail.com', admin: 'Sanjay Bhat', status: 'Active', created: '2026-03-19' },
      { name: 'Orbit Labs', code: 'OL', email: 'divya@orbitlabs.io', admin: 'Divya Menon', status: 'Active', created: '2026-05-08' },
      { name: 'Greenfield Foods', code: 'GF', email: 'harish@greenfield.in', admin: 'Harish Jain', status: 'Suspended', created: '2026-06-22' },
      { name: 'Skyline Realty', code: 'SR', email: 'tanvi@skyline.co', admin: 'Tanvi Shah', status: 'Active', created: '2026-09-04' },
      { name: 'Pixel & Pine Studio', code: 'PPS', email: 'arjun@pixelpine.com', admin: 'Arjun Das', status: 'Active', created: '2026-10-15' },
    ];

    for (const c of companiesToSeed) {
      const [cRes] = await conn.query(
        'INSERT INTO companies (name, code, email, admin_name, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [c.name, c.code, c.email, c.admin, c.status, `${c.created} 10:00:00`]
      );
      const newCompId = cRes.insertId;

      // Create Admin user for each company
      await conn.query(
        `INSERT INTO users (company_id, employee_code, name, email, password, role, department, title, phone, status, joined_date, created_at)
         VALUES (?, ?, ?, ?, ?, 'admin', 'Management', 'Company Administrator', '+91 98000 00000', 'Active', ?, ?)`,
        [newCompId, `${c.code}-001`, c.admin, c.email, hashedPw, c.created, `${c.created} 10:00:00`]
      );
    }
    console.log('Seeded 6 additional companies and their admins.');
  }

  // Seed sample audit logs if empty
  const [existingLogs] = await conn.query('SELECT COUNT(*) as cnt FROM audit_logs');
  if (existingLogs[0].cnt === 0) {
    console.log('Seeding initial audit logs...');
    const sampleLogs = [
      { who: 'Platform Owner', action: 'Company created', tone: 'green', detail: 'Pixel & Pine Studio, Admin: Arjun Das', created: '2026-10-15 10:00:00' },
      { who: 'Platform Owner', action: 'Company suspended', tone: 'rose', detail: 'Greenfield Foods (billing inquiry)', created: '2026-10-02 16:20:00' },
      { who: 'Platform Owner', action: 'Company created', tone: 'green', detail: 'Skyline Realty, Admin: Tanvi Shah', created: '2026-09-04 11:35:00' },
      { who: 'Platform Owner', action: 'Invite resent', tone: 'blue', detail: 'Divya Menon, Orbit Labs', created: '2026-08-28 09:12:00' },
      { who: 'Platform Owner', action: 'Company created', tone: 'green', detail: 'Greenfield Foods, Admin: Harish Jain', created: '2026-06-22 13:40:00' },
      { who: 'Platform Owner', action: 'Company reactivated', tone: 'green', detail: 'Nimbus Retail account restored', created: '2026-05-15 14:10:00' },
    ];

    for (const log of sampleLogs) {
      await conn.query(
        'INSERT INTO audit_logs (company_id, user_id, user_name, action, tone, detail, created_at) VALUES (NULL, 1, ?, ?, ?, ?, ?)',
        [log.who, log.action, log.tone, log.detail, log.created]
      );
    }
    console.log('Seeded initial platform audit logs.');
  }

  await conn.end();
  console.log('Super Admin data setup complete!');
}

initSuperData().catch(console.error);
