-- Criar extensão para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
SET CONSTRAINTS ALL DEFERRED;
    TRUNCATE TABLE "CardAvaliacaoLiderColaborador" CASCADE;
    TRUNCATE TABLE "CardAutoAvaliacao" CASCADE;
    TRUNCATE TABLE "AvaliacaoLiderColaborador" CASCADE;
    TRUNCATE TABLE "AvaliacaoColaboradorMentor" CASCADE;
    TRUNCATE TABLE "AvaliacaoPares" CASCADE;
    TRUNCATE TABLE "AutoAvaliacao" CASCADE;
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
SET CONSTRAINTS ALL IMMEDIATE;

    -- Reabilitar as verificações de chave estrangeira
    END $$;

-- Declaração dos UUIDs para uso posterior
DO $$

DECLARE
    -- Colaboradores
    colaborador_admin_id UUID := '11111111-1111-1111-1111-111111111111';
    colaborador_rh_id UUID := '22222222-2222-2222-2222-222222222222';
    colaborador_gestor_id UUID := '33333333-3333-3333-3333-333333333333';
    colaborador_comum_id UUID := '44444444-4444-4444-4444-444444444444';
    colaborador_mentor_id UUID := '99999999-9999-9999-9999-999999999999';
    colaborador_qa_id UUID := 'aaaaaaaa-1111-1111-1111-111111111111';
    colaborador_ux_id UUID := 'bbbbbbbb-2222-2222-2222-222222222222';
    colaborador_marketing_id UUID := 'cccccccc-3333-3333-3333-333333333333';
    
    -- Ciclos de Avaliação
    ciclo_2024_2_id UUID := '55555555-5555-5555-5555-555555555555';
    ciclo_2025_1_id UUID := '55555555-5555-5555-5555-666666666666';
    ciclo_2025_2_id UUID := '55555555-5555-5555-5555-777777777777';

    
    -- Critérios de Comportamento
    criterio_comp_1_id UUID := '66666666-6666-6666-6666-666666666666';
    criterio_comp_2_id UUID := '66666666-6666-6666-6666-777777777777';
    criterio_comp_3_id UUID := '66666666-6666-6666-6666-888888888888';
    
    -- Critérios de Execução
    criterio_exec_1_id UUID := '77777777-7777-7777-7777-666666666666';
    criterio_exec_2_id UUID := '77777777-7777-7777-7777-777777777777';
    criterio_exec_3_id UUID := '77777777-7777-7777-7777-888888888888';
    
    -- Critérios de Gestão e Liderança
    criterio_gest_1_id UUID := '88888888-8888-8888-8888-666666666666';
    criterio_gest_2_id UUID := '88888888-8888-8888-8888-777777777777';
    criterio_gest_3_id UUID := '88888888-8888-8888-8888-888888888888';
    
    -- Projetos (removido - não existe mais no schema)
    
    -- Avaliações
    avaliacao_autoavaliacao_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    avaliacao_pares_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    avaliacao_lider_colaborador_id UUID := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    avaliacao_colaborador_mentor_id UUID := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
    
BEGIN  

-- Inserir Colaboradores
INSERT INTO "Colaborador" ("idColaborador", "nomeCompleto", "email", "senha", "cargo", "trilhaCarreira", "unidade", "dataCriacao")
VALUES
    (colaborador_admin_id,'Administrador Sistema', 'admin@empresa.com', '$2b$10$HEWRRVLJThBKJptgYrvswe1aWq8nLQ6Y/R8xjLvIAkE/KvR7iJyeu', 'DESENVOLVEDOR', 'GERENCIAMENTO', 'RECIFE', CURRENT_TIMESTAMP),
    (colaborador_rh_id, 'RH Manager', 'rh@empresa.com', '$2b$10$HEWRRVLJThBKJptgYrvswe1aWq8nLQ6Y/R8xjLvIAkE/KvR7iJyeu', 'RH', 'RH', 'RECIFE', CURRENT_TIMESTAMP),
    (colaborador_gestor_id, 'Gestor Tech', 'gestor@empresa.com', '$2b$10$HEWRRVLJThBKJptgYrvswe1aWq8nLQ6Y/R8xjLvIAkE/KvR7iJyeu', 'DESENVOLVEDOR', 'DESENVOLVIMENTO', 'RECIFE', CURRENT_TIMESTAMP),
    (colaborador_comum_id, 'Desenvolvedor Junior', 'dev@empresa.com', '$2b$10$HEWRRVLJThBKJptgYrvswe1aWq8nLQ6Y/R8xjLvIAkE/KvR7iJyeu', 'DESENVOLVEDOR', 'DESENVOLVIMENTO', 'SAO PAULO', CURRENT_TIMESTAMP),
    (colaborador_mentor_id, 'Mentor Senior', 'mentor@empresa.com', '$2b$10$HEWRRVLJThBKJptgYrvswe1aWq8nLQ6Y/R8xjLvIAkE/KvR7iJyeu', 'DESENVOLVEDOR', 'DESENVOLVIMENTO', 'RECIFE', CURRENT_TIMESTAMP),
    (colaborador_qa_id, 'Analista QA', 'qa@empresa.com', '$2b$10$HEWRRVLJThBKJptgYrvswe1aWq8nLQ6Y/R8xjLvIAkE/KvR7iJyeu', 'QA', 'QA', 'FLORIANOPOLIS', CURRENT_TIMESTAMP),
    (colaborador_ux_id, 'Designer UX', 'ux@empresa.com', '$2b$10$HEWRRVLJThBKJptgYrvswe1aWq8nLQ6Y/R8xjLvIAkE/KvR7iJyeu', 'UX', 'UX', 'SAO PAULO', CURRENT_TIMESTAMP),
    (colaborador_marketing_id, 'Analista Marketing', 'marketing@empresa.com', '$2b$10$HEWRRVLJThBKJptgYrvswe1aWq8nLQ6Y/R8xjLvIAkE/KvR7iJyeu', 'MARKETING', 'MARKETING', 'RECIFE', CURRENT_TIMESTAMP);

-- Inserir Perfis dos Colaboradores
INSERT INTO "ColaboradorPerfil" ("idColaborador", "tipoPerfil")
VALUES
    (colaborador_admin_id, 'ADMIN'),
    (colaborador_rh_id, 'RH'),
    (colaborador_rh_id, 'MEMBRO_COMITE'),
    (colaborador_gestor_id, 'GESTOR'),
    (colaborador_gestor_id, 'LIDER'),
    (colaborador_comum_id, 'COLABORADOR_COMUM'),
    (colaborador_mentor_id, 'GESTOR'),
    (colaborador_mentor_id, 'MENTOR'),
    (colaborador_qa_id, 'COLABORADOR_COMUM'),
    (colaborador_ux_id, 'COLABORADOR_COMUM'),
    (colaborador_marketing_id, 'COLABORADOR_COMUM');

-- Inserir Ciclos de Avaliação
INSERT INTO "CicloAvaliacao" ("idCiclo", "nomeCiclo", "dataInicio", "dataFim", "status")
VALUES
    (ciclo_2024_2_id, '2024.2', '2024-07-01', '2024-12-31', 'FECHADO'),
    (ciclo_2025_1_id, '2025.1', '2025-01-01', '2025-06-30', 'EM_ANDAMENTO'),
    (ciclo_2025_2_id, '2025.2', '2025-07-01', '2025-12-31', 'AGENDADO');


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
    (uuid_generate_v4(), colaborador_gestor_id, colaborador_marketing_id, ciclo_2025_1_id);

-- Inserir Relação Líder-Colaborador
INSERT INTO "LiderColaborador" ("idLiderColaborador", "idLider", "idColaborador", "idCiclo")
VALUES
    (uuid_generate_v4(), colaborador_gestor_id, colaborador_comum_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_gestor_id, colaborador_qa_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_gestor_id, colaborador_ux_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_gestor_id, colaborador_marketing_id, ciclo_2025_1_id);

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
    (uuid_generate_v4(), colaborador_marketing_id, ciclo_2025_1_id);

-- Inserir Relação Mentor-Colaborador
INSERT INTO "MentorColaborador" ("idMentorColaborador", "idMentor", "idColaborador", "idCiclo")
VALUES
    (uuid_generate_v4(), colaborador_mentor_id, colaborador_comum_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_mentor_id, colaborador_qa_id, ciclo_2025_1_id);

-- Inserir Pares
INSERT INTO "Pares" ("idPar", "idColaborador1", "idColaborador2", "idCiclo")
VALUES
    (uuid_generate_v4(), colaborador_comum_id, colaborador_qa_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_ux_id, colaborador_marketing_id, ciclo_2025_1_id),
    (uuid_generate_v4(), colaborador_gestor_id, colaborador_mentor_id, ciclo_2025_1_id);

-- Inserir Avaliações
INSERT INTO "Avaliacao" ("idAvaliacao", "idCiclo", "idAvaliador", "idAvaliado", "tipoAvaliacao", "status")
VALUES
    (avaliacao_autoavaliacao_id, ciclo_2025_1_id, colaborador_comum_id, colaborador_comum_id, 'AUTOAVALIACAO', 'PENDENTE'),
    (avaliacao_pares_id, ciclo_2025_1_id, colaborador_gestor_id, colaborador_comum_id, 'AVALIACAO_PARES', 'PENDENTE'),
    (avaliacao_lider_colaborador_id, ciclo_2025_1_id, colaborador_gestor_id, colaborador_comum_id, 'LIDER_COLABORADOR', 'PENDENTE'),
    (avaliacao_colaborador_mentor_id, ciclo_2025_1_id, colaborador_comum_id, colaborador_mentor_id, 'COLABORADOR_MENTOR', 'PENDENTE');

-- Inserir AutoAvaliacao
INSERT INTO "AutoAvaliacao" ("idAvaliacao", "notaFinal")
VALUES
    (avaliacao_autoavaliacao_id, 4.2);

-- Inserir Cards da AutoAvaliacao
INSERT INTO "CardAutoAvaliacao" ("idCardAvaliacao", "idAvaliacao", "nomeCriterio", "nota", "justificativa")
VALUES
    (uuid_generate_v4(), avaliacao_autoavaliacao_id, 'Trabalho em Equipe', 4, 'Consigo trabalhar bem em equipe'),
    (uuid_generate_v4(), avaliacao_autoavaliacao_id, 'Qualidade das Entregas', 4, 'Entrego trabalhos de qualidade'),
    (uuid_generate_v4(), avaliacao_autoavaliacao_id, 'Desenvolvimento de Equipe', 4, 'Estou desenvolvendo habilidades de liderança');

-- Inserir AvaliacaoPares
INSERT INTO "AvaliacaoPares" ("idAvaliacao", "nota", "motivadoTrabalharNovamente", "pontosFortes", "pontosFracos")
VALUES
    (avaliacao_pares_id, 4.5, 'Sim, é um excelente colega de trabalho', 'Comunicativo, proativo, técnico', 'Às vezes é perfeccionista demais');

-- Inserir AvaliacaoColaboradorMentor
INSERT INTO "AvaliacaoColaboradorMentor" ("idAvaliacao", "nota", "justificativa")
VALUES
    (avaliacao_colaborador_mentor_id, 4.8, 'Excelente mentor, sempre disponível para ajudar e ensinar novas tecnologias');

-- Inserir AvaliacaoLiderColaborador
INSERT INTO "AvaliacaoLiderColaborador" ("idAvaliacao", "notaFinal")
VALUES
    (avaliacao_lider_colaborador_id, 4.3);

-- Inserir Cards da AvaliacaoLiderColaborador
INSERT INTO "CardAvaliacaoLiderColaborador" ("idCardAvaliacao", "idAvaliacao", "nomeCriterio", "nota", "justificativa")
VALUES
    (uuid_generate_v4(), avaliacao_lider_colaborador_id, 'Trabalho em Equipe', 4, 'Demonstra excelente capacidade de trabalho em equipe'),
    (uuid_generate_v4(), avaliacao_lider_colaborador_id, 'Qualidade das Entregas', 5, 'Entregas consistentemente de alta qualidade'),
    (uuid_generate_v4(), avaliacao_lider_colaborador_id, 'Desenvolvimento de Equipe', 4, 'Está desenvolvendo bem habilidades de liderança');

-- Inserir Indicação de Referência
INSERT INTO "IndicacaoReferencia" ("idIndicacao", "idCiclo", "idIndicador", "idIndicado", "tipo", "justificativa")
VALUES
    (uuid_generate_v4(), ciclo_2025_1_id, colaborador_gestor_id, colaborador_comum_id, 'TECNICA', 'Forte conhecimento técnico');

-- Inserir Equalização
INSERT INTO "Equalizacao" ("idEqualizacao", "idCiclo", "idAvaliado", "idMembroComite", "notaAjustada", "justificativa", "status")
VALUES
    (uuid_generate_v4(), ciclo_2025_1_id, colaborador_comum_id, colaborador_rh_id, 4, 'Desempenho consistente ao longo do ciclo', 'CONCLUIDA');

END $$;

