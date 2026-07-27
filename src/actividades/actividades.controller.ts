import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ActividadesService } from './actividades.service'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'

@Controller('actividades')
export class ActividadesController {
  constructor(private readonly service: ActividadesService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Get()
  findAll() {
    return this.service.findAll()
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Post()
  crear(@Body() body: { nombre: string; icono?: string }) {
    return this.service.crear(body.nombre, body.icono)
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post('limpiar-iconos')
  limpiarIconos() {
    return this.service.limpiarIconos()
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Patch(':id')
  actualizar(
    @Param('id') id: string,
    @Body() body: { nombre?: string; icono?: string; orden?: number },
  ) {
    return this.service.actualizar(Number(id), body)
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Delete(':id')
  eliminar(@Param('id') id: string) {
    return this.service.eliminar(Number(id))
  }
}