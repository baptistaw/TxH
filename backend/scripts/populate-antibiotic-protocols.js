// scripts/populate-antibiotic-protocols.js
// Poblar protocolos de antibióticos profilácticos según protocolo TxH

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
};

const PROTOCOLS = [
  // ============================================================================
  // 1. PROFILAXIS ESTÁNDAR
  // ============================================================================
  {
    code: 'STANDARD_HEPATIC',
    name: 'Profilaxis estándar trasplante hepático',
    type: 'hepatico',
    isStandard: true,
    forAllergy: false,
    description: 'Paciente NO colonizado previamente por enterobacteria productora de BLEE resistente a PTZ y Gentamicina o carbapenemasa',
    phases: [
      {
        phase: 'pre_incision',
        order: 1,
        timing: '30-60 min antes de incisión',
        antibiotics: [
          {
            antibioticCode: 'PTZ',
            dose: '4.5 g',
            frequency: 'dosis única',
            route: 'IV',
            order: 1,
          },
          {
            antibioticCode: 'GENTAMICINA',
            dose: '5 mg/kg',
            frequency: 'dosis única',
            route: 'IV',
            order: 2,
          },
        ],
      },
      {
        phase: 'intraoperatorio',
        order: 2,
        duration: 'Durante toda la cirugía',
        antibiotics: [
          {
            antibioticCode: 'PTZ',
            dose: '13.5 g',
            frequency: 'BIC',
            route: 'IV',
            notes: '3 amp. de 4.5 g diluido en 250 cc SG 5% a pasar en 8 horas',
            order: 1,
          },
        ],
      },
      {
        phase: 'intraoperatorio',
        order: 3,
        condition: 'Si cirugía se prolonga > 10 horas',
        antibiotics: [
          {
            antibioticCode: 'PTZ',
            dose: '4.5 g',
            frequency: 'dosis adicional',
            route: 'IV',
            order: 1,
          },
        ],
      },
      {
        phase: 'intraoperatorio',
        order: 4,
        condition: 'Si sangrado > 1500 ml',
        antibiotics: [
          {
            antibioticCode: 'PTZ',
            dose: '4.5 g',
            frequency: 'dosis adicional',
            route: 'IV',
            order: 1,
          },
          {
            antibioticCode: 'GENTAMICINA',
            dose: '2 mg/kg',
            frequency: 'dosis adicional',
            route: 'IV',
            order: 2,
          },
        ],
      },
      {
        phase: 'postoperatorio',
        order: 5,
        duration: '24 horas',
        antibiotics: [
          {
            antibioticCode: 'PTZ',
            dose: '4.5 g',
            frequency: 'c/8h',
            route: 'IV',
            order: 1,
          },
        ],
      },
    ],
  },

  // ============================================================================
  // 2. PACIENTE CON ALERGIA A BETALACTÁMICOS
  // ============================================================================
  {
    code: 'ALLERGY_BETALACTAM',
    name: 'Protocolo para alergia a betalactámicos',
    type: 'hepatico',
    isStandard: false,
    forAllergy: true,
    description: 'Paciente con antecedente de alergia a betalactámicos',
    phases: [
      {
        phase: 'pre_incision',
        order: 1,
        timing: '30-60 min antes de incisión',
        antibiotics: [
          {
            antibioticCode: 'GENTAMICINA',
            dose: '5 mg/kg',
            frequency: 'dosis única',
            route: 'IV',
            order: 1,
          },
          {
            antibioticCode: 'CIPROFLOXACINA',
            dose: '400 mg',
            frequency: 'dosis única',
            route: 'IV',
            order: 2,
          },
        ],
      },
    ],
  },

  // ============================================================================
  // 3. TRASPLANTE HEPATORRENAL
  // ============================================================================
  {
    code: 'HEPATORENAL',
    name: 'Protocolo trasplante hepatorrenal',
    type: 'hepatorrenal',
    isStandard: false,
    forAllergy: false,
    description: 'Protocolo específico para trasplante hepatorrenal simultáneo',
    phases: [
      {
        phase: 'pre_incision',
        order: 1,
        timing: '30-60 min antes de incisión',
        antibiotics: [
          {
            antibioticCode: 'PTZ',
            dose: '4.5 g',
            frequency: 'dosis única',
            route: 'IV',
            order: 1,
          },
          {
            antibioticCode: 'AMIKACINA',
            dose: '15 mg/kg',
            frequency: 'dosis única',
            route: 'IV',
            order: 2,
          },
          {
            antibioticCode: 'CIPROFLOXACINA',
            dose: '400 mg',
            frequency: 'c/8h',
            route: 'IV',
            order: 3,
          },
        ],
      },
      {
        phase: 'intraoperatorio',
        order: 2,
        condition: 'Si cirugía dura más de 6 horas',
        antibiotics: [
          {
            antibioticCode: 'PTZ',
            dose: '4.5 g',
            frequency: 'dosis adicional',
            route: 'IV',
            order: 1,
          },
        ],
      },
      {
        phase: 'postoperatorio',
        order: 3,
        duration: '24 horas',
        antibiotics: [
          {
            antibioticCode: 'CIPROFLOXACINA',
            dose: '200 mg',
            frequency: 'c/6h',
            route: 'IV',
            order: 1,
          },
          {
            antibioticCode: 'PTZ',
            dose: '4.5 g',
            frequency: 'c/8h',
            route: 'IV',
            order: 2,
          },
        ],
      },
    ],
  },

  // ============================================================================
  // 4. SITUACIONES ESPECIALES (SAMR, XDR)
  // ============================================================================
  {
    code: 'SPECIAL_SAMR',
    name: 'Protocolo para colonización por SAMR',
    type: 'especial',
    isStandard: false,
    forAllergy: false,
    forColonization: 'SAMR',
    description: 'Para pacientes con colonización nasal por Staphylococcus aureus meticilino-resistente. Se analiza caso a caso.',
    phases: [
      {
        phase: 'pre_incision',
        order: 1,
        timing: '30-60 min antes de incisión',
        description: 'Se ajusta según análisis individual del caso',
        antibiotics: [
          {
            antibioticCode: 'VANCOMICINA',
            dose: '15-20 mg/kg',
            frequency: 'dosis única',
            route: 'IV',
            notes: 'Ajustar según función renal',
            order: 1,
          },
        ],
      },
    ],
  },
  {
    code: 'SPECIAL_XDR',
    name: 'Protocolo para colonización rectal por XDR',
    type: 'especial',
    isStandard: false,
    forAllergy: false,
    forColonization: 'XDR',
    description: 'Para pacientes con colonización rectal por gérmenes extremadamente resistentes. Se analiza caso a caso.',
    phases: [
      {
        phase: 'pre_incision',
        order: 1,
        timing: '30-60 min antes de incisión',
        description: 'Se ajusta según antibiograma y análisis individual',
        antibiotics: [
          {
            antibioticCode: 'MEROPENEM',
            dose: '1 g',
            frequency: 'c/8h',
            route: 'IV',
            notes: 'Cobertura para gérmenes multirresistentes',
            order: 1,
          },
        ],
      },
    ],
  },
];

async function populateProtocols() {
  console.log(`${colors.cyan}
╔══════════════════════════════════════════════════════════════════╗
║     POBLACIÓN DE PROTOCOLOS DE ANTIBIÓTICOS - PROTOCOLO TxH      ║
╚══════════════════════════════════════════════════════════════════╝
${colors.reset}\n`);

  let created = 0;
  let updated = 0;

  for (const protocolData of PROTOCOLS) {
    try {
      const { phases, ...protocolInfo } = protocolData;

      // Verificar si existe
      const existing = await prisma.antibioticProtocol.findUnique({
        where: { code: protocolData.code },
        include: { phases: true },
      });

      let protocol;

      if (existing) {
        // Eliminar fases antiguas
        await prisma.protocolPhase.deleteMany({
          where: { protocolId: existing.id },
        });

        // Actualizar protocolo
        protocol = await prisma.antibioticProtocol.update({
          where: { code: protocolData.code },
          data: protocolInfo,
        });

        console.log(`${colors.yellow}   ↻ ${protocolData.name} (actualizado)${colors.reset}`);
        updated++;
      } else {
        // Crear nuevo protocolo
        protocol = await prisma.antibioticProtocol.create({
          data: protocolInfo,
        });

        console.log(`${colors.green}   ✓ ${protocolData.name}${colors.reset}`);
        created++;
      }

      // Crear fases
      for (const phaseData of phases) {
        const { antibiotics, ...phaseInfo } = phaseData;

        const phase = await prisma.protocolPhase.create({
          data: {
            ...phaseInfo,
            protocolId: protocol.id,
          },
        });

        // Crear antibióticos de la fase
        for (const antibioticData of antibiotics) {
          await prisma.protocolAntibiotic.create({
            data: {
              ...antibioticData,
              phaseId: phase.id,
            },
          });
        }
      }

      console.log(`      → ${phases.length} fases creadas`);
    } catch (error) {
      console.error(
        `${colors.red}   ✗ Error con ${protocolData.name}: ${error.message}${colors.reset}`
      );
      console.error(error);
    }
  }

  console.log(`\n${colors.green}✓ Proceso completado${colors.reset}`);
  console.log(`  Creados:      ${created}`);
  console.log(`  Actualizados: ${updated}`);
  console.log(`  Total:        ${PROTOCOLS.length}\n`);

  // Mostrar resumen
  console.log(`${colors.cyan}Resumen de protocolos:${colors.reset}\n`);

  const allProtocols = await prisma.antibioticProtocol.findMany({
    include: {
      phases: {
        include: {
          antibiotics: true,
        },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  for (const p of allProtocols) {
    console.log(`${colors.green}${p.name}${colors.reset}`);
    console.log(`  Código: ${p.code}`);
    console.log(`  Tipo: ${p.type}`);
    console.log(`  Fases: ${p.phases.length}`);

    for (const phase of p.phases) {
      const phaseLabel = phase.phase === 'pre_incision' ? 'Pre-incisión' :
                        phase.phase === 'intraoperatorio' ? 'Intraoperatorio' :
                        'Postoperatorio';
      console.log(`    • ${phaseLabel}${phase.condition ? ` (${phase.condition})` : ''}`);

      for (const atb of phase.antibiotics) {
        console.log(`      - ${atb.antibioticCode}: ${atb.dose} ${atb.frequency || ''}`);
      }
    }
    console.log();
  }

  await prisma.$disconnect();
}

populateProtocols();
