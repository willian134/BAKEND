import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'

@Injectable()
export class LibrosService {
  constructor(private prisma: PrismaService) { }

  findAll() {
    return this.prisma.libro.findMany({
      where: { activo: true },
      orderBy: { titulo: 'asc' },
    })
  }

  // Detecta libros que parecen ser el mismo repetido. Ocurre, por ejemplo,
  // si una auditoría crea una fila nueva en vez de editar la existente al
  // cambiar el programa: quedan dos filas con el mismo título y autor.
  //
  // Agrupa por una clave normalizada (sin tildes, sin mayúsculas, sin espacios
  // de más) de título + autor, para que "Cálculo" y "CALCULO " caigan juntos.
  // Devuelve solo los grupos con más de un libro, cada uno con sus filas para
  // que el bibliotecario decida cuál conservar.
  async duplicados() {
    const libros = await this.prisma.libro.findMany({
      where: { activo: true },
      orderBy: { titulo: 'asc' },
    })

    const normalizar = (texto: string) =>
      (texto ?? '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes
        .toLowerCase().replace(/\s+/g, ' ').trim()

    const grupos = new Map<string, typeof libros>()
    for (const libro of libros) {
      const clave = `${normalizar(libro.titulo)}|${normalizar(libro.autor)}`
      const grupo = grupos.get(clave) ?? []
      grupo.push(libro)
      grupos.set(clave, grupo)
    }

    // Solo los que se repiten, ordenados por los grupos más grandes primero
    return [...grupos.values()]
      .filter(g => g.length > 1)
      .sort((a, b) => b.length - a.length)
      .map(g => ({
        titulo: g[0].titulo,
        autor: g[0].autor,
        cantidad: g.length,
        libros: g,
      }))
  }

  findByCodigo(codigo: string) {
    return this.prisma.libro.findFirst({
      where: { codigo, activo: true },
    })
  }

  // Crear un libro o revista — acepta todos los metadatos del inventario institucional.
  create(data: {
    codigo: string
    titulo: string
    autor: string
    anio: number
    categoria: string
    totalEjemplares: number
    disponibles: number
    descripcion: string
    tipo?: string
    isbn?: string
    codigoDewey?: string
    codigoCutter?: string
    edicion?: string
    paginas?: number
    editorial?: string
    idioma?: string
    soloEnSala?: boolean
    programa?: string
    palabrasClave?: string
    citaBibliografica?: string
  }) {
    return this.prisma.libro.create({ data })
  }

  update(id: number, data: Partial<{
    titulo: string
    autor: string
    totalEjemplares: number
    disponibles: number
    categoria: string
    isbn: string
    editorial: string
    programa: string
  }>) {
    return this.prisma.libro.update({
      where: { id },
      data,
    })
  }

  // Soft-delete: nunca borramos de verdad — solo marcamos inactivo. Reversible.
  remove(id: number) {
    return this.prisma.libro.update({
      where: { id },
      data: { activo: false },
    })
  }

  // Papelera: libros eliminados, solo visible para admin
  findEliminados() {
    return this.prisma.libro.findMany({
      where: { activo: false },
      orderBy: { titulo: 'asc' },
    })
  }

  restaurar(id: number) {
    return this.prisma.libro.update({
      where: { id },
      data: { activo: true },
    })
  }

  // Importación por lote: en vez de N peticiones (una por libro), procesa todo
  // el archivo en una sola operación.
  // - Códigos nuevos → se crean completos, con su stock inicial.
  // - Códigos que YA EXISTEN (activos) → se actualiza su metadata (título,
  //   autor, categoría, ISBN, etc.) pero NUNCA totalEjemplares/disponibles,
  //   porque esos valores reflejan préstamos reales en curso — sobrescribirlos
  //   en cada resubida del Excel borraría el estado real de la biblioteca.
  // - Códigos que estaban en la papelera → se reactivan y se actualizan igual
  //   que los existentes.
  async crearLote(libros: {
    codigo: string
    titulo: string
    autor: string
    anio: number
    categoria: string
    totalEjemplares: number
    disponibles: number
    descripcion: string
    tipo?: string
    isbn?: string
    codigoDewey?: string
    codigoCutter?: string
    edicion?: string
    paginas?: number
    editorial?: string
    idioma?: string
    soloEnSala?: boolean
    programa?: string
    palabrasClave?: string
    citaBibliografica?: string
  }[]) {
    const codigos = libros.map(l => l.codigo)
    const existentes = await this.prisma.libro.findMany({
      where: { codigo: { in: codigos } },
      select: { codigo: true, activo: true },
    })
    const existentesActivos = new Set(existentes.filter(e => e.activo).map(e => e.codigo))
    const existentesInactivos = new Set(existentes.filter(e => !e.activo).map(e => e.codigo))

    const nuevos = libros.filter(l => !existentesActivos.has(l.codigo) && !existentesInactivos.has(l.codigo))
    const paraActualizar = libros.filter(l => existentesActivos.has(l.codigo) || existentesInactivos.has(l.codigo))

    const metadata = (l: typeof libros[number]) => ({
      titulo: l.titulo,
      autor: l.autor,
      anio: l.anio,
      categoria: l.categoria,
      descripcion: l.descripcion,
      tipo: l.tipo,
      isbn: l.isbn,
      codigoDewey: l.codigoDewey,
      codigoCutter: l.codigoCutter,
      edicion: l.edicion,
      paginas: l.paginas,
      editorial: l.editorial,
      idioma: l.idioma,
      soloEnSala: l.soloEnSala,
      programa: l.programa,
      palabrasClave: l.palabrasClave,
      citaBibliografica: l.citaBibliografica,
    })

    if (nuevos.length > 0) {
      await this.prisma.libro.createMany({ data: nuevos, skipDuplicates: true })
    }

    // Actualizar de a lotes en paralelo (no uno por uno) — con miles de libros
    // existentes, actualizar secuencialmente podía agotar el tiempo de espera
    // de la petición antes de terminar.
    const TAMANO_LOTE = 25
    for (let i = 0; i < paraActualizar.length; i += TAMANO_LOTE) {
      const lote = paraActualizar.slice(i, i + TAMANO_LOTE)
      await Promise.all(
        lote.map(libro =>
          this.prisma.libro.update({
            where: { codigo: libro.codigo },
            data: { ...metadata(libro), activo: true },
          })
        )
      )
    }

    return {
      total: libros.length,
      creados: nuevos.length,
      actualizados: paraActualizar.length,
      reactivados: [...existentesInactivos].filter(c => libros.some(l => l.codigo === c)).length,
    }
  }

  // Todos los libros en el mismo formato de columnas del Excel institucional,
  // para exportar el catálogo completo desde el sistema
  exportarTodos() {
    return this.prisma.libro.findMany({ where: { activo: true }, orderBy: { codigo: 'asc' } })
  }

  // Conteo de libros agrupados por programa/carrera (para las tarjetas de la landing)
  async conteoPorPrograma() {
    const resultado = await this.prisma.libro.groupBy({
      by: ['programa'],
      _count: { _all: true },
      where: { programa: { not: null }, activo: true },
    })
    return resultado.map(r => ({
      programa: r.programa,
      total: r._count._all,
    }))
  }

  // Búsqueda combinada: texto libre (código/título/autor) + filtros opcionales
  // de carrera y categoría + orden configurable. Sin límite artificial de
  // resultados — antes se cortaba siempre a 50, aunque una carrera tuviera
  // más libros que eso.
  buscar(texto?: string, programa?: string, categoria?: string, orden?: string, direccion?: string) {
    const campoOrden = orden === 'autor' ? 'autor' : orden === 'anio' ? 'anio' : 'titulo'
    const direccionOrden = direccion === 'desc' ? 'desc' : 'asc'

    return this.prisma.libro.findMany({
      where: {
        AND: [
          { activo: true },
          programa ? { programa } : {},
          categoria ? { categoria } : {},
          texto
            ? {
              OR: [
                { codigo: { contains: texto, mode: 'insensitive' } },
                { titulo: { contains: texto, mode: 'insensitive' } },
                { autor: { contains: texto, mode: 'insensitive' } },
              ],
            }
            : {},
        ],
      },
      orderBy: { [campoOrden]: direccionOrden },
    })
  }

  // Lista de categorías (área de conocimiento) distintas — si se pasa un
  // programa, solo trae las categorías que de verdad tienen libros de esa
  // carrera, en vez de mostrar siempre todas las categorías de la biblioteca
  // completa (que confundía: elegías "Electricidad" y veías "Historia de América").
  async listaCategorias(programa?: string) {
    const resultado = await this.prisma.libro.findMany({
      where: { activo: true, ...(programa && { programa }) },
      select: { categoria: true },
      distinct: ['categoria'],
      orderBy: { categoria: 'asc' },
    })
    return resultado.map(r => r.categoria)
  }

  // Lista de programas/carreras distintos que existen en el catálogo
  async listaProgramas() {
    const resultado = await this.prisma.libro.findMany({
      where: { programa: { not: null }, activo: true },
      select: { programa: true },
      distinct: ['programa'],
      orderBy: { programa: 'asc' },
    })
    return resultado.map(r => r.programa)
  }
}