// Corre esto UNA SOLA VEZ con: node seed-carreras.js
// Siembra las 10 carreras reales del instituto en la base de datos, para que
// el endpoint GET /docentes/carreras las devuelva todas desde el día uno,
// no solo las que ya tengan a alguien asignado.

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const CARRERAS_REALES = [
  'Desarrollo de Software',
  'Diseño Gráfico',
  'Gastronomía',
  'Marketing Digital y Negocios',
  'Turismo',
  'Enfermería',
  'Contabilidad y Asesoría Tributaria',
  'Redes y Telecomunicaciones',
  'Electricidad',
  'Talento Humano',
]

async function main() {
  for (const nombre of CARRERAS_REALES) {
    await prisma.carrera.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    })
    console.log(`✓ ${nombre}`)
  }
  console.log(`\nListo — ${CARRERAS_REALES.length} carreras aseguradas en la base de datos.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())