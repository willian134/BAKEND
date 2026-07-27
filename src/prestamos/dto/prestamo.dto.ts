import { IsIn, IsInt, IsOptional, IsString } from 'class-validator'

export class CrearPrestamoDto {
  @IsInt()
  usuarioId!: number

  @IsInt()
  libroId!: number

  @IsOptional() @IsString()
  fechaDevolucionEsperada?: string

  // Documento físico que la persona deja en garantía mientras tiene el libro
  @IsIn(['cedula', 'carnet', 'licencia', 'otro'])
  tipoDocumento!: string

  @IsOptional() @IsString()
  numeroDocumento?: string
}