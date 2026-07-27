/*
  Warnings:

  - You are about to drop the column `carreraId` on the `Ciclo` table. All the data in the column will be lost.
  - Added the required column `usuarioCarreraId` to the `Ciclo` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Ciclo" DROP CONSTRAINT "Ciclo_carreraId_fkey";

-- DropForeignKey
ALTER TABLE "Materia" DROP CONSTRAINT "Materia_cicloId_fkey";

-- AlterTable
ALTER TABLE "Ciclo" DROP COLUMN "carreraId",
ADD COLUMN     "usuarioCarreraId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Ciclo" ADD CONSTRAINT "Ciclo_usuarioCarreraId_fkey" FOREIGN KEY ("usuarioCarreraId") REFERENCES "UsuarioCarrera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Materia" ADD CONSTRAINT "Materia_cicloId_fkey" FOREIGN KEY ("cicloId") REFERENCES "Ciclo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
