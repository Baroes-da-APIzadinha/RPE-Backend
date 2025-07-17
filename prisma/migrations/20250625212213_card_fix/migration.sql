/*
  Warnings:

  - You are about to drop the column `idCriterio` on the `CardAutoAvaliacao` table. All the data in the column will be lost.
  - You are about to drop the column `idCriterio` on the `CardAvaliacaoLiderColaborador` table. All the data in the column will be lost.
  - You are about to drop the `CardAvaliacaoColaboradorMentor` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CardAvaliacaoPares` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `nomeCriterio` to the `CardAutoAvaliacao` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nomeCriterio` to the `CardAvaliacaoLiderColaborador` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CardAutoAvaliacao" DROP CONSTRAINT "CardAutoAvaliacao_idCriterio_fkey";

-- DropForeignKey
ALTER TABLE "CardAvaliacaoColaboradorMentor" DROP CONSTRAINT "CardAvaliacaoColaboradorMentor_idAvaliacao_fkey";

-- DropForeignKey
ALTER TABLE "CardAvaliacaoColaboradorMentor" DROP CONSTRAINT "CardAvaliacaoColaboradorMentor_idCriterio_fkey";

-- DropForeignKey
ALTER TABLE "CardAvaliacaoLiderColaborador" DROP CONSTRAINT "CardAvaliacaoLiderColaborador_idCriterio_fkey";

-- DropForeignKey
ALTER TABLE "CardAvaliacaoPares" DROP CONSTRAINT "CardAvaliacaoPares_idAvaliacao_fkey";

-- DropForeignKey
ALTER TABLE "CardAvaliacaoPares" DROP CONSTRAINT "CardAvaliacaoPares_idCriterio_fkey";

-- AlterTable
ALTER TABLE "CardAutoAvaliacao" DROP COLUMN "idCriterio",
ADD COLUMN     "nomeCriterio" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CardAvaliacaoLiderColaborador" DROP COLUMN "idCriterio",
ADD COLUMN     "nomeCriterio" TEXT NOT NULL;

-- DropTable
DROP TABLE "CardAvaliacaoColaboradorMentor";

-- DropTable
DROP TABLE "CardAvaliacaoPares";
