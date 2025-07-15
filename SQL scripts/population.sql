-- Criar extensão para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Declaração dos UUIDs para uso posterior
DO $$

DECLARE
    -- Colaboradores
    colaborador_admin_id UUID := uuid_generate_v4();
    colaborador_rh_id UUID := uuid_generate_v4();
    colaborador_gestor_id UUID := uuid_generate_v4();
    colaborador_comum_id UUID := uuid_generate_v4();
    colaborador_mentor_id UUID := uuid_generate_v4();
    colaborador_qa_id UUID := uuid_generate_v4();
    colaborador_ux_id UUID := uuid_generate_v4();
    colaborador_marketing_id UUID := uuid_generate_v4();
    colaborador_comite_id UUID := uuid_generate_v4();
    -- Novos colaboradores comuns
    colaborador_suporte_id UUID := uuid_generate_v4();
    colaborador_financeiro_id UUID := uuid_generate_v4();
    colaborador_comercial_id UUID := uuid_generate_v4();
    colaborador_comum_sem_avaliação_id UUID := uuid_generate_v4();
    
    -- Ciclos de Avaliação
    ciclo_2024_2_id UUID := uuid_generate_v4();
    ciclo_2025_1_id UUID := uuid_generate_v4();
    ciclo_2025_2_id UUID := uuid_generate_v4();

    
    -- Critérios de Comportamento
    criterio_comp_1_id UUID := uuid_generate_v4();
    criterio_comp_2_id UUID := uuid_generate_v4();
    criterio_comp_3_id UUID := uuid_generate_v4();
    
    -- Critérios de Execução
    criterio_exec_1_id UUID := uuid_generate_v4();
    criterio_exec_2_id UUID := uuid_generate_v4();
    criterio_exec_3_id UUID := uuid_generate_v4();
    
    -- Critérios de Gestão e Liderança
    criterio_gest_1_id UUID := uuid_generate_v4();
    criterio_gest_2_id UUID := uuid_generate_v4();
    criterio_gest_3_id UUID := uuid_generate_v4();
    
    -- Projetos (removido - não existe mais no schema)
    
    -- Avaliações
    avaliacao_pares_id UUID := uuid_generate_v4();
    avaliacao_pares_2_id UUID := uuid_generate_v4();
    avaliacao_pares_3_id UUID := uuid_generate_v4();
    avaliacao_colaborador_mentor_id UUID := uuid_generate_v4();
    avaliacao_colaborador_mentor_2_id UUID := uuid_generate_v4();
    avaliacao_autoavaliacao_id UUID := uuid_generate_v4();
    avaliacao_autoavaliacao_2_id UUID := uuid_generate_v4();
    avaliacao_autoavaliacao_3_id UUID := uuid_generate_v4();
    avaliacao_autoavaliacao_4_id UUID := uuid_generate_v4();
    avaliacao_autoavaliacao_5_id UUID := uuid_generate_v4();
    avaliacao_autoavaliacao_6_id UUID := uuid_generate_v4();
    avaliacao_autoavaliacao_7_id UUID := uuid_generate_v4();
    avaliacao_autoavaliacao_8_id UUID := uuid_generate_v4();
    avaliacao_lider_colaborador_id UUID := uuid_generate_v4();
    avaliacao_lider_colaborador_2_id UUID := uuid_generate_v4();
    avaliacao_lider_colaborador_3_id UUID := uuid_generate_v4();
    avaliacao_lider_colaborador_4_id UUID := uuid_generate_v4();
    avaliacao_lider_colaborador_5_id UUID := uuid_generate_v4();
    avaliacao_lider_colaborador_6_id UUID := uuid_generate_v4();
    avaliacao_lider_colaborador_7_id UUID := uuid_generate_v4();
    
    -- projetos
    projeto_rocket_id UUID := uuid_generate_v4();
    projeto_apollo_id UUID := uuid_generate_v4();
BEGIN  





-- Inserir Colaboradores
INSERT INTO "Colaborador" ("idColaborador", "nomeCompleto", "email", "senha", "cargo", "trilhaCarreira", "unidade", "dataCriacao", "primeiroLogin")
VALUES
    (colaborador_admin_id,'Administrador Sistema', 'admin@empresa.com', '$2b$10$HEWRRVLJThBKJptgYrvswe1aWq8nLQ6Y/R8xjLvIAkE/KvR7iJyeu', 'DESENVOLVEDOR', 'GERENCIAMENTO', 'RECIFE', CURRENT_TIMESTAMP, false),
    (colaborador_rh_id, 'Maria Silva', 'maria.silva@empresa.com', '$2b$10$HEWRRVLJThBKJptgYrvswe1aWq8nLQ6Y/R8xjLvIAkE/KvR7iJyeu', 'RH', 'RH', 'RECIFE', CURRENT_TIMESTAMP, false),
    (colaborador_gestor_id, 'João Santos', 'joao.santos@empresa.com', '$2b$10$HEWRRVLJThBKJptgYrvswe1aWq8nLQ6Y/R8xjLvIAkE/KvR7iJyeu', 'DESENVOLVEDOR', 'DESENVOLVIMENTO', 'RECIFE', CURRENT_TIMESTAMP, false),
    (colaborador_comum_id, 'Ana Costa', 'ana.costa@empresa.com', '$2b$10$HEWRRVLJThBKJptgYrvswe1aWq8nLQ6Y/R8xjLvIAkE/KvR7iJyeu', 'DESENVOLVEDOR', 'DESENVOLVIMENTO', 'SAO PAULO', CURRENT_TIMESTAMP, true),
    (colaborador_mentor_id, 'Carlos Oliveira', 'carlos.oliveira@empresa.com', '$2b$10$HEWRRVLJThBKJptgYrvswe1aWq8nLQ6Y/R8xjLvIAkE/KvR7iJyeu', 'DESENVOLVEDOR', 'DESENVOLVIMENTO', 'RECIFE', CURRENT_TIMESTAMP, false),
    (colaborador_qa_id, 'Fernanda Lima', 'fernanda.lima@empresa.com', '$2b$10$HEWRRVLJThBKJptgYrvswe1aWq8nLQ6Y/R8xjLvIAkE/KvR7iJyeu', 'QA', 'QA', 'FLORIANOPOLIS', CURRENT_TIMESTAMP, true),
    (colaborador_ux_id, 'Rafael Martins', 'rafael.martins@empresa.com', '$2b$10$HEWRRVLJThBKJptgYrvswe1aWq8nLQ6Y/R8xjLvIAkE/KvR7iJyeu', 'UX', 'UX', 'SAO PAULO', CURRENT_TIMESTAMP, false),
    (colaborador_marketing_id, 'Juliana Rocha', 'juliana.rocha@empresa.com', '$2b$10$HEWRRVLJThBKJptgYrvswe1aWq8nLQ6Y/R8xjLvIAkE/KvR7iJyeu', 'MARKETING', 'MARKETING', 'RECIFE', CURRENT_TIMESTAMP, true),
    (colaborador_suporte_id, 'Lucas Ferreira', 'lucas.ferreira@empresa.com', '$2b$10$HEWRRVLJThBKJptgYrvswe1aWq8nLQ6Y/R8xjLvIAkE/KvR7iJyeu', 'SUPORTE', 'SUPORTE', 'FLORIANOPOLIS', CURRENT_TIMESTAMP, true),
    (colaborador_financeiro_id, 'Patricia Alves', 'patricia.alves@empresa.com', '$2b$10$HEWRRVLJThBKJptgYrvswe1aWq8nLQ6Y/R8xjLvIAkE/KvR7iJyeu', 'FINANCEIRO', 'FINANCEIRO', 'RECIFE', CURRENT_TIMESTAMP, false),
    (colaborador_comercial_id, 'Eduardo Nunes', 'eduardo.nunes@empresa.com', '$2b$10$HEWRRVLJThBKJptgYrvswe1aWq8nLQ6Y/R8xjLvIAkE/KvR7iJyeu', 'COMERCIAL', 'COMERCIAL', 'SAO PAULO', CURRENT_TIMESTAMP, true),
    (colaborador_comite_id, 'Comitê Equalização', 'comite@empresa.com', '$2b$10$HEWRRVLJThBKJptgYrvswe1aWq8nLQ6Y/R8xjLvIAkE/KvR7iJyeu', 'RH', 'RH', 'RECIFE', CURRENT_TIMESTAMP, false),
    (colaborador_comum_sem_avaliação_id, 'João Souza', 'joao.souza@empresa.com', '$2b$10$HEWRRVLJThBKJptgYrvswe1aWq8nLQ6Y/R8xjLvIAkE/KvR7iJyeu', 'DESENVOLVEDOR', 'DESENVOLVIMENTO', 'RECIFE', CURRENT_TIMESTAMP, true);
-- Inserir Perfis dos Colaboradores
INSERT INTO "ColaboradorPerfil" ("idColaborador", "tipoPerfil")
VALUES
    (colaborador_admin_id, 'ADMIN'),
    (colaborador_rh_id, 'RH'),
    (colaborador_gestor_id, 'GESTOR'),
    (colaborador_gestor_id, 'LIDER'),
    (colaborador_comum_id, 'COLABORADOR_COMUM'),
    (colaborador_mentor_id, 'GESTOR'),
    (colaborador_mentor_id, 'MENTOR'),
    (colaborador_qa_id, 'COLABORADOR_COMUM'),
    (colaborador_ux_id, 'COLABORADOR_COMUM'),
    (colaborador_marketing_id, 'COLABORADOR_COMUM'),
    (colaborador_suporte_id, 'COLABORADOR_COMUM'),
    (colaborador_financeiro_id, 'COLABORADOR_COMUM'),
    (colaborador_comercial_id, 'COLABORADOR_COMUM'),
    (colaborador_comite_id, 'MEMBRO_COMITE'),
    (colaborador_comum_sem_avaliação_id, 'COLABORADOR_COMUM');

-- Inserir Ciclos de Avaliação (com campos obrigatórios)

-- Inserir Projetos
INSERT INTO "projetos" ("idProjeto", "nomeProjeto", "cliente", "dataInicio", "dataFim", "status", "idLider")
VALUES
    (projeto_rocket_id, 'Projeto Rocket', 'Cliente A', '2025-01-01', '2025-12-31', 'EM_ANDAMENTO', colaborador_gestor_id),
    (projeto_apollo_id, 'Projeto Apollo', 'Cliente B', '2025-02-01', '2025-11-30', 'PLANEJADO', colaborador_mentor_id);


INSERT INTO "CicloAvaliacao" ("idCiclo", "nomeCiclo", "dataInicio", "dataFim", "status", "duracaoEmAndamentoDias", "duracaoEmRevisaoDias", "duracaoEmEqualizacaoDias", "updatedAt")
VALUES
    (ciclo_2024_2_id, '2024.2', '2024-07-01', '2024-12-31', 'FECHADO', 30, 15, 10, CURRENT_TIMESTAMP),
    (ciclo_2025_1_id, '2025.1', '2025-02-01', '2025-07-30', 'EM_ANDAMENTO', 45, 20, 15, CURRENT_TIMESTAMP),
    (ciclo_2025_2_id, '2025.2', '2025-07-01', '2025-12-31', 'AGENDADO', 45, 20, 15, CURRENT_TIMESTAMP);


-- Inserir Critérios Avaliativos
INSERT INTO "CriterioAvaliativo" ("idCriterio", "nomeCriterio", "pilar", "descricao", "peso", "obrigatorio", "dataCriacao")
VALUES
    -- Critérios de Comportamento
    (criterio_comp_1_id, 'Trabalho em Equipe', 'Comportamento', 'Capacidade de trabalhar de forma colaborativa e efetiva com outros membros da equipe', 1.0, true, CURRENT_TIMESTAMP),
    (criterio_comp_2_id, 'Comunicação', 'Comportamento', 'Habilidade de se comunicar de forma clara e efetiva com colegas e stakeholders', 1.0, true, CURRENT_TIMESTAMP),
    (criterio_comp_3_id, 'Adaptabilidade', 'Comportamento', 'Capacidade de se adaptar a mudanças e novos desafios', 1.0, true, CURRENT_TIMESTAMP),
    
    -- Critérios de Execução
    (criterio_exec_1_id, 'Qualidade das Entregas', 'Execucao', 'Consistência e qualidade do trabalho entregue', 1.0, true, CURRENT_TIMESTAMP),
    (criterio_exec_2_id, 'Cumprimento de Prazos', 'Execucao', 'Capacidade de entregar as atividades dentro dos prazos estabelecidos', 1.0, true, CURRENT_TIMESTAMP),
    (criterio_exec_3_id, 'Resolução de Problemas', 'Execucao', 'Habilidade de identificar e resolver problemas de forma efetiva', 1.0, true, CURRENT_TIMESTAMP),
    
    -- Critérios de Gestão e Liderança
    (criterio_gest_1_id, 'Desenvolvimento de Equipe', 'Gestao_e_Lideranca', 'Capacidade de desenvolver e mentorear membros da equipe', 1.0, true, CURRENT_TIMESTAMP),
    (criterio_gest_2_id, 'Gestão de Projetos', 'Gestao_e_Lideranca', 'Habilidade de gerenciar recursos e entregas de projetos', 1.0, true, CURRENT_TIMESTAMP),
    (criterio_gest_3_id, 'Tomada de Decisão', 'Gestao_e_Lideranca', 'Capacidade de tomar decisões estratégicas e assertivas', 1.0, true, CURRENT_TIMESTAMP);

-- Inserir Associação de Critérios ao Ciclo
INSERT INTO "AssociacaoCriterioCiclo" ("idAssociacao", "idCiclo", "idCriterio")
VALUES
    -- Ciclo 2024.2
    (uuid_generate_v4(), ciclo_2024_2_id, criterio_comp_1_id),
    (uuid_generate_v4(), ciclo_2024_2_id, criterio_comp_2_id),
    (uuid_generate_v4(), ciclo_2024_2_id, criterio_comp_3_id),
    (uuid_generate_v4(), ciclo_2024_2_id, criterio_exec_1_id),
    (uuid_generate_v4(), ciclo_2024_2_id, criterio_exec_2_id),
    (uuid_generate_v4(), ciclo_2024_2_id, criterio_exec_3_id),
    (uuid_generate_v4(), ciclo_2024_2_id, criterio_gest_1_id),
    (uuid_generate_v4(), ciclo_2024_2_id, criterio_gest_2_id),
    (uuid_generate_v4(), ciclo_2024_2_id, criterio_gest_3_id),
    
    -- Ciclo 2025.1
    (uuid_generate_v4(), ciclo_2025_1_id, criterio_comp_1_id),
    (uuid_generate_v4(), ciclo_2025_1_id, criterio_comp_2_id),
    (uuid_generate_v4(), ciclo_2025_1_id, criterio_comp_3_id),
    (uuid_generate_v4(), ciclo_2025_1_id, criterio_exec_1_id),
    (uuid_generate_v4(), ciclo_2025_1_id, criterio_exec_2_id),
    (uuid_generate_v4(), ciclo_2025_1_id, criterio_exec_3_id),
    (uuid_generate_v4(), ciclo_2025_1_id, criterio_gest_1_id),
    (uuid_generate_v4(), ciclo_2025_1_id, criterio_gest_2_id),
    (uuid_generate_v4(), ciclo_2025_1_id, criterio_gest_3_id),
    
    -- Ciclo 2025.2
    (uuid_generate_v4(), ciclo_2025_2_id, criterio_comp_1_id),
    (uuid_generate_v4(), ciclo_2025_2_id, criterio_comp_2_id),
    (uuid_generate_v4(), ciclo_2025_2_id, criterio_comp_3_id),
    (uuid_generate_v4(), ciclo_2025_2_id, criterio_exec_1_id),
    (uuid_generate_v4(), ciclo_2025_2_id, criterio_exec_2_id),
    (uuid_generate_v4(), ciclo_2025_2_id, criterio_exec_3_id),
    (uuid_generate_v4(), ciclo_2025_2_id, criterio_gest_1_id),
    (uuid_generate_v4(), ciclo_2025_2_id, criterio_gest_2_id),
    (uuid_generate_v4(), ciclo_2025_2_id, criterio_gest_3_id);

-- Inserir Relação Gestor-Colaborador
INSERT INTO "GestorColaborador" ("idGestorColaborador", "idGestor", "idColaborador", "idCiclo")
VALUES
    (uuid_generate_v4(), colaborador_gestor_id, colaborador_comum_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_gestor_id, colaborador_qa_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_gestor_id, colaborador_ux_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_gestor_id, colaborador_marketing_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_gestor_id, colaborador_suporte_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_gestor_id, colaborador_financeiro_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_gestor_id, colaborador_comercial_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_gestor_id, colaborador_comum_sem_avaliação_id, ciclo_2025_1_id);

-- Inserir Relação Líder-Colaborador
INSERT INTO "LiderColaborador" ("idLiderColaborador", "idLider", "idColaborador", "idCiclo")
VALUES
    (uuid_generate_v4(), colaborador_gestor_id, colaborador_comum_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_gestor_id, colaborador_qa_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_gestor_id, colaborador_ux_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_gestor_id, colaborador_marketing_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_gestor_id, colaborador_suporte_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_gestor_id, colaborador_financeiro_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_gestor_id, colaborador_comercial_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_gestor_id, colaborador_comum_sem_avaliação_id, ciclo_2025_1_id);

-- Inserir Colaboradores no Ciclo
INSERT INTO "ColaboradorCiclo" ("id", "idColaborador", "idCiclo")
VALUES
    -- Ciclo 2024.2 (fechado)
    (uuid_generate_v4(), colaborador_comum_id, ciclo_2024_2_id),
    (uuid_generate_v4(), colaborador_gestor_id, ciclo_2024_2_id),
    (uuid_generate_v4(), colaborador_mentor_id, ciclo_2024_2_id),
    (uuid_generate_v4(), colaborador_qa_id, ciclo_2024_2_id),
    (uuid_generate_v4(), colaborador_ux_id, ciclo_2024_2_id),
    (uuid_generate_v4(), colaborador_marketing_id, ciclo_2024_2_id),
    -- Ciclo 2025.1 (em andamento)
    (uuid_generate_v4(), colaborador_comum_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_gestor_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_mentor_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_qa_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_ux_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_marketing_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_suporte_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_financeiro_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_comercial_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_comum_sem_avaliação_id, ciclo_2025_1_id);

-- Inserir Relação Mentor-Colaborador
INSERT INTO "MentorColaborador" ("idMentorColaborador", "idMentor", "idColaborador", "idCiclo")
VALUES
    (uuid_generate_v4(), colaborador_mentor_id, colaborador_comum_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_mentor_id, colaborador_qa_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_mentor_id, colaborador_suporte_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_mentor_id, colaborador_comum_sem_avaliação_id, ciclo_2025_1_id);

-- Inserir Pares
INSERT INTO "Pares" ("idPar", "idColaborador1", "idColaborador2", "idCiclo", "idProjeto", "diasTrabalhadosJuntos")
VALUES
    (uuid_generate_v4(), colaborador_comum_id, colaborador_qa_id, ciclo_2025_1_id, projeto_apollo_id, 90),
    (uuid_generate_v4(), colaborador_ux_id, colaborador_marketing_id, ciclo_2025_1_id, projeto_apollo_id, 90),
    (uuid_generate_v4(), colaborador_suporte_id, colaborador_financeiro_id, ciclo_2025_1_id, projeto_apollo_id, 60),
    (uuid_generate_v4(), colaborador_gestor_id, colaborador_mentor_id, ciclo_2025_1_id, projeto_apollo_id, 60),

    (uuid_generate_v4(), colaborador_comum_sem_avaliação_id, colaborador_suporte_id, ciclo_2025_1_id, projeto_apollo_id, 90),
    (uuid_generate_v4(), colaborador_comum_sem_avaliação_id, colaborador_qa_id, ciclo_2025_1_id, projeto_apollo_id, 100),
    (uuid_generate_v4(), colaborador_suporte_id, colaborador_comum_sem_avaliação_id, ciclo_2025_1_id, projeto_rocket_id, 90),
    (uuid_generate_v4(), colaborador_qa_id, colaborador_comum_sem_avaliação_id, ciclo_2025_1_id, projeto_rocket_id, 80);


-- Inserir Avaliações
INSERT INTO "Avaliacao" ("idAvaliacao", "idCiclo", "idAvaliador", "idAvaliado", "tipoAvaliacao", "status")
VALUES
    -- Autoavaliações
    (avaliacao_autoavaliacao_id, ciclo_2025_1_id, colaborador_comum_id, colaborador_comum_id, 'AUTOAVALIACAO', 'CONCLUIDA'),
    (avaliacao_autoavaliacao_2_id, ciclo_2025_1_id, colaborador_qa_id, colaborador_qa_id, 'AUTOAVALIACAO', 'CONCLUIDA'),
    (avaliacao_autoavaliacao_3_id, ciclo_2025_1_id, colaborador_ux_id, colaborador_ux_id, 'AUTOAVALIACAO', 'CONCLUIDA'),
    (avaliacao_autoavaliacao_4_id, ciclo_2025_1_id, colaborador_marketing_id, colaborador_marketing_id, 'AUTOAVALIACAO', 'CONCLUIDA'),
    (avaliacao_autoavaliacao_5_id, ciclo_2025_1_id, colaborador_suporte_id, colaborador_suporte_id, 'AUTOAVALIACAO', 'CONCLUIDA'),
    (avaliacao_autoavaliacao_6_id, ciclo_2025_1_id, colaborador_comercial_id, colaborador_comercial_id, 'AUTOAVALIACAO', 'CONCLUIDA'),
    (avaliacao_autoavaliacao_7_id, ciclo_2025_1_id, colaborador_comum_sem_avaliação_id, colaborador_comum_sem_avaliação_id, 'AUTOAVALIACAO', 'PENDENTE'),
    (avaliacao_autoavaliacao_8_id, ciclo_2025_1_id, colaborador_financeiro_id, colaborador_financeiro_id, 'AUTOAVALIACAO', 'PENDENTE'),
    
    -- Avaliações de pares
    (avaliacao_pares_id, ciclo_2025_1_id, colaborador_qa_id, colaborador_comum_id, 'AVALIACAO_PARES', 'CONCLUIDA'),
    (avaliacao_pares_2_id, ciclo_2025_1_id, colaborador_comum_sem_avaliação_id, colaborador_suporte_id, 'AVALIACAO_PARES', 'PENDENTE'),
    (avaliacao_pares_3_id, ciclo_2025_1_id, colaborador_comum_sem_avaliação_id, colaborador_qa_id, 'AVALIACAO_PARES', 'PENDENTE'),
    

    
    -- Avaliações líder-colaborador
    (avaliacao_lider_colaborador_id, ciclo_2025_1_id, colaborador_gestor_id, colaborador_comum_id, 'LIDER_COLABORADOR', 'CONCLUIDA'),
    (avaliacao_lider_colaborador_2_id, ciclo_2025_1_id, colaborador_gestor_id, colaborador_qa_id, 'LIDER_COLABORADOR', 'CONCLUIDA'),
    (avaliacao_lider_colaborador_3_id, ciclo_2025_1_id, colaborador_gestor_id, colaborador_ux_id, 'LIDER_COLABORADOR', 'CONCLUIDA'),
    (avaliacao_lider_colaborador_4_id, ciclo_2025_1_id, colaborador_gestor_id, colaborador_marketing_id, 'LIDER_COLABORADOR', 'CONCLUIDA'),
    (avaliacao_lider_colaborador_5_id, ciclo_2025_1_id, colaborador_gestor_id, colaborador_suporte_id, 'LIDER_COLABORADOR', 'CONCLUIDA'),
    (avaliacao_lider_colaborador_6_id, ciclo_2025_1_id, colaborador_gestor_id, colaborador_financeiro_id, 'LIDER_COLABORADOR', 'CONCLUIDA'),
    (avaliacao_lider_colaborador_7_id, ciclo_2025_1_id, colaborador_gestor_id, colaborador_comercial_id, 'LIDER_COLABORADOR', 'CONCLUIDA'),
    (uuid_generate_v4(), ciclo_2025_1_id, colaborador_gestor_id, colaborador_comum_sem_avaliação_id, 'LIDER_COLABORADOR', 'PENDENTE'),
    
    
    -- Avaliação colaborador-mentor
    (avaliacao_colaborador_mentor_id, ciclo_2025_1_id, colaborador_comum_id, colaborador_mentor_id, 'COLABORADOR_MENTOR', 'PENDENTE'),
    (avaliacao_colaborador_mentor_2_id, ciclo_2025_1_id, colaborador_comum_sem_avaliação_id, colaborador_mentor_id, 'COLABORADOR_MENTOR', 'PENDENTE');

-- Inserir AutoAvaliacao
INSERT INTO "AutoAvaliacao" ("idAvaliacao", "notaFinal")
VALUES
    (avaliacao_autoavaliacao_id, 4.2),
    (avaliacao_autoavaliacao_2_id, 3.9),
    (avaliacao_autoavaliacao_3_id, 3.8),
    (avaliacao_autoavaliacao_4_id, 4.1),
    (avaliacao_autoavaliacao_5_id, 3.7),
    (avaliacao_autoavaliacao_6_id, 4.0),
    (avaliacao_autoavaliacao_7_id, 0.0),
    (avaliacao_autoavaliacao_8_id, 0.0);


-- Inserir Cards da AutoAvaliacao
INSERT INTO "CardAutoAvaliacao" ("idCardAvaliacao", "idAvaliacao", "nomeCriterio", "nota", "justificativa")
VALUES
    -- Cards para autoavaliação do colaborador comum (Ana Costa)
    (uuid_generate_v4(), avaliacao_autoavaliacao_id, 'Trabalho em Equipe', 4, 'Consigo trabalhar bem em equipe e colaboro ativamente nos projetos'),
    (uuid_generate_v4(), avaliacao_autoavaliacao_id, 'Comunicação', 4, 'Me comunico de forma clara e objetiva'),
    (uuid_generate_v4(), avaliacao_autoavaliacao_id, 'Qualidade das Entregas', 4, 'Entrego trabalhos de qualidade dentro dos padrões esperados'),
    
    -- Cards para autoavaliação do QA (Fernanda Lima)
    (uuid_generate_v4(), avaliacao_autoavaliacao_2_id, 'Trabalho em Equipe', 4, 'Colaboro bem com a equipe de desenvolvimento'),
    (uuid_generate_v4(), avaliacao_autoavaliacao_2_id, 'Qualidade das Entregas', 4, 'Realizo testes detalhados e documentados'),
    (uuid_generate_v4(), avaliacao_autoavaliacao_2_id, 'Resolução de Problemas', 4, 'Identifico bugs e problemas de forma eficiente'),
    
    -- Cards para autoavaliação do UX (Rafael Martins)
    (uuid_generate_v4(), avaliacao_autoavaliacao_3_id, 'Trabalho em Equipe', 4, 'Trabalho bem com desenvolvedores e stakeholders'),
    (uuid_generate_v4(), avaliacao_autoavaliacao_3_id, 'Qualidade das Entregas', 4, 'Entrego designs de qualidade'),
    (uuid_generate_v4(), avaliacao_autoavaliacao_3_id, 'Resolução de Problemas', 3, 'Ainda estou desenvolvendo essa habilidade'),
    
    -- Cards para autoavaliação do Marketing (Juliana Rocha)
    (uuid_generate_v4(), avaliacao_autoavaliacao_4_id, 'Trabalho em Equipe', 4, 'Trabalho bem com todas as áreas da empresa'),
    (uuid_generate_v4(), avaliacao_autoavaliacao_4_id, 'Comunicação', 4, 'Tenho forte habilidade de comunicação'),
    (uuid_generate_v4(), avaliacao_autoavaliacao_4_id, 'Qualidade das Entregas', 4, 'Entrego campanhas efetivas'),
    
    -- Cards para autoavaliação do Suporte (Lucas Ferreira)
    (uuid_generate_v4(), avaliacao_autoavaliacao_5_id, 'Trabalho em Equipe', 4, 'Colaboro bem com toda a equipe'),
    (uuid_generate_v4(), avaliacao_autoavaliacao_5_id, 'Comunicação', 4, 'Me comunico bem com clientes e colegas'),
    (uuid_generate_v4(), avaliacao_autoavaliacao_5_id, 'Resolução de Problemas', 3, 'Resolvo problemas dos clientes de forma eficaz'),
    
    -- Cards para autoavaliação do Comercial (Eduardo Nunes)
    (uuid_generate_v4(), avaliacao_autoavaliacao_6_id, 'Trabalho em Equipe', 4, 'Trabalho bem com a equipe comercial'),
    (uuid_generate_v4(), avaliacao_autoavaliacao_6_id, 'Comunicação', 4, 'Tenho excelente comunicação com clientes'),
    (uuid_generate_v4(), avaliacao_autoavaliacao_6_id, 'Qualidade das Entregas', 4, 'Alcanço minhas metas de vendas'),

    -- Cards para autoavaliação do Financeiro (Patricia Alves)
    (uuid_generate_v4(), avaliacao_autoavaliacao_8_id, 'Trabalho em Equipe', 4, 'Trabalho bem com toda a equipe'),
    (uuid_generate_v4(), avaliacao_autoavaliacao_8_id, 'Comunicação', 4, 'Me comunico de forma clara'),
    (uuid_generate_v4(), avaliacao_autoavaliacao_8_id, 'Qualidade das Entregas', 4, 'Entrego relatórios precisos'),

    -- Cards para autoavaliação do colaborador sem avaliação (João Souza)
    (uuid_generate_v4(), avaliacao_autoavaliacao_7_id, 'Trabalho em Equipe', 0, ''),
    (uuid_generate_v4(), avaliacao_autoavaliacao_7_id, 'Comunicação', 0, ''),
    (uuid_generate_v4(), avaliacao_autoavaliacao_7_id, 'Qualidade das Entregas', 0, '');


-- Inserir AvaliacaoPares
INSERT INTO "AvaliacaoPares" ("idAvaliacao", "nota", "motivadoTrabalharNovamente", "pontosFortes", "pontosFracos")
VALUES
    (avaliacao_pares_id, 4.5, 'Neutro', 'Comunicativo, proativo, técnico', 'Às vezes é perfeccionista demais'),
    (avaliacao_pares_2_id, 0, '', '', ''),
    (avaliacao_pares_3_id, 0, '', '', '');

-- Inserir AvaliacaoColaboradorMentor
INSERT INTO "AvaliacaoColaboradorMentor" ("idAvaliacao", "nota", "justificativa")
VALUES
    (avaliacao_colaborador_mentor_id, 4.8, 'Excelente mentor, sempre disponível para ajudar e ensinar novas tecnologias'),
    (avaliacao_colaborador_mentor_2_id, NULL, '');

-- Inserir AvaliacaoLiderColaborador
INSERT INTO "AvaliacaoLiderColaborador" ("idAvaliacao", "notaFinal")
VALUES
    (avaliacao_lider_colaborador_id, 4.3),
    (avaliacao_lider_colaborador_2_id, 4.0),
    (avaliacao_lider_colaborador_3_id, 3.9),
    (avaliacao_lider_colaborador_4_id, 4.2),
    (avaliacao_lider_colaborador_5_id, 3.8),
    (avaliacao_lider_colaborador_6_id, 4.0),
    (avaliacao_lider_colaborador_7_id, 4.1);

-- Inserir Cards da AvaliacaoLiderColaborador
INSERT INTO "CardAvaliacaoLiderColaborador" ("idCardAvaliacao", "idAvaliacao", "nomeCriterio", "nota", "justificativa")
VALUES
    -- Cards para Ana Costa (Desenvolvedor comum)
    (uuid_generate_v4(), avaliacao_lider_colaborador_id, 'Trabalho em Equipe', 4, 'Demonstra excelente capacidade de trabalho em equipe'),
    (uuid_generate_v4(), avaliacao_lider_colaborador_id, 'Comunicação', 4, 'Comunica-se de forma efetiva'),
    (uuid_generate_v4(), avaliacao_lider_colaborador_id, 'Qualidade das Entregas', 5, 'Entregas consistentemente de alta qualidade'),
    (uuid_generate_v4(), avaliacao_lider_colaborador_id, 'Cumprimento de Prazos', 4, 'Cumpre prazos estabelecidos'),
    
    -- Cards para Fernanda Lima (QA)
    (uuid_generate_v4(), avaliacao_lider_colaborador_2_id, 'Trabalho em Equipe', 4, 'Colabora bem com a equipe de desenvolvimento'),
    (uuid_generate_v4(), avaliacao_lider_colaborador_2_id, 'Qualidade das Entregas', 4, 'Testes bem estruturados e documentados'),
    (uuid_generate_v4(), avaliacao_lider_colaborador_2_id, 'Resolução de Problemas', 4, 'Identifica problemas de forma proativa'),
    
    -- Cards para Rafael Martins (UX)
    (uuid_generate_v4(), avaliacao_lider_colaborador_3_id, 'Trabalho em Equipe', 4, 'Trabalha bem com stakeholders'),
    (uuid_generate_v4(), avaliacao_lider_colaborador_3_id, 'Qualidade das Entregas', 4, 'Designs bem elaborados'),
    (uuid_generate_v4(), avaliacao_lider_colaborador_3_id, 'Comunicação', 4, 'Se comunica bem com usuários'),
    
    -- Cards para Juliana Rocha (Marketing)
    (uuid_generate_v4(), avaliacao_lider_colaborador_4_id, 'Trabalho em Equipe', 4, 'Excelente trabalho com outras áreas'),
    (uuid_generate_v4(), avaliacao_lider_colaborador_4_id, 'Comunicação', 5, 'Comunicação excepcional'),
    (uuid_generate_v4(), avaliacao_lider_colaborador_4_id, 'Qualidade das Entregas', 4, 'Campanhas efetivas e criativas'),
    
    -- Cards para Lucas Ferreira (Suporte)
    (uuid_generate_v4(), avaliacao_lider_colaborador_5_id, 'Trabalho em Equipe', 4, 'Colabora bem com toda a equipe'),
    (uuid_generate_v4(), avaliacao_lider_colaborador_5_id, 'Comunicação', 4, 'Boa comunicação com clientes'),
    (uuid_generate_v4(), avaliacao_lider_colaborador_5_id, 'Resolução de Problemas', 3, 'Resolve bem os problemas dos clientes'),

    -- Cards para Patricia Alves (Financeiro)
    (uuid_generate_v4(), avaliacao_lider_colaborador_6_id, 'Trabalho em Equipe', 4, 'Colabora bem com todas as áreas'),
    (uuid_generate_v4(), avaliacao_lider_colaborador_6_id, 'Qualidade das Entregas', 4, 'Relatórios precisos e organizados'),
    (uuid_generate_v4(), avaliacao_lider_colaborador_6_id, 'Cumprimento de Prazos', 4, 'Sempre entrega dentro do prazo'),
    
    -- Cards para Eduardo Nunes (Comercial)
    (uuid_generate_v4(), avaliacao_lider_colaborador_7_id, 'Trabalho em Equipe', 4, 'Trabalha bem com a equipe'),
    (uuid_generate_v4(), avaliacao_lider_colaborador_7_id, 'Comunicação', 4, 'Excelente comunicação com clientes'),
    (uuid_generate_v4(), avaliacao_lider_colaborador_7_id, 'Qualidade das Entregas', 4, 'Atinge suas metas de vendas');


-- Inserir Equalizações para todos os colaboradores comuns
INSERT INTO "Equalizacao" ("idEqualizacao", "idCiclo", "idAvaliado", "idMembroComite", "notaAjustada", "justificativa", "status")
VALUES
    (uuid_generate_v4(), ciclo_2025_1_id, colaborador_comum_id, colaborador_comite_id, NULL, NULL, 'PENDENTE'),
    (uuid_generate_v4(), ciclo_2025_1_id, colaborador_qa_id, colaborador_comite_id, NULL, NULL, 'PENDENTE'),
    (uuid_generate_v4(), ciclo_2025_1_id, colaborador_ux_id, colaborador_comite_id, NULL, NULL, 'PENDENTE'),
    (uuid_generate_v4(), ciclo_2025_1_id, colaborador_marketing_id, colaborador_comite_id, NULL, NULL, 'PENDENTE'),
    (uuid_generate_v4(), ciclo_2025_1_id, colaborador_suporte_id, colaborador_comite_id, NULL, NULL, 'PENDENTE'),
    (uuid_generate_v4(), ciclo_2025_1_id, colaborador_financeiro_id, colaborador_comite_id, NULL, NULL, 'PENDENTE'),
    (uuid_generate_v4(), ciclo_2025_1_id, colaborador_comercial_id, colaborador_comite_id, NULL, NULL, 'PENDENTE'),
    (uuid_generate_v4(), ciclo_2025_1_id, colaborador_comum_sem_avaliação_id, colaborador_comite_id, NULL, NULL, 'PENDENTE');

-- Inserir Alocação de Colaboradores aos Projetos
INSERT INTO "alocacoes_colaborador_projeto" ("idAlocacao", "idColaborador", "idProjeto", "dataEntrada", "dataSaida")
VALUES
    (uuid_generate_v4(), colaborador_comum_id, projeto_rocket_id, '2025-01-01', NULL),
    (uuid_generate_v4(), colaborador_qa_id, projeto_rocket_id, '2025-01-01', NULL),
    (uuid_generate_v4(), colaborador_mentor_id, projeto_apollo_id, '2025-02-01', NULL),
    (uuid_generate_v4(), colaborador_ux_id, projeto_apollo_id, '2025-02-01', NULL);


END $$;

