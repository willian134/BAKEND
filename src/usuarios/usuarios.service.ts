import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'

// Normaliza el nombre de una materia (recorta espacios, primera letra de cada
// palabra en mayúscula) para que "programación", "Programación " y "PROGRAMACIÓN"
// no queden como 3 filas distintas en la base de datos.
function normalizarMateria(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ')
}

// Pasa un texto a MAYÚSCULAS conservando tildes y ñ, y colapsando espacios.
// "  josé  pérez " -> "JOSÉ PÉREZ"
function aMayusculas(texto?: string): string {
  return (texto ?? '').replace(/\s+/g, ' ').trim().toUpperCase()
}

// Arma el nombre completo con el formato institucional: APELLIDOS NOMBRES,
// en mayúsculas y con tildes. Si solo llega uno de los dos (o ninguno), no
// falla: usa lo que haya. Si no llega ninguno, cae al `nombre` ya recibido
// (por compatibilidad con llamadas antiguas que mandaban solo `nombre`).
function componerNombre(apellidos?: string, nombres?: string, nombreFallback?: string): string {
  const a = aMayusculas(apellidos)
  const n = aMayusculas(nombres)
  const combinado = [a, n].filter(Boolean).join(' ')
  return combinado || aMayusculas(nombreFallback)
}

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) { }

  // tipoPersona opcional: filtra en el backend en vez de traer todo y
  // descartar en el navegador — importante para cuando la lista crezca.
  findAll(tipoPersona?: string) {
    return this.prisma.usuario.findMany({
      where: { activo: true, ...(tipoPersona && { tipoPersona }) },
      omit: { password: true },
      include: {
        carreras: {
          include: {
            carrera: true,
            ciclos: { include: { materias: true } },
          },
        },
      },
    })
  }

  // Lista de carreras reales guardadas en la base de datos — reemplaza
  // la lista fija que antes vivía duplicada en varios archivos del frontend.
  listaCarreras() {
    return this.prisma.carrera.findMany({ orderBy: { nombre: 'asc' } })
  }

  findByRfid(rfid: string) {
    return this.prisma.usuario.findFirst({
      where: { rfid, activo: true },
      omit: { password: true },
      include: {
        carreras: {
          include: {
            carrera: true,
            ciclos: { include: { materias: true } },
          },
        },
        prestamos: {
          where: { activo: true },
          include: { libro: true },
        },
      },
    })
  }

  // Para estudiantes que ya se registraron antes — se reconocen por email
  findByEmail(email: string) {
    return this.prisma.usuario.findFirst({
      where: { email, activo: true },
      omit: { password: true },
      include: {
        carreras: {
          include: {
            carrera: true,
            ciclos: { include: { materias: true } },
          },
        },
        prestamos: {
          where: { activo: true },
          include: { libro: true },
        },
      },
    })
  }

  // Para invitados/externos que ya visitaron antes — se reconocen por su documento
  findByDocumento(numeroDocumento: string) {
    return this.prisma.usuario.findFirst({
      where: { numeroDocumento, activo: true },
      omit: { password: true },
      include: {
        prestamos: {
          where: { activo: true },
          include: { libro: true },
        },
      },
    })
  }

  // Búsqueda parcial mientras el bibliotecario escribe: por nombre O correo,
  // sin importar mayúsculas/minúsculas. Devuelve una lista corta para el
  // autocompletado del registro (no los datos completos con préstamos —
  // eso se pide al seleccionar a la persona). Se puede acotar por tipoPersona
  // para que el certificado, por ejemplo, solo sugiera estudiantes.
  buscar(q: string, tipoPersona?: string) {
    const texto = q.trim()
    if (texto.length < 2) return []
    return this.prisma.usuario.findMany({
      where: {
        activo: true,
        ...(tipoPersona && { tipoPersona }),
        OR: [
          { nombre: { contains: texto, mode: 'insensitive' } },
          { email: { contains: texto, mode: 'insensitive' } },
        ],
      },
      omit: { password: true },
      include: {
        carreras: {
          include: {
            carrera: true,
            ciclos: { include: { materias: true } },
          },
        },
      },
      orderBy: { nombre: 'asc' },
      take: 10,
    })
  }

  async create(data: {
    rfid?: string
    nombre?: string
    apellidos?: string
    nombres?: string
    email?: string
    tipoDocumento?: string
    numeroDocumento?: string
    iniciales?: string
    rol?: string
    tipoPersona?: string
    carreras?: {
      nombre: string
      ciclos: { numero: number; materias?: string[]; jornada?: string }[]
    }[]
  }) {
    const nombreCompleto = componerNombre(data.apellidos, data.nombres, data.nombre)
    // Todo o nada: si falla a mitad de camino (por ejemplo, en la segunda
    // carrera), no queda un usuario a medio crear — se revierte completo.
    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          rfid: data.rfid,
          nombre: nombreCompleto,
          apellidos: aMayusculas(data.apellidos) || null,
          nombres: aMayusculas(data.nombres) || null,
          email: data.email,
          tipoDocumento: data.tipoDocumento,
          numeroDocumento: data.numeroDocumento,
          iniciales: data.iniciales,
          rol: data.rol || 'usuario',
          tipoPersona: data.tipoPersona || 'DOCENTE',
        },
      })

      if (data.carreras) {
        for (const c of data.carreras) {
          const carrera = await tx.carrera.upsert({
            where: { nombre: c.nombre },
            update: {},
            create: { nombre: c.nombre },
          })

          // Cada docente tiene su propia fila de UsuarioCarrera → sus propios
          // ciclos → sus propias materias. Nunca comparte ciclos con otro
          // docente de la misma carrera, aunque tengan el mismo número de ciclo.
          await tx.usuarioCarrera.create({
            data: {
              usuarioId: usuario.id,
              carreraId: carrera.id,
              ciclos: {
                create: c.ciclos.map(ci => ({
                  numero: ci.numero,
                  jornada: ci.jornada,
                  materias: {
                    create: [...new Set(
                      (ci.materias ?? []).map(normalizarMateria).filter(Boolean)
                    )].map(nombre => ({ nombre })),
                  },
                })),
              },
            },
          })
        }
      }

      return usuario
    })
  }

  async update(id: number, data: Partial<{
    rfid: string
    nombre: string
    apellidos: string
    nombres: string
    iniciales: string
    rol: string
    tipoDocumento: string
    numeroDocumento: string
  }>) {
    // Si llega apellidos o nombres, se recompone el `nombre` combinado a partir
    // de los valores actuales de la persona (para no perder el que no se envió).
    const patch: any = { ...data }
    if (data.apellidos !== undefined || data.nombres !== undefined) {
      const actual = await this.prisma.usuario.findUnique({ where: { id } })
      const apellidos = data.apellidos !== undefined ? data.apellidos : (actual?.apellidos ?? '')
      const nombres = data.nombres !== undefined ? data.nombres : (actual?.nombres ?? '')
      patch.apellidos = aMayusculas(apellidos) || null
      patch.nombres = aMayusculas(nombres) || null
      patch.nombre = componerNombre(apellidos, nombres, actual?.nombre)
    }
    return this.prisma.usuario.update({
      where: { id },
      data: patch,
    })
  }

  async actualizarCiclosYMaterias(
    usuarioId: number,
    carreraNombre: string,
    ciclos: { numero: number; materias?: string[]; jornada?: string }[]
  ) {
    const uc = await this.prisma.usuarioCarrera.findFirst({
      where: { usuarioId, carrera: { nombre: carreraNombre } },
    })
    if (!uc) return { ok: false, mensaje: 'El usuario no tiene esa carrera asignada' }

    // Todo o nada: si falla a mitad (por ejemplo, al insertar las materias
    // del tercer ciclo), no queda una asignación académica incompleta.
    await this.prisma.$transaction(async (tx) => {
      // Los ciclos que ya no vienen en la asignación enviada se eliminan.
      // Sin esto, quitar un ciclo desde la interfaz no lo borraba de la base
      // y seguía apareciendo como si el usuario aún lo tuviera asignado.
      const numerosEnviados = ciclos.map(c => c.numero)
      await tx.ciclo.deleteMany({
        where: { usuarioCarreraId: uc.id, numero: { notIn: numerosEnviados } },
      })

      for (const ciclo of ciclos) {
        // Busca el ciclo dentro de ESTE usuario-carrera específico, nunca en
        // los de otro usuario aunque compartan carrera y número de ciclo
        let cicloDb = await tx.ciclo.findFirst({
          where: { numero: ciclo.numero, usuarioCarreraId: uc.id },
        })

        if (!cicloDb) {
          cicloDb = await tx.ciclo.create({
            data: { numero: ciclo.numero, usuarioCarreraId: uc.id, jornada: ciclo.jornada },
          })
        } else {
          await tx.ciclo.update({
            where: { id: cicloDb.id },
            data: { jornada: ciclo.jornada },
          })
        }

        // Las materias se reemplazan por completo en cada guardado
        await tx.materia.deleteMany({ where: { cicloId: cicloDb.id } })

        const nombres = [...new Set(
          (ciclo.materias ?? []).map(normalizarMateria).filter(Boolean)
        )]
        if (nombres.length > 0) {
          await tx.materia.createMany({
            data: nombres.map(nombre => ({ nombre, cicloId: cicloDb!.id })),
          })
        }
      }
    })

    return { ok: true }
  }

  // Agrega una carrera adicional a un docente que ya existe (para el caso de
  // docentes que dictan en más de una carrera)
  async agregarCarrera(usuarioId: number, nombreCarrera: string) {
    const carrera = await this.prisma.carrera.upsert({
      where: { nombre: nombreCarrera },
      update: {},
      create: { nombre: nombreCarrera },
    })

    const existente = await this.prisma.usuarioCarrera.findFirst({
      where: { usuarioId, carreraId: carrera.id },
    })
    if (existente) return { ok: false, mensaje: 'El docente ya tiene esa carrera asignada' }

    await this.prisma.usuarioCarrera.create({
      data: { usuarioId, carreraId: carrera.id },
    })
    return { ok: true }
  }

  // Quita una carrera de un docente — elimina en cascada sus ciclos y materias
  async quitarCarrera(usuarioId: number, carreraNombre: string) {
    const uc = await this.prisma.usuarioCarrera.findFirst({
      where: { usuarioId, carrera: { nombre: carreraNombre } },
    })
    if (!uc) return { ok: false, mensaje: 'El docente no tiene esa carrera asignada' }

    await this.prisma.usuarioCarrera.delete({ where: { id: uc.id } })
    return { ok: true }
  }

  // Solo admin puede llamar esto (aplicado en el guard del controller) —
  // nadie puede auto-otorgarse más permisos de los que ya tiene. Además, un
  // invitado (visitante externo sin afiliación al instituto) nunca puede
  // recibir permisos de bibliotecario/admin — solo docentes o estudiantes.
  async cambiarRol(id: number, rol: string) {
    const rolesValidos = ['usuario', 'bibliotecario', 'admin']
    if (!rolesValidos.includes(rol)) {
      return { ok: false, mensaje: 'Rol inválido' }
    }
    if (rol !== 'usuario') {
      const persona = await this.prisma.usuario.findUnique({ where: { id } })
      if (persona?.tipoPersona === 'INVITADO') {
        return { ok: false, mensaje: 'Un invitado externo no puede recibir permisos de bibliotecario o administrador' }
      }
    }
    return this.prisma.usuario.update({ where: { id }, data: { rol } })
  }

  // Soft-delete: nunca borramos a una persona de verdad — solo la marcamos
  // inactiva. Sus préstamos/registros históricos quedan intactos. Su llavero
  // RFID se libera (se pone en null) para que el mismo llavero físico se
  // pueda reasignar a una persona nueva sin chocar con la restricción de
  // unicidad — si algún día se restaura a esta persona, hay que volver a
  // vincularle un llavero.
  remove(id: number) {
    return this.prisma.usuario.update({
      where: { id },
      data: { activo: false, rfid: null },
    })
  }

  findEliminados(tipoPersona?: string) {
    return this.prisma.usuario.findMany({
      where: { activo: false, ...(tipoPersona && { tipoPersona }) },
      omit: { password: true },
      include: {
        carreras: { include: { carrera: true } },
      },
    })
  }

  restaurar(id: number) {
    return this.prisma.usuario.update({
      where: { id },
      data: { activo: true },
    })
  }

  // Reemplaza TODA la asignación académica de un usuario en una sola
  // operación atómica. Sustituye la secuencia agregarCarrera →
  // quitarCarrera → actualizarCiclosYMaterias, que hacía N llamadas HTTP
  // y podía dejar al usuario con una carrera sin ciclos si fallaba a mitad.
  async reemplazarAsignacion(
    usuarioId: number,
    carreras: {
      nombre: string
      ciclos: { numero: number; jornada?: string; materias?: string[] }[]
    }[]
  ) {
    return this.prisma.$transaction(async (tx) => {
      const nombresEnviados = carreras.map(c => c.nombre)

      // Las carreras que ya no vienen se eliminan; sus ciclos y materias
      // caen en cascada por la relación definida en el schema.
      await tx.usuarioCarrera.deleteMany({
        where: {
          usuarioId,
          carrera: { nombre: { notIn: nombresEnviados } },
        },
      })

      for (const c of carreras) {
        const carrera = await tx.carrera.upsert({
          where: { nombre: c.nombre },
          update: {},
          create: { nombre: c.nombre },
        })

        // Se borra la relación anterior y se recrea con sus ciclos: más
        // simple y seguro que reconciliar ciclo por ciclo, y al estar
        // dentro de la transacción no hay ventana de inconsistencia.
        await tx.usuarioCarrera.deleteMany({
          where: { usuarioId, carreraId: carrera.id },
        })

        await tx.usuarioCarrera.create({
          data: {
            usuarioId,
            carreraId: carrera.id,
            ciclos: {
              create: c.ciclos.map(ci => ({
                numero: ci.numero,
                jornada: ci.jornada,
                materias: {
                  create: [...new Set(
                    (ci.materias ?? []).map(normalizarMateria).filter(Boolean)
                  )].map(nombre => ({ nombre })),
                },
              })),
            },
          },
        })
      }

      return { ok: true }
    })
  }

}