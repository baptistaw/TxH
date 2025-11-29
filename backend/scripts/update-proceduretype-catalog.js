// scripts/update-proceduretype-catalog.js
// Actualiza el catálogo de tipos de procedimientos

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mapeo completo de códigos a nombres descriptivos
const PROCEDURE_TYPES = [
  // Biopsias hepáticas
  { code: 'BIOPSIA_HEPATICA_PERCUTANEA', label: 'Biopsia hepática percutánea', order: 10 },
  { code: 'BIOPSIA_HEPATICA_TRANSYUGULAR', label: 'Biopsia hepática transyugular', order: 11 },
  { code: 'BIOPSIA_HEPATICA_PROTOCOLO', label: 'Biopsia de protocolo post-trasplante', order: 12 },

  // Endoscopías digestivas
  { code: 'FGC_DIAGNOSTICA', label: 'Fibrogastroscopía diagnóstica', order: 20 },
  { code: 'FGC_TERAPEUTICA', label: 'Fibrogastroscopía terapéutica', order: 21 },
  { code: 'FGC_LIGADURA_VARICES', label: 'Ligadura de várices esofágicas', order: 22 },
  { code: 'FGC_ESCLEROTERAPIA', label: 'Escleroterapia de várices', order: 23 },
  { code: 'FBC_DIAGNOSTICA', label: 'Fibrocolonoscopía diagnóstica', order: 24 },
  { code: 'FBC_BIOPSIA', label: 'Fibrocolonoscopía con biopsia', order: 25 },

  // CPRE y vía biliar
  { code: 'CPRE_DIAGNOSTICA', label: 'CPRE diagnóstica', order: 30 },
  { code: 'CPRE_ESFINTEROTOMIA', label: 'CPRE con esfinterotomía', order: 31 },
  { code: 'CPRE_PROTESIS_BILIAR', label: 'CPRE con colocación de prótesis biliar', order: 32 },
  { code: 'CPRE_DILATACION_ESTENOSIS', label: 'CPRE con dilatación de estenosis', order: 33 },
  { code: 'COLANGIOGRAFIA_TRANSPARIETOHEPATICA', label: 'Colangiografía transparietohepática', order: 34 },

  // Procedimientos intervencionistas
  { code: 'TIPS', label: 'TIPS - Shunt portosistémico intrahepático transyugular', order: 40 },
  { code: 'PARACENTESIS_DIAGNOSTICA', label: 'Paracentesis diagnóstica', order: 41 },
  { code: 'PARACENTESIS_EVACUADORA', label: 'Paracentesis evacuadora', order: 42 },
  { code: 'TORACENTESIS', label: 'Toracentesis', order: 43 },
  { code: 'ARTERIOGRAFIA_HEPATICA', label: 'Arteriografía hepática', order: 44 },
  { code: 'EMBOLIZACION_ARTERIAL', label: 'Embolización arterial', order: 45 },
  { code: 'QUIMIOEMBOLIZACION_TACE', label: 'Quimioembolización transarterial (TACE)', order: 46 },
  { code: 'RADIOFRECUENCIA_HEPATICA', label: 'Ablación por radiofrecuencia hepática', order: 47 },

  // Accesos vasculares y diálisis
  { code: 'COLOCACION_CVC', label: 'Colocación de catéter venoso central', order: 50 },
  { code: 'COLOCACION_CATETER_DIALISIS', label: 'Colocación de catéter de diálisis', order: 51 },
  { code: 'HEMODIALISIS', label: 'Sesión de hemodiálisis', order: 52 },
  { code: 'DIALISIS_PERITONEAL', label: 'Diálisis peritoneal', order: 53 },

  // Cirugías abdominales
  { code: 'LAPAROTOMIA_EXPLORADORA', label: 'Laparotomía exploradora', order: 60 },
  { code: 'DRENAJE_ABSCESO', label: 'Drenaje de absceso', order: 61 },
  { code: 'HERNIOPLASTIA', label: 'Reparación de hernia', order: 62 },
  { code: 'COLECISTECTOMIA', label: 'Colecistectomía', order: 63 },
  { code: 'ESPLENECTOMIA', label: 'Esplenectomía', order: 64 },
  { code: 'NEFRECTOMIA', label: 'Nefrectomía', order: 65 },

  // Cirugías torácicas
  { code: 'TORACOTOMIA', label: 'Toracotomía', order: 70 },
  { code: 'VIDEOTORACOSCOPIA', label: 'Videotoracoscopía (VATS)', order: 71 },
  { code: 'DRENAJE_PLEURAL', label: 'Drenaje pleural', order: 72 },

  // Procedimientos cardíacos
  { code: 'CORONARIOGRAFIA', label: 'Coronariografía', order: 80 },
  { code: 'ANGIOPLASTIA', label: 'Angioplastia coronaria', order: 81 },
  { code: 'ECOCARDIOGRAMA_TE', label: 'Ecocardiograma transesofágico', order: 82 },

  // Procedimientos urológicos
  { code: 'CISTOSCOPIA', label: 'Cistoscopía', order: 90 },
  { code: 'NEFROSTOMIA_PERCUTANEA', label: 'Nefrostomía percutánea', order: 91 },

  // Otros procedimientos quirúrgicos
  { code: 'TRAQUEOSTOMIA', label: 'Traqueostomía', order: 100 },
  { code: 'GASTROSTOMIA_PERCUTANEA', label: 'Gastrostomía percutánea (PEG)', order: 101 },
  { code: 'CIRUGIA_ORTOPEDICA', label: 'Cirugía ortopédica', order: 102 },
  { code: 'CIRUGIA_VASCULAR', label: 'Cirugía vascular', order: 103 },
  { code: 'CIRUGIA_NEUROLOGICA', label: 'Cirugía neurológica', order: 104 },
  { code: 'PROCEDIMIENTO_DENTAL', label: 'Procedimiento odontológico', order: 105 },

  // Trasplante
  { code: 'TRASPLANTE_HEPATICO', label: 'Trasplante hepático', order: 200 },
  { code: 'RETRASPLANTE_HEPATICO', label: 'Retrasplante hepático', order: 201 },
  { code: 'TRASPLANTE_RENAL', label: 'Trasplante renal', order: 202 },

  // Otros
  { code: 'CER', label: 'CER', order: 998 },
  { code: 'OTRO', label: 'Otro procedimiento', order: 999 },
];

async function updateProcedureTypeCatalog() {
  console.log('\n📋 ACTUALIZACIÓN DE CATÁLOGO DE TIPOS DE PROCEDIMIENTO\n');
  console.log('='.repeat(80));

  try {
    // Buscar o crear catálogo ProcedureType
    let catalog = await prisma.catalog.findFirst({
      where: { name: 'ProcedureType' },
      include: { items: true }
    });

    if (!catalog) {
      console.log('Creando catálogo ProcedureType...');
      catalog = await prisma.catalog.create({
        data: {
          name: 'ProcedureType',
          label: 'Tipo de Procedimiento',
          description: 'Tipos de procedimientos médicos para pacientes en lista de espera y trasplantados',
          active: true
        },
        include: { items: true }
      });
    }

    console.log(`\nCatálogo encontrado: ${catalog.label}`);
    console.log(`Items actuales: ${catalog.items.length}`);
    console.log('');

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const procType of PROCEDURE_TYPES) {
      const existing = catalog.items.find(item => item.code === procType.code);

      if (existing) {
        // Actualizar si el label u order cambió
        if (existing.label !== procType.label || existing.order !== procType.order) {
          await prisma.catalogItem.update({
            where: { id: existing.id },
            data: {
              label: procType.label,
              order: procType.order
            }
          });
          console.log(`✓ Actualizado: ${procType.code}`);
          updated++;
        } else {
          skipped++;
        }
      } else {
        // Crear nuevo
        await prisma.catalogItem.create({
          data: {
            catalogId: catalog.id,
            code: procType.code,
            label: procType.label,
            order: procType.order,
            active: true
          }
        });
        console.log(`✓ Creado: ${procType.code} → ${procType.label}`);
        created++;
      }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('RESUMEN');
    console.log('='.repeat(80));
    console.log(`Tipos creados: ${created}`);
    console.log(`Tipos actualizados: ${updated}`);
    console.log(`Tipos sin cambios: ${skipped}`);
    console.log(`Total de tipos: ${PROCEDURE_TYPES.length}`);
    console.log('');

    // Verificar total final
    const finalCount = await prisma.catalogItem.count({
      where: { catalogId: catalog.id }
    });

    console.log(`✅ Catálogo actualizado exitosamente con ${finalCount} tipos de procedimiento`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateProcedureTypeCatalog();
