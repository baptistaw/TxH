// scripts/populate-antibiotic-catalog.js
// Poblar catálogo de antibióticos según protocolo TxH

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
};

const ANTIBIOTICS = [
  // Betalactámicos
  {
    code: 'PTZ',
    name: 'Piperacilina/Tazobactam',
    category: 'Betalactámico - Inhibidor de betalactamasa',
    dosages: [
      { dose: '4.5 g IV', indication: 'Dosis estándar', route: 'IV' },
      { dose: '13.5 g IV en BIC (8h)', indication: 'Infusión continua intraoperatoria', route: 'IV' },
    ],
    description: 'Antibiótico de amplio espectro, primera línea en trasplante hepático',
    active: true,
  },

  // Aminoglucósidos
  {
    code: 'GENTAMICINA',
    name: 'Gentamicina',
    category: 'Aminoglucósido',
    dosages: [
      { dose: '5 mg/kg IV', indication: 'Dosis pre-incisión', route: 'IV' },
      { dose: '2 mg/kg IV', indication: 'Dosis adicional por sangrado >1500ml', route: 'IV' },
    ],
    description: 'Aminoglucósido para cobertura gram negativo',
    active: true,
  },
  {
    code: 'AMIKACINA',
    name: 'Amikacina',
    category: 'Aminoglucósido',
    dosages: [
      { dose: '15 mg/kg IV', indication: 'Trasplante hepatorrenal', route: 'IV' },
    ],
    description: 'Aminoglucósido para trasplante hepatorrenal',
    active: true,
  },

  // Fluoroquinolonas
  {
    code: 'CIPROFLOXACINA',
    name: 'Ciprofloxacina',
    category: 'Fluoroquinolona',
    dosages: [
      { dose: '400 mg IV c/8h', indication: 'Alergia a betalactámicos / Trasplante hepatorrenal', route: 'IV' },
      { dose: '200 mg IV c/6h', indication: 'Postoperatorio trasplante hepatorrenal', route: 'IV' },
    ],
    description: 'Fluoroquinolona de amplio espectro',
    active: true,
  },

  // Otros antibióticos comunes
  {
    code: 'UNASYM',
    name: 'Ampicilina/Sulbactam (Unasym)',
    category: 'Betalactámico - Inhibidor de betalactamasa',
    dosages: [
      { dose: '3 g IV c/6-8h', indication: 'Profilaxis general', route: 'IV' },
    ],
    description: 'Combinación de ampicilina con inhibidor de betalactamasa',
    active: true,
  },
  {
    code: 'CEFTRIAXONA',
    name: 'Ceftriaxona',
    category: 'Cefalosporina 3ra generación',
    dosages: [
      { dose: '1-2 g IV c/12-24h', indication: 'Profilaxis / Tratamiento', route: 'IV' },
    ],
    description: 'Cefalosporina de amplio espectro',
    active: true,
  },
  {
    code: 'VANCOMICINA',
    name: 'Vancomicina',
    category: 'Glicopéptido',
    dosages: [
      { dose: '15-20 mg/kg IV c/8-12h', indication: 'Cobertura SAMR', route: 'IV' },
    ],
    description: 'Para colonización por Staphylococcus aureus meticilino-resistente',
    active: true,
  },
  {
    code: 'MEROPENEM',
    name: 'Meropenem',
    category: 'Carbapenem',
    dosages: [
      { dose: '1 g IV c/8h', indication: 'Cobertura XDR / Multirresistentes', route: 'IV' },
    ],
    description: 'Carbapenem de amplio espectro para gérmenes multirresistentes',
    active: true,
  },
];

async function populateAntibiotics() {
  console.log(`${colors.cyan}
╔══════════════════════════════════════════════════════════════════╗
║       POBLACIÓN DE CATÁLOGO DE ANTIBIÓTICOS - PROTOCOLO TxH      ║
╚══════════════════════════════════════════════════════════════════╝
${colors.reset}\n`);

  let created = 0;
  let updated = 0;

  for (const atb of ANTIBIOTICS) {
    try {
      const { dosages, ...antibioticData } = atb;

      const existing = await prisma.antibiotic.findUnique({
        where: { code: atb.code }
      });

      if (existing) {
        await prisma.antibiotic.update({
          where: { code: atb.code },
          data: {
            ...antibioticData,
            dosage: dosages.map(d => `${d.dose} - ${d.indication}`).join(' | '),
          }
        });
        console.log(`${colors.yellow}   ↻ ${atb.name} (actualizado)${colors.reset}`);
        updated++;
      } else {
        await prisma.antibiotic.create({
          data: {
            ...antibioticData,
            dosage: dosages.map(d => `${d.dose} - ${d.indication}`).join(' | '),
          }
        });
        console.log(`${colors.green}   ✓ ${atb.name}${colors.reset}`);
        created++;
      }
    } catch (error) {
      console.error(`${colors.red}   ✗ Error con ${atb.name}: ${error.message}${colors.reset}`);
    }
  }

  console.log(`\n${colors.green}✓ Proceso completado${colors.reset}`);
  console.log(`  Creados:      ${created}`);
  console.log(`  Actualizados: ${updated}`);
  console.log(`  Total:        ${ANTIBIOTICS.length}\n`);

  await prisma.$disconnect();
}

populateAntibiotics();
