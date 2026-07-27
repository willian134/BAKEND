import { Controller, Get, Post, Body, Query, UseGuards, Sse, MessageEvent } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Observable } from 'rxjs'
import { RfidService } from './rfid.service'
import { RegistrarScanDto, EscanearDto } from './dto/rfid.dto'

@Controller('rfid')
export class RfidController {
  constructor(private readonly service: RfidService) {}

  // El script Python hace POST aquí (flujo anterior, se mantiene por compatibilidad)
  @Post('scan')
  registrarScan(@Body() body: RegistrarScanDto) {
    return this.service.registrarScan(body.uid)
  }

  // Polling anterior — se mantiene por compatibilidad, pero el frontend nuevo
  // ya no lo usa: ahora escucha el canal SSE de abajo.
  @Get('pendiente')
  obtenerPendiente() {
    return this.service.obtenerPendiente()
  }

  // Canal SSE: el kiosco abre esta conexión una vez y el backend le empuja
  // cada escaneo al instante. Protegido con JWT igual que el resto.
  @UseGuards(AuthGuard('jwt'))
  @Sse('eventos')
  eventos(): Observable<MessageEvent> {
    return this.service.streamEscaneos()
  }

  // Usado por el flujo "vincular llavero nuevo" en Gestión de Docentes.
  // No consume el escaneo — solo mira si hubo uno nuevo desde la hora dada.
  @UseGuards(AuthGuard('jwt'))
  @Get('ultimo-escaneo')
  ultimoEscaneoDesde(@Query('desde') desde: string) {
    return this.service.ultimoEscaneoDesde(new Date(desde))
  }

  // El ESP32 hace POST aquí cada vez que detecta una tarjeta
  @Post('escanear')
  escanear(@Body() body: EscanearDto) {
    return this.service.escanear(body.uid, body.nombres ?? '', body.apellidos ?? '', body.rol ?? '')
  }
}