const { query, asApi } = require('./database');

const userSelect = (includePassword = false) => `SELECT u.id,u.name,u.role,u.auth_version,u.email,${includePassword ? 'u.password,' : ''}u.student_id,u.designation,u.mobile_no,u.is_active,u.created_at,u.updated_at, COALESCE(s.name, u.name) AS display_name,
    CASE WHEN s.id IS NULL THEN NULL ELSE row_to_json(s) END AS student_profile
    FROM users u LEFT JOIN students s ON s.id = u.student_id`;

const fromRow = (row) => {
    if (!row) return null;
    const user = asApi({ ...row, name: row.display_name || row.name });
    delete user.displayName;
    delete user.studentProfile;
    if (row.student_profile) user.studentId = asApi(row.student_profile);
    return user;
};

const getUserById = async (id) => fromRow((await query(`${userSelect()} WHERE u.id = $1 AND u.is_active = true`, [id])).rows[0]);
const getUserByEmail = async (email) => fromRow((await query(`${userSelect(true)} WHERE u.email = $1 AND u.is_active = true`, [email])).rows[0]);

module.exports = { getUserById, getUserByEmail };
