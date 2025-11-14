// tests/fixtures/testData.js
// Datos anonimizados para testing

/**
 * 3 Pacientes de prueba
 */
const testPatients = [
  {
    id: '12345678',
    ciRaw: '1.234.567-8',
    name: 'Juan Pérez',
    birthDate: new Date('1970-05-15'),
    sex: 'M',
    provider: 'ASSE',
    bloodGroup: 'O+',
  },
  {
    id: '23456789',
    ciRaw: '2.345.678-9',
    name: 'María González',
    birthDate: new Date('1965-08-22'),
    sex: 'F',
    provider: 'ASSE',
    bloodGroup: 'A+',
  },
  {
    id: '34567890',
    ciRaw: '3.456.789-0',
    name: 'Pedro Rodríguez',
    birthDate: new Date('1958-12-10'),
    sex: 'M',
    provider: 'ASSE',
    bloodGroup: 'B+',
  },
];

/**
 * 3 Clínicos de prueba
 */
const testClinicians = [
  {
    id: 45678901,
    name: 'Dr. Carlos Martínez',
    specialty: 'ANESTESIOLOGO',
    email: 'carlos.martinez@test.com',
    phone: '099123456',
  },
  {
    id: 56789012,
    name: 'Dra. Ana Fernández',
    specialty: 'CIRUJANO',
    email: 'ana.fernandez@test.com',
    phone: '099234567',
  },
  {
    id: 67890123,
    name: 'Dr. Luis García',
    specialty: 'HEPATOLOGO',
    email: 'luis.garcia@test.com',
    phone: '099345678',
  },
];

/**
 * 2 Casos de trasplante
 */
const testCases = [
  {
    patientId: '12345678', // Juan Pérez
    startAt: new Date('2024-03-15T08:00:00Z'),
    endAt: new Date('2024-03-15T14:30:00Z'),
    duration: 390, // 6.5 horas
    isRetransplant: false,
    isHepatoRenal: false,
    optimalDonor: true,
    coldIschemiaTime: 360,
    warmIschemiaTime: 45,
    observations: 'Trasplante sin complicaciones intraoperatorias',
  },
  {
    patientId: '23456789', // María González
    startAt: new Date('2024-06-20T09:00:00Z'),
    endAt: new Date('2024-06-20T16:00:00Z'),
    duration: 420, // 7 horas
    isRetransplant: true,
    isHepatoRenal: true,
    optimalDonor: false,
    coldIschemiaTime: 420,
    warmIschemiaTime: 60,
    observations: 'Retrasplante por disfunción crónica',
  },
];

/**
 * Evaluaciones preoperatorias
 */
const testPreops = [
  {
    // Para caso 1 (Juan Pérez)
    evaluationDate: new Date('2024-03-10'),
    meld: 18,
    meldNa: 20,
    child: 'B',
    etiology1: 'Cirrosis alcohólica',
    etiology2: 'Hepatitis C',
  },
  {
    // Para caso 2 (María González)
    evaluationDate: new Date('2024-06-15'),
    meld: 32,
    meldNa: 35,
    child: 'C',
    etiology1: 'Cirrosis biliar primaria',
  },
];

/**
 * 20 Snapshots intraoperatorios (10 por caso)
 * Distribuidos en diferentes fases
 */
const testIntraopSnapshots = [
  // Caso 1 - Juan Pérez (10 snapshots)
  // Fase INDUCCION (2 snapshots)
  {
    caseIndex: 0,
    phase: 'INDUCCION',
    timestamp: new Date('2024-03-15T08:15:00Z'),
    heartRate: 75,
    pas: 120,
    pad: 70,
    pam: 87,
    cvp: 8,
    peep: 5,
    fio2: 0.50,
    tidalVolume: 450,
  },
  {
    caseIndex: 0,
    phase: 'INDUCCION',
    timestamp: new Date('2024-03-15T08:30:00Z'),
    heartRate: 78,
    pas: 115,
    pad: 68,
    pam: 84,
    cvp: 7,
    peep: 5,
    fio2: 0.50,
    tidalVolume: 450,
  },

  // Fase DISECCION (2 snapshots)
  {
    caseIndex: 0,
    phase: 'DISECCION',
    timestamp: new Date('2024-03-15T09:00:00Z'),
    heartRate: 82,
    pas: 110,
    pad: 65,
    pam: 80,
    cvp: 9,
    peep: 5,
    fio2: 0.50,
    tidalVolume: 450,
  },
  {
    caseIndex: 0,
    phase: 'DISECCION',
    timestamp: new Date('2024-03-15T09:45:00Z'),
    heartRate: 85,
    pas: 108,
    pad: 64,
    pam: 79,
    cvp: 10,
    peep: 5,
    fio2: 0.50,
    tidalVolume: 450,
  },

  // Fase ANHEPATICA_INICIAL (2 snapshots)
  {
    caseIndex: 0,
    phase: 'ANHEPATICA',
    timestamp: new Date('2024-03-15T10:30:00Z'),
    heartRate: 88,
    pas: 105,
    pad: 62,
    pam: 76,
    cvp: 12,
    peep: 6,
    fio2: 0.60,
    tidalVolume: 450,
  },
  {
    caseIndex: 0,
    phase: 'ANHEPATICA',
    timestamp: new Date('2024-03-15T11:00:00Z'),
    heartRate: 90,
    pas: 102,
    pad: 60,
    pam: 74,
    cvp: 13,
    peep: 6,
    fio2: 0.60,
    tidalVolume: 450,
  },

  // Fase PRE_REPERFUSION (1 snapshot)
  {
    caseIndex: 0,
    phase: 'PRE_REPERFUSION',
    timestamp: new Date('2024-03-15T11:30:00Z'),
    heartRate: 92,
    pas: 100,
    pad: 58,
    pam: 72,
    cvp: 14,
    peep: 6,
    fio2: 0.60,
    tidalVolume: 450,
  },

  // Fase POST_REPERFUSION_INICIAL (2 snapshots)
  {
    caseIndex: 0,
    phase: 'POST_REPERFUSION',
    timestamp: new Date('2024-03-15T12:00:00Z'),
    heartRate: 95,
    pas: 95,
    pad: 55,
    pam: 68,
    cvp: 15,
    peep: 7,
    fio2: 0.70,
    tidalVolume: 450,
  },
  {
    caseIndex: 0,
    phase: 'POST_REPERFUSION',
    timestamp: new Date('2024-03-15T12:30:00Z'),
    heartRate: 88,
    pas: 105,
    pad: 62,
    pam: 76,
    cvp: 12,
    peep: 6,
    fio2: 0.60,
    tidalVolume: 450,
  },

  // Fase FIN_VIA_BILIAR (1 snapshot)
  {
    caseIndex: 0,
    phase: 'FIN_VIA_BILIAR',
    timestamp: new Date('2024-03-15T13:30:00Z'),
    heartRate: 82,
    pas: 112,
    pad: 66,
    pam: 81,
    cvp: 10,
    peep: 5,
    fio2: 0.50,
    tidalVolume: 450,
  },

  // Caso 2 - María González (10 snapshots)
  // Fase INDUCCION (2 snapshots)
  {
    caseIndex: 1,
    phase: 'INDUCCION',
    timestamp: new Date('2024-06-20T09:15:00Z'),
    heartRate: 92,
    pas: 130,
    pad: 80,
    pam: 97,
    cvp: 10,
    peep: 5,
    fio2: 0.60,
    tidalVolume: 400,
  },
  {
    caseIndex: 1,
    phase: 'INDUCCION',
    timestamp: new Date('2024-06-20T09:30:00Z'),
    heartRate: 88,
    pas: 125,
    pad: 75,
    pam: 92,
    cvp: 9,
    peep: 5,
    fio2: 0.60,
    tidalVolume: 400,
  },

  // Fase DISECCION (2 snapshots)
  {
    caseIndex: 1,
    phase: 'DISECCION',
    timestamp: new Date('2024-06-20T10:00:00Z'),
    heartRate: 95,
    pas: 118,
    pad: 70,
    pam: 86,
    cvp: 11,
    peep: 6,
    fio2: 0.60,
    tidalVolume: 400,
  },
  {
    caseIndex: 1,
    phase: 'DISECCION',
    timestamp: new Date('2024-06-20T11:00:00Z'),
    heartRate: 98,
    pas: 115,
    pad: 68,
    pam: 84,
    cvp: 12,
    peep: 6,
    fio2: 0.60,
    tidalVolume: 400,
  },

  // Fase ANHEPATICA_INICIAL (2 snapshots)
  {
    caseIndex: 1,
    phase: 'ANHEPATICA',
    timestamp: new Date('2024-06-20T12:00:00Z'),
    heartRate: 102,
    pas: 108,
    pad: 64,
    pam: 79,
    cvp: 14,
    peep: 7,
    fio2: 0.70,
    tidalVolume: 400,
  },
  {
    caseIndex: 1,
    phase: 'ANHEPATICA',
    timestamp: new Date('2024-06-20T12:45:00Z'),
    heartRate: 105,
    pas: 105,
    pad: 62,
    pam: 76,
    cvp: 15,
    peep: 7,
    fio2: 0.70,
    tidalVolume: 400,
  },

  // Fase PRE_REPERFUSION (1 snapshot)
  {
    caseIndex: 1,
    phase: 'PRE_REPERFUSION',
    timestamp: new Date('2024-06-20T13:15:00Z'),
    heartRate: 108,
    pas: 102,
    pad: 60,
    pam: 74,
    cvp: 16,
    peep: 7,
    fio2: 0.80,
    tidalVolume: 400,
  },

  // Fase POST_REPERFUSION_INICIAL (2 snapshots)
  {
    caseIndex: 1,
    phase: 'POST_REPERFUSION',
    timestamp: new Date('2024-06-20T13:45:00Z'),
    heartRate: 112,
    pas: 92,
    pad: 52,
    pam: 65,
    cvp: 18,
    peep: 8,
    fio2: 0.90,
    tidalVolume: 400,
  },
  {
    caseIndex: 1,
    phase: 'POST_REPERFUSION',
    timestamp: new Date('2024-06-20T14:15:00Z'),
    heartRate: 98,
    pas: 102,
    pad: 60,
    pam: 74,
    cvp: 14,
    peep: 7,
    fio2: 0.70,
    tidalVolume: 400,
  },

  // Fase FIN_VIA_BILIAR (1 snapshot)
  {
    caseIndex: 1,
    phase: 'FIN_VIA_BILIAR',
    timestamp: new Date('2024-06-20T15:30:00Z'),
    heartRate: 90,
    pas: 108,
    pad: 64,
    pam: 79,
    cvp: 12,
    peep: 6,
    fio2: 0.60,
    tidalVolume: 400,
  },
];

/**
 * Team members (equipos para los casos)
 */
const testTeamMembers = [
  // Caso 1 team
  {
    caseIndex: 0,
    clinicianCi: 45678901, // Dr. Carlos Martínez
    role: 'ANEST1',
  },
  {
    caseIndex: 0,
    clinicianCi: 56789012, // Dra. Ana Fernández
    role: 'CIRUJANO1',
  },

  // Caso 2 team
  {
    caseIndex: 1,
    clinicianCi: 45678901, // Dr. Carlos Martínez
    role: 'ANEST1',
  },
  {
    caseIndex: 1,
    clinicianCi: 67890123, // Dr. Luis García
    role: 'HEPATOLOGO',
  },
];

/**
 * Outcomes postoperatorios
 */
const testPostops = [
  // Caso 1
  {
    caseIndex: 0,
    icuDays: 3,
    hospitalDays: 12,
    complications: 'Ninguna',
    inHospitalMortality: false,
    dischargeDate: new Date('2024-03-27'),
    observations: 'Evolución favorable',
  },
  // Caso 2
  {
    caseIndex: 1,
    icuDays: 7,
    hospitalDays: 21,
    complications: 'Insuficiencia renal transitoria',
    inHospitalMortality: false,
    dischargeDate: new Date('2024-07-11'),
    observations: 'Requirió hemodiálisis transitoria',
  },
];

module.exports = {
  testPatients,
  testClinicians,
  testCases,
  testPreops,
  testIntraopSnapshots,
  testTeamMembers,
  testPostops,
};
