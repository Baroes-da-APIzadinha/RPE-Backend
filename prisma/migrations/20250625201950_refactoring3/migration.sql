-- CreateEnum
CREATE TYPE "perfilTipo" AS ENUM ('COLABORADOR_COMUM', 'GESTOR', 'RH', 'MEMBRO_COMITE', 'ADMIN');

-- CreateEnum
CREATE TYPE "cicloStatus" AS ENUM ('AGENDADO', 'EM_ANDAMENTO', 'FECHADO');

-- CreateEnum
CREATE TYPE "avaliacaoTipo" AS ENUM ('AUTOAVALIACAO', 'AVALIACAO_PARES', 'LIDER_COLABORADOR', 'COLABORADOR_MENTOR');

-- CreateEnum
CREATE TYPE "preenchimentoStatus" AS ENUM ('PENDENTE', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "pilarCriterio" AS ENUM ('Comportamento', 'Execucao', 'Gestao_e_Lideranca');

-- CreateEnum
CREATE TYPE "projetoStatus" AS ENUM ('PLANEJADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO');

-- CreateTable
CREATE TABLE "Colaborador" (
    "idColaborador" UUID NOT NULL,
    "nomeCompleto" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "senha" VARCHAR(255) NOT NULL,
    "cargo" VARCHAR(100),
    "trilhaCarreira" VARCHAR(100),
    "unidade" VARCHAR(100),
    "dataCriacao" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
    "tipo" TEXT NOT NULL,
    "justificativa" TEXT,

    CONSTRAINT "IndicacaoReferencia_pkey" PRIMARY KEY ("idIndicacao")
);

-- CreateTable
CREATE TABLE "Avaliacao" (
    "idAvaliacao" UUID NOT NULL,
    "idCiclo" UUID NOT NULL,
    "idAvaliador" UUID NOT NULL,
    "idAvaliado" UUID NOT NULL,
    "status" "preenchimentoStatus" NOT NULL,
    "tipoAvaliacao" "avaliacaoTipo" NOT NULL,

    CONSTRAINT "Avaliacao_pkey" PRIMARY KEY ("idAvaliacao")
);

-- CreateTable
CREATE TABLE "AutoAvaliacao" (
    "idAvaliacao" UUID NOT NULL,
    "notaFinal" DECIMAL(5,2),

    CONSTRAINT "AutoAvaliacao_pkey" PRIMARY KEY ("idAvaliacao")
);

-- CreateTable
CREATE TABLE "AvaliacaoPares" (
    "idAvaliacao" UUID NOT NULL,
    "nota" DECIMAL(5,2),
    "motivadoTrabalharNovamente" TEXT,
    "pontosFortes" TEXT,
    "pontosFracos" TEXT,

    CONSTRAINT "AvaliacaoPares_pkey" PRIMARY KEY ("idAvaliacao")
);

-- CreateTable
CREATE TABLE "AvaliacaoColaboradorMentor" (
    "idAvaliacao" UUID NOT NULL,
    "nota" DECIMAL(5,2),
    "justificativa" TEXT,

    CONSTRAINT "AvaliacaoColaboradorMentor_pkey" PRIMARY KEY ("idAvaliacao")
);

-- CreateTable
CREATE TABLE "AvaliacaoLiderColaborador" (
    "idAvaliacao" UUID NOT NULL,
    "notaFinal" DECIMAL(5,2),

    CONSTRAINT "AvaliacaoLiderColaborador_pkey" PRIMARY KEY ("idAvaliacao")
);

-- CreateTable
CREATE TABLE "CardAutoAvaliacao" (
    "idCardAvaliacao" UUID NOT NULL,
    "idAvaliacao" UUID NOT NULL,
    "idCriterio" UUID NOT NULL,
    "nota" DECIMAL(65,30),
    "justificativa" TEXT,

    CONSTRAINT "CardAutoAvaliacao_pkey" PRIMARY KEY ("idCardAvaliacao")
);

-- CreateTable
CREATE TABLE "CardAvaliacaoLiderColaborador" (
    "idCardAvaliacao" UUID NOT NULL,
    "idAvaliacao" UUID NOT NULL,
    "idCriterio" UUID NOT NULL,
    "nota" DECIMAL(65,30),
    "justificativa" TEXT,

    CONSTRAINT "CardAvaliacaoLiderColaborador_pkey" PRIMARY KEY ("idCardAvaliacao")
);

-- CreateTable
CREATE TABLE "CardAvaliacaoPares" (
    "idCardAvaliacao" UUID NOT NULL,
    "idAvaliacao" UUID NOT NULL,
    "idCriterio" UUID NOT NULL,
    "nota" DECIMAL(65,30),
    "justificativa" TEXT,

    CONSTRAINT "CardAvaliacaoPares_pkey" PRIMARY KEY ("idCardAvaliacao")
);

-- CreateTable
CREATE TABLE "CardAvaliacaoColaboradorMentor" (
    "idCardAvaliacao" UUID NOT NULL,
    "idAvaliacao" UUID NOT NULL,
    "idCriterio" UUID NOT NULL,
    "nota" DECIMAL(65,30),
    "justificativa" TEXT,

    CONSTRAINT "CardAvaliacaoColaboradorMentor_pkey" PRIMARY KEY ("idCardAvaliacao")
);

-- CreateTable
CREATE TABLE "GestorColaborador" (
    "idGestorColaborador" UUID NOT NULL,
    "idGestor" UUID NOT NULL,
    "idColaborador" UUID NOT NULL,
    "idCiclo" UUID NOT NULL,

    CONSTRAINT "GestorColaborador_pkey" PRIMARY KEY ("idGestorColaborador")
);

-- CreateTable
CREATE TABLE "Pares" (
    "idPar" UUID NOT NULL,
    "idColaborador1" UUID,
    "idColaborador2" UUID,
    "idCiclo" UUID,

    CONSTRAINT "Pares_pkey" PRIMARY KEY ("idPar")
);

-- CreateTable
CREATE TABLE "LiderColaborador" (
    "idLiderColaborador" UUID NOT NULL,
    "idLider" UUID NOT NULL,
    "idColaborador" UUID NOT NULL,
    "idCiclo" UUID NOT NULL,

    CONSTRAINT "LiderColaborador_pkey" PRIMARY KEY ("idLiderColaborador")
);

-- CreateTable
CREATE TABLE "MentorColaborador" (
    "idMentorColaborador" UUID NOT NULL,
    "idMentor" UUID NOT NULL,
    "idColaborador" UUID NOT NULL,
    "idCiclo" UUID NOT NULL,

    CONSTRAINT "MentorColaborador_pkey" PRIMARY KEY ("idMentorColaborador")
);

-- CreateTable
CREATE TABLE "ColaboradorCiclo" (
    "id" UUID NOT NULL,
    "idColaborador" UUID NOT NULL,
    "idCiclo" UUID NOT NULL,

    CONSTRAINT "ColaboradorCiclo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Colaborador_email_key" ON "Colaborador"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AssociacaoCriterioCiclo_idCiclo_idCriterio_cargo_trilhaCarr_key" ON "AssociacaoCriterioCiclo"("idCiclo", "idCriterio", "cargo", "trilhaCarreira", "unidade");

-- CreateIndex
CREATE UNIQUE INDEX "GestorColaborador_idGestor_idColaborador_idCiclo_key" ON "GestorColaborador"("idGestor", "idColaborador", "idCiclo");

-- CreateIndex
CREATE UNIQUE INDEX "Pares_idColaborador1_idColaborador2_idCiclo_key" ON "Pares"("idColaborador1", "idColaborador2", "idCiclo");

-- CreateIndex
CREATE UNIQUE INDEX "LiderColaborador_idLider_idColaborador_idCiclo_key" ON "LiderColaborador"("idLider", "idColaborador", "idCiclo");

-- CreateIndex
CREATE UNIQUE INDEX "MentorColaborador_idMentor_idColaborador_idCiclo_key" ON "MentorColaborador"("idMentor", "idColaborador", "idCiclo");

-- CreateIndex
CREATE UNIQUE INDEX "ColaboradorCiclo_idColaborador_idCiclo_key" ON "ColaboradorCiclo"("idColaborador", "idCiclo");

-- AddForeignKey
ALTER TABLE "ColaboradorPerfil" ADD CONSTRAINT "ColaboradorPerfil_idColaborador_fkey" FOREIGN KEY ("idColaborador") REFERENCES "Colaborador"("idColaborador") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssociacaoCriterioCiclo" ADD CONSTRAINT "AssociacaoCriterioCiclo_idCiclo_fkey" FOREIGN KEY ("idCiclo") REFERENCES "CicloAvaliacao"("idCiclo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssociacaoCriterioCiclo" ADD CONSTRAINT "AssociacaoCriterioCiclo_idCriterio_fkey" FOREIGN KEY ("idCriterio") REFERENCES "CriterioAvaliativo"("idCriterio") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_idCiclo_fkey" FOREIGN KEY ("idCiclo") REFERENCES "CicloAvaliacao"("idCiclo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_idAvaliador_fkey" FOREIGN KEY ("idAvaliador") REFERENCES "Colaborador"("idColaborador") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_idAvaliado_fkey" FOREIGN KEY ("idAvaliado") REFERENCES "Colaborador"("idColaborador") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoAvaliacao" ADD CONSTRAINT "AutoAvaliacao_idAvaliacao_fkey" FOREIGN KEY ("idAvaliacao") REFERENCES "Avaliacao"("idAvaliacao") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvaliacaoPares" ADD CONSTRAINT "AvaliacaoPares_idAvaliacao_fkey" FOREIGN KEY ("idAvaliacao") REFERENCES "Avaliacao"("idAvaliacao") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvaliacaoColaboradorMentor" ADD CONSTRAINT "AvaliacaoColaboradorMentor_idAvaliacao_fkey" FOREIGN KEY ("idAvaliacao") REFERENCES "Avaliacao"("idAvaliacao") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvaliacaoLiderColaborador" ADD CONSTRAINT "AvaliacaoLiderColaborador_idAvaliacao_fkey" FOREIGN KEY ("idAvaliacao") REFERENCES "Avaliacao"("idAvaliacao") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardAutoAvaliacao" ADD CONSTRAINT "CardAutoAvaliacao_idAvaliacao_fkey" FOREIGN KEY ("idAvaliacao") REFERENCES "AutoAvaliacao"("idAvaliacao") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardAutoAvaliacao" ADD CONSTRAINT "CardAutoAvaliacao_idCriterio_fkey" FOREIGN KEY ("idCriterio") REFERENCES "CriterioAvaliativo"("idCriterio") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardAvaliacaoLiderColaborador" ADD CONSTRAINT "CardAvaliacaoLiderColaborador_idAvaliacao_fkey" FOREIGN KEY ("idAvaliacao") REFERENCES "AvaliacaoLiderColaborador"("idAvaliacao") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardAvaliacaoLiderColaborador" ADD CONSTRAINT "CardAvaliacaoLiderColaborador_idCriterio_fkey" FOREIGN KEY ("idCriterio") REFERENCES "CriterioAvaliativo"("idCriterio") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardAvaliacaoPares" ADD CONSTRAINT "CardAvaliacaoPares_idAvaliacao_fkey" FOREIGN KEY ("idAvaliacao") REFERENCES "AvaliacaoPares"("idAvaliacao") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardAvaliacaoPares" ADD CONSTRAINT "CardAvaliacaoPares_idCriterio_fkey" FOREIGN KEY ("idCriterio") REFERENCES "CriterioAvaliativo"("idCriterio") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardAvaliacaoColaboradorMentor" ADD CONSTRAINT "CardAvaliacaoColaboradorMentor_idAvaliacao_fkey" FOREIGN KEY ("idAvaliacao") REFERENCES "AvaliacaoColaboradorMentor"("idAvaliacao") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardAvaliacaoColaboradorMentor" ADD CONSTRAINT "CardAvaliacaoColaboradorMentor_idCriterio_fkey" FOREIGN KEY ("idCriterio") REFERENCES "CriterioAvaliativo"("idCriterio") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GestorColaborador" ADD CONSTRAINT "GestorColaborador_idGestor_fkey" FOREIGN KEY ("idGestor") REFERENCES "Colaborador"("idColaborador") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GestorColaborador" ADD CONSTRAINT "GestorColaborador_idColaborador_fkey" FOREIGN KEY ("idColaborador") REFERENCES "Colaborador"("idColaborador") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GestorColaborador" ADD CONSTRAINT "GestorColaborador_idCiclo_fkey" FOREIGN KEY ("idCiclo") REFERENCES "CicloAvaliacao"("idCiclo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pares" ADD CONSTRAINT "Pares_idColaborador1_fkey" FOREIGN KEY ("idColaborador1") REFERENCES "Colaborador"("idColaborador") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pares" ADD CONSTRAINT "Pares_idColaborador2_fkey" FOREIGN KEY ("idColaborador2") REFERENCES "Colaborador"("idColaborador") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pares" ADD CONSTRAINT "Pares_idCiclo_fkey" FOREIGN KEY ("idCiclo") REFERENCES "CicloAvaliacao"("idCiclo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiderColaborador" ADD CONSTRAINT "LiderColaborador_idLider_fkey" FOREIGN KEY ("idLider") REFERENCES "Colaborador"("idColaborador") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiderColaborador" ADD CONSTRAINT "LiderColaborador_idColaborador_fkey" FOREIGN KEY ("idColaborador") REFERENCES "Colaborador"("idColaborador") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiderColaborador" ADD CONSTRAINT "LiderColaborador_idCiclo_fkey" FOREIGN KEY ("idCiclo") REFERENCES "CicloAvaliacao"("idCiclo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorColaborador" ADD CONSTRAINT "MentorColaborador_idMentor_fkey" FOREIGN KEY ("idMentor") REFERENCES "Colaborador"("idColaborador") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorColaborador" ADD CONSTRAINT "MentorColaborador_idColaborador_fkey" FOREIGN KEY ("idColaborador") REFERENCES "Colaborador"("idColaborador") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorColaborador" ADD CONSTRAINT "MentorColaborador_idCiclo_fkey" FOREIGN KEY ("idCiclo") REFERENCES "CicloAvaliacao"("idCiclo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColaboradorCiclo" ADD CONSTRAINT "ColaboradorCiclo_idColaborador_fkey" FOREIGN KEY ("idColaborador") REFERENCES "Colaborador"("idColaborador") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColaboradorCiclo" ADD CONSTRAINT "ColaboradorCiclo_idCiclo_fkey" FOREIGN KEY ("idCiclo") REFERENCES "CicloAvaliacao"("idCiclo") ON DELETE RESTRICT ON UPDATE CASCADE;
