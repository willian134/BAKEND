import { IsIn, IsInt, IsOptional, IsString } from 'class-validator'

export class CrearRegistroDto {
  @IsIn(['uso', 'prestamo', 'devolucion'])
  tipo!: string

  @IsInt()
  usuarioId!: number

  @IsOptional() @IsString()
  actividad?: string

  @IsOptional() @IsString()
  detalle?: string

  @IsOptional() @IsString()
  carrera?: string

  @IsOptional() @IsInt()
  ciclo?: number

  @IsOptional() @IsString()
  materia?: string

  @IsOptional() @IsIn(['matutino', 'vespertino', 'nocturno'])
  jornada?: string

  @IsOptional() @IsInt()
  libroId?: number
}