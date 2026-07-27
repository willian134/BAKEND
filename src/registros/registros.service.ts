import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import { calcularFechaDesde } from '../common/periodo.helper'

@Injectable()
export class RegistrosService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.registro.findMany({
      orderBy: { fecha: 'desc' },
      include: { usuario: true },
    })
  }

  findByMes(anio: number, mes: number) {
    const inicio = new Date(anio, mes - 1, 1)
    const fin = new Date(anio, mes, 1)
    return this.prisma.registro.findMany({
      where: { fecha: { gte: inicio, lt: fin } },
      orderBy: { fecha: 'desc' },
      include: { usuario: true },
    })
  }

  // Historial completo, en orden cronológico ascendente (como una bitácora
  // en papel) y con los datos del usuario que hacen falta para exportar.
  exportarTodos() {
    return this.prisma.registro.findMany({
      orderBy: { fecha: 'asc' },
      include: {
        usuario: {
          select: {
            id: true, nombre: true, email: true, tipoPersona: true,
            iniciales: true, numeroDocumento: true, tipoDocumento: true,
          },
        },
      },
    })
  }

  create(data: {
    tipo: string
    usuarioId: number
    actividad?: string
    detalle?: string
    carrera?: string
    ciclo?: number
    materia?: string
    jornada?: string
    libroId?: number
  }) {
    return this.prisma.registro.create({ data })
  }

  async stats(anio: number, mes: number) {
    const registros = await this.findByMes(anio, mes)

    const porCarreraMap: Record<string, number> = {}
    for (const r of registros) {
      if (r.carrera) {
        porCarreraMap[r.carrera] = (porCarreraMap[r.carrera] || 0) + 1
      }
    }
    const porCarrera = Object.entries(porCarreraMap)
      .map(([carrera, visitas]) => ({ carrera, visitas }))
      .sort((a, b) => b.visitas - a.visitas)

    return {
      totalVisitas: registros.length,
      usos: registros.filter(r => r.tipo === 'uso').length,
      prestamos: registros.filter(r => r.tipo === 'prestamo').length,
      devoluciones: registros.filter(r => r.tipo === 'devolucion').length,
      porCarrera,
    }
  }

  // Igual que stats(anio,mes) pero con ventana de tiempo relativa (día/semana/mes/año/todo)
  // en vez de un mes calendario fijo — para el selector de período del Resumen.
  // tipoPersona/carrera/materia opcionales para filtrar por segmento.
  async statsPeriodo(periodo?: string, tipoPersona?: string, carrera?: string, materia?: string) {
    const desde = calcularFechaDesde(periodo)
    const registros = await this.prisma.registro.findMany({
      where: {
        ...(desde && { fecha: { gte: desde } }),
        ...(tipoPersona && { usuario: { tipoPersona } }),
        ...(carrera && { carrera }),
        ...(materia && { materia }),
      },
      include: { usuario: true },
    })

    const porCarreraMap: Record<string, number> = {}
    for (const r of registros) {
      if (r.carrera) {
        porCarreraMap[r.carrera] = (porCarreraMap[r.carrera] || 0) + 1
      }
    }
    const porCarrera = Object.entries(porCarreraMap)
      .map(([carrera, visitas]) => ({ carrera, visitas }))
      .sort((a, b) => b.visitas - a.visitas)

    return {
      totalVisitas: registros.length,
      usos: registros.filter(r => r.tipo === 'uso').length,
      prestamos: registros.filter(r => r.tipo === 'prestamo').length,
      devoluciones: registros.filter(r => r.tipo === 'devolucion').length,
      porCarrera,
    }
  }

  // Lista de materias distintas registradas — para el filtro de Reportes
  async materiasDisponibles() {
    const resultado = await this.prisma.registro.findMany({
      where: { materia: { not: null } },
      select: { materia: true },
      distinct: ['materia'],
      orderBy: { materia: 'asc' },
    })
    return resultado.map(r => r.materia).filter(Boolean)
  }

  // Compara actividad entre Docentes, Estudiantes e Invitados en el período elegido
  async comparativaPorTipo(periodo?: string) {
    const desde = calcularFechaDesde(periodo)
    const tipos = ['DOCENTE', 'ESTUDIANTE', 'INVITADO']

    const resultados = await Promise.all(tipos.map(async tipoPersona => {
      const registros = await this.prisma.registro.findMany({
        where: {
          ...(desde && { fecha: { gte: desde } }),
          usuario: { tipoPersona },
        },
      })
      return {
        tipoPersona,
        visitas: registros.length,
        prestamos: registros.filter(r => r.tipo === 'prestamo').length,
        devoluciones: registros.filter(r => r.tipo === 'devolucion').length,
      }
    }))

    return resultados
  }

  // Totales agrupados por año, para el gráfico comparativo entre años
  async comparativaAnual() {
    const registros = await this.prisma.registro.findMany({ select: { fecha: true, tipo: true } })
    const porAnio: Record<number, { visitas: number; usos: number; prestamos: number; devoluciones: number }> = {}

    for (const r of registros) {
      const anio = r.fecha.getFullYear()
      if (!porAnio[anio]) porAnio[anio] = { visitas: 0, usos: 0, prestamos: 0, devoluciones: 0 }
      porAnio[anio].visitas++
      if (r.tipo === 'uso') porAnio[anio].usos++
      if (r.tipo === 'prestamo') porAnio[anio].prestamos++
      if (r.tipo === 'devolucion') porAnio[anio].devoluciones++
    }

    return Object.entries(porAnio)
      .map(([anio, datos]) => ({ anio: Number(anio), ...datos }))
      .sort((a, b) => a.anio - b.anio)
  }

  // Ranking de usuarios por número de visitas registradas — incluye a quienes tienen 0
  // (por eso se parte de Usuario y no de Registro, para no perder los que nunca vinieron)
  async rankingUsuarios(periodo?: string, tipoPersona?: string, carrera?: string, materia?: string) {
    const desde = calcularFechaDesde(periodo)
    const conteos = await this.prisma.registro.groupBy({
      by: ['usuarioId'],
      _count: { _all: true },
      where: {
        ...(desde && { fecha: { gte: desde } }),
        ...(carrera && { carrera }),
        ...(materia && { materia }),
      },
    })
    const usuarios = await this.prisma.usuario.findMany({
      where: { rol: 'usuario', activo: true, ...(tipoPersona && { tipoPersona }) },
      omit: { password: true },
    })
    const mapa = new Map(conteos.map(c => [c.usuarioId, c._count._all]))
    return usuarios
      .map(u => ({ usuario: u, visitas: mapa.get(u.id) || 0 }))
      .sort((a, b) => b.visitas - a.visitas)
  }

  // Devuelve { "Desarrollo de Software": ["Base de Datos", ...], ... }
  // Se arma desde las materias ya asignadas a usuarios en cada carrera,
  // para que las sugerencias no mezclen materias de carreras distintas.
  async materiasPorCarrera() {
    const relaciones = await this.prisma.usuarioCarrera.findMany({
      include: {
        carrera: true,
        ciclos: { include: { materias: true } },
      },
    })

    const mapa: Record<string, Set<string>> = {}
    for (const rel of relaciones) {
      const carrera = rel.carrera?.nombre
      if (!carrera) continue
      if (!mapa[carrera]) mapa[carrera] = new Set()
      for (const ciclo of rel.ciclos) {
        for (const materia of ciclo.materias) {
          mapa[carrera].add(materia.nombre)
        }
      }
    }

    return Object.fromEntries(
      Object.entries(mapa).map(([carrera, set]) => [carrera, [...set].sort()])
    )
  }

  // Agrupa los registros de uso por actividad. Como ahora cada actividad
  // genera su propio registro, basta con contar por ese campo.
  async actividadesMasRealizadas(periodo?: string) {
    const desde = calcularFechaDesde(periodo)
    const resultado = await this.prisma.registro.groupBy({
      by: ['actividad'],
      _count: { _all: true },
      where: {
        tipo: 'uso',
        actividad: { not: null },
        ...(desde && { fecha: { gte: desde } }),
      },
      orderBy: { _count: { actividad: 'desc' } },
    })
    return resultado.map(r => ({ actividad: r.actividad, veces: r._count._all }))
  }
}