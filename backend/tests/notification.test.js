import request from 'supertest';
import app from '../server.js'; // Ensure server is exported in server.js

describe('Notification API', () => {
    it('should fetch user notifications', async () => {
        const res = await request(app)
            .get('/api/notifications')
            .set('Authorization', `Bearer validTokenHere`);
        
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveLength(0); // Assuming there are no notifications
    });
});
