import { IsEmail, IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator'

export class LoginDto {
  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  email!: string

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password!: string
}

export class CrearCuentaStaffDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre!: string

  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  email!: string

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password!: string

  @IsIn(['bibliotecario', 'admin'], { message: 'Rol inválido para una cuenta de staff' })
  rol!: string
}