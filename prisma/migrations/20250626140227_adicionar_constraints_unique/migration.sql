/*
  Warnings:

  - A unique constraint covering the columns `[nomeCiclo]` on the table `CicloAvaliacao` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nomeCriterio]` on the table `CriterioAvaliativo` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CicloAvaliacao_nomeCiclo_key" ON "CicloAvaliacao"("nomeCiclo");

-- CreateIndex
CREATE UNIQUE INDEX "CriterioAvaliativo_nomeCriterio_key" ON "CriterioAvaliativo"("nomeCriterio");
