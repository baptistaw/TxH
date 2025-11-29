// prisma/seeds/catalogs.js - Seed de catálogos dinámicos
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CATALOGS = [
  {
    name: 'Sex',
    label: 'Sexo',
    description: 'Sexo biológico del paciente',
    items: [
      { code: 'M', label: 'Masculino', order: 1 },
      { code: 'F', label: 'Femenino', order: 2 },
      { code: 'O', label: 'Otro/No especificado', order: 3 },
    ],
  },
  {
    name: 'ASA',
    label: 'Clasificación ASA',
    description: 'American Society of Anesthesiologists Physical Status Classification',
    items: [
      { code: 'I', label: 'ASA I - Paciente sano', order: 1 },
      { code: 'II', label: 'ASA II - Enfermedad sistémica leve', order: 2 },
      { code: 'III', label: 'ASA III - Enfermedad sistémica grave', order: 3 },
      { code: 'IV', label: 'ASA IV - Enfermedad sistémica grave amenazante', order: 4 },
      { code: 'V', label: 'ASA V - Moribundo', order: 5 },
      { code: 'VI', label: 'ASA VI - Muerte cerebral', order: 6 },
    ],
  },
  {
    name: 'Provider',
    label: 'Prestador de Salud',
    description: 'Prestador de salud del paciente',
    items: [
      { code: 'ASSE', label: 'ASSE', order: 1 },
      { code: 'FEMI', label: 'FEMI', order: 2 },
      { code: 'CASMU', label: 'CASMU', order: 3 },
      { code: 'MP', label: 'Médica Uruguaya', order: 4 },
      { code: 'OTRA', label: 'Otra', order: 5 },
    ],
  },
  {
    name: 'ProcedureType',
    label: 'Tipo de Procedimiento',
    description: 'Tipos de procedimientos no-trasplante',
    items: [
      { code: 'BIOPSIA_HEPATICA', label: 'Biopsia Hepática', order: 1 },
      { code: 'BIOPSIA_PERCUTANEA', label: 'Biopsia Percutánea', order: 2 },
      { code: 'FGC_DIAGNOSTICA', label: 'FGC Diagnóstica', order: 3 },
      { code: 'FGC_BIOPSIA', label: 'FGC con Biopsia', order: 4 },
      { code: 'CER', label: 'CER', order: 5 },
      { code: 'FBC_BIOPSIA', label: 'FBC con Biopsia', order: 6 },
      { code: 'OTRO', label: 'Otro', order: 7 },
    ],
  },
  {
    name: 'HemodynamicStatus',
    label: 'Estado Hemodinámico',
    description: 'Estado hemodinámico del paciente',
    items: [
      { code: 'ESTABLE', label: 'Estable', order: 1 },
      { code: 'INESTABLE', label: 'Inestable', order: 2 },
      { code: 'CRITICO', label: 'Crítico', order: 3 },
    ],
  },
  {
    name: 'AirwayManagement',
    label: 'Manejo de Vía Aérea',
    description: 'Tipo de vía aérea utilizada',
    items: [
      { code: 'VAN', label: 'Vía aérea natural', order: 1 },
      { code: 'IOT', label: 'Intubación orotraqueal', order: 2 },
      { code: 'TQT', label: 'Traqueostomía', order: 3 },
      { code: 'MF', label: 'Máscara facial', order: 4 },
      { code: 'ML', label: 'Máscara laríngea', order: 5 },
    ],
  },
  {
    name: 'VentilationPattern',
    label: 'Patrón Ventilatorio',
    description: 'Patrón ventilatorio del paciente',
    items: [
      { code: 'VAN', label: 'No ventilación', order: 1 },
      { code: 'VESP', label: 'Ventilación espontánea', order: 2 },
      { code: 'ARM', label: 'Asistencia respiratoria mecánica', order: 3 },
      { code: 'MF_ESPONTANEA', label: 'Máscara facial espontánea', order: 4 },
    ],
  },
  {
    name: 'AnesthesiaTechnique',
    label: 'Técnica Anestésica',
    description: 'Técnica anestésica utilizada',
    items: [
      { code: 'AGB', label: 'Anestesia general balanceada', order: 1 },
      { code: 'AL_POTENCIADA', label: 'Anestesia local potenciada', order: 2 },
      { code: 'SEDACION_LEVE', label: 'Sedación leve-moderada', order: 3 },
      { code: 'SEDACION_PROFUNDA', label: 'Sedación profunda', order: 4 },
      { code: 'REGIONAL', label: 'Anestesia regional', order: 5 },
      { code: 'COMBINADA', label: 'Anestesia combinada', order: 6 },
    ],
  },
  {
    name: 'VentilationMode',
    label: 'Modo de Ventilación',
    description: 'Modo de ventilación mecánica',
    items: [
      { code: 'ESPONTANEA', label: 'Ventilación espontánea', order: 1 },
      { code: 'VC', label: 'Volumen controlado', order: 2 },
      { code: 'PC', label: 'Presión controlada', order: 3 },
      { code: 'SIMV', label: 'Ventilación intermitente sincronizada', order: 4 },
      { code: 'PSV', label: 'Presión de soporte', order: 5 },
      { code: 'CPAP', label: 'Presión positiva continua', order: 6 },
      { code: 'OTRO', label: 'Otro', order: 7 },
    ],
  },
  {
    name: 'AirwayGrade',
    label: 'Grado Cormack-Lehane',
    description: 'Clasificación de dificultad de intubación',
    items: [
      { code: 'I', label: 'Grado I - Glotis completamente visible', order: 1 },
      { code: 'II', label: 'Grado II - Glotis parcialmente visible', order: 2 },
      { code: 'III', label: 'Grado III - Solo epiglotis visible', order: 3 },
      { code: 'IV', label: 'Grado IV - Ni epiglotis visible', order: 4 },
    ],
  },
  {
    name: 'FunctionalClass',
    label: 'Clase Funcional NYHA',
    description: 'Clasificación funcional de la New York Heart Association',
    items: [
      { code: 'I', label: 'Clase I - Sin limitación', order: 1 },
      { code: 'II', label: 'Clase II - Limitación leve', order: 2 },
      { code: 'III', label: 'Clase III - Limitación moderada', order: 3 },
      { code: 'IV', label: 'Clase IV - Limitación severa', order: 4 },
    ],
  },
  {
    name: 'ProcedureLocation',
    label: 'Ubicación del Procedimiento',
    description: 'Ubicación donde se realiza el procedimiento',
    items: [
      { code: 'BQ', label: 'Bloque Quirúrgico', order: 1 },
      { code: 'CTI', label: 'CTI', order: 2 },
      { code: 'SALA', label: 'Sala', order: 3 },
      { code: 'OTRO', label: 'Otro', order: 4 },
    ],
  },
];

async function seedCatalogs() {
  console.log('🌱 Seeding catalogs...');

  for (const catalogData of CATALOGS) {
    const { items, ...catalogInfo } = catalogData;

    // Upsert catalog
    const catalog = await prisma.catalog.upsert({
      where: { name: catalogInfo.name },
      update: catalogInfo,
      create: catalogInfo,
    });

    console.log(`  ✓ Catalog: ${catalog.label}`);

    // Upsert items
    for (const item of items) {
      await prisma.catalogItem.upsert({
        where: {
          catalogId_code: {
            catalogId: catalog.id,
            code: item.code,
          },
        },
        update: item,
        create: {
          ...item,
          catalogId: catalog.id,
        },
      });
    }

    console.log(`    - Added ${items.length} items`);
  }

  console.log('✅ Catalogs seeded successfully!');
}

module.exports = { seedCatalogs };

// Si se ejecuta directamente
if (require.main === module) {
  seedCatalogs()
    .catch((e) => {
      console.error('❌ Error seeding catalogs:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
