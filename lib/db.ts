import mysql from 'mysql2/promise';

declare global {
  // eslint-disable-next-line no-var
  var _mysqlPool: mysql.Pool | undefined;
}

const pool =
  global._mysqlPool ||
  mysql.createPool({
    host: process.env.DB_HOST || 'srv597.hstgr.io',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'u856729253_coin_hr_age',
    password: process.env.DB_PASSWORD || 'kondoz-maxnob-1cuxxI',
    database: process.env.DB_NAME || 'u856729253_coinhr',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
    dateStrings: true,
  });

global._mysqlPool = pool;

export async function query<T = any>(sql: string, params: any[] = []): Promise<T> {
  const [results] = await pool.execute(sql, params);
  return results as T;
}

export default pool;
