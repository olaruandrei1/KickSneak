require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function query() {
  const res = await pool.query('SELECT id, status FROM chat_sessions ORDER BY created_at DESC LIMIT 5;');
  console.log(res.rows);
  process.exit(0);
}
query();
