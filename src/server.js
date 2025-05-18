// Import dependencies
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { apiKeyAuth, executiveAuth } from './authentication.js';
import { db } from './db.js';

// Create app
const app = express();
app.use(cors());
app.use(bodyParser.json());



// === 1. SYNC ENDPOINTS ===
// POST endpoint to Sync data from Unit Cabang to Cabang Pusat
app.post('/sync/branch-data', apiKeyAuth, async (req, res) => {
    const { branch_id, customers, loans, payments, employees, income } = req.body;
    try {
        const conn = await db.getConnection();

        await conn.beginTransaction();

        // Insert or update customers
        for (const cust of customers || []) {
            await conn.query(`
    INSERT INTO customers (customer_id, branch_id, name, nik, address, phone_number, registration_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      branch_id = VALUES(branch_id),
      name = VALUES(name),
      nik = VALUES(nik),
      address = VALUES(address),
      phone_number = VALUES(phone_number),
      registration_date = VALUES(registration_date)
  `, [
                cust.customer_id, branch_id, cust.name, cust.nik, cust.address, cust.phone_number, cust.registration_date
            ]);
        }

        // Insert or update loans
        for (const loan of loans || []) {
            await conn.query(`
    INSERT INTO loans (loan_id, customer_id, branch_id, amount_plafond, interest_rate, loan_date, term_months, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      customer_id = VALUES(customer_id),
      branch_id = VALUES(branch_id),
      amount_plafond = VALUES(amount_plafond),
      interest_rate = VALUES(interest_rate),
      loan_date = VALUES(loan_date),
      term_months = VALUES(term_months),
      status = VALUES(status)
  `, [
                loan.loan_id, loan.customer_id, branch_id, loan.amount_plafond, loan.interest_rate, loan.loan_date, loan.term_months, loan.status
            ]);
        }

        // Insert or update payments
        for (const pay of payments || []) {
            await conn.query(`
    INSERT INTO payments (payment_id, loan_id, branch_id, payment_date, amount_paid, due_date, is_on_time)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      loan_id = VALUES(loan_id),
      branch_id = VALUES(branch_id),
      payment_date = VALUES(payment_date),
      amount_paid = VALUES(amount_paid),
      due_date = VALUES(due_date),
      is_on_time = VALUES(is_on_time)
  `, [
                pay.payment_id, pay.loan_id, branch_id, pay.payment_date, pay.amount_paid, pay.due_date, pay.is_on_time
            ]);
        }

        // Insert or update employees
        for (const emp of employees || []) {
            await conn.query(`
    INSERT INTO employees (employee_id, name, position, assigned_customers, hire_date, branch_id)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      name = VALUES(name),
      position = VALUES(position),
      assigned_customers = VALUES(assigned_customers),
      hire_date = VALUES(hire_date),
      branch_id = VALUES(branch_id)
  `, [
                emp.employee_id, emp.name, emp.position, emp.assigned_customers, emp.hire_date, branch_id
            ]);
        }

        // Insert or update income
        for (const inc of income || []) {
            await conn.query(`
    INSERT INTO income (income_id, loan_id, income_amount, recorded_date)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      loan_id = VALUES(loan_id),
      income_amount = VALUES(income_amount),
      recorded_date = VALUES(recorded_date)
  `, [
                inc.income_id, inc.loan_id, inc.income_amount, inc.recorded_date
            ]);
        }

        // Log sync
        await conn.query(`INSERT INTO sync_logs (synced_table, last_sync_time, records_synced) VALUES (?, NOW(), ?)`, [
            'full_branch_data',
            (customers?.length || 0) + (loans?.length || 0) + (payments?.length || 0)
        ]);

        await conn.commit();
        conn.release();
        res.json({ success: true, message: 'Sync successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Sync failed' });
    }
});

// GET endpoint to fetch data of specific Unit Cabang
app.get('/sync/branch-data/:branch_id', apiKeyAuth, async (req, res) => {
    const { branch_id } = req.params;

    try {
        const conn = await db.getConnection();

        // Fetch customers
        const [customers] = await conn.query('SELECT * FROM customers WHERE branch_id = ?', [branch_id]);

        // Fetch loans
        const [loans] = await conn.query('SELECT * FROM loans WHERE branch_id = ?', [branch_id]);

        // Fetch payments
        const [payments] = await conn.query('SELECT * FROM payments WHERE branch_id = ?', [branch_id]);

        // Fetch employees
        const [employees] = await conn.query('SELECT * FROM employees WHERE branch_id = ?', [branch_id]);

        // Fetch income
        const [income] = await conn.query('SELECT * FROM income WHERE loan_id IN (SELECT loan_id FROM loans WHERE branch_id = ?)', [branch_id]);

        conn.release();

        res.json({
            branch_id,
            customers,
            loans,
            payments,
            employees,
            income
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch branch data' });
    }
});



// === 2. DASHBOARD ENDPOINTS ===

// Branches summary
app.get('/dashboard/branches-summary', executiveAuth, async (req, res) => {
    try {
        const [rows] = await db.query(`
      SELECT ku.branch_id, ku.name AS branch_name,
        COUNT(DISTINCT c.customer_id) AS customers,
        COUNT(DISTINCT l.loan_id) AS active_loans,
        SUM(i.income_amount) AS total_income,
        ROUND(SUM(CASE WHEN p.is_on_time THEN 1 ELSE 0 END) / COUNT(p.payment_id), 2) AS on_time_ratio
      FROM kantor_units ku
      LEFT JOIN customers c ON c.branch_id = ku.branch_id
      LEFT JOIN loans l ON l.branch_id = ku.branch_id AND l.status = 'active'
      LEFT JOIN income i ON i.loan_id = l.loan_id
      LEFT JOIN payments p ON p.branch_id = ku.branch_id
      GROUP BY ku.branch_id
    `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching summary' });
    }
});

// Get sync logs
app.get('/sync/logs', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM sync_logs ORDER BY last_sync_time DESC LIMIT 100');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to retrieve logs' });
    }
});

// GET /dashboard/income-over-time
app.get('/dashboard/income-over-time', executiveAuth, async (req, res) => {
    try {
        const [rows] = await db.query(`
    SELECT DATE_FORMAT(recorded_date, '%Y-%m') as month, SUM(income_amount) as total_income
    FROM income
    GROUP BY month
    ORDER BY month
  `);
        res.json(rows);
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Failed to retrieve income over time.' })
    }
});

// GET /dashboard/customers-over-time
app.get('/dashboard/customers-over-time', executiveAuth, async (req, res) => {
    try {
        const [rows] = await db.query(`
    SELECT DATE_FORMAT(registration_date, '%Y-%m') as month, COUNT(*) as total_customers
    FROM customers
    GROUP BY month
    ORDER BY month
  `);

        res.json(rows);
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Failed to retrieve customer count by time' })
    }
});

// GET /dashboard/on-time-payment-ratio
app.get('/dashboard/on-time-payment-ratio', executiveAuth, async (req, res) => {
    try {
        const [[{ on_time = 0 } = {}]] = await db.query(`SELECT COUNT(*) as on_time FROM payments WHERE is_on_time = 1`);
        const [[{ late = 0 } = {}]] = await db.query(`SELECT COUNT(*) as late FROM payments WHERE is_on_time = 0`);
        res.json([
            { name: 'On Time', value: on_time },
            { name: 'Late', value: late }
        ]);
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Failed to retrieve on time payment ratio' })
    }
});

// GET /dashboard/income-over-time-cumulative
app.get('/dashboard/income-over-time-cumulative', executiveAuth, async (req, res) => {
    try {
        const [rows] = await db.query(`
    SELECT
      t.month,
      SUM(t.total_income) OVER (ORDER BY t.month) AS cumulative_income
    FROM (
      SELECT DATE_FORMAT(recorded_date, '%Y-%m') AS month, SUM(income_amount) AS total_income
      FROM income
      GROUP BY month
    ) AS t
  `);
        res.json(rows);
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Failed to retrieve cumulative income over time' })
    }
});

// GET /dashboard/customers-over-time-cumulative
app.get('/dashboard/customers-over-time-cumulative', executiveAuth, async (req, res) => {
    try {
        const [rows] = await db.query(`
    SELECT
      t.month,
      SUM(t.total_customers) OVER (ORDER BY t.month) AS cumulative_customers
    FROM (
      SELECT DATE_FORMAT(registration_date, '%Y-%m') AS month, COUNT(*) AS total_customers
      FROM customers
      GROUP BY month
    ) AS t
  `);
        res.json(rows);
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Failed to retrieve cumulative customer count over time' })
    }
});


app.post('/secrets', executiveAuth, async (req, res) => {

    try {
        const { user_id, newKey, branch_id } = req.body;
        const conn = await db.getConnection();

        await conn.beginTransaction();
        if (branch_id == undefined) {
            const [secrets] = await conn.query('SELECT secret_id FROM secrets WHERE user_id = ?', [user_id]);
            if (secrets.length > 0) {
                // Update existing secret
                await conn.query(
                    `UPDATE secrets SET hashed_secret = ? WHERE user_id = ?`,
                    [newKey, user_id]
                );
                console.log("Updated secret for user_id", user_id);
            } else {
                // Insert new secret
                await conn.query(
                    `INSERT INTO secrets (user_id, hashed_secret) VALUES (?, ?)`,
                    [user_id, newKey]
                );
                console.log("Inserted new secret for user_id", user_id);
            }
        } else {
            const [secrets] = await conn.query('SELECT secret_id FROM secrets WHERE branch_id = ?', [branch_id]);
            if (secrets.length > 0) {
                // Update existing secret
                await conn.query(
                    `UPDATE secrets SET hashed_secret = ? WHERE branch_id = ?`,
                    [newKey, branch_id]
                );
                console.log("Updated secret for branch_id", branch_id);
            } else {
                // Insert new secret
                await conn.query(
                    `INSERT INTO secrets (hashed_secret, branch_id) VALUES (?, ?)`,
                    [newKey, branch_id]
                );
                console.log("Inserted new secret for branch_id", branch_id);
            }
        }
        await conn.commit()
        conn.release()
        res.status(200).json({ "success": true, "message": "secret added successfully" })
    } catch (err) {
        console.log(err)
        res.status(500).json({ success: false, message: 'Add secrets failed' });
    }
});

app.get('/', (req, res) => {
    return res.json({ code: 0, message: 'success', description: 'api endPoint Bank Cabang Pusat Sister', author: "Fitran Alfian Nizar aka. Raiden Xavier" });
});
export default app;
