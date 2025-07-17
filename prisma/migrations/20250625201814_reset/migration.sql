/*
  Warnings:

  - You are about to drop the `AlocacaoColaboradorProjeto` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AlocacaoLiderProjeto` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AssociacaoCriterioCiclo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Avaliacao` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CicloAvaliacao` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Colaborador` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ColaboradorPerfil` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CriterioAvaliativo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DetalheAvaliacao` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Equalizacao` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GestorColaborador` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `IndicacaoReferencia` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Projeto` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `colaboradores_ciclos` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AlocacaoColaboradorProjeto" DROP CONSTRAINT "AlocacaoColaboradorProjeto_idColaborador_fkey";

-- DropForeignKey
ALTER TABLE "AlocacaoColaboradorProjeto" DROP CONSTRAINT "AlocacaoColaboradorProjeto_idProjeto_fkey";

-- DropForeignKey
ALTER TABLE "AlocacaoLiderProjeto" DROP CONSTRAINT "AlocacaoLiderProjeto_idLider_fkey";

-- DropForeignKey
ALTER TABLE "AlocacaoLiderProjeto" DROP CONSTRAINT "AlocacaoLiderProjeto_idProjeto_fkey";

-- DropForeignKey
ALTER TABLE "AssociacaoCriterioCiclo" DROP CONSTRAINT "AssociacaoCriterioCiclo_idCiclo_fkey";

-- DropForeignKey
ALTER TABLE "AssociacaoCriterioCiclo" DROP CONSTRAINT "AssociacaoCriterioCiclo_idCriterio_fkey";

-- DropForeignKey
ALTER TABLE "Avaliacao" DROP CONSTRAINT "Avaliacao_idAvaliado_fkey";

-- DropForeignKey
ALTER TABLE "Avaliacao" DROP CONSTRAINT "Avaliacao_idAvaliador_fkey";

-- DropForeignKey
ALTER TABLE "Avaliacao" DROP CONSTRAINT "Avaliacao_idCiclo_fkey";

-- DropForeignKey
ALTER TABLE "Avaliacao" DROP CONSTRAINT "Avaliacao_idProjetoJunto_fkey";

-- DropForeignKey
ALTER TABLE "ColaboradorPerfil" DROP CONSTRAINT "ColaboradorPerfil_idColaborador_fkey";

-- DropForeignKey
ALTER TABLE "DetalheAvaliacao" DROP CONSTRAINT "DetalheAvaliacao_idAvaliacao_fkey";

-- DropForeignKey
ALTER TABLE "DetalheAvaliacao" DROP CONSTRAINT "DetalheAvaliacao_idCriterio_fkey";

-- DropForeignKey
ALTER TABLE "Equalizacao" DROP CONSTRAINT "Equalizacao_idAvaliado_fkey";

-- DropForeignKey
ALTER TABLE "Equalizacao" DROP CONSTRAINT "Equalizacao_idMembroComite_fkey";

-- DropForeignKey
ALTER TABLE "GestorColaborador" DROP CONSTRAINT "GestorColaborador_idCiclo_fkey";

-- DropForeignKey
ALTER TABLE "GestorColaborador" DROP CONSTRAINT "GestorColaborador_idColaborador_fkey";

-- DropForeignKey
ALTER TABLE "GestorColaborador" DROP CONSTRAINT "GestorColaborador_idGestor_fkey";

-- DropForeignKey
ALTER TABLE "IndicacaoReferencia" DROP CONSTRAINT "IndicacaoReferencia_idCiclo_fkey";

-- DropForeignKey
ALTER TABLE "IndicacaoReferencia" DROP CONSTRAINT "IndicacaoReferencia_idIndicado_fkey";

-- DropForeignKey
ALTER TABLE "IndicacaoReferencia" DROP CONSTRAINT "IndicacaoReferencia_idIndicador_fkey";

-- DropForeignKey
ALTER TABLE "colaboradores_ciclos" DROP CONSTRAINT "colaboradores_ciclos_idCiclo_fkey";

-- DropForeignKey
ALTER TABLE "colaboradores_ciclos" DROP CONSTRAINT "colaboradores_ciclos_idColaborador_fkey";

-- DropTable
DROP TABLE "AlocacaoColaboradorProjeto";

-- DropTable
DROP TABLE "AlocacaoLiderProjeto";

-- DropTable
DROP TABLE "AssociacaoCriterioCiclo";

-- DropTable
DROP TABLE "Avaliacao";

-- DropTable
DROP TABLE "CicloAvaliacao";

-- DropTable
DROP TABLE "Colaborador";

-- DropTable
DROP TABLE "ColaboradorPerfil";

-- DropTable
DROP TABLE "CriterioAvaliativo";

-- DropTable
DROP TABLE "DetalheAvaliacao";

-- DropTable
DROP TABLE "Equalizacao";

-- DropTable
DROP TABLE "GestorColaborador";

-- DropTable
DROP TABLE "IndicacaoReferencia";

-- DropTable
DROP TABLE "Projeto";

-- DropTable
DROP TABLE "colaboradores_ciclos";

-- DropEnum
DROP TYPE "avaliacaoTipo";

-- DropEnum
DROP TYPE "cicloStatus";

-- DropEnum
DROP TYPE "perfilTipo";

-- DropEnum
DROP TYPE "pilarCriterio";

-- DropEnum
DROP TYPE "preenchimentoStatus";

-- DropEnum
DROP TYPE "projetoStatus";

-- DropEnum
DROP TYPE "referenciaTipo";
