import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe, UseGuards, Put } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { UsuariosService } from './usuarios.service'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { CrearUsuarioDto, ActualizarUsuarioDto, ActualizarCiclosDto, AgregarCarreraDto, CambiarRolDto } from './dto/usuario.dto'

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(@Query('tipoPersona') tipoPersona?: string) {
    return this.service.findAll(tipoPersona)
  }

  // Lista de carreras reales — reemplaza el hardcodeo que vivía en el frontend
  @UseGuards(AuthGuard('jwt'))
  @Get('carreras')
  listaCarreras() {
    return this.service.listaCarreras()
  }

  // Búsqueda parcial por nombre o correo para el autocompletado del registro.
  // Va antes de las rutas con :param para que "buscar" no se confunda con un id.
  @UseGuards(AuthGuard('jwt'))
  @Get('buscar')
  buscar(@Query('q') q: string, @Query('tipoPersona') tipoPersona?: string) {
    return this.service.buscar(q ?? '', tipoPersona)
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('rfid/:uid')
  findByRfid(@Param('uid') uid: string) {
    return this.service.findByRfid(uid)
  }

  // Para reconocer a un estudiante que ya se registró antes
  @UseGuards(AuthGuard('jwt'))
  @Get('email/:email')
  findByEmail(@Param('email') email: string) {
    return this.service.findByEmail(email)
  }

  // Para reconocer a un invitado/externo que ya visitó antes
  @UseGuards(AuthGuard('jwt'))
  @Get('documento/:numero')
  findByDocumento(@Param('numero') numero: string) {
    return this.service.findByDocumento(numero)
  }

  // Registrar a alguien por PRIMERA VEZ es tarea del día a día — la necesita
  // el bibliotecario para no depender de un admin cada vez que llega gente nueva.
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Post()
  create(@Body() body: CrearUsuarioDto) {
    return this.service.create(body)
  }

  // Editar a alguien que YA EXISTE (nombre, RFID, iniciales) es reconfiguración,
  // no operación diaria — solo admin.
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: ActualizarUsuarioDto) {
    return this.service.update(id, body)
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Patch(':id/ciclos')
  actualizarCiclos(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ActualizarCiclosDto
  ) {
    return this.service.actualizarCiclosYMaterias(id, body.carrera, body.ciclos)
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post(':id/carreras')
  agregarCarrera(@Param('id', ParseIntPipe) id: number, @Body() body: AgregarCarreraDto) {
    return this.service.agregarCarrera(id, body.carrera)
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Delete(':id/carreras/:carrera')
  quitarCarrera(@Param('id', ParseIntPipe) id: number, @Param('carrera') carrera: string) {
    return this.service.quitarCarrera(id, decodeURIComponent(carrera))
  }

  // Decidir quién tiene qué nivel de poder en el sistema es la acción más
  // sensible de todas — exclusiva de admin, nadie puede auto-ascenderse.
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Patch(':id/rol')
  cambiarRol(@Param('id', ParseIntPipe) id: number, @Body() body: CambiarRolDto) {
    return this.service.cambiarRol(id, body.rol)
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('papelera')
  findEliminados(@Query('tipoPersona') tipoPersona?: string) {
    return this.service.findEliminados(tipoPersona)
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Patch(':id/restaurar')
  restaurar(@Param('id', ParseIntPipe) id: number) {
    return this.service.restaurar(id)
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id)
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Put(':id/asignacion')
  reemplazarAsignacion(
    @Param('id') id: string,
    @Body() body: {
      carreras: {
        nombre: string
        ciclos: { numero: number; jornada?: string; materias?: string[] }[]
      }[]
    },
  ) {
    return this.service.reemplazarAsignacion(Number(id), body.carreras)
  }

}