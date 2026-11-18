import mysql from 'mysql2/promise';

async function test() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
  });

  console.log('Testing HR tables in MySQL...');

  // Test salary structures
  const [salaries] = await conn.query(`
    SELECT u.name, s.basic, s.hra, s.other, s.fixed 
    FROM salary_structures s 
    JOIN users u ON s.user_id = u.id 
    WHERE s.company_id = 1
  `);
  console.log(`Salary structures count: ${salaries.length}`);
  console.log('Sample salary:', salaries[0]);

  // Test leave policy
  const [policies] = await conn.query('SELECT * FROM leave_policies WHERE company_id = 1');
  console.log('Leave policy:', policies[0]);

  // Test documents
  const [docs] = await conn.query(`
    SELECT d.id, d.kind, d.status, u.name 
    FROM documents d 
    JOIN users u ON d.user_id = u.id 
    WHERE d.company_id = 1
  `);
  console.log(`Documents count: ${docs.length}`);

  // Test messages
  const [msgs] = await conn.query(`
    SELECT m.id, m.thread_id, m.text, u.name 
    FROM messages m 
    JOIN users u ON m.sender_id = u.id 
    WHERE m.company_id = 1
  `);
  console.log(`Messages count: ${msgs.length}`);

  await conn.end();
  console.log('All HR DB verification tests passed!');
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
