import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'srv597.hstgr.io',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'u856729253_coin_hr_age',
  password: process.env.DB_PASSWORD || 'kondoz-maxnob-1cuxxI',
  database: process.env.DB_NAME || 'u856729253_coinhr',
};

async function updateSchemaForInvitations() {
  console.log('Connecting to MySQL database...');
  const conn = await mysql.createConnection(dbConfig);
  console.log('Connected!');

  // 1. Modify companies status ENUM to include 'Pending'
  console.log("Updating companies status ENUM to include 'Pending'...");
  await conn.query(`
    ALTER TABLE companies 
    MODIFY COLUMN status ENUM('Active', 'Suspended', 'Pending') DEFAULT 'Pending'
  `);

  // 2. Modify users status ENUM to include 'Pending'
  console.log("Updating users status ENUM to include 'Pending'...");
  await conn.query(`
    ALTER TABLE users 
    MODIFY COLUMN status ENUM('Active', 'Inactive', 'Pending') DEFAULT 'Pending'
  `);

  // 3. Create invitations table
  console.log('Creating invitations table...');
  await conn.query(`
    CREATE TABLE IF NOT EXISTS invitations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      user_id INT NOT NULL,
      email VARCHAR(255) NOT NULL,
      token VARCHAR(255) NOT NULL UNIQUE,
      role ENUM('admin', 'hr', 'employee') DEFAULT 'admin',
      status ENUM('Pending', 'Accepted', 'Expired') DEFAULT 'Pending',
      expires_at DATETIME NOT NULL,
      accepted_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_token (token),
      INDEX idx_email (email),
      INDEX idx_company (company_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('Invitations schema created successfully!');
  await conn.end();
}

updateSchemaForInvitations().catch(console.error);
