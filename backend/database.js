const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://campus_care:campus_care@127.0.0.1:5432/campus_care',
    max: Number(process.env.PG_POOL_MAX) || 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
});

const query = (text, values) => pool.query(text, values);
const newId = () => crypto.randomUUID();
const isId = (value) => typeof value === 'string' && value.length > 0 && value.length <= 80 && /^[a-zA-Z0-9_-]+$/.test(value);
const asApi = (row) => {
    if (!row) return row;
    const value = {};
    for (const [key, field] of Object.entries(row)) {
        if (key === 'id') value._id = field;
        else if (key === 'previous_health') value.previous_health = field;
        else value[key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())] = field;
    }
    return value;
};

const withTransaction = async (handler) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await handler(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
    } finally {
        client.release();
    }
};

const closeDatabase = () => pool.end();

module.exports = { pool, query, withTransaction, closeDatabase, newId, isId, asApi };
