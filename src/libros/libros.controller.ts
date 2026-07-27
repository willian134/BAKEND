import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { LibrosService } from './libros.service'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { CrearLibroDto, ActualizarLibroDto, ImportarLoteDto } from './dto/libro.dto'

@Controller('libros')
export class LibrosController {
  constructor(private readonly service: LibrosService) { }

  // ── PÚBLICOS (sin login) ──
  @Get()
  findAll() {
    return this.service.findAll()
  }

  @Get('conteo-por-programa')
  conteoPorPrograma() {
    return this.service.conteoPorPrograma()
  }

  @Get('programas')
  listaProgramas() {
    return this.service.listaProgramas()
  }

  // Grupos de libros que parecen repetidos (mismo título y autor). Va antes
  // de las rutas con :param para que "duplicados" no se lea como un código.
  @Get('duplicados')
  duplicados() {
    return this.service.duplicados()
  }

  @Get('buscar')
  buscar(
    @Query('texto') texto?: string,
    @Query('programa') programa?: string,
    @Query('categoria') categoria?: string,
    @Query('orden') orden?: string,
    @Query('direccion') direccion?: string,
  ) {
    return this.service.buscar(texto, programa, categoria, orden, direccion)
  }

  @Get('categorias')
  listaCategorias(@Query('programa') programa?: string) {
    return this.service.listaCategorias(programa)
  }

  @Get('codigo/:codigo')
  findByCodigo(@Param('codigo') codigo: string) {
    return this.service.findByCodigo(codigo)
  }

  // ── PROTEGIDOS: bibliotecario y admin ──
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Post()
  create(@Body() body: CrearLibroDto) {
    return this.service.create(body)
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Post('importar-lote')
  crearLote(@Body() body: ImportarLoteDto) {
    return this.service.crearLote(body.libros)
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Get('exportar-todos')
  exportarTodos() {
    return this.service.exportarTodos()
  }

  // ── PROTEGIDO: solo admin (editar un libro ya existente es reconfiguración) ──
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: ActualizarLibroDto) {
    return this.service.update(Number(id), body)
  }

  // ── PROTEGIDO: solo admin ──
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('papelera')
  findEliminados() {
    return this.service.findEliminados()
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Patch(':id/restaurar')
  restaurar(@Param('id') id: string) {
    return this.service.restaurar(Number(id))
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id))
  }
}