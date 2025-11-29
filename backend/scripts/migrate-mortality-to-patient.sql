-- Migración: Cambiar mortalidad de caseId a patientId
-- Los datos de mortalidad son del paciente, no de un caso específico

-- 1. Agregar columna patientId (nullable temporalmente)
ALTER TABLE mortality ADD COLUMN "patientId" VARCHAR(20);

-- 2. Copiar patientId desde la tabla de casos
UPDATE mortality m
SET "patientId" = tc."patientId"
FROM transplant_cases tc
WHERE m."caseId" = tc.id;

-- 3. Verificar que todos los registros tienen patientId
-- (si hay alguno NULL, investigar antes de continuar)
SELECT COUNT(*) as registros_sin_patient
FROM mortality
WHERE "patientId" IS NULL;

-- 4. Hacer patientId NOT NULL
ALTER TABLE mortality ALTER COLUMN "patientId" SET NOT NULL;

-- 5. Eliminar el constraint de foreign key anterior
ALTER TABLE mortality DROP CONSTRAINT IF EXISTS "mortality_caseId_fkey";

-- 6. Eliminar el unique constraint de caseId
ALTER TABLE mortality DROP CONSTRAINT IF EXISTS "mortality_caseId_key";

-- 7. Eliminar la columna caseId
ALTER TABLE mortality DROP COLUMN "caseId";

-- 8. Crear unique constraint en patientId
ALTER TABLE mortality ADD CONSTRAINT "mortality_patientId_key" UNIQUE ("patientId");

-- 9. Crear foreign key a patients
ALTER TABLE mortality ADD CONSTRAINT "mortality_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES patients(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- 10. Crear índice en patientId
CREATE INDEX IF NOT EXISTS "mortality_patientId_idx" ON mortality("patientId");

-- 11. Eliminar índice viejo de caseId si existe
DROP INDEX IF EXISTS "mortality_caseId_idx";
