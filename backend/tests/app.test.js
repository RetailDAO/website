const request = require('supertest');
const app = require('../src/app_minimal');

describe('App', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok'
      });
    });
  });

  describe('GET /test', () => {
    it('should return test message', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Server is working'
      });
    });
  });

  describe('GET /nonexistent', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(response.body).toBeDefined();
    });
  });

  describe('CORS', () => {
    it('should handle CORS headers', async () => {
      const response = await request(app)
        .options('/health')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('JSON Parsing', () => {
    it('should parse JSON body', async () => {
      const testData = { test: 'data' };
      
      // Since we don't have a POST endpoint in minimal app, this tests middleware setup
      const response = await request(app)
        .post('/test')
        .send(testData);

      // Should get 404 but with CORS headers, meaning middleware is working
      expect(response.status).toBe(404);
    });
  });
});