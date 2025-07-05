/*
  Warnings:

  - Added the required column `idCiclo` to the `Equalizacao` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Equalizacao" ADD COLUMN     "idCiclo" UUID NOT NULL;
