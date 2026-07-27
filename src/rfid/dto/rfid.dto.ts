import { IsOptional, IsString } from 'class-validator'

export class RegistrarScanDto {
  @IsString()
  uid!: string
}

export class EscanearDto {
  @IsString()
  uid!: string

  @IsOptional() @IsString()
  nombres?: string

  @IsOptional() @IsString()
  apellidos?: string

  @IsOptional() @IsString()
  rol?: string
}