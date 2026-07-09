require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function query() {
  const res = await pool.query('SELECT role, content FROM chat_messages ORDER BY created_at DESC LIMIT 15;');
  console.log(res.rows);
  process.exit(0);
}
query();
