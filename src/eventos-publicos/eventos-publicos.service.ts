import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import { calcularFechaDesde } from '../common/periodo.helper'

@Injectable()
export class EventosPublicosService {
  constructor(private prisma: PrismaService) {}

  // Registro público (sin login) — llamado desde Landing/Catálogo
  registrar(data: {
    tipo: string // "visita_pagina" | "busqueda" | "clic_libro" | "clic_carrera"
    programa?: string
    texto?: string
    libroId?: number
  }) {
    return this.prisma.eventoPublico.create({ data })
  }

  totalVisitas(periodo?: string) {
    const desde = calcularFechaDesde(periodo)
    return this.prisma.eventoPublico.count({
      where: { tipo: 'visita_pagina', ...(desde && { fecha: { gte: desde } }) },
    })
  }

  // Libros con más clics desde resultados de búsqueda pública
  async librosMasBuscados(periodo?: string) {
    const desde = calcularFechaDesde(periodo)
    const resultado = await this.prisma.eventoPublico.groupBy({
      by: ['libroId'],
      _count: { _all: true },
      where: { tipo: 'clic_libro', libroId: { not: null }, ...(desde && { fecha: { gte: desde } }) },
      orderBy: { _count: { libroId: 'desc' } },
      take: 20,
    })
    const libros = await this.prisma.libro.findMany({
      where: { id: { in: resultado.map(r => r.libroId as number) } },
    })
    return resultado.map(r => ({
      libro: libros.find(l => l.id === r.libroId) || null,
      clics: r._count._all,
    }))
  }

  // Carreras con más clics desde las cards del landing público — señal de interés
  // aunque el usuario no haya llegado a abrir el detalle de ningún libro
  async carrerasMasClickeadas(periodo?: string) {
    const desde = calcularFechaDesde(periodo)
    const resultado = await this.prisma.eventoPublico.groupBy({
      by: ['programa'],
      _count: { _all: true },
      where: { tipo: 'clic_carrera', programa: { not: null }, ...(desde && { fecha: { gte: desde } }) },
      orderBy: { _count: { programa: 'desc' } },
    })
    return resultado.map(r => ({ programa: r.programa, clics: r._count._all }))
  }
}