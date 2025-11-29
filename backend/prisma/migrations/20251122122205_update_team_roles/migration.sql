-- Actualizar enum Role para remover jerarquías

-- Paso 1: Eliminar la restricción unique antigua
ALTER TABLE "team_assignments" DROP CONSTRAINT IF EXISTS "team_assignments_caseId_clinicianId_role_key";

-- Paso 2: Eliminar duplicados que se crearían al mapear roles antiguos a nuevos
--         (mantener solo el primer registro por caseId, clinicianId después del mapeo)
DELETE FROM "team_assignments" a
USING "team_assignments" b
WHERE a.id > b.id
  AND a."caseId" = b."caseId"
  AND a."clinicianId" = b."clinicianId"
  AND (
    (a.role IN ('ANEST1', 'ANEST2') AND b.role IN ('ANEST1', 'ANEST2'))
    OR
    (a.role IN ('CIRUJANO1', 'CIRUJANO2') AND b.role IN ('CIRUJANO1', 'CIRUJANO2'))
  );

-- Paso 3: Actualizar roles existentes directamente en el enum
--         (No podemos cambiar valores de enum fácilmente, así que usaremos una columna temporal)
ALTER TABLE "team_assignments" ADD COLUMN "role_temp" TEXT;

UPDATE "team_assignments"
SET "role_temp" = CASE role::text
  WHEN 'ANEST1' THEN 'ANESTESIOLOGO'
  WHEN 'ANEST2' THEN 'ANESTESIOLOGO'
  WHEN 'CIRUJANO1' THEN 'CIRUJANO'
  WHEN 'CIRUJANO2' THEN 'CIRUJANO'
  WHEN 'INTENSIVISTA' THEN 'INTENSIVISTA'
  WHEN 'HEPATOLOGO' THEN 'HEPATOLOGO'
  WHEN 'NURSE_COORD' THEN 'NURSE_COORD'
END;

-- Paso 4: Eliminar la columna role antigua
ALTER TABLE "team_assignments" DROP COLUMN "role";

-- Paso 5: Crear el nuevo enum
CREATE TYPE "Role" AS ENUM ('ANESTESIOLOGO', 'CIRUJANO', 'INTENSIVISTA', 'HEPATOLOGO', 'NURSE_COORD');

-- Paso 6: Convertir la columna temporal a la nueva columna role con el nuevo enum
ALTER TABLE "team_assignments" ADD COLUMN "role" "Role";

UPDATE "team_assignments"
SET "role" = "role_temp"::"Role";

-- Paso 7: Hacer la columna role NOT NULL
ALTER TABLE "team_assignments" ALTER COLUMN "role" SET NOT NULL;

-- Paso 8: Eliminar la columna temporal
ALTER TABLE "team_assignments" DROP COLUMN "role_temp";

-- Paso 9: Crear la nueva restricción unique (sin role)
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_caseId_clinicianId_key" UNIQUE ("caseId", "clinicianId");
