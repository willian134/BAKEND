import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { PrestamosService } from './prestamos.service'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { CrearPrestamoDto } from './dto/prestamo.dto'

@Controller('prestamos')
export class PrestamosController {
  constructor(private readonly service: PrestamosService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Get('activos')
  findActivos() {
    return this.service.findActivos()
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Get('todos')
  findTodos() {
    return this.service.findTodos()
  }

  // Todos los préstamos en orden cronológico — para respaldo/exportación
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Get('exportar-todos')
  exportarTodos() {
    return this.service.exportarTodos()
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Get('usuario/:id')
  findByUsuario(@Param('id') id: string) {
    return this.service.findByUsuario(Number(id))
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Post()
  crear(@Body() body: CrearPrestamoDto) {
    const fecha = body.fechaDevolucionEsperada
      ? new Date(body.fechaDevolucionEsperada)
      : undefined
    return this.service.crear(body.usuarioId, body.libroId, fecha, {
      tipoDocumento: body.tipoDocumento,
      numeroDocumento: body.numeroDocumento,
    })
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Patch('devolver/:id')
  devolver(@Param('id') id: string) {
    return this.service.devolver(Number(id))
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Get('ranking-libros')
  rankingLibros(@Query('periodo') periodo?: string) {
    return this.service.rankingLibros(periodo)
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Get('ranking-usuarios')
  rankingUsuarios(@Query('periodo') periodo?: string, @Query('tipoPersona') tipoPersona?: string) {
    return this.service.rankingUsuarios(periodo, tipoPersona)
  }

  // Certificado de no adeudar libros — requisito para titulación
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Get('estado-usuario/:id')
  estadoUsuario(@Param('id') id: string) {
    return this.service.estadoUsuario(Number(id))
  }
}