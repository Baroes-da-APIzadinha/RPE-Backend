-- CreateEnum
CREATE TYPE "perfilTipo" AS ENUM ('COLABORADOR_COMUM', 'GESTOR', 'RH', 'MEMBRO_COMITE', 'ADMIN');

-- CreateEnum
CREATE TYPE "cicloStatus" AS ENUM ('EM_ANDAMENTO', 'FECHADO');

-- CreateEnum
CREATE TYPE "avaliacaoTipo" AS ENUM ('AUTOAVALIACAO', 'GESTOR_LIDERADO', 'LIDERADO_GESTOR', 'AVALIACAO_PARES');

-- CreateEnum
CREATE TYPE "preenchimentoStatus" AS ENUM ('PENDENTE', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "pilarCriterio" AS ENUM ('Comportamento', 'Execucao', 'Gestao_e_Lideranca');

-- CreateEnum
CREATE TYPE "referenciaTipo" AS ENUM ('TECNICA', 'CULTURAL');

-- CreateEnum
CREATE TYPE "projetoStatus" AS ENUM ('PLANEJADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO');

-- CreateTable
CREATE TABLE "Colaborador" (
    "idColaborador" UUID NOT NULL,
    "nomeCompleto" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "cargo" VARCHAR(100),
    "trilhaCarreira" VARCHAR(100),
    "unidade" VARCHAR(100),
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Colaborador_pkey" PRIMARY KEY ("idColaborador")
);

-- CreateTable
CREATE TABLE "ColaboradorPerfil" (
    "idColaborador" UUID NOT NULL,
    "tipoPerfil" "perfilTipo" NOT NULL,

    CONSTRAINT "ColaboradorPerfil_pkey" PRIMARY KEY ("idColaborador","tipoPerfil")
);

-- CreateTable
CREATE TABLE "CicloAvaliacao" (
    "idCiclo" UUID NOT NULL,
    "nomeCiclo" VARCHAR(255) NOT NULL,
    "dataInicio" DATE NOT NULL,
    "dataFim" DATE NOT NULL,
    "status" "cicloStatus" NOT NULL DEFAULT 'EM_ANDAMENTO',

    CONSTRAINT "CicloAvaliacao_pkey" PRIMARY KEY ("idCiclo")
);

-- CreateTable
CREATE TABLE "CriterioAvaliativo" (
    "idCriterio" UUID NOT NULL,
    "nomeCriterio" VARCHAR(255) NOT NULL,
    "pilar" "pilarCriterio",
    "descricao" TEXT,
    "peso" DECIMAL(65,30) NOT NULL DEFAULT 1.0,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT true,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataUltimaModificacao" TIMESTAMP(3),

    CONSTRAINT "CriterioAvaliativo_pkey" PRIMARY KEY ("idCriterio")
);

-- CreateTable
CREATE TABLE "AssociacaoCriterioCiclo" (
    "idAssociacao" UUID NOT NULL,
    "idCiclo" UUID NOT NULL,
    "idCriterio" UUID NOT NULL,
    "cargo" VARCHAR(100),
    "trilhaCarreira" VARCHAR(100),
    "unidade" VARCHAR(100),

    CONSTRAINT "AssociacaoCriterioCiclo_pkey" PRIMARY KEY ("idAssociacao")
);

-- CreateTable
CREATE TABLE "Avaliacao" (
    "idAvaliacao" UUID NOT NULL,
    "idCiclo" UUID NOT NULL,
    "idAvaliador" UUID NOT NULL,
    "idAvaliado" UUID NOT NULL,
    "tipo" "avaliacaoTipo" NOT NULL,
    "status" "preenchimentoStatus" NOT NULL DEFAULT 'PENDENTE',
    "dataPreenchimento" TIMESTAMP(3),

    CONSTRAINT "Avaliacao_pkey" PRIMARY KEY ("idAvaliacao")
);

-- CreateTable
CREATE TABLE "DetalheAvaliacao" (
    "idDetalheAvaliacao" UUID NOT NULL,
    "idAvaliacao" UUID NOT NULL,
    "idCriterio" UUID NOT NULL,
    "nota" INTEGER NOT NULL,
    "justificativa" TEXT NOT NULL,

    CONSTRAINT "DetalheAvaliacao_pkey" PRIMARY KEY ("idDetalheAvaliacao")
);

-- CreateTable
CREATE TABLE "Equalizacao" (
    "idEqualizacao" UUID NOT NULL,
    "idAvaliado" UUID NOT NULL,
    "idMembroComite" UUID NOT NULL,
    "notaAjustada" INTEGER NOT NULL,
    "justificativa" TEXT NOT NULL,
    "status" "preenchimentoStatus" NOT NULL DEFAULT 'PENDENTE',
    "dataEqualizacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Equalizacao_pkey" PRIMARY KEY ("idEqualizacao")
);

-- CreateTable
CREATE TABLE "IndicacaoReferencia" (
    "idIndicacao" UUID NOT NULL,
    "idCiclo" UUID NOT NULL,
    "idIndicador" UUID NOT NULL,
    "idIndicado" UUID NOT NULL,
    "tipo" "referenciaTipo" NOT NULL,
    "justificativa" TEXT,

    CONSTRAINT "IndicacaoReferencia_pkey" PRIMARY KEY ("idIndicacao")
);

-- CreateTable
CREATE TABLE "Projeto" (
    "idProjeto" UUID NOT NULL,
    "nomeProjeto" VARCHAR(255) NOT NULL,
    "cliente" VARCHAR(255),
    "dataInicio" DATE,
    "dataFim" DATE,
    "status" "projetoStatus" NOT NULL DEFAULT 'PLANEJADO',

    CONSTRAINT "Projeto_pkey" PRIMARY KEY ("idProjeto")
);

-- CreateTable
CREATE TABLE "AlocacaoColaboradorProjeto" (
    "idAlocacao" UUID NOT NULL,
    "idColaborador" UUID NOT NULL,
    "idProjeto" UUID NOT NULL,
    "dataEntrada" DATE NOT NULL,
    "dataSaida" DATE,

    CONSTRAINT "AlocacaoColaboradorProjeto_pkey" PRIMARY KEY ("idAlocacao")
);

-- CreateTable
CREATE TABLE "AlocacaoLiderProjeto" (
    "idAlocacaoLider" UUID NOT NULL,
    "idLider" UUID NOT NULL,
    "idProjeto" UUID NOT NULL,
    "dataEntrada" DATE NOT NULL,
    "dataSaida" DATE,

    CONSTRAINT "AlocacaoLiderProjeto_pkey" PRIMARY KEY ("idAlocacaoLider")
);

-- CreateTable
CREATE TABLE "GestorColaborador" (
    "idGestorMentorado" UUID NOT NULL,
    "idGestor" UUID NOT NULL,
    "idColaborador" UUID NOT NULL,
    "idCiclo" UUID NOT NULL,

    CONSTRAINT "GestorColaborador_pkey" PRIMARY KEY ("idGestorMentorado")
);

-- CreateIndex
CREATE UNIQUE INDEX "Colaborador_email_key" ON "Colaborador"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AssociacaoCriterioCiclo_idCiclo_idCriterio_cargo_trilhaCarr_key" ON "AssociacaoCriterioCiclo"("idCiclo", "idCriterio", "cargo", "trilhaCarreira", "unidade");

-- CreateIndex
CREATE UNIQUE INDEX "GestorColaborador_idGestor_idColaborador_idCiclo_key" ON "GestorColaborador"("idGestor", "idColaborador", "idCiclo");

-- AddForeignKey
ALTER TABLE "ColaboradorPerfil" ADD CONSTRAINT "ColaboradorPerfil_idColaborador_fkey" FOREIGN KEY ("idColaborador") REFERENCES "Colaborador"("idColaborador") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssociacaoCriterioCiclo" ADD CONSTRAINT "AssociacaoCriterioCiclo_idCiclo_fkey" FOREIGN KEY ("idCiclo") REFERENCES "CicloAvaliacao"("idCiclo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssociacaoCriterioCiclo" ADD CONSTRAINT "AssociacaoCriterioCiclo_idCriterio_fkey" FOREIGN KEY ("idCriterio") REFERENCES "CriterioAvaliativo"("idCriterio") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_idCiclo_fkey" FOREIGN KEY ("idCiclo") REFERENCES "CicloAvaliacao"("idCiclo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_idAvaliador_fkey" FOREIGN KEY ("idAvaliador") REFERENCES "Colaborador"("idColaborador") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_idAvaliado_fkey" FOREIGN KEY ("idAvaliado") REFERENCES "Colaborador"("idColaborador") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalheAvaliacao" ADD CONSTRAINT "DetalheAvaliacao_idAvaliacao_fkey" FOREIGN KEY ("idAvaliacao") REFERENCES "Avaliacao"("idAvaliacao") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalheAvaliacao" ADD CONSTRAINT "DetalheAvaliacao_idCriterio_fkey" FOREIGN KEY ("idCriterio") REFERENCES "CriterioAvaliativo"("idCriterio") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equalizacao" ADD CONSTRAINT "Equalizacao_idAvaliado_fkey" FOREIGN KEY ("idAvaliado") REFERENCES "Colaborador"("idColaborador") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equalizacao" ADD CONSTRAINT "Equalizacao_idMembroComite_fkey" FOREIGN KEY ("idMembroComite") REFERENCES "Colaborador"("idColaborador") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndicacaoReferencia" ADD CONSTRAINT "IndicacaoReferencia_idCiclo_fkey" FOREIGN KEY ("idCiclo") REFERENCES "CicloAvaliacao"("idCiclo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndicacaoReferencia" ADD CONSTRAINT "IndicacaoReferencia_idIndicador_fkey" FOREIGN KEY ("idIndicador") REFERENCES "Colaborador"("idColaborador") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndicacaoReferencia" ADD CONSTRAINT "IndicacaoReferencia_idIndicado_fkey" FOREIGN KEY ("idIndicado") REFERENCES "Colaborador"("idColaborador") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlocacaoColaboradorProjeto" ADD CONSTRAINT "AlocacaoColaboradorProjeto_idColaborador_fkey" FOREIGN KEY ("idColaborador") REFERENCES "Colaborador"("idColaborador") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlocacaoColaboradorProjeto" ADD CONSTRAINT "AlocacaoColaboradorProjeto_idProjeto_fkey" FOREIGN KEY ("idProjeto") REFERENCES "Projeto"("idProjeto") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlocacaoLiderProjeto" ADD CONSTRAINT "AlocacaoLiderProjeto_idLider_fkey" FOREIGN KEY ("idLider") REFERENCES "Colaborador"("idColaborador") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlocacaoLiderProjeto" ADD CONSTRAINT "AlocacaoLiderProjeto_idProjeto_fkey" FOREIGN KEY ("idProjeto") REFERENCES "Projeto"("idProjeto") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GestorColaborador" ADD CONSTRAINT "GestorColaborador_idGestor_fkey" FOREIGN KEY ("idGestor") REFERENCES "Colaborador"("idColaborador") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GestorColaborador" ADD CONSTRAINT "GestorColaborador_idColaborador_fkey" FOREIGN KEY ("idColaborador") REFERENCES "Colaborador"("idColaborador") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GestorColaborador" ADD CONSTRAINT "GestorColaborador_idCiclo_fkey" FOREIGN KEY ("idCiclo") REFERENCES "CicloAvaliacao"("idCiclo") ON DELETE CASCADE ON UPDATE CASCADE;
