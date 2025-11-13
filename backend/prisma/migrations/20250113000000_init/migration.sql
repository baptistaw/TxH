-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('M', 'F', 'O');

-- CreateEnum
CREATE TYPE "ASA" AS ENUM ('I', 'II', 'III', 'IV', 'V', 'VI');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ANEST1', 'ANEST2', 'CIRUJANO1', 'CIRUJANO2', 'INTENSIVISTA', 'HEPATOLOGO', 'NURSE_COORD');

-- CreateEnum
CREATE TYPE "Specialty" AS ENUM ('ANESTESIOLOGO', 'CIRUJANO', 'INTENSIVISTA', 'HEPATOLOGO', 'COORDINADORA', 'OTRO');

-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('ASSE', 'FEMI', 'CASMU', 'MP', 'OTRA');

-- CreateEnum
CREATE TYPE "IntraopPhase" AS ENUM ('INDUCCION', 'DISECCION', 'ANHEPATICA', 'PRE_REPERFUSION', 'POST_REPERFUSION', 'FIN_VIA_BILIAR', 'CIERRE');

-- CreateEnum
CREATE TYPE "VentilationMode" AS ENUM ('VC', 'PC', 'SIMV', 'PSV', 'CPAP', 'OTRO');

-- CreateEnum
CREATE TYPE "AirwayGrade" AS ENUM ('I', 'II', 'III', 'IV');

-- CreateEnum
CREATE TYPE "FunctionalClass" AS ENUM ('I', 'II', 'III', 'IV');

-- CreateTable
CREATE TABLE "patients" (
    "id" VARCHAR(20) NOT NULL,
    "ciRaw" VARCHAR(30),
    "name" TEXT NOT NULL,
    "fnr" TEXT,
    "birthDate" TIMESTAMP(3),
    "sex" "Sex",
    "provider" "Provider",
    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "bloodGroup" VARCHAR(5),
    "admissionDate" TIMESTAMP(3),
    "transplanted" BOOLEAN NOT NULL DEFAULT false,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinicians" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "specialty" "Specialty",
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinicians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transplant_cases" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "duration" INTEGER,
    "isRetransplant" BOOLEAN NOT NULL DEFAULT false,
    "isHepatoRenal" BOOLEAN NOT NULL DEFAULT false,
    "optimalDonor" BOOLEAN,
    "provenance" TEXT,
    "coldIschemiaTime" INTEGER,
    "warmIschemiaTime" INTEGER,
    "icuTransferDate" TIMESTAMP(3),
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transplant_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_assignments" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "clinicianId" INTEGER NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preop_evaluations" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "caseId" TEXT,
    "evaluationDate" TIMESTAMP(3) NOT NULL,
    "meld" INTEGER,
    "meldNa" INTEGER,
    "child" VARCHAR(10),
    "etiology1" TEXT,
    "etiology2" TEXT,
    "isFulminant" BOOLEAN NOT NULL DEFAULT false,
    "mpt" TEXT,
    "mouthOpening" TEXT,
    "physicalExamObs" TEXT,
    "coronaryDisease" BOOLEAN NOT NULL DEFAULT false,
    "hypertension" BOOLEAN NOT NULL DEFAULT false,
    "valvulopathy" TEXT,
    "arrhythmia" BOOLEAN NOT NULL DEFAULT false,
    "dilatedCardio" BOOLEAN NOT NULL DEFAULT false,
    "smokerCOPD" BOOLEAN NOT NULL DEFAULT false,
    "asthma" BOOLEAN NOT NULL DEFAULT false,
    "renalFailure" BOOLEAN NOT NULL DEFAULT false,
    "singleKidney" BOOLEAN NOT NULL DEFAULT false,
    "diabetes" BOOLEAN NOT NULL DEFAULT false,
    "thyroidDysfunction" BOOLEAN NOT NULL DEFAULT false,
    "previousAbdSurgery" BOOLEAN NOT NULL DEFAULT false,
    "abdSurgeryDetail" TEXT,
    "refluxUlcer" BOOLEAN NOT NULL DEFAULT false,
    "allergies" TEXT,
    "hepatoRenalSyndrome" BOOLEAN NOT NULL DEFAULT false,
    "hepatoPulmonarySyndr" BOOLEAN NOT NULL DEFAULT false,
    "pulmonaryHypertension" BOOLEAN NOT NULL DEFAULT false,
    "portalHypertension" BOOLEAN NOT NULL DEFAULT false,
    "ascites" BOOLEAN NOT NULL DEFAULT false,
    "hydrothorax" BOOLEAN NOT NULL DEFAULT false,
    "sbe" BOOLEAN NOT NULL DEFAULT false,
    "portalThrombosis" BOOLEAN NOT NULL DEFAULT false,
    "esophagealVarices" BOOLEAN NOT NULL DEFAULT false,
    "encephalopathy" BOOLEAN NOT NULL DEFAULT false,
    "hepatocarcinoma" BOOLEAN NOT NULL DEFAULT false,
    "bleeding" BOOLEAN NOT NULL DEFAULT false,
    "hyponatremia" BOOLEAN NOT NULL DEFAULT false,
    "complicationsObs" TEXT,
    "functionalClass" "FunctionalClass",
    "mechanicalVent" BOOLEAN NOT NULL DEFAULT false,
    "habitualMeds" TEXT,
    "inList" BOOLEAN NOT NULL DEFAULT false,
    "reasonNotInList" TEXT,
    "problems" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preop_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preop_labs" (
    "id" TEXT NOT NULL,
    "preopId" TEXT NOT NULL,
    "labDate" TIMESTAMP(3) NOT NULL,
    "hb" DOUBLE PRECISION,
    "hto" DOUBLE PRECISION,
    "platelets" DOUBLE PRECISION,
    "pt" DOUBLE PRECISION,
    "inr" DOUBLE PRECISION,
    "fibrinogen" DOUBLE PRECISION,
    "glucose" DOUBLE PRECISION,
    "sodium" DOUBLE PRECISION,
    "potassium" DOUBLE PRECISION,
    "ionicCalcium" DOUBLE PRECISION,
    "magnesium" DOUBLE PRECISION,
    "azotemia" DOUBLE PRECISION,
    "creatinine" DOUBLE PRECISION,
    "gfr" DOUBLE PRECISION,
    "sgot" DOUBLE PRECISION,
    "sgpt" DOUBLE PRECISION,
    "totalBili" DOUBLE PRECISION,
    "albumin" DOUBLE PRECISION,
    "tsh" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preop_labs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intraop_records" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "phase" "IntraopPhase" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "ventMode" "VentilationMode",
    "fio2" DOUBLE PRECISION,
    "tidalVolume" INTEGER,
    "respRate" INTEGER,
    "peep" INTEGER,
    "peakPressure" INTEGER,
    "heartRate" INTEGER,
    "satO2" INTEGER,
    "pas" INTEGER,
    "pad" INTEGER,
    "pam" INTEGER,
    "cvp" INTEGER,
    "etCO2" INTEGER,
    "temp" DOUBLE PRECISION,
    "paps" INTEGER,
    "papd" INTEGER,
    "papm" INTEGER,
    "pcwp" INTEGER,
    "cardiacOutput" DOUBLE PRECISION,
    "bis" INTEGER,
    "icp" INTEGER,
    "svO2" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intraop_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fluids_and_blood" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "phase" "IntraopPhase" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "plasmalyte" INTEGER NOT NULL DEFAULT 0,
    "ringer" INTEGER NOT NULL DEFAULT 0,
    "saline" INTEGER NOT NULL DEFAULT 0,
    "dextrose" INTEGER NOT NULL DEFAULT 0,
    "colloids" INTEGER NOT NULL DEFAULT 0,
    "albumin" INTEGER NOT NULL DEFAULT 0,
    "redBloodCells" INTEGER NOT NULL DEFAULT 0,
    "plasma" INTEGER NOT NULL DEFAULT 0,
    "platelets" INTEGER NOT NULL DEFAULT 0,
    "cryoprecip" INTEGER NOT NULL DEFAULT 0,
    "cellSaver" INTEGER NOT NULL DEFAULT 0,
    "otherFluids" TEXT,
    "insensibleLoss" INTEGER NOT NULL DEFAULT 0,
    "ascites" INTEGER NOT NULL DEFAULT 0,
    "suction" INTEGER NOT NULL DEFAULT 0,
    "gauze" INTEGER NOT NULL DEFAULT 0,
    "urine" INTEGER NOT NULL DEFAULT 0,
    "balance" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fluids_and_blood_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drugs_given" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "phase" "IntraopPhase" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "inhalAgent" TEXT,
    "opioidBolus" TEXT,
    "opioidInfusion" TEXT,
    "hypnoticBolus" TEXT,
    "hypnoticInfusion" TEXT,
    "relaxantBolus" TEXT,
    "relaxantInfusion" TEXT,
    "lidocaineBolus" TEXT,
    "lidocaineInfusion" TEXT,
    "adrenalineBolus" TEXT,
    "adrenalineInfusion" TEXT,
    "dobutamine" TEXT,
    "dopamine" TEXT,
    "noradrenaline" TEXT,
    "phenylephrine" TEXT,
    "insulinBolus" TEXT,
    "insulinInfusion" TEXT,
    "furosemide" TEXT,
    "tranexamic" TEXT,
    "calciumGlucon" TEXT,
    "sodiumBicarb" TEXT,
    "antibiotics" TEXT,
    "otherDrugs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drugs_given_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lines_and_monitoring" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "cvc1" TEXT,
    "cvc2" TEXT,
    "cvc3" TEXT,
    "arterialLine1" TEXT,
    "arterialLine2" TEXT,
    "swanGanz" BOOLEAN NOT NULL DEFAULT false,
    "peripheralIV" TEXT,
    "airwayType" TEXT,
    "tubeSellick" BOOLEAN NOT NULL DEFAULT false,
    "laryngoscopy" "AirwayGrade",
    "anesthesiaType" TEXT,
    "premedication" TEXT,
    "warmer" BOOLEAN NOT NULL DEFAULT false,
    "cellSaverUsed" BOOLEAN NOT NULL DEFAULT false,
    "elasticBandages" BOOLEAN NOT NULL DEFAULT false,
    "pressurePoints" TEXT,
    "thermalBlanket" BOOLEAN NOT NULL DEFAULT false,
    "prophylacticATB" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lines_and_monitoring_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postop_outcomes" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "evaluationDate" TIMESTAMP(3) NOT NULL,
    "extubatedInOR" BOOLEAN NOT NULL DEFAULT false,
    "mechVentHours" INTEGER,
    "mechVentDays" INTEGER,
    "reintubation24h" BOOLEAN NOT NULL DEFAULT false,
    "reoperation" BOOLEAN NOT NULL DEFAULT false,
    "reoperationCause" TEXT,
    "primaryGraftFailure" BOOLEAN NOT NULL DEFAULT false,
    "acuteRenalFailure" BOOLEAN NOT NULL DEFAULT false,
    "pulmonaryEdema" BOOLEAN NOT NULL DEFAULT false,
    "neurotoxicity" BOOLEAN NOT NULL DEFAULT false,
    "rejection" BOOLEAN NOT NULL DEFAULT false,
    "apacheInitial" INTEGER,
    "biliaryComplications" BOOLEAN NOT NULL DEFAULT false,
    "vascularComplications" BOOLEAN NOT NULL DEFAULT false,
    "surgicalBleeding" BOOLEAN NOT NULL DEFAULT false,
    "otherComplications" TEXT,
    "icuDays" INTEGER,
    "wardDays" INTEGER,
    "dischargeDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "postop_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mortality" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "earlyDeath" BOOLEAN NOT NULL DEFAULT false,
    "deathDate" TIMESTAMP(3),
    "deathCause" TEXT,
    "aliveAtDischarge" BOOLEAN NOT NULL DEFAULT true,
    "aliveAt1Year" BOOLEAN,
    "aliveAt3Years" BOOLEAN,
    "aliveAt5Years" BOOLEAN,
    "lateDeathCause" TEXT,
    "readmissionWithin6m" BOOLEAN NOT NULL DEFAULT false,
    "daysToFirstReadm" INTEGER,
    "daysToSecondReadm" INTEGER,
    "readmissionCause" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mortality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observations" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "category" TEXT,
    "content" TEXT NOT NULL,
    "authorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileHash" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" INTEGER,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" INTEGER,
    "changes" JSONB NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patients_name_idx" ON "patients"("name");

-- CreateIndex
CREATE INDEX "patients_provider_idx" ON "patients"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "clinicians_email_key" ON "clinicians"("email");

-- CreateIndex
CREATE INDEX "clinicians_specialty_idx" ON "clinicians"("specialty");

-- CreateIndex
CREATE INDEX "transplant_cases_patientId_startAt_idx" ON "transplant_cases"("patientId", "startAt");

-- CreateIndex
CREATE INDEX "transplant_cases_startAt_idx" ON "transplant_cases"("startAt");

-- CreateIndex
CREATE INDEX "transplant_cases_isRetransplant_idx" ON "transplant_cases"("isRetransplant");

-- CreateIndex
CREATE INDEX "team_assignments_caseId_idx" ON "team_assignments"("caseId");

-- CreateIndex
CREATE INDEX "team_assignments_clinicianId_idx" ON "team_assignments"("clinicianId");

-- CreateIndex
CREATE UNIQUE INDEX "team_assignments_caseId_clinicianId_role_key" ON "team_assignments"("caseId", "clinicianId", "role");

-- CreateIndex
CREATE INDEX "preop_evaluations_patientId_idx" ON "preop_evaluations"("patientId");

-- CreateIndex
CREATE INDEX "preop_evaluations_caseId_idx" ON "preop_evaluations"("caseId");

-- CreateIndex
CREATE INDEX "preop_evaluations_evaluationDate_idx" ON "preop_evaluations"("evaluationDate");

-- CreateIndex
CREATE INDEX "preop_labs_preopId_idx" ON "preop_labs"("preopId");

-- CreateIndex
CREATE INDEX "preop_labs_labDate_idx" ON "preop_labs"("labDate");

-- CreateIndex
CREATE INDEX "intraop_records_caseId_phase_timestamp_idx" ON "intraop_records"("caseId", "phase", "timestamp");

-- CreateIndex
CREATE INDEX "intraop_records_timestamp_idx" ON "intraop_records"("timestamp");

-- CreateIndex
CREATE INDEX "fluids_and_blood_caseId_phase_timestamp_idx" ON "fluids_and_blood"("caseId", "phase", "timestamp");

-- CreateIndex
CREATE INDEX "drugs_given_caseId_phase_timestamp_idx" ON "drugs_given"("caseId", "phase", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "lines_and_monitoring_caseId_key" ON "lines_and_monitoring"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "postop_outcomes_caseId_key" ON "postop_outcomes"("caseId");

-- CreateIndex
CREATE INDEX "postop_outcomes_caseId_idx" ON "postop_outcomes"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "mortality_caseId_key" ON "mortality"("caseId");

-- CreateIndex
CREATE INDEX "mortality_caseId_idx" ON "mortality"("caseId");

-- CreateIndex
CREATE INDEX "observations_caseId_idx" ON "observations"("caseId");

-- CreateIndex
CREATE INDEX "observations_createdAt_idx" ON "observations"("createdAt");

-- CreateIndex
CREATE INDEX "attachments_caseId_idx" ON "attachments"("caseId");

-- CreateIndex
CREATE INDEX "audit_logs_tableName_recordId_idx" ON "audit_logs"("tableName", "recordId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "transplant_cases" ADD CONSTRAINT "transplant_cases_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "transplant_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "clinicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preop_evaluations" ADD CONSTRAINT "preop_evaluations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preop_evaluations" ADD CONSTRAINT "preop_evaluations_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "transplant_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preop_labs" ADD CONSTRAINT "preop_labs_preopId_fkey" FOREIGN KEY ("preopId") REFERENCES "preop_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intraop_records" ADD CONSTRAINT "intraop_records_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "transplant_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fluids_and_blood" ADD CONSTRAINT "fluids_and_blood_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "transplant_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drugs_given" ADD CONSTRAINT "drugs_given_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "transplant_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lines_and_monitoring" ADD CONSTRAINT "lines_and_monitoring_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "transplant_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postop_outcomes" ADD CONSTRAINT "postop_outcomes_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "transplant_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mortality" ADD CONSTRAINT "mortality_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "transplant_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "transplant_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "transplant_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

