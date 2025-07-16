DO $$
BEGIN
SET CONSTRAINTS ALL DEFERRED;
    TRUNCATE TABLE "CardAvaliacaoLiderColaborador" CASCADE;
    TRUNCATE TABLE "CardAutoAvaliacao" CASCADE;
    TRUNCATE TABLE "AvaliacaoLiderColaborador" CASCADE;
    TRUNCATE "AvaliacaoColaboradorMentor" CASCADE;
    TRUNCATE TABLE "AvaliacaoPares" CASCADE;
    TRUNCATE TABLE "AutoAvaliacao" CASCADE;
    TRUNCATE TABLE "alocacoes_colaborador_projeto" CASCADE;
    TRUNCATE TABLE "Equalizacao" CASCADE;
    TRUNCATE TABLE "IndicacaoReferencia" CASCADE;
    TRUNCATE TABLE "Avaliacao" CASCADE;
    TRUNCATE TABLE "ColaboradorCiclo" CASCADE;
    TRUNCATE TABLE "MentorColaborador" CASCADE;
    TRUNCATE TABLE "LiderColaborador" CASCADE;
    TRUNCATE TABLE "Pares" CASCADE;
    TRUNCATE TABLE "GestorColaborador" CASCADE;
    TRUNCATE TABLE "AssociacaoCriterioCiclo" CASCADE;
    TRUNCATE TABLE "CriterioAvaliativo" CASCADE;
    TRUNCATE TABLE "CicloAvaliacao" CASCADE;
    TRUNCATE TABLE "ColaboradorPerfil" CASCADE;
    TRUNCATE TABLE "Colaborador" CASCADE;
    TRUNCATE TABLE "projetos" CASCADE;
    TRUNCATE TABLE "BrutalFacts" CASCADE;
    TRUNCATE TABLE "AuditLog" CASCADE;
SET CONSTRAINTS ALL IMMEDIATE;

    -- Reabilitar as verificações de chave estrangeira
    END $$;



DO $$
DECLARE
colaborador_admin_id UUID := uuid_generate_v4();

BEGIN
INSERT INTO "Colaborador" ("idColaborador", "nomeCompleto", "email", "senha", "cargo", "trilhaCarreira", "unidade", "dataCriacao", "primeiroLogin")
VALUES
    (colaborador_admin_id,'Administrador Sistema', 'admin@empresa.com', '$2b$10$HEWRRVLJThBKJptgYrvswe1aWq8nLQ6Y/R8xjLvIAkE/KvR7iJyeu', 'DESENVOLVEDOR', 'GERENCIAMENTO', 'RECIFE', CURRENT_TIMESTAMP, false);

INSERT INTO "ColaboradorPerfil" ("idColaborador", "tipoPerfil")
VALUES
    (colaborador_admin_id, 'ADMIN');

END $$;