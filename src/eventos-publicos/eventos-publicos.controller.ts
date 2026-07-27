import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { EventosPublicosService } from './eventos-publicos.service'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'

@Controller('eventos-publicos')
export class EventosPublicosController {
  constructor(private readonly service: EventosPublicosService) {}

  // ── PÚBLICO (sin login) ──
  @Post()
  registrar(@Body() body: { tipo: string; programa?: string; texto?: string; libroId?: number }) {
    return this.service.registrar(body)
  }

  // ── PROTEGIDOS: bibliotecario y admin ──
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Get('total-visitas')
  totalVisitas(@Query('periodo') periodo?: string) {
    return this.service.totalVisitas(periodo)
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Get('libros-mas-buscados')
  librosMasBuscados(@Query('periodo') periodo?: string) {
    return this.service.librosMasBuscados(periodo)
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'bibliotecario')
  @Get('carreras-mas-clickeadas')
  carrerasMasClickeadas(@Query('periodo') periodo?: string) {
    return this.service.carrerasMasClickeadas(periodo)
  }
}