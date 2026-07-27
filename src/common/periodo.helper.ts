// Ventanas móviles de tiempo para filtrar analítica: día, semana, mes, año o todo el historial.
export type Periodo = 'dia' | 'semana' | 'mes' | 'anio' | 'todo'

export function calcularFechaDesde(periodo?: string): Date | undefined {
  const ahora = Date.now()
  const dia = 24 * 60 * 60 * 1000

  switch (periodo) {
    case 'dia':
      return new Date(ahora - dia)
    case 'semana':
      return new Date(ahora - 7 * dia)
    case 'mes':
      return new Date(ahora - 30 * dia)
    case 'anio':
      return new Date(ahora - 365 * dia)
    default:
      return undefined // 'todo' o sin especificar: sin filtro de fecha
  }
}