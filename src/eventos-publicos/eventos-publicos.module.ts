import { Module } from '@nestjs/common'
import { EventosPublicosController } from './eventos-publicos.controller'
import { EventosPublicosService } from './eventos-publicos.service'
import { PrismaService } from '../prisma.service'

@Module({
  controllers: [EventosPublicosController],
  providers: [EventosPublicosService, PrismaService],
})
export class EventosPublicosModule {}