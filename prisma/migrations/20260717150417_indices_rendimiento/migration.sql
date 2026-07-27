-- CreateIndex
CREATE INDEX "Libro_activo_idx" ON "Libro"("activo");

-- CreateIndex
CREATE INDEX "Libro_programa_idx" ON "Libro"("programa");

-- CreateIndex
CREATE INDEX "Prestamo_fechaPrestamo_idx" ON "Prestamo"("fechaPrestamo");

-- CreateIndex
CREATE INDEX "Prestamo_activo_idx" ON "Prestamo"("activo");

-- CreateIndex
CREATE INDEX "Registro_carrera_idx" ON "Registro"("carrera");

-- CreateIndex
CREATE INDEX "Registro_materia_idx" ON "Registro"("materia");

-- CreateIndex
CREATE INDEX "Registro_fecha_idx" ON "Registro"("fecha");

-- CreateIndex
CREATE INDEX "Usuario_tipoPersona_idx" ON "Usuario"("tipoPersona");

-- CreateIndex
CREATE INDEX "Usuario_rol_idx" ON "Usuario"("rol");
