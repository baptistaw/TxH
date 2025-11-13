// src/routes/__tests__/intraop.test.js
const request = require('supertest');
const app = require('../../app');
const { seedTestData, cleanDatabase, closeDatabase } = require('../../../tests/helpers/dbHelper');

describe('Intraop API Endpoints', () => {
  let testData;

  beforeAll(async () => {
    testData = await seedTestData();

    // Authentication is mocked in tests/setup.js
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('GET /api/intraop', () => {
    it('should list intraop records for a case', async () => {
      const caseId = testData.cases[0].id;

      const response = await request(app)
        .get('/api/intraop')
        .query({ caseId });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('fc');
      expect(response.body[0]).toHaveProperty('phase');
    });

    it('should filter by phase', async () => {
      const caseId = testData.cases[0].id;

      const response = await request(app)
        .get('/api/intraop')
        .query({ caseId, phase: 'INDUCCION' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((record) => {
        expect(record.phase).toBe('INDUCCION');
      });
    });

    it('should return 400 if caseId missing', async () => {
      const response = await request(app)
        .get('/api/intraop');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/intraop/:id', () => {
    it('should get intraop record by ID', async () => {
      const recordId = testData.intraopRecords[0].id;

      const response = await request(app)
        .get(`/api/intraop/${recordId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', recordId);
      expect(response.body).toHaveProperty('fc');
    });

    it('should return 404 for non-existent ID', async () => {
      const response = await request(app)
        .get('/api/intraop/999999');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/intraop', () => {
    it('should create intraop record with valid data', async () => {
      const caseId = testData.cases[0].id;
      const newRecord = {
        caseId,
        phase: 'CIERRE',
        timestamp: new Date().toISOString(),
        fc: 80,
        sys: 120,
        dia: 70,
        cvp: 8,
        peep: 5,
        fio2: 50,
        vt: 450,
      };

      const response = await request(app)
        .post('/api/intraop')
        .send(newRecord);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.fc).toBe(80);
      expect(response.body.sys).toBe(120);
      expect(response.body.dia).toBe(70);
      // MAP should be auto-calculated
      expect(response.body.map).toBe(87); // (120 + 2*70) / 3
    });

    it('should return 400 for invalid data', async () => {
      const invalidRecord = {
        caseId: testData.cases[0].id,
        phase: 'CIERRE',
        fc: 300, // Invalid - too high
      };

      const response = await request(app)
        .post('/api/intraop')
        .send(invalidRecord);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteRecord = {
        phase: 'CIERRE',
        // Missing caseId
      };

      const response = await request(app)
        .post('/api/intraop')
        .send(incompleteRecord);

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/intraop/:id', () => {
    it('should update intraop record', async () => {
      const recordId = testData.intraopRecords[0].id;
      const updates = {
        fc: 85,
        observations: 'Updated via API',
      };

      const response = await request(app)
        .put(`/api/intraop/${recordId}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.fc).toBe(85);
      expect(response.body.observations).toBe('Updated via API');
    });

    it('should return 404 for non-existent record', async () => {
      const response = await request(app)
        .put('/api/intraop/999999')
        .send({ fc: 80 });

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid updates', async () => {
      const recordId = testData.intraopRecords[0].id;

      const response = await request(app)
        .put(`/api/intraop/${recordId}`)
        .send({ fc: 300 }); // Invalid value

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/intraop/:id', () => {
    it('should delete intraop record', async () => {
      // Create a record to delete
      const caseId = testData.cases[0].id;
      const createResponse = await request(app)
        .post('/api/intraop')
        .send({
          caseId,
          phase: 'CIERRE',
          timestamp: new Date().toISOString(),
          fc: 75,
          sys: 115,
          dia: 68,
        });

      const recordId = createResponse.body.id;

      const deleteResponse = await request(app)
        .delete(`/api/intraop/${recordId}`);

      expect(deleteResponse.status).toBe(200);

      // Verify it's deleted
      const getResponse = await request(app)
        .get(`/api/intraop/${recordId}`);

      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent record', async () => {
      const response = await request(app)
        .delete('/api/intraop/999999');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/intraop/duplicate', () => {
    it('should duplicate last record of a phase', async () => {
      const caseId = testData.cases[0].id;
      const phase = 'INDUCCION';

      const response = await request(app)
        .post('/api/intraop/duplicate')
        .send({ caseId, phase });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.phase).toBe(phase);
      expect(response.body.caseId).toBe(caseId);
    });

    it('should return 404 when no records to duplicate', async () => {
      const caseId = testData.cases[0].id;

      const response = await request(app)
        .post('/api/intraop/duplicate')
        .send({ caseId, phase: 'NONEXISTENT_PHASE' });

      expect(response.status).toBe(404);
    });

    it('should return 400 for missing parameters', async () => {
      const response = await request(app)
        .post('/api/intraop/duplicate')
        .send({ phase: 'INDUCCION' }); // Missing caseId

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/intraop/stats/:caseId/:phase', () => {
    it('should return statistics for a phase', async () => {
      const caseId = testData.cases[0].id;
      const phase = 'INDUCCION';

      const response = await request(app)
        .get(`/api/intraop/stats/${caseId}/${phase}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('count');
      expect(response.body.count).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('fc');
      expect(response.body.fc).toHaveProperty('avg');
      expect(response.body.fc).toHaveProperty('min');
      expect(response.body.fc).toHaveProperty('max');
    });

    it('should return zero stats for non-existent phase', async () => {
      const caseId = testData.cases[0].id;

      const response = await request(app)
        .get(`/api/intraop/stats/${caseId}/NONEXISTENT`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(0);
    });
  });

  describe('Validation', () => {
    it('should validate FC range (20-250)', async () => {
      const caseId = testData.cases[0].id;

      // Below minimum
      let response = await request(app)
        .post('/api/intraop')
        .send({
          caseId,
          phase: 'CIERRE',
          fc: 15,
          sys: 120,
          dia: 70,
        });

      expect(response.status).toBe(400);

      // Above maximum
      response = await request(app)
        .post('/api/intraop')
        .send({
          caseId,
          phase: 'CIERRE',
          fc: 300,
          sys: 120,
          dia: 70,
        });

      expect(response.status).toBe(400);

      // Within range
      response = await request(app)
        .post('/api/intraop')
        .send({
          caseId,
          phase: 'CIERRE',
          fc: 80,
          sys: 120,
          dia: 70,
        });

      expect(response.status).toBe(201);
    });

    it('should validate blood pressure ranges', async () => {
      const caseId = testData.cases[0].id;

      // Invalid PAS
      let response = await request(app)
        .post('/api/intraop')
        .send({
          caseId,
          phase: 'CIERRE',
          fc: 80,
          sys: 350, // Too high
          dia: 70,
        });

      expect(response.status).toBe(400);

      // Invalid PAD
      response = await request(app)
        .post('/api/intraop')
        .send({
          caseId,
          phase: 'CIERRE',
          fc: 80,
          sys: 120,
          dia: 250, // Too high
        });

      expect(response.status).toBe(400);
    });

    it('should validate PEEP range (0-30)', async () => {
      const caseId = testData.cases[0].id;

      const response = await request(app)
        .post('/api/intraop')
        .send({
          caseId,
          phase: 'CIERRE',
          fc: 80,
          sys: 120,
          dia: 70,
          peep: 50, // Too high
        });

      expect(response.status).toBe(400);
    });

    it('should validate FiO2 range (21-100)', async () => {
      const caseId = testData.cases[0].id;

      const response = await request(app)
        .post('/api/intraop')
        .send({
          caseId,
          phase: 'CIERRE',
          fc: 80,
          sys: 120,
          dia: 70,
          fio2: 120, // Too high
        });

      expect(response.status).toBe(400);
    });
  });
});
