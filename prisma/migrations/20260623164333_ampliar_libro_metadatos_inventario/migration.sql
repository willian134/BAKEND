-- AlterTable
ALTER TABLE "Libro" ADD COLUMN     "citaBibliografica" TEXT,
ADD COLUMN     "codigoCutter" TEXT,
ADD COLUMN     "codigoDewey" TEXT,
ADD COLUMN     "edicion" TEXT,
ADD COLUMN     "editorial" TEXT,
ADD COLUMN     "idioma" TEXT,
ADD COLUMN     "isbn" TEXT,
ADD COLUMN     "paginas" INTEGER,
ADD COLUMN     "palabrasClave" TEXT,
ADD COLUMN     "programa" TEXT,
ADD COLUMN     "soloEnSala" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT 'LIBRO';
