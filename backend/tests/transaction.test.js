import request from 'supertest';
import app from '../server.js';

let token = '';

beforeAll(async () => {
    // Login to get the token before running transaction tests
    const res = await request(app)
        .post('/api/auth/login')
        .send({
            email: 'johndoe@example.com',
            password: 'Password123!'
        });
    
    token = res.body.token;
});

describe('Transaction API', () => {
    let transactionId = '';

    it('should add a new transaction', async () => {
        const res = await request(app)
            .post('/api/transactions')
            .set('Authorization', `Bearer ${token}`) // Auth header
            .send({
                description: 'Grocery shopping',
                amount: 50,
                type: 'expense',
                category: 'Food',
                date: '2024-10-01'
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('_id');
        transactionId = res.body._id;
    });

    it('should fetch all transactions for the user', async () => {
        const res = await request(app)
            .get('/api/transactions')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toBeInstanceOf(Array);
    });

    it('should update a transaction', async () => {
        const res = await request(app)
            .put(`/api/transactions/${transactionId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                description: 'Updated grocery shopping',
                amount: 60
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('description', 'Updated grocery shopping');
        expect(res.body).toHaveProperty('amount', 60);
    });

    it('should delete a transaction', async () => {
        const res = await request(app)
            .delete(`/api/transactions/${transactionId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'Transaction deleted successfully');
    });
});
