/*
  Warnings:

  - Added the required column `duracaoEmAndamentoDias` to the `CicloAvaliacao` table without a default value. This is not possible if the table is not empty.
  - Added the required column `duracaoEmEqualizacaoDias` to the `CicloAvaliacao` table without a default value. This is not possible if the table is not empty.
  - Added the required column `duracaoEmRevisaoDias` to the `CicloAvaliacao` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `CicloAvaliacao` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CicloAvaliacao" ADD COLUMN     "duracaoEmAndamentoDias" INTEGER NOT NULL,
ADD COLUMN     "duracaoEmEqualizacaoDias" INTEGER NOT NULL,
ADD COLUMN     "duracaoEmRevisaoDias" INTEGER NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
