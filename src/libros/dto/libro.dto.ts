import { Type } from 'class-transformer'
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator'

export class CrearLibroDto {
  @IsString() @IsNotEmpty()
  codigo!: string

  @IsString() @IsNotEmpty()
  titulo!: string

  @IsString() @IsNotEmpty()
  autor!: string

  @IsInt()
  anio!: number

  @IsString() @IsNotEmpty()
  categoria!: string

  @IsInt() @Min(0)
  totalEjemplares!: number

  @IsInt() @Min(0)
  disponibles!: number

  @IsString() @IsNotEmpty()
  descripcion!: string

  @IsOptional() @IsString()
  tipo?: string

  @IsOptional() @IsString()
  isbn?: string

  @IsOptional() @IsString()
  codigoDewey?: string

  @IsOptional() @IsString()
  codigoCutter?: string

  @IsOptional() @IsString()
  edicion?: string

  @IsOptional() @IsInt()
  paginas?: number

  @IsOptional() @IsString()
  editorial?: string

  @IsOptional() @IsString()
  idioma?: string

  @IsOptional() @IsBoolean()
  soloEnSala?: boolean

  @IsOptional() @IsString()
  programa?: string

  @IsOptional() @IsString()
  palabrasClave?: string

  @IsOptional() @IsString()
  citaBibliografica?: string
}

export class ActualizarLibroDto {
  @IsOptional() @IsString()
  titulo?: string

  @IsOptional() @IsString()
  autor?: string

  @IsOptional() @IsInt() @Min(0)
  totalEjemplares?: number

  @IsOptional() @IsInt() @Min(0)
  disponibles?: number

  @IsOptional() @IsString()
  categoria?: string

  @IsOptional() @IsString()
  isbn?: string

  @IsOptional() @IsString()
  editorial?: string

  @IsOptional() @IsString()
  programa?: string
}

export class ImportarLoteDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrearLibroDto)
  libros!: CrearLibroDto[]
}