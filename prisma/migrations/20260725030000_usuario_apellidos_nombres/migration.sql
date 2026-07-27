-- AlterTable: separar el nombre en apellidos y nombres.
-- Se agregan como columnas opcionales para no romper las filas existentes.
-- El campo `nombre` se conserva como el combinado "APELLIDOS NOMBRES" que
-- usan reportes, certificados, tablas y el flujo RFID.
ALTER TABLE "Usuario" ADD COLUMN "apellidos" TEXT;
ALTER TABLE "Usuario" ADD COLUMN "nombres" TEXT;
