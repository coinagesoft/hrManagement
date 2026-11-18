import mysql from 'mysql2/promise';

async function testConnection() {
  const configs = [
    {
      name: "Standard without SSL",
      config: {
        host: 'srv597.hstgr.io',
        port: 3306,
        user: 'u856729253_coin_hr_age',
        password: 'kondoz-maxnob-1cuxxI',
        database: 'u856729253_coinhr',
        connectTimeout: 10000,
      }
    },
    {
      name: "With SSL rejectUnauthorized: false",
      config: {
        host: 'srv597.hstgr.io',
        port: 3306,
        user: 'u856729253_coin_hr_age',
        password: 'kondoz-maxnob-1cuxxI',
        database: 'u856729253_coinhr',
        ssl: { rejectUnauthorized: false },
        connectTimeout: 10000,
      }
    }
  ];

  for (const item of configs) {
    console.log(`Trying connection: ${item.name}...`);
    try {
      const conn = await mysql.createConnection(item.config);
      console.log(`SUCCESS! Connected using ${item.name}`);
      const [tables] = await conn.query('SHOW TABLES');
      console.log('Existing tables:', tables);
      await conn.end();
      return item.config;
    } catch (err) {
      console.error(`Failed ${item.name}:`, err.message);
    }
  }
}

testConnection();
