// scripts/update-provider-catalog.js
// Actualiza el catálogo de prestadores de salud con todos los prestadores de Uruguay

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mapeo de códigos a nombres completos
const PROVIDERS = [
  // ASSE
  { code: 'ASSE', label: 'ASSE - Administración de los Servicios de Salud del Estado', order: 1 },

  // IAMC - Orden alfabético
  { code: 'AMECOM', label: 'AMECOM - Asociación Médica de Colón', order: 10 },
  { code: 'AMEDRIN', label: 'AMEDRIN - Asistencia Médica Integral', order: 11 },
  { code: 'AMSJ', label: 'AMSJ - Asistencia Médica San José', order: 12 },
  { code: 'ASOC_ESPANOLA', label: 'Asociación Española', order: 13 },
  { code: 'CAAMEPA', label: 'CAAMEPA - Cooperativa Asistencial Médica de Pando', order: 14 },
  { code: 'CAMCEL', label: 'CAMCEL - Centro de Asistencia Médica de Cerro Largo', order: 15 },
  { code: 'CAMDEL', label: 'CAMDEL - Centro de Asistencia del Litoral', order: 16 },
  { code: 'CAMEC', label: 'CAMEC - Centro de Asistencia Médica de Canelones', order: 17 },
  { code: 'CAMEDUR', label: 'CAMEDUR - Centro de Asistencia Médica de Durazno', order: 18 },
  { code: 'CAMOC', label: 'CAMOC - Centro de Asistencia Médica de Colonia', order: 19 },
  { code: 'CAMS', label: 'CAMS - Centro de Asistencia Médica de Salto', order: 20 },
  { code: 'CAMY', label: 'CAMY - Centro de Asistencia Médica de Young', order: 21 },
  { code: 'CASA_GALICIA', label: 'Casa de Galicia', order: 22 },
  { code: 'CASMER', label: 'CASMER - Casa de Salud Mercedes', order: 23 },
  { code: 'CASMU', label: 'CASMU - Centro de Asistencia del Sindicato Médico del Uruguay', order: 24 },
  { code: 'CCOU', label: 'CCOU - Crédito Cooperativo Obreros Unidos', order: 25 },
  { code: 'COMECA', label: 'COMECA - Corporación Médica de Canelones', order: 26 },
  { code: 'COMEF', label: 'COMEF - Cooperativa Médica de Florida', order: 27 },
  { code: 'COMEFLO', label: 'COMEFLO - Cooperativa Médica de Flores', order: 28 },
  { code: 'COMEPA', label: 'COMEPA - Cooperativa Médica de Paysandú', order: 29 },
  { code: 'COMERI', label: 'COMERI - Cooperativa Médica de Rivera', order: 30 },
  { code: 'COMERO', label: 'COMERO - Cooperativa Médica de Rocha', order: 31 },
  { code: 'COMETT', label: 'COMETT - Cooperativa Médica de Tacuarembó', order: 32 },
  { code: 'COMTA', label: 'COMTA - Cooperativa Médica de Treinta y Tres', order: 33 },
  { code: 'COSEM', label: 'COSEM - Cooperativa de Servicios Médicos', order: 34 },
  { code: 'CRAME', label: 'CRAME - Círculo Médico de Melo', order: 35 },
  { code: 'CRAMI', label: 'CRAMI - Círculo Médico de Minas', order: 36 },
  { code: 'CUDAM', label: 'CUDAM - Corporación Uruguaya de Asistencia Médica', order: 37 },
  { code: 'EVANGELICO', label: 'Hospital Evangélico', order: 38 },
  { code: 'GREMCA', label: 'GREMCA - Gremial Médica de Canelones', order: 39 },
  { code: 'GREMEDA', label: 'GREMEDA - Gremial Médica de Artigas', order: 40 },
  { code: 'IAC', label: 'IAC - Instituto de Asistencia de Canelones', order: 41 },
  { code: 'MUCAM', label: 'MUCAM - Mutualista Camino', order: 42 },
  { code: 'SMI', label: 'SMI - Sociedad Médica Italiana', order: 43 },
  { code: 'SMQS', label: 'SMQS - Sociedad Médica Quintín Saubidet', order: 44 },
  { code: 'UNIVERSAL', label: 'UNIVERSAL - Médica Uruguaya', order: 45 },

  // Seguros privados
  { code: 'FEMI', label: 'FEMI - Federación Médica del Interior', order: 50 },
  { code: 'MP', label: 'MP - Medicina Privada', order: 51 },

  // Otros
  { code: 'OTRA', label: 'Otra Institución', order: 99 },
];

async function updateProviderCatalog() {
  console.log('\n📋 ACTUALIZACIÓN DE CATÁLOGO DE PRESTADORES DE SALUD\n');
  console.log('='.repeat(80));

  try {
    // Buscar o crear catálogo Provider
    let catalog = await prisma.catalog.findFirst({
      where: { name: 'Provider' },
      include: { items: true }
    });

    if (!catalog) {
      console.log('Creando catálogo Provider...');
      catalog = await prisma.catalog.create({
        data: {
          name: 'Provider',
          label: 'Prestador de Salud',
          description: 'Prestadores de salud de Uruguay (IAMC y ASSE)',
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

    for (const provider of PROVIDERS) {
      const existing = catalog.items.find(item => item.code === provider.code);

      if (existing) {
        // Actualizar si el label cambió
        if (existing.label !== provider.label || existing.order !== provider.order) {
          await prisma.catalogItem.update({
            where: { id: existing.id },
            data: {
              label: provider.label,
              order: provider.order
            }
          });
          console.log(`✓ Actualizado: ${provider.code} → ${provider.label}`);
          updated++;
        } else {
          skipped++;
        }
      } else {
        // Crear nuevo
        await prisma.catalogItem.create({
          data: {
            catalogId: catalog.id,
            code: provider.code,
            label: provider.label,
            order: provider.order,
            active: true
          }
        });
        console.log(`✓ Creado: ${provider.code} → ${provider.label}`);
        created++;
      }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('RESUMEN');
    console.log('='.repeat(80));
    console.log(`Prestadores creados: ${created}`);
    console.log(`Prestadores actualizados: ${updated}`);
    console.log(`Prestadores sin cambios: ${skipped}`);
    console.log(`Total de prestadores: ${PROVIDERS.length}`);
    console.log('');

    // Verificar total final
    const finalCount = await prisma.catalogItem.count({
      where: { catalogId: catalog.id }
    });

    console.log(`✅ Catálogo actualizado exitosamente con ${finalCount} prestadores`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateProviderCatalog();
