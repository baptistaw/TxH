// src/__tests__/app.test.js
const request = require('supertest');
const app = require('../app');
const { seedTestData, cleanDatabase, closeDatabase } = require('../../tests/helpers/dbHelper');

describe('App Integration Tests', () => {
  let testData;

  beforeAll(async () => {
    testData = await seedTestData();
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('Health Check', () => {
    it('GET /api/health should return 200', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('db', true);
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('environment');
    });
  });

  describe('API Root', () => {
    it('GET /api should return API info', async () => {
      const response = await request(app).get('/api');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body.endpoints).toHaveProperty('health');
      expect(response.body.endpoints).toHaveProperty('patients');
      expect(response.body.endpoints).toHaveProperty('cases');
      expect(response.body.endpoints).toHaveProperty('intraop');
      expect(response.body.endpoints).toHaveProperty('exports');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/api/nonexistent-route');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Cases API', () => {
    it('GET /api/cases should list cases', async () => {
      const response = await request(app).get('/api/cases');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('GET /api/cases/:id should return case detail', async () => {
      const caseId = testData.cases[0].id;

      const response = await request(app).get(`/api/cases/${caseId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', caseId);
      expect(response.body).toHaveProperty('surgeryDate');
      expect(response.body).toHaveProperty('patient');
    });

    it('GET /api/cases/:id should return 404 for non-existent case', async () => {
      const response = await request(app).get('/api/cases/999999');

      expect(response.status).toBe(404);
    });
  });

  describe('Patients API', () => {
    it('GET /api/patients should list patients', async () => {
      const response = await request(app).get('/api/patients');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('GET /api/patients/:ci should return patient by CI', async () => {
      const patientCi = testData.patients[0].ci;

      const response = await request(app).get(`/api/patients/${patientCi}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ci', patientCi);
      expect(response.body).toHaveProperty('firstName');
      expect(response.body).toHaveProperty('lastName');
    });
  });

  describe('Pagination', () => {
    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/cases')
        .query({ page: 1, limit: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 1);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.data.length).toBeLessThanOrEqual(1);
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/cases')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });
  });
});
