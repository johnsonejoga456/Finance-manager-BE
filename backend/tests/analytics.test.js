import request from 'supertest';
import app from '../server.js';

let token = '';

beforeAll(async () => {
    const res = await request(app)
        .post('/api/auth/login')
        .send({
            email: 'johndoe@example.com',
            password: 'Password123!'
        });

    token = res.body.token;
});

describe('Analytics API', () => {

    // Test fetching total income and expenses
    it('should fetch total income and expenses', async () => {
        const res = await request(app)
            .get('/api/transactions/analytics/income-expenses')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('totalIncome');
        expect(res.body).toHaveProperty('totalExpenses');
    });

    // Test fetching income vs expenses report
    it('should fetch income vs expenses report', async () => {
        const res = await request(app)
            .get('/api/transactions/analytics/income-vs-expenses')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('income');
        expect(res.body).toHaveProperty('expenses');
    });

    // Test fetching categorical breakdown of expenses
    it('should fetch expense breakdown by category', async () => {
        const res = await request(app)
            .get('/api/transactions/analytics/expense-breakdown')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('categories');
    });
});
