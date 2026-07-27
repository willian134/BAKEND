-- ============================================
-- PASO 1: Crear la tabla Usuario nueva (vacía)
-- ============================================
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT,
    "rfid" TEXT,
    "rol" TEXT NOT NULL DEFAULT 'usuario',
    "tipoPersona" TEXT NOT NULL DEFAULT 'DOCENTE',
    "iniciales" TEXT,
    "prestamosActivos" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");
CREATE UNIQUE INDEX "Usuario_rfid_key" ON "Usuario"("rfid");

-- ============================================
-- PASO 2: Copiar los datos de Docente -> Usuario
-- (los IDs se preservan exactamente iguales)
-- ============================================
INSERT INTO "Usuario" ("id", "nombre", "rfid", "iniciales", "prestamosActivos", "rol", "tipoPersona", "createdAt")
SELECT "id", "nombre", "rfid", "iniciales", "prestamosActivos", 'usuario', 'DOCENTE', "createdAt"
FROM "Docente";

-- Reiniciar el contador de autoincremento para que el próximo INSERT no choque con los IDs ya copiados
SELECT setval('"Usuario_id_seq"', (SELECT MAX("id") FROM "Usuario"));

-- ============================================
-- PASO 3: Crear UsuarioCarrera y copiar desde DocenteCarrera
-- ============================================
CREATE TABLE "UsuarioCarrera" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "carreraId" INTEGER NOT NULL,

    CONSTRAINT "UsuarioCarrera_pkey" PRIMARY KEY ("id")
);

INSERT INTO "UsuarioCarrera" ("id", "usuarioId", "carreraId")
SELECT "id", "docenteId", "carreraId"
FROM "DocenteCarrera";

SELECT setval('"UsuarioCarrera_id_seq"', (SELECT MAX("id") FROM "UsuarioCarrera"));

ALTER TABLE "UsuarioCarrera" ADD CONSTRAINT "UsuarioCarrera_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UsuarioCarrera" ADD CONSTRAINT "UsuarioCarrera_carreraId_fkey" FOREIGN KEY ("carreraId") REFERENCES "Carrera"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- PASO 4: Agregar usuarioId a Prestamo, copiando el valor desde docenteId
-- ============================================
ALTER TABLE "Prestamo" ADD COLUMN "usuarioId" INTEGER;
UPDATE "Prestamo" SET "usuarioId" = "docenteId";
ALTER TABLE "Prestamo" ALTER COLUMN "usuarioId" SET NOT NULL;

ALTER TABLE "Prestamo" ADD COLUMN "nombreInvitado" TEXT;
ALTER TABLE "Prestamo" ADD COLUMN "numeroDocumento" TEXT;
ALTER TABLE "Prestamo" ADD COLUMN "tipoDocumento" TEXT;

ALTER TABLE "Prestamo" DROP CONSTRAINT "Prestamo_docenteId_fkey";
ALTER TABLE "Prestamo" DROP COLUMN "docenteId";
ALTER TABLE "Prestamo" ADD CONSTRAINT "Prestamo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- PASO 5: Agregar usuarioId a Registro, copiando el valor desde docenteId
-- ============================================
ALTER TABLE "Registro" ADD COLUMN "usuarioId" INTEGER;
UPDATE "Registro" SET "usuarioId" = "docenteId";
ALTER TABLE "Registro" ALTER COLUMN "usuarioId" SET NOT NULL;

ALTER TABLE "Registro" DROP CONSTRAINT "Registro_docenteId_fkey";
ALTER TABLE "Registro" DROP COLUMN "docenteId";
ALTER TABLE "Registro" ADD CONSTRAINT "Registro_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- PASO 6: Borrar las tablas viejas, ya con todo migrado
-- ============================================
DROP TABLE "DocenteCarrera";
DROP TABLE "Docente";