import 'dotenv/config'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { json, urlencoded } from 'express'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Por defecto Express/Nest solo aceptan peticiones de hasta 100kb — de sobra
  // para casi todo el sistema, pero muy poco para importar un lote de miles de
  // libros con toda su metadata de una sola vez (por eso daba 413 Payload Too
  // Large al importar el Excel completo).
  app.use(json({ limit: '20mb' }))
  app.use(urlencoded({ extended: true, limit: '20mb' }))

  // Validación global: cada endpoint que use un DTO con decoradores de
  // class-validator ahora sí rechaza automáticamente datos mal formados,
  // en vez de aceptar cualquier cosa (antes todos los endpoints eran `body: any`).
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,            // descarta campos que no están en el DTO
    forbidNonWhitelisted: false, // no rechaza la petición completa por un campo extra, solo lo ignora
    transform: true,             // convierte tipos automáticamente (ej. strings de query params a number)
  }))

  // Lista explícita de orígenes permitidos. Antes se aceptaba cualquier
  // dominio que CONTUVIERA "biblioteca-front" y terminara en .vercel.app,
  // lo que permitiría que un dominio ajeno como "biblioteca-front-falso"
  // pasara el filtro. Una lista cerrada elimina esa ambigüedad.
  const origenesPermitidos = [
    'http://localhost:5173',
    'https://biblioteca-front-ashen.vercel.app',
  ]

  app.enableCors({
    origin: (origin, callback) => {
      // Sin origin: peticiones del ESP32 y herramientas locales, que no
      // envían cabecera Origin. No son navegadores, CORS no aplica.
      if (!origin || origenesPermitidos.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Origen no permitido por CORS'))
      }
    },
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  await app.listen(3000)
  console.log('Biblioteca backend corriendo en puerto 3000')
}
bootstrap()