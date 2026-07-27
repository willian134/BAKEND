BEGIN;

-- Actividad registrada: uso de sala, préstamos, devoluciones
DELETE FROM "Prestamo";
DELETE FROM "Registro";

-- Escaneos crudos del lector y analítica del catálogo público
DELETE FROM "RfidScan";
DELETE FROM "EventoPublico";

-- Asignación académica de prueba: materias, ciclos y vínculos con carreras.
-- Los usuarios y las carreras se conservan; solo se borra lo que el
-- bibliotecario volverá a cargar con los datos reales.
DELETE FROM "Materia";
DELETE FROM "Ciclo";
DELETE FROM "UsuarioCarrera";

-- Los usuarios conservan sus datos, pero su contador de préstamos
-- activos debe volver a cero: si no, quedarían con préstamos fantasma
UPDATE "Usuario" SET "prestamosActivos" = 0;

-- Los libros vuelven a tener todos sus ejemplares disponibles
UPDATE "Libro" SET disponibles = "totalEjemplares";

-- Reiniciar contadores de ID
ALTER SEQUENCE "Prestamo_id_seq" RESTART WITH 1;
ALTER SEQUENCE "Registro_id_seq" RESTART WITH 1;
ALTER SEQUENCE "RfidScan_id_seq" RESTART WITH 1;
ALTER SEQUENCE "EventoPublico_id_seq" RESTART WITH 1;
ALTER SEQUENCE "Materia_id_seq" RESTART WITH 1;
ALTER SEQUENCE "Ciclo_id_seq" RESTART WITH 1;
ALTER SEQUENCE "UsuarioCarrera_id_seq" RESTART WITH 1;

COMMIT;

-- npx prisma db execute --file ./limpiar-actividad.sql