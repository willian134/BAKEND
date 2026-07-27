-- CreateTable
CREATE TABLE "EventoPublico" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "programa" TEXT,
    "texto" TEXT,
    "libroId" INTEGER,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoPublico_pkey" PRIMARY KEY ("id")
);
