import mysql from 'mysql2/promise';
import { configDotenv } from 'dotenv';

configDotenv()

const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

// MySQL connection pool (adjust credentials as needed)
export const db = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME
});