import { Module } from '@nestjs/common'
import { ActividadesController } from './actividades.controller'
import { ActividadesService } from './actividades.service'
import { PrismaService } from '../prisma.service'

@Module({
  controllers: [ActividadesController],
  providers: [ActividadesService, PrismaService],
})
export class ActividadesModule {}