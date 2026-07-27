import { Module } from '@nestjs/common'
import { RfidController } from './rfid.controller'
import { RfidService } from './rfid.service'
import { PrismaService } from '../prisma.service'

@Module({
  controllers: [RfidController],
  providers: [RfidService, PrismaService],
})
export class RfidModule {}
