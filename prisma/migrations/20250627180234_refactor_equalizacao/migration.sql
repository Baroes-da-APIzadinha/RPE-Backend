/*
  Warnings:

  - You are about to alter the column `notaAjustada` on the `Equalizacao` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(5,2)`.

*/
-- AlterTable
ALTER TABLE "Equalizacao" ALTER COLUMN "idMembroComite" DROP NOT NULL,
ALTER COLUMN "notaAjustada" DROP NOT NULL,
ALTER COLUMN "notaAjustada" SET DATA TYPE DECIMAL(5,2),
ALTER COLUMN "justificativa" DROP NOT NULL;
