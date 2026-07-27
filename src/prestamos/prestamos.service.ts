import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import { calcularFechaDesde } from '../common/periodo.helper'

@Injectable()
export class PrestamosService {
  constructor(private prisma: PrismaService) {}

  findActivos() {
    return this.prisma.prestamo.findMany({
      where: { activo: true },
      include: { usuario: true, libro: true },
      orderBy: { fechaPrestamo: 'desc' },
    })
  }

  findTodos() {
    return this.prisma.prestamo.findMany({
      include: { usuario: true, libro: true },
      orderBy: { fechaPrestamo: 'desc' },
    })
  }

  // Historial completo de préstamos en orden cronológico ascendente,
  // con usuario y libro — para respaldo/exportación.
  exportarTodos() {
    return this.prisma.prestamo.findMany({
      include: {
        usuario: {
          select: {
            id: true, nombre: true, email: true, tipoPersona: true,
            numeroDocumento: true, tipoDocumento: true,
          },
        },
        libro: true,
      },
      orderBy: { fechaPrestamo: 'asc' },
    })
  }

  findByUsuario(usuarioId: number) {
    return this.prisma.prestamo.findMany({
      where: { usuarioId },
      include: { libro: true },
      orderBy: { fechaPrestamo: 'desc' },
    })
  }

  async crear(
    usuarioId: number,
    libroId: number,
    fechaDevolucionEsperada?: Date,
    datosInvitado?: { nombreInvitado?: string; tipoDocumento?: string; numeroDocumento?: string },
  ) {
    const [prestamo] = await this.prisma.$transaction([
      this.prisma.prestamo.create({
        data: {
          usuarioId,
          libroId,
          fechaDevolucionEsperada,
          nombreInvitado: datosInvitado?.nombreInvitado,
          tipoDocumento: datosInvitado?.tipoDocumento,
          numeroDocumento: datosInvitado?.numeroDocumento,
        },
        include: { libro: true },
      }),
      this.prisma.libro.update({
        where: { id: libroId },
        data: { disponibles: { decrement: 1 } },
      }),
      this.prisma.usuario.update({
        where: { id: usuarioId },
        data: { prestamosActivos: { increment: 1 } },
      }),
    ])
    return prestamo
  }

  async devolver(prestamoId: number) {
    const prestamo = await this.prisma.prestamo.findUnique({ where: { id: prestamoId } })
    if (!prestamo) throw new Error('Préstamo no encontrado')

    const [actualizado] = await this.prisma.$transaction([
      this.prisma.prestamo.update({
        where: { id: prestamoId },
        data: { activo: false, fechaDevolucion: new Date() },
      }),
      this.prisma.libro.update({
        where: { id: prestamo.libroId },
        data: { disponibles: { increment: 1 } },
      }),
      this.prisma.usuario.update({
        where: { id: prestamo.usuarioId },
        data: { prestamosActivos: { decrement: 1 } },
      }),
    ])
    return actualizado
  }

  // Ranking de libros por número de préstamos — incluye libros con 0 préstamos
  async rankingLibros(periodo?: string) {
    const desde = calcularFechaDesde(periodo)
    const conteos = await this.prisma.prestamo.groupBy({
      by: ['libroId'],
      _count: { _all: true },
      where: desde ? { fechaPrestamo: { gte: desde } } : undefined,
    })
    const libros = await this.prisma.libro.findMany()
    const mapa = new Map(conteos.map(c => [c.libroId, c._count._all]))
    return libros
      .map(l => ({ libro: l, prestamos: mapa.get(l.id) || 0 }))
      .sort((a, b) => b.prestamos - a.prestamos)
  }

  // Ranking de usuarios por número de préstamos — incluye usuarios con 0 préstamos
  async rankingUsuarios(periodo?: string, tipoPersona?: string) {
    const desde = calcularFechaDesde(periodo)
    const conteos = await this.prisma.prestamo.groupBy({
      by: ['usuarioId'],
      _count: { _all: true },
      where: desde ? { fechaPrestamo: { gte: desde } } : undefined,
    })
    const usuarios = await this.prisma.usuario.findMany({
      where: { rol: 'usuario', activo: true, ...(tipoPersona && { tipoPersona }) },
      omit: { password: true },
    })
    const mapa = new Map(conteos.map(c => [c.usuarioId, c._count._all]))
    return usuarios
      .map(u => ({ usuario: u, prestamos: mapa.get(u.id) || 0 }))
      .sort((a, b) => b.prestamos - a.prestamos)
  }

  // Devuelve el estado de deuda de un usuario y su historial completo.
  // Sustenta el certificado de no adeudar libros que la institución
  // solicita para los trámites de titulación.
  async estadoUsuario(usuarioId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      omit: { password: true },
      include: {
        carreras: { include: { carrera: true } },
      },
    })
    if (!usuario) return { ok: false, mensaje: 'Usuario no encontrado' }

    const prestamos = await this.prisma.prestamo.findMany({
      where: { usuarioId },
      include: { libro: true },
      orderBy: { fechaPrestamo: 'asc' },
    })

    const pendientes = prestamos.filter(p => p.activo)

    return {
      ok: true,
      usuario,
      alDia: pendientes.length === 0,
      pendientes,
      historial: prestamos,
      totalPrestamos: prestamos.length,
    }
  }
}