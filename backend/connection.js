const { query } = require('./database');

const connectDatabase = async () => {
    await query('SELECT 1');
    const schema = await query("SELECT to_regclass('public.users') AS users_table");
    if (!schema.rows[0].users_table) throw new Error('PostgreSQL schema is not installed. Run "npm run db:migrate" from the backend folder.');
    console.log('Connected to PostgreSQL');
};

module.exports = connectDatabase;
