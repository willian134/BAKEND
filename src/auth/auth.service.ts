import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../prisma.service'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } })

    // Una cuenta desactivada (soft-delete) no debe poder iniciar sesión,
    // aunque su contraseña siga siendo correcta.
    if (!usuario || !usuario.password || !usuario.activo) {
      throw new UnauthorizedException('Credenciales inválidas')
    }

    const valida = await bcrypt.compare(password, usuario.password)
    if (!valida) {
      throw new UnauthorizedException('Credenciales inválidas')
    }

    const payload = { sub: usuario.id, rol: usuario.rol, email: usuario.email }

    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    }
  }

  // Solo admin puede llamar esto (el guard vive en el controller) — crea una
  // cuenta nueva de staff (bibliotecario o admin) con contraseña propia.
  // tipoPersona = 'STAFF', para no confundirla con docente/estudiante/invitado.
  async crearCuentaStaff(nombre: string, email: string, password: string, rol: string) {
    const rolesValidos = ['bibliotecario', 'admin']
    if (!rolesValidos.includes(rol)) {
      throw new UnauthorizedException('Rol inválido para una cuenta de staff')
    }

    const existente = await this.prisma.usuario.findUnique({ where: { email } })
    if (existente) {
      throw new UnauthorizedException('Ya existe una cuenta con ese correo')
    }

    const passwordHasheado = await bcrypt.hash(password, 10)

    return this.prisma.usuario.create({
      data: {
        nombre,
        email,
        password: passwordHasheado,
        rol,
        tipoPersona: 'STAFF',
      },
      select: { id: true, nombre: true, email: true, rol: true },
    })
  }
}