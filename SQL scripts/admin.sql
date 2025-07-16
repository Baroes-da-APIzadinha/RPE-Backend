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
BEGIN

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


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

INSERT INTO "CriterioAvaliativo" ("idCriterio", "nomeCriterio", "pilar", "descricao", "peso", "obrigatorio", "dataCriacao")
VALUES
    -- Critérios de Comportamento
    (uuid_generate_v4(), 'Trabalho em Equipe', 'Comportamento', 'Capacidade de trabalhar de forma colaborativa e efetiva com outros membros da equipe', 1.0, true, CURRENT_TIMESTAMP),
    (uuid_generate_v4(), 'Comunicação', 'Comportamento', 'Habilidade de se comunicar de forma clara e efetiva com colegas e stakeholders', 1.0, true, CURRENT_TIMESTAMP),
    (uuid_generate_v4(), 'Adaptabilidade', 'Comportamento', 'Capacidade de se adaptar a mudanças e novos desafios', 1.0, true, CURRENT_TIMESTAMP),
    
    -- Critérios de Execução
    (uuid_generate_v4(), 'Qualidade das Entregas', 'Execucao', 'Consistência e qualidade do trabalho entregue', 1.0, true, CURRENT_TIMESTAMP),
    (uuid_generate_v4(), 'Cumprimento de Prazos', 'Execucao', 'Capacidade de entregar as atividades dentro dos prazos estabelecidos', 1.0, true, CURRENT_TIMESTAMP),
    (uuid_generate_v4(), 'Resolução de Problemas', 'Execucao', 'Habilidade de identificar e resolver problemas de forma efetiva', 1.0, true, CURRENT_TIMESTAMP),
    
    -- Critérios de Gestão e Liderança
    (uuid_generate_v4(), 'Desenvolvimento de Equipe', 'Gestao_e_Lideranca', 'Capacidade de desenvolver e mentorear membros da equipe', 1.0, true, CURRENT_TIMESTAMP),
    (uuid_generate_v4(), 'Gestão de Projetos', 'Gestao_e_Lideranca', 'Habilidade de gerenciar recursos e entregas de projetos', 1.0, true, CURRENT_TIMESTAMP),
    (uuid_generate_v4(), 'Tomada de Decisão', 'Gestao_e_Lideranca', 'Capacidade de tomar decisões estratégicas e assertivas', 1.0, true, CURRENT_TIMESTAMP);



END $$;