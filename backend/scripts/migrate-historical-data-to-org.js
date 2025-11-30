#!/usr/bin/env node
/**
 * Script para migrar datos históricos al sistema de multi-tenancy
 *
 * Este script asigna un organizationId a todos los registros que no lo tienen,
 * permitiendo que los datos históricos sean accesibles en el nuevo sistema.
 *
 * Uso:
 *   node scripts/migrate-historical-data-to-org.js [--org-id=xxx] [--dry-run]
 *
 * Si no se especifica --org-id, usa la primera organización activa de la BD.
 * Usa --dry-run para ver qué cambios se harían sin aplicarlos.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Tablas que tienen campo organizationId y necesitan migración
// Los nombres son en camelCase como los usa Prisma Client
const TABLES_TO_MIGRATE = [
  { name: 'patient', model: 'patient' },
  { name: 'clinician', model: 'clinician' },
  { name: 'transplantCase', model: 'transplantCase' },
  { name: 'procedure', model: 'procedure' },
  { name: 'preopEvaluation', model: 'preopEvaluation' },
  { name: 'etiology', model: 'etiology' },
  { name: 'location', model: 'location' },
  { name: 'position', model: 'position' },
  { name: 'antibiotic', model: 'antibiotic' },
  { name: 'antibioticProtocol', model: 'antibioticProtocol' },
  { name: 'catalog', model: 'catalog' },
  { name: 'auditLog', model: 'auditLog' },
  { name: 'digitalSignature', model: 'digitalSignature' },
];

async function getOrganizationId(specifiedOrgId) {
  if (specifiedOrgId) {
    // Verificar que existe
    let org = await prisma.organization.findUnique({
      where: { id: specifiedOrgId },
    });

    // Si no existe, crearla
    if (!org) {
      console.log(`\nOrganization ${specifiedOrgId} not found, creating it...`);
      org = await prisma.organization.create({
        data: {
          id: specifiedOrgId,
          name: 'PNTH Uruguay',
          slug: 'pnth-uruguay',
          timezone: 'America/Montevideo',
          isActive: true,
        },
      });
      console.log(`Organization created: ${org.name} (${org.id})`);
    }

    return org;
  }

  // Buscar la primera organización activa
  let org = await prisma.organization.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  // Si no hay organización, pedir que especifiquen una
  if (!org) {
    throw new Error(
      'No active organization found in database.\n' +
      'Please specify the Clerk organization ID with --org-id=org_xxxxx\n' +
      'You can find the org ID in your Clerk Dashboard > Organizations'
    );
  }

  return org;
}

async function migrateTable(tableConfig, organizationId, dryRun) {
  const { name: tableName, model: modelName } = tableConfig;
  const model = prisma[modelName];

  if (!model) {
    console.log(`  - Skipping ${tableName}: model not found`);
    return { skipped: true };
  }

  try {
    // Contar registros sin organizationId
    const countWithoutOrg = await model.count({
      where: { organizationId: null },
    });

    if (countWithoutOrg === 0) {
      console.log(`  - ${tableName}: No records to migrate (all have organizationId)`);
      return { updated: 0, skipped: false };
    }

    console.log(`  - ${tableName}: Found ${countWithoutOrg} records without organizationId`);

    if (dryRun) {
      console.log(`    [DRY-RUN] Would update ${countWithoutOrg} records`);
      return { updated: countWithoutOrg, dryRun: true };
    }

    // Actualizar registros
    const result = await model.updateMany({
      where: { organizationId: null },
      data: { organizationId },
    });

    console.log(`    Updated ${result.count} records`);
    return { updated: result.count, skipped: false };

  } catch (error) {
    // Algunos modelos pueden no tener el campo organizationId
    if (error.code === 'P2009' || error.message.includes('Unknown field')) {
      console.log(`  - ${tableName}: Skipped (no organizationId field)`);
      return { skipped: true };
    }
    throw error;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Historical Data Migration to Multi-Tenancy');
  console.log('='.repeat(60));

  // Parse arguments
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const orgIdArg = args.find(a => a.startsWith('--org-id='));
  const specifiedOrgId = orgIdArg ? orgIdArg.split('=')[1] : null;

  if (dryRun) {
    console.log('\n[DRY-RUN MODE] No changes will be made\n');
  }

  try {
    // 1. Obtener la organización
    const organization = await getOrganizationId(specifiedOrgId);
    console.log(`\nUsing organization: ${organization.name} (${organization.id})`);
    console.log(`  Slug: ${organization.slug}`);
    console.log(`  Active: ${organization.isActive}`);

    // 2. Mostrar estadísticas antes
    console.log('\n--- Pre-migration Statistics ---');
    for (const tableConfig of TABLES_TO_MIGRATE) {
      const model = prisma[tableConfig.model];
      if (model) {
        try {
          const total = await model.count();
          const withOrg = await model.count({ where: { organizationId: { not: null } } });
          const withoutOrg = await model.count({ where: { organizationId: null } });
          console.log(`  ${tableConfig.name}: ${total} total, ${withOrg} with org, ${withoutOrg} without org`);
        } catch {
          // Skip if model doesn't have organizationId
        }
      }
    }

    // 3. Migrar cada tabla
    console.log('\n--- Migrating Tables ---');
    const results = {};

    for (const tableConfig of TABLES_TO_MIGRATE) {
      results[tableConfig.name] = await migrateTable(tableConfig, organization.id, dryRun);
    }

    // 4. Resumen
    console.log('\n--- Migration Summary ---');
    let totalUpdated = 0;
    let tablesUpdated = 0;

    for (const [table, result] of Object.entries(results)) {
      if (!result.skipped && result.updated > 0) {
        tablesUpdated++;
        totalUpdated += result.updated;
      }
    }

    console.log(`  Tables processed: ${tablesUpdated}`);
    console.log(`  Records updated: ${totalUpdated}`);

    if (dryRun) {
      console.log('\n[DRY-RUN] Run without --dry-run to apply changes');
    } else {
      console.log('\nMigration completed successfully!');
    }

    // 5. Verificación post-migración
    if (!dryRun) {
      console.log('\n--- Post-migration Verification ---');
      for (const tableConfig of TABLES_TO_MIGRATE) {
        const model = prisma[tableConfig.model];
        if (model) {
          try {
            const withoutOrg = await model.count({ where: { organizationId: null } });
            if (withoutOrg > 0) {
              console.log(`  WARNING: ${tableConfig.name} still has ${withoutOrg} records without organizationId`);
            }
          } catch {
            // Skip
          }
        }
      }
    }

  } catch (error) {
    console.error('\nError during migration:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
