const prisma = require('../src/lib/prisma');

async function clean() {
  const historicos = await prisma.transplantCase.findMany({
    where: { duration: { gt: 840 } },
    select: { id: true, startAt: true, duration: true }
  });

  const toClean = historicos.filter(c => {
    if (!c.startAt) return false;
    const h = c.startAt.getUTCHours();
    const m = c.startAt.getUTCMinutes();
    const s = c.startAt.getUTCSeconds();
    return h === 0 && m === 0 && s === 0;
  });

  console.log("Casos históricos a limpiar:", toClean.length);

  for (const c of toClean) {
    await prisma.transplantCase.update({
      where: { id: c.id },
      data: { duration: null }
    });
  }

  console.log("Limpieza completada.");

  const remaining = await prisma.transplantCase.findMany({
    where: { duration: { gt: 840 } },
    select: {
      patientId: true, startAt: true, endAt: true, duration: true,
      patient: { select: { name: true } }
    },
    orderBy: { duration: "desc" }
  });

  console.log("");
  console.log("=== CASOS RESTANTES CON > 14 HS ===");
  remaining.forEach(c => {
    const hours = (c.duration / 60).toFixed(1);
    const start = c.startAt ? c.startAt.toISOString().slice(0, 19).replace("T", " ") : "N/A";
    const end = c.endAt ? c.endAt.toISOString().slice(0, 19).replace("T", " ") : "N/A";
    console.log(c.patientId, "|", hours, "hs |", start, "|", end, "|", c.patient?.name);
  });

  await prisma.$disconnect();
}

clean().catch(e => { console.error(e); process.exit(1); });
