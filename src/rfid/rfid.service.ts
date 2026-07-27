import { Injectable, MessageEvent } from '@nestjs/common'
import { Observable, Subject, interval, merge, map } from 'rxjs'
import { PrismaService } from '../prisma.service'

// Tokens generales: no pertenecen a nadie, pero SÍ son válidos —
// el frontend los usa para abrir el Registro Manual por tipo.
// Deben coincidir con src/config/llaverosGenerales.ts del frontend.
const UIDS_GENERALES = ['738F1492', 'B943AA14', 'C82F0059']

@Injectable()
export class RfidService {
  constructor(private prisma: PrismaService) { }

  // Canal en memoria por el que se "anuncian" los escaneos a los kioscos
  // conectados por SSE. Es una transmisión: todos los que escuchan lo reciben.
  private escaneos$ = new Subject<{ uid: string; usuario: any }>()

  // Flujo SSE que consume el frontend. Se mezcla con un "ping" cada 25s
  // para que el proxy de Railway no cierre la conexión por inactividad.
  streamEscaneos(): Observable<MessageEvent> {
    return merge(
      this.escaneos$.pipe(map(evento => ({ data: evento }) as MessageEvent)),
      interval(25000).pipe(map(() => ({ data: 'ping' }) as MessageEvent)),
    )
  }

  async registrarScan(uid: string) {
    return this.prisma.rfidScan.create({
      data: { uid, leido: false },
    })
  }

  async obtenerPendiente() {
    const scan = await this.prisma.rfidScan.findFirst({
      where: { leido: false },
      orderBy: { createdAt: 'asc' },
    })
    if (!scan) return null

    await this.prisma.rfidScan.update({
      where: { id: scan.id },
      data: { leido: true },
    })

    const usuario = await this.prisma.usuario.findFirst({
      where: { rfid: scan.uid, activo: true },
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

    return { uid: scan.uid, usuario }
  }

  // Para el flujo de "vincular llavero nuevo": no consume el escaneo (no marca leido),
  // solo mira si hubo algún escaneo nuevo desde que se abrió el modal de vinculación.
  // Así no compite con el canal normal de escaneos.
  async ultimoEscaneoDesde(desde: Date) {
    return this.prisma.rfidScan.findFirst({
      where: { createdAt: { gte: desde } },
      orderBy: { createdAt: 'desc' },
    })
  }

  // Endpoint real usado por el ESP32: POST /rfid/escanear
  // Busca el usuario por UID; si no existe, queda registrado como pendiente de vincular.
  // En ambos casos se anuncia por SSE al instante — ese es el "timbre".
  async escanear(uid: string, nombres: string, apellidos: string, rol: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { rfid: uid, activo: true },
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

    // El registro en RfidScan se mantiene: lo usa el flujo de vinculación
    // y sirve de respaldo por si algún cliente viejo sigue con polling.
    await this.prisma.rfidScan.create({
      data: { uid, leido: false },
    })

    // Timbre: anunciar a los kioscos conectados, con o sin usuario encontrado
    this.escaneos$.next({ uid, usuario })

    if (usuario) {
      return { autorizado: true, usuario }
    }

    // Un token general no tiene usuario, pero es una tarjeta válida del
    // sistema: se responde autorizado para que el lector suene "aceptado".
    if (UIDS_GENERALES.includes(uid)) {
      return { autorizado: true, general: true }
    }

    return {
      autorizado: false,
      mensaje: 'Tarjeta no registrada. Pendiente de vinculación por el bibliotecario.',
      datosLeidos: { nombres, apellidos, rol },
    }
  }

}