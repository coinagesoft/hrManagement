import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const dbConfig = {
  host: process.env.DB_HOST || 'srv597.hstgr.io',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'u856729253_coin_hr_age',
  password: process.env.DB_PASSWORD || 'kondoz-maxnob-1cuxxI',
  database: process.env.DB_NAME || 'u856729253_coinhr',
};

async function initDB() {
  console.log('Connecting to database...');
  const conn = await mysql.createConnection(dbConfig);
  console.log('Connected successfully!');

  // Create companies table
  console.log('Creating companies table...');
  await conn.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50) NULL,
      email VARCHAR(255) NULL,
      admin_name VARCHAR(255) NULL,
      status ENUM('Active', 'Suspended') DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Create users table
  console.log('Creating users table...');
  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NULL,
      employee_code VARCHAR(50) NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('super', 'admin', 'hr', 'employee') NOT NULL DEFAULT 'employee',
      department VARCHAR(100) NULL,
      title VARCHAR(100) NULL,
      phone VARCHAR(50) NULL,
      status ENUM('Active', 'Inactive') DEFAULT 'Active',
      joined_date DATE NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_email (email),
      INDEX idx_company (company_id),
      INDEX idx_role (role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Seed company if not exists
  const [existingCompanies] = await conn.query('SELECT id FROM companies WHERE name = ?', ['Acme Technologies']);
  let companyId;
  if (existingCompanies.length === 0) {
    console.log('Seeding initial company...');
    const [result] = await conn.query(
      'INSERT INTO companies (name, code, email, admin_name, status) VALUES (?, ?, ?, ?, ?)',
      ['Acme Technologies', 'ACM', 'aarav@acme.com', 'Aarav Sharma', 'Active']
    );
    companyId = result.insertId;
  } else {
    companyId = existingCompanies[0].id;
  }

  // Seed default users if users table is empty
  const [existingUsers] = await conn.query('SELECT COUNT(*) as count FROM users');
  if (existingUsers[0].count === 0) {
    console.log('Seeding initial users...');
    const hashedPw = await bcrypt.hash('Password123!', 10);

    const seedUsers = [
      {
        company_id: null,
        employee_code: 'SUP-001',
        name: 'Platform Owner',
        email: 'superadmin@coinhr.com',
        password: hashedPw,
        role: 'super',
        department: 'Executive',
        title: 'Super Admin',
        phone: '+91 99000 00000',
        status: 'Active',
        joined_date: '2024-01-01'
      },
      {
        company_id: companyId,
        employee_code: 'ACM-001',
        name: 'Aarav Sharma',
        email: 'aarav@acme.com',
        password: hashedPw,
        role: 'admin',
        department: 'Management',
        title: 'Founder & CEO',
        phone: '+91 98900 11001',
        status: 'Active',
        joined_date: '2024-01-15'
      },
      {
        company_id: companyId,
        employee_code: 'ACM-002',
        name: 'Priya Deshmukh',
        email: 'priya@acme.com',
        password: hashedPw,
        role: 'hr',
        department: 'HR',
        title: 'HR Manager',
        phone: '+91 98900 11002',
        status: 'Active',
        joined_date: '2024-02-01'
      },
      {
        company_id: companyId,
        employee_code: 'ACM-014',
        name: 'Rohan Patil',
        email: 'rohan@acme.com',
        password: hashedPw,
        role: 'employee',
        department: 'Engineering',
        title: 'Senior Engineer',
        phone: '+91 98900 11003',
        status: 'Active',
        joined_date: '2024-03-01'
      }
    ];

    for (const u of seedUsers) {
      await conn.query(`
        INSERT INTO users (company_id, employee_code, name, email, password, role, department, title, phone, status, joined_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        u.company_id, u.employee_code, u.name, u.email, u.password, u.role, u.department, u.title, u.phone, u.status, u.joined_date
      ]);
    }
    console.log('Seeded 4 initial users (Password: Password123!)');
  } else {
    console.log(`Users table already contains ${existingUsers[0].count} users.`);
  }

  const [tables] = await conn.query('SHOW TABLES');
  console.log('Tables in database:', tables);

  const [userList] = await conn.query('SELECT id, name, email, role, company_id FROM users');
  console.log('Current users:', userList);

  await conn.end();
  console.log('DB initialization finished successfully!');
}

initDB().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
