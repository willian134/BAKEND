import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { RegistrosService } from './registros.service'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { CrearRegistroDto } from './dto/registro.dto'

@Controller('registros')
export class RegistrosController {
  constructor(private readonly service: RegistrosService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Get()
  findAll() {
    return this.service.findAll()
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Get('mes/:anio/:mes')
  findByMes(@Param('anio') anio: string, @Param('mes') mes: string) {
    return this.service.findByMes(Number(anio), Number(mes))
  }

  // Todos los registros con el usuario completo — para respaldo/exportación
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Get('exportar-todos')
  exportarTodos() {
    return this.service.exportarTodos()
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Get('stats/:anio/:mes')
  stats(@Param('anio') anio: string, @Param('mes') mes: string) {
    return this.service.stats(Number(anio), Number(mes))
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Get('stats-periodo')
  statsPeriodo(
    @Query('periodo') periodo?: string,
    @Query('tipoPersona') tipoPersona?: string,
    @Query('carrera') carrera?: string,
    @Query('materia') materia?: string,
  ) {
    return this.service.statsPeriodo(periodo, tipoPersona, carrera, materia)
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Get('materias-disponibles')
  materiasDisponibles() {
    return this.service.materiasDisponibles()
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Get('comparativa-por-tipo')
  comparativaPorTipo(@Query('periodo') periodo?: string) {
    return this.service.comparativaPorTipo(periodo)
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Get('comparativa-anual')
  comparativaAnual() {
    return this.service.comparativaAnual()
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Post()
  create(@Body() body: CrearRegistroDto) {
    return this.service.create(body)
  }

  // Materias agrupadas por carrera — alimenta las sugerencias filtradas
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Get('materias-por-carrera')
  materiasPorCarrera() {
    return this.service.materiasPorCarrera()
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Get('ranking-usuarios')
  rankingUsuarios(
    @Query('periodo') periodo?: string,
    @Query('tipoPersona') tipoPersona?: string,
    @Query('carrera') carrera?: string,
    @Query('materia') materia?: string,
  ) {
    return this.service.rankingUsuarios(periodo, tipoPersona, carrera, materia)
  }

  // Conteo de actividades más realizadas — para el gráfico del resumen
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Get('actividades-mas-realizadas')
  actividadesMasRealizadas(@Query('periodo') periodo?: string) {
    return this.service.actividadesMasRealizadas(periodo)
  }
}