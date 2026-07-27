-- Catálogo real de carreras del Instituto Tecnológico Superior Sudamericano
-- Periodo Académico Septiembre 2025 - Febrero 2026
-- ON CONFLICT evita duplicar "Desarrollo de Software", que ya existe.

INSERT INTO "Carrera" (nombre) VALUES
  ('Desarrollo de Software'),
  ('Diseño Gráfico'),
  ('Gastronomía'),
  ('Marketing Digital y Negocios'),
  ('Turismo'),
  ('Talento Humano'),
  ('Enfermería'),
  ('Electricidad'),
  ('Contabilidad y Asesoría Tributaria'),
  ('Redes y Telecomunicaciones')
ON CONFLICT (nombre) DO NOTHING;