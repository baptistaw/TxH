// tests/fixtures/testData.js
// Datos anonimizados para testing

/**
 * 3 Pacientes de prueba
 */
const testPatients = [
  {
    ci: 12345678,
    firstName: 'Juan',
    lastName: 'Pérez',
    birthDate: new Date('1970-05-15'),
    sex: 'M',
    provider: 'ASSE',
    bloodGroup: 'O+',
  },
  {
    ci: 23456789,
    firstName: 'María',
    lastName: 'González',
    birthDate: new Date('1965-08-22'),
    sex: 'F',
    provider: 'Mutualista',
    bloodGroup: 'A+',
  },
  {
    ci: 34567890,
    firstName: 'Pedro',
    lastName: 'Rodríguez',
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
    ci: 45678901,
    firstName: 'Dr. Carlos',
    lastName: 'Martínez',
    specialty: 'Anestesiología',
  },
  {
    ci: 56789012,
    firstName: 'Dra. Ana',
    lastName: 'Fernández',
    specialty: 'Cirugía',
  },
  {
    ci: 67890123,
    firstName: 'Dr. Luis',
    lastName: 'García',
    specialty: 'Hepatología',
  },
];

/**
 * 2 Casos de trasplante
 */
const testCases = [
  {
    patientId: 12345678, // Juan Pérez
    surgeryDate: new Date('2024-03-15'),
    startAt: new Date('2024-03-15T08:00:00Z'),
    endAt: new Date('2024-03-15T14:30:00Z'),
    duration: 390, // 6.5 horas
    isRetransplant: false,
    isHepatoRenal: false,
    isOptimalDonor: true,
    coldIschemiaTime: 360,
    warmIschemiaTime: 45,
    listingDate: new Date('2023-09-10'),
    transplantDate: new Date('2024-03-15'),
    observations: 'Trasplante sin complicaciones intraoperatorias',
  },
  {
    patientId: 23456789, // María González
    surgeryDate: new Date('2024-06-20'),
    startAt: new Date('2024-06-20T09:00:00Z'),
    endAt: new Date('2024-06-20T16:00:00Z'),
    duration: 420, // 7 horas
    isRetransplant: true,
    isHepatoRenal: true,
    isOptimalDonor: false,
    coldIschemiaTime: 420,
    warmIschemiaTime: 60,
    listingDate: new Date('2023-12-05'),
    transplantDate: new Date('2024-06-20'),
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
    etiology3: null,
    observations: 'Función renal preservada',
  },
  {
    // Para caso 2 (María González)
    evaluationDate: new Date('2024-06-15'),
    meld: 32,
    meldNa: 35,
    child: 'C',
    etiology1: 'Cirrosis biliar primaria',
    etiology2: null,
    etiology3: null,
    observations: 'Insuficiencia renal crónica asociada',
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
    fc: 75,
    sys: 120,
    dia: 70,
    map: 87,
    cvp: 8,
    peep: 5,
    fio2: 50,
    vt: 450,
    observations: 'Inducción sin incidentes',
  },
  {
    caseIndex: 0,
    phase: 'INDUCCION',
    timestamp: new Date('2024-03-15T08:30:00Z'),
    fc: 78,
    sys: 115,
    dia: 68,
    map: 84,
    cvp: 7,
    peep: 5,
    fio2: 50,
    vt: 450,
    observations: null,
  },

  // Fase DISECCION (2 snapshots)
  {
    caseIndex: 0,
    phase: 'DISECCION',
    timestamp: new Date('2024-03-15T09:00:00Z'),
    fc: 82,
    sys: 110,
    dia: 65,
    map: 80,
    cvp: 9,
    peep: 5,
    fio2: 50,
    vt: 450,
    observations: 'Disección portal',
  },
  {
    caseIndex: 0,
    phase: 'DISECCION',
    timestamp: new Date('2024-03-15T09:45:00Z'),
    fc: 85,
    sys: 108,
    dia: 64,
    map: 79,
    cvp: 10,
    peep: 5,
    fio2: 50,
    vt: 450,
    observations: null,
  },

  // Fase ANHEPATICA_INICIAL (2 snapshots)
  {
    caseIndex: 0,
    phase: 'ANHEPATICA_INICIAL',
    timestamp: new Date('2024-03-15T10:30:00Z'),
    fc: 88,
    sys: 105,
    dia: 62,
    map: 76,
    cvp: 12,
    peep: 6,
    fio2: 60,
    vt: 450,
    observations: 'Clampeo portal',
  },
  {
    caseIndex: 0,
    phase: 'ANHEPATICA_INICIAL',
    timestamp: new Date('2024-03-15T11:00:00Z'),
    fc: 90,
    sys: 102,
    dia: 60,
    map: 74,
    cvp: 13,
    peep: 6,
    fio2: 60,
    vt: 450,
    observations: 'Estable',
  },

  // Fase PRE_REPERFUSION (1 snapshot)
  {
    caseIndex: 0,
    phase: 'PRE_REPERFUSION',
    timestamp: new Date('2024-03-15T11:30:00Z'),
    fc: 92,
    sys: 100,
    dia: 58,
    map: 72,
    cvp: 14,
    peep: 6,
    fio2: 60,
    vt: 450,
    observations: 'Preparando reperfusión',
  },

  // Fase POST_REPERFUSION_INICIAL (2 snapshots)
  {
    caseIndex: 0,
    phase: 'POST_REPERFUSION_INICIAL',
    timestamp: new Date('2024-03-15T12:00:00Z'),
    fc: 95,
    sys: 95,
    dia: 55,
    map: 68,
    cvp: 15,
    peep: 7,
    fio2: 70,
    vt: 450,
    observations: 'Post-reperfusión inmediata, hipotensión leve',
  },
  {
    caseIndex: 0,
    phase: 'POST_REPERFUSION_INICIAL',
    timestamp: new Date('2024-03-15T12:30:00Z'),
    fc: 88,
    sys: 105,
    dia: 62,
    map: 76,
    cvp: 12,
    peep: 6,
    fio2: 60,
    vt: 450,
    observations: 'Recuperación hemodinámica',
  },

  // Fase FIN_VIA_BILIAR (1 snapshot)
  {
    caseIndex: 0,
    phase: 'FIN_VIA_BILIAR',
    timestamp: new Date('2024-03-15T13:30:00Z'),
    fc: 82,
    sys: 112,
    dia: 66,
    map: 81,
    cvp: 10,
    peep: 5,
    fio2: 50,
    vt: 450,
    observations: 'Anastomosis biliar completada',
  },

  // Caso 2 - María González (10 snapshots)
  // Fase INDUCCION (2 snapshots)
  {
    caseIndex: 1,
    phase: 'INDUCCION',
    timestamp: new Date('2024-06-20T09:15:00Z'),
    fc: 92,
    sys: 130,
    dia: 80,
    map: 97,
    cvp: 10,
    peep: 5,
    fio2: 60,
    vt: 400,
    observations: 'Paciente retrasplante, hipertensión portal severa',
  },
  {
    caseIndex: 1,
    phase: 'INDUCCION',
    timestamp: new Date('2024-06-20T09:30:00Z'),
    fc: 88,
    sys: 125,
    dia: 75,
    map: 92,
    cvp: 9,
    peep: 5,
    fio2: 60,
    vt: 400,
    observations: null,
  },

  // Fase DISECCION (2 snapshots)
  {
    caseIndex: 1,
    phase: 'DISECCION',
    timestamp: new Date('2024-06-20T10:00:00Z'),
    fc: 95,
    sys: 118,
    dia: 70,
    map: 86,
    cvp: 11,
    peep: 6,
    fio2: 60,
    vt: 400,
    observations: 'Disección dificultosa por adherencias',
  },
  {
    caseIndex: 1,
    phase: 'DISECCION',
    timestamp: new Date('2024-06-20T11:00:00Z'),
    fc: 98,
    sys: 115,
    dia: 68,
    map: 84,
    cvp: 12,
    peep: 6,
    fio2: 60,
    vt: 400,
    observations: 'Sangrado moderado controlado',
  },

  // Fase ANHEPATICA_INICIAL (2 snapshots)
  {
    caseIndex: 1,
    phase: 'ANHEPATICA_INICIAL',
    timestamp: new Date('2024-06-20T12:00:00Z'),
    fc: 102,
    sys: 108,
    dia: 64,
    map: 79,
    cvp: 14,
    peep: 7,
    fio2: 70,
    vt: 400,
    observations: 'Hepatectomía completada',
  },
  {
    caseIndex: 1,
    phase: 'ANHEPATICA_INICIAL',
    timestamp: new Date('2024-06-20T12:45:00Z'),
    fc: 105,
    sys: 105,
    dia: 62,
    map: 76,
    cvp: 15,
    peep: 7,
    fio2: 70,
    vt: 400,
    observations: 'Fase anhepática prolongada',
  },

  // Fase PRE_REPERFUSION (1 snapshot)
  {
    caseIndex: 1,
    phase: 'PRE_REPERFUSION',
    timestamp: new Date('2024-06-20T13:15:00Z'),
    fc: 108,
    sys: 102,
    dia: 60,
    map: 74,
    cvp: 16,
    peep: 7,
    fio2: 80,
    vt: 400,
    observations: 'Anastomosis vascular completadas',
  },

  // Fase POST_REPERFUSION_INICIAL (2 snapshots)
  {
    caseIndex: 1,
    phase: 'POST_REPERFUSION_INICIAL',
    timestamp: new Date('2024-06-20T13:45:00Z'),
    fc: 112,
    sys: 92,
    dia: 52,
    map: 65,
    cvp: 18,
    peep: 8,
    fio2: 90,
    vt: 400,
    observations: 'Síndrome post-reperfusión, hipotensión severa',
  },
  {
    caseIndex: 1,
    phase: 'POST_REPERFUSION_INICIAL',
    timestamp: new Date('2024-06-20T14:15:00Z'),
    fc: 98,
    sys: 102,
    dia: 60,
    map: 74,
    cvp: 14,
    peep: 7,
    fio2: 70,
    vt: 400,
    observations: 'Recuperación hemodinámica con soporte vasoactivo',
  },

  // Fase FIN_VIA_BILIAR (1 snapshot)
  {
    caseIndex: 1,
    phase: 'FIN_VIA_BILIAR',
    timestamp: new Date('2024-06-20T15:30:00Z'),
    fc: 90,
    sys: 108,
    dia: 64,
    map: 79,
    cvp: 12,
    peep: 6,
    fio2: 60,
    vt: 400,
    observations: 'Anastomosis biliar finalizada',
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
    role: 'Anestesiólogo Principal',
  },
  {
    caseIndex: 0,
    clinicianCi: 56789012, // Dra. Ana Fernández
    role: 'Cirujano Principal',
  },

  // Caso 2 team
  {
    caseIndex: 1,
    clinicianCi: 45678901, // Dr. Carlos Martínez
    role: 'Anestesiólogo Principal',
  },
  {
    caseIndex: 1,
    clinicianCi: 67890123, // Dr. Luis García
    role: 'Hepatólogo Consultor',
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
