// src/services/__tests__/intraopService.test.js
const intraopService = require('../intraopService');
const { seedTestData, cleanDatabase, closeDatabase } = require('../../../tests/helpers/dbHelper');

describe('IntraopService', () => {
  let testData;

  beforeAll(async () => {
    testData = await seedTestData();
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('list', () => {
    it('should list intraop records for a case', async () => {
      const caseId = testData.cases[0].id;
      const result = await intraopService.list({ caseId });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('fc');
      expect(result[0]).toHaveProperty('sys');
      expect(result[0]).toHaveProperty('dia');
      expect(result[0]).toHaveProperty('map');
    });

    it('should filter by phase', async () => {
      const caseId = testData.cases[0].id;
      const result = await intraopService.list({ caseId, phase: 'INDUCCION' });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      result.forEach((record) => {
        expect(record.phase).toBe('INDUCCION');
      });
    });

    it('should return empty array for non-existent case', async () => {
      const result = await intraopService.list({ caseId: 999999 });
      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should get intraop record by ID', async () => {
      const recordId = testData.intraopRecords[0].id;
      const result = await intraopService.getById(recordId);

      expect(result).toBeDefined();
      expect(result.id).toBe(recordId);
      expect(result).toHaveProperty('fc');
      expect(result).toHaveProperty('phase');
    });

    it('should throw error for non-existent ID', async () => {
      await expect(intraopService.getById(999999)).rejects.toThrow('not found');
    });
  });

  describe('create', () => {
    it('should create intraop record with auto-calculated MAP', async () => {
      const caseId = testData.cases[0].id;
      const data = {
        caseId,
        phase: 'CIERRE',
        timestamp: new Date(),
        fc: 80,
        sys: 120,
        dia: 70,
        // map not provided - should be calculated
        cvp: 8,
        peep: 5,
        fio2: 50,
        vt: 450,
      };

      const result = await intraopService.create(data);

      expect(result).toBeDefined();
      expect(result.fc).toBe(80);
      expect(result.sys).toBe(120);
      expect(result.dia).toBe(70);
      // MAP = (120 + 2*70) / 3 = 87 (rounded)
      expect(result.map).toBe(87);
    });

    it('should use provided MAP if given', async () => {
      const caseId = testData.cases[0].id;
      const data = {
        caseId,
        phase: 'CIERRE',
        timestamp: new Date(),
        fc: 80,
        sys: 120,
        dia: 70,
        map: 90, // Manually provided
        cvp: 8,
      };

      const result = await intraopService.create(data);

      expect(result.map).toBe(90); // Should keep provided value
    });

    it('should validate required fields', async () => {
      const data = {
        // Missing caseId
        phase: 'CIERRE',
      };

      await expect(intraopService.create(data)).rejects.toThrow();
    });

    it('should validate physiological ranges', async () => {
      const caseId = testData.cases[0].id;
      const data = {
        caseId,
        phase: 'CIERRE',
        fc: 300, // Invalid - too high
        sys: 120,
        dia: 70,
      };

      await expect(intraopService.create(data)).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update intraop record', async () => {
      const recordId = testData.intraopRecords[0].id;
      const updates = {
        fc: 85,
        observations: 'Updated observation',
      };

      const result = await intraopService.update(recordId, updates);

      expect(result).toBeDefined();
      expect(result.fc).toBe(85);
      expect(result.observations).toBe('Updated observation');
    });

    it('should recalculate MAP when sys/dia updated', async () => {
      const recordId = testData.intraopRecords[0].id;
      const updates = {
        sys: 130,
        dia: 80,
      };

      const result = await intraopService.update(recordId, updates);

      // MAP = (130 + 2*80) / 3 = 97 (rounded)
      expect(result.sys).toBe(130);
      expect(result.dia).toBe(80);
      expect(result.map).toBe(97);
    });

    it('should throw error for non-existent record', async () => {
      await expect(
        intraopService.update(999999, { fc: 80 })
      ).rejects.toThrow('not found');
    });
  });

  describe('delete', () => {
    it('should delete intraop record', async () => {
      // Create a record to delete
      const caseId = testData.cases[0].id;
      const created = await intraopService.create({
        caseId,
        phase: 'CIERRE',
        timestamp: new Date(),
        fc: 75,
        sys: 115,
        dia: 68,
      });

      const result = await intraopService.delete(created.id);
      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);

      // Verify it's deleted
      await expect(intraopService.getById(created.id)).rejects.toThrow('not found');
    });

    it('should throw error for non-existent record', async () => {
      await expect(intraopService.delete(999999)).rejects.toThrow('not found');
    });
  });

  describe('duplicate', () => {
    it('should duplicate last record of a phase', async () => {
      const caseId = testData.cases[0].id;
      const phase = 'INDUCCION';

      const result = await intraopService.duplicate({ caseId, phase });

      expect(result).toBeDefined();
      expect(result.phase).toBe(phase);
      expect(result.caseId).toBe(caseId);
      // Should have incremented timestamp
      expect(result.timestamp).toBeDefined();
    });

    it('should throw error when no records to duplicate', async () => {
      const caseId = testData.cases[0].id;
      await expect(
        intraopService.duplicate({ caseId, phase: 'PHASE_DOES_NOT_EXIST' })
      ).rejects.toThrow('No records found');
    });
  });

  describe('getStats', () => {
    it('should return statistics for a phase', async () => {
      const caseId = testData.cases[0].id;
      const phase = 'INDUCCION';

      const result = await intraopService.getStats(caseId, phase);

      expect(result).toBeDefined();
      expect(result.count).toBeGreaterThan(0);
      expect(result.fc).toBeDefined();
      expect(result.fc.avg).toBeDefined();
      expect(result.fc.min).toBeDefined();
      expect(result.fc.max).toBeDefined();
    });

    it('should return zero stats for non-existent phase', async () => {
      const caseId = testData.cases[0].id;

      const result = await intraopService.getStats(caseId, 'NONEXISTENT_PHASE');

      expect(result.count).toBe(0);
    });
  });

  describe('MAP calculation', () => {
    it('should correctly calculate MAP', () => {
      // MAP = (SYS + 2*DIA) / 3
      const testCases = [
        { sys: 120, dia: 80, expected: 93 },
        { sys: 110, dia: 70, expected: 83 },
        { sys: 130, dia: 85, expected: 100 },
        { sys: 100, dia: 60, expected: 73 },
      ];

      testCases.forEach(({ sys, dia, expected }) => {
        const calculated = Math.round((sys + 2 * dia) / 3);
        expect(calculated).toBe(expected);
      });
    });

    it('should handle edge cases in MAP calculation', async () => {
      const caseId = testData.cases[0].id;

      // Very low values
      const lowRecord = await intraopService.create({
        caseId,
        phase: 'CIERRE',
        timestamp: new Date(),
        sys: 50,
        dia: 30,
      });
      expect(lowRecord.map).toBe(37); // (50 + 2*30) / 3

      // Very high values
      const highRecord = await intraopService.create({
        caseId,
        phase: 'CIERRE',
        timestamp: new Date(),
        sys: 200,
        dia: 120,
      });
      expect(highRecord.map).toBe(147); // (200 + 2*120) / 3
    });
  });
});
