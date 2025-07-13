/*
  Warnings:

  - A unique constraint covering the columns `[nomeProjeto]` on the table `projetos` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "CicloAvaliacao" ALTER COLUMN "duracaoEmAndamentoDias" SET DEFAULT 0,
ALTER COLUMN "duracaoEmEqualizacaoDias" SET DEFAULT 0,
ALTER COLUMN "duracaoEmRevisaoDias" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "LiderColaborador" ADD COLUMN     "idProjeto" UUID;

-- AlterTable
ALTER TABLE "Pares" ADD COLUMN     "diasTrabalhadosJuntos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "idProjeto" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "projetos_nomeProjeto_key" ON "projetos"("nomeProjeto");

-- AddForeignKey
ALTER TABLE "Pares" ADD CONSTRAINT "Pares_idProjeto_fkey" FOREIGN KEY ("idProjeto") REFERENCES "projetos"("idProjeto") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiderColaborador" ADD CONSTRAINT "LiderColaborador_idProjeto_fkey" FOREIGN KEY ("idProjeto") REFERENCES "projetos"("idProjeto") ON DELETE SET NULL ON UPDATE CASCADE;
