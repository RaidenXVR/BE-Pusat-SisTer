import mysql from 'mysql2/promise';

// MySQL connection pool (adjust credentials as needed)
export const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'thepassword',
    database: 'cabang_pusat'
});