import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'

@Injectable()
export class ActividadesService {
  constructor(private prisma: PrismaService) {}

  // Solo las activas, en el orden definido por el bibliotecario
  findAll() {
    return this.prisma.actividad.findMany({
      where: { activo: true },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    })
  }

  // Crea una actividad nueva. Si ya existe con ese nombre, la reactiva
  // en vez de fallar — así una actividad eliminada por error vuelve
  // al escribirla de nuevo.
  async crear(nombre: string, icono?: string) {
    const limpio = nombre.replace(/\s+/g, ' ').trim()
    const existente = await this.prisma.actividad.findUnique({
      where: { nombre: limpio },
    })
    if (existente) {
      return this.prisma.actividad.update({
        where: { id: existente.id },
        data: { activo: true },
      })
    }
    const ultima = await this.prisma.actividad.findFirst({
      orderBy: { orden: 'desc' },
    })
    return this.prisma.actividad.create({
      data: { nombre: limpio, icono, orden: (ultima?.orden ?? 0) + 1 },
    })
  }

  actualizar(id: number, data: { nombre?: string; icono?: string; orden?: number }) {
    return this.prisma.actividad.update({ where: { id }, data })
  }

  // Quita el emoji de todas las actividades. La biblioteca decidió mostrar
  // las actividades solo con texto, sin iconos. Deja icono en null en toda
  // la tabla en una sola operación.
  async limpiarIconos() {
    const r = await this.prisma.actividad.updateMany({
      data: { icono: null },
    })
    return { ok: true, actualizadas: r.count }
  }

  // Eliminación lógica: los registros históricos guardan el nombre como
  // texto, así que desactivar no rompe los reportes anteriores.
  eliminar(id: number) {
    return this.prisma.actividad.update({
      where: { id },
      data: { activo: false },
    })
  }
}