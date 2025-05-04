import request from 'supertest';
import app from '../server.js'; // Ensure server.js exports your Express app

describe('Authentication API', () => {
    it('should register a new user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'John Doe',
                email: 'johndoe@example.com',
                password: 'Password123!'
            });
        
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('token');
    });

    it('should login an existing user', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'johndoe@example.com',
                password: 'Password123!'
            });
        
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
    });

    it('should not login with incorrect credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'johndoe@example.com',
                password: 'WrongPassword123!'
            });
        
        expect(res.statusCode).toEqual(401); // Unauthorized
        expect(res.body).toHaveProperty('message', 'Invalid credentials');
    });
});
