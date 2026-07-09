require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function query() {
  const res = await pool.query(`SELECT session_id, role, content FROM chat_messages WHERE content LIKE '%Thank you for your message%' ORDER BY created_at DESC LIMIT 15;`);
  console.log(res.rows);
  process.exit(0);
}
query();
