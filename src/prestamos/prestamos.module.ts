import { Module } from '@nestjs/common'
import { PrestamosController } from './prestamos.controller'
import { PrestamosService } from './prestamos.service'
import { PrismaService } from '../prisma.service'

@Module({
  controllers: [PrestamosController],
  providers: [PrestamosService, PrismaService],
})
export class PrestamosModule {}