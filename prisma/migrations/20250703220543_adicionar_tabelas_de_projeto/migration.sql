/*
  Warnings:

  - You are about to drop the column `idCiclo` on the `Equalizacao` table. All the data in the column will be lost.
  - You are about to alter the column `notaAjustada` on the `Equalizacao` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,2)` to `Integer`.
  - Made the column `idMembroComite` on table `Equalizacao` required. This step will fail if there are existing NULL values in that column.
  - Made the column `notaAjustada` on table `Equalizacao` required. This step will fail if there are existing NULL values in that column.
  - Made the column `justificativa` on table `Equalizacao` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Equalizacao" DROP CONSTRAINT "Equalizacao_idCiclo_fkey";

-- AlterTable
ALTER TABLE "Equalizacao" DROP COLUMN "idCiclo",
ALTER COLUMN "idMembroComite" SET NOT NULL,
ALTER COLUMN "notaAjustada" SET NOT NULL,
ALTER COLUMN "notaAjustada" SET DATA TYPE INTEGER,
ALTER COLUMN "justificativa" SET NOT NULL;

-- CreateTable
CREATE TABLE "projetos" (
    "idProjeto" UUID NOT NULL,
    "nomeProjeto" VARCHAR(255) NOT NULL,
    "cliente" VARCHAR(255),
    "dataInicio" DATE,
    "dataFim" DATE,
    "status" "projetoStatus" NOT NULL DEFAULT 'PLANEJADO',

    CONSTRAINT "projetos_pkey" PRIMARY KEY ("idProjeto")
);

-- CreateTable
CREATE TABLE "alocacoes_colaborador_projeto" (
    "idAlocacao" UUID NOT NULL,
    "idColaborador" UUID NOT NULL,
    "idProjeto" UUID NOT NULL,
    "dataEntrada" DATE NOT NULL,
    "dataSaida" DATE,

    CONSTRAINT "alocacoes_colaborador_projeto_pkey" PRIMARY KEY ("idAlocacao")
);

-- AddForeignKey
ALTER TABLE "alocacoes_colaborador_projeto" ADD CONSTRAINT "alocacoes_colaborador_projeto_idProjeto_fkey" FOREIGN KEY ("idProjeto") REFERENCES "projetos"("idProjeto") ON DELETE CASCADE ON UPDATE CASCADE;
