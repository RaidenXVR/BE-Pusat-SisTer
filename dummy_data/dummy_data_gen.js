// Dummy Data Generator for Cabang Pusat API Testing (with timestamps)
const faker = require('faker');
const fs = require('fs');

const NUM_BRANCH = 5;
const NUM_CUSTOMERS = 10;
const NUM_LOANS = 12;
const NUM_PAYMENTS = 9;
const NUM_EMPLOYEES = 4;
const NUM_INCOME = 9;

function generateTimestamp() {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function generateData(branch_id) {
    const timestamp = generateTimestamp();

    const customers = Array.from({ length: NUM_CUSTOMERS }).map((_, i) => ({
        customer_id: i + 1 + (NUM_CUSTOMERS * branch_id),
        branch_id,
        name: faker.name.findName(),
        nik: faker.datatype.uuid().slice(0, 16),
        address: faker.address.streetAddress(),
        phone_number: faker.phone.phoneNumber(),
        registration_date: faker.date.past(2).toISOString().split('T')[0],
        created_at: timestamp,
        updated_at: timestamp
    }));

    const loans = Array.from({ length: NUM_LOANS }).map((_, i) => ({
        loan_id: i + 1 + (NUM_CUSTOMERS * branch_id),
        customer_id: customers[i % NUM_CUSTOMERS].customer_id,
        branch_id,
        amount_plafond: faker.finance.amount(10000000, 50000000, 0),
        interest_rate: faker.datatype.float({ min: 5, max: 15 }),
        loan_date: faker.date.past(1).toISOString().split('T')[0],
        term_months: faker.datatype.number({ min: 6, max: 24 }),
        status: faker.helpers.randomize(['active', 'completed', 'defaulted']),
        created_at: timestamp,
        updated_at: timestamp
    }));

    const payments = Array.from({ length: NUM_PAYMENTS }).map((_, i) => ({
        payment_id: i + 1 + (NUM_CUSTOMERS * branch_id),
        loan_id: loans[i % NUM_LOANS].loan_id,
        branch_id,
        payment_date: faker.date.recent(60).toISOString().split('T')[0],
        amount_paid: faker.finance.amount(1000000, 5000000, 0),
        due_date: faker.date.recent(90).toISOString().split('T')[0],
        is_on_time: faker.datatype.boolean(),

    }));

    const employees = Array.from({ length: NUM_EMPLOYEES }).map((_, i) => ({
        employee_id: i + 1 + (NUM_CUSTOMERS * branch_id),
        name: faker.name.findName(),
        position: faker.name.jobTitle(),
        assigned_customers: faker.datatype.number({ min: 1, max: 5 }),
        hire_date: faker.date.past(3).toISOString().split('T')[0],
        branch_id,
        created_at: timestamp,
        updated_at: timestamp
    }));

    const income = Array.from({ length: NUM_INCOME }).map((_, i) => ({
        income_id: i + 1 + (NUM_CUSTOMERS * branch_id),
        loan_id: loans[i % NUM_LOANS].loan_id,
        income_amount: faker.finance.amount(500000, 2000000, 0),
        recorded_date: faker.date.recent(30).toISOString().split('T')[0],

    }));

    const payload = { branch_id, customers, loans, payments, employees, income };
    fs.writeFileSync(`dummy_data/dummy-sync-data-${branch_id}.json`, JSON.stringify(payload, null, 2));
    console.log(`Dummy data saved to dummy-sync-data-${branch_id}.json`);
}

for (let i = 1; i <= NUM_BRANCH; i++) {
    generateData(i);
}
