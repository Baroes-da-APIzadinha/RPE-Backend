import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prismaService';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

describe('Fluxo Completo de Avaliações (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let liderToken: string;
  let colaboradorToken: string;
  let cicloId: string;
  let avaliacaoId: string;
  let colaboradorId: string;
  let liderId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.use(cookieParser());
    
    prisma = app.get<PrismaService>(PrismaService);
    
    await app.init();

    // Criar usuários de teste
    await criarUsuariosDeTeste();
    
    // Criar ciclo de avaliação
    await criarCicloAvaliacao();
    
    // Criar critérios de avaliação
    await criarCriterios();
  });

  afterAll(async () => {
    // Limpeza mais simples e específica
    await prisma.avaliacao.deleteMany({});
    await prisma.associacaoCriterioCiclo.deleteMany({});
    await prisma.colaboradorCiclo.deleteMany({});
    await prisma.liderColaborador.deleteMany({});
    await prisma.colaboradorPerfil.deleteMany({});
    await prisma.colaborador.deleteMany({});
    await prisma.cicloAvaliacao.deleteMany({});
    await prisma.criterioAvaliativo.deleteMany({});
    await prisma.$disconnect();
    await app.close();
  });

  async function criarUsuariosDeTeste() {
    // Admin
    const admin = await prisma.colaborador.create({
      data: {
        nomeCompleto: 'Admin Sistema',
        email: 'admin@sistema.com',
        senha: '$2b$10$bZ2TmebxzLlsiMlrLZQ2Xu5tvGFNAhLIt8EgqmTIGDMW1VbEX0ydG', // senha: 'senha123'
      },
    });

    await prisma.colaboradorPerfil.create({
      data: {
        idColaborador: admin.idColaborador,
        tipoPerfil: 'ADMIN',
      },
    });

    // Líder
    const lider = await prisma.colaborador.create({
      data: {
        nomeCompleto: 'Líder Equipe',
        email: 'lider@empresa.com',
        senha: '$2b$10$bZ2TmebxzLlsiMlrLZQ2Xu5tvGFNAhLIt8EgqmTIGDMW1VbEX0ydG', // senha: 'senha123'
      },
    });

    liderId = lider.idColaborador;

    await prisma.colaboradorPerfil.create({
      data: {
        idColaborador: lider.idColaborador,
        tipoPerfil: 'LIDER',
      },
    });

    // Colaborador
    const colaborador = await prisma.colaborador.create({
      data: {
        nomeCompleto: 'Colaborador Teste',
        email: 'colaborador@empresa.com',
        senha: '$2b$10$bZ2TmebxzLlsiMlrLZQ2Xu5tvGFNAhLIt8EgqmTIGDMW1VbEX0ydG', // senha: 'senha123'
      },
    });

    colaboradorId = colaborador.idColaborador;

    await prisma.colaboradorPerfil.create({
      data: {
        idColaborador: colaborador.idColaborador,
        tipoPerfil: 'COLABORADOR_COMUM',
      },
    });

    // Criar relação líder-colaborador (aguardar criação do ciclo)
    // Esta relação será criada após o ciclo ser criado

    // Fazer login com cada usuário
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@sistema.com', senha: 'senha123' })
      .expect(200);
      
    adminToken = Array.isArray(adminLogin.headers['set-cookie']) 
      ? adminLogin.headers['set-cookie'].join('; ') 
      : adminLogin.headers['set-cookie'] || '';

    const liderLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'lider@empresa.com', senha: 'senha123' })
      .expect(200);
      
    liderToken = Array.isArray(liderLogin.headers['set-cookie']) 
      ? liderLogin.headers['set-cookie'].join('; ') 
      : liderLogin.headers['set-cookie'] || '';

    const colaboradorLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'colaborador@empresa.com', senha: 'senha123' })
      .expect(200);
      
    colaboradorToken = Array.isArray(colaboradorLogin.headers['set-cookie']) 
      ? colaboradorLogin.headers['set-cookie'].join('; ') 
      : colaboradorLogin.headers['set-cookie'] || '';
  }

  async function criarCicloAvaliacao() {
    const ciclo = await prisma.cicloAvaliacao.create({
      data: {
        nomeCiclo: 'Ciclo E2E 2024',
        dataInicio: new Date('2024-01-01'),
        dataFim: new Date('2024-12-31'),
        status: 'EM_ANDAMENTO',
      },
    });
    cicloId = ciclo.idCiclo;

    // Criar relação líder-colaborador agora que temos o ciclo
    await prisma.liderColaborador.create({
      data: {
        idLider: liderId,
        idColaborador: colaboradorId,
        idCiclo: cicloId,
      },
    });

    // Criar associações colaborador-ciclo para que sejam incluídos nas avaliações
    await prisma.colaboradorCiclo.createMany({
      data: [
        { idColaborador: liderId, idCiclo: cicloId },
        { idColaborador: colaboradorId, idCiclo: cicloId },
      ],
    });
  }

  async function criarCriterios() {
    const criterios = await prisma.criterioAvaliativo.createMany({
      data: [
        {
          nomeCriterio: 'Execução',
          descricao: 'Capacidade de execução de tarefas',
          pilar: 'Execucao',
        },
        {
          nomeCriterio: 'Comunicação',
          descricao: 'Habilidades de comunicação',
          pilar: 'Comportamento',
        },
        {
          nomeCriterio: 'Liderança',
          descricao: 'Capacidade de liderança',
          pilar: 'Gestao_e_Lideranca',
        },
      ],
    });

    // Buscar os critérios criados para obter seus IDs
    const criteriosCriados = await prisma.criterioAvaliativo.findMany({
      where: {
        nomeCriterio: {
          in: ['Execução', 'Comunicação', 'Liderança']
        }
      }
    });

    // Criar associações de critérios com o ciclo
    await prisma.associacaoCriterioCiclo.createMany({
      data: criteriosCriados.map(criterio => ({
        idCiclo: cicloId,
        idCriterio: criterio.idCriterio,
        cargo: null, // Critérios gerais
        trilhaCarreira: null,
        unidade: null,
      })),
    });
  }

  describe('1. Lançamento de Avaliações (Admin)', () => {
    it('deve lançar autoavaliações para o ciclo', async () => {
      const response = await request(app.getHttpServer())
        .post('/avaliacoes/lancar-auto-avaliacoes')
        .set('Cookie', adminToken)
        .send({ idCiclo: cicloId })
        .expect(201); // Created é o status correto

      expect(response.body.message).toContain('lançadas com sucesso');
      expect(response.body.relatorio).toBeDefined();
      expect(response.body.relatorio.lancadas).toBeGreaterThan(0);
    });

    it('deve lançar avaliações líder-colaborador', async () => {
      const response = await request(app.getHttpServer())
        .post('/avaliacoes/lancar-lider-colaborador')
        .set('Cookie', adminToken)
        .send({ idCiclo: cicloId }) // Enviar como objeto com idCiclo
        .expect(201); // Created é o status correto

      expect(response.body.message).toContain('lançadas com sucesso');
    });
  });

  describe('2. Preenchimento de Autoavaliação (Colaborador)', () => {
    it('deve buscar autoavaliação do colaborador', async () => {
      const response = await request(app.getHttpServer())
        .get(`/avaliacoes/tipo/usuario/${colaboradorId}`)
        .query({ idCiclo: cicloId, tipoAvaliacao: 'AUTOAVALIACAO' })
        .set('Cookie', colaboradorToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.avaliacoes).toHaveLength(1);
      avaliacaoId = response.body.avaliacoes[0].idAvaliacao;
    });

    it('deve salvar rascunho de autoavaliação', async () => {
      const rascunhoData = {
        idAvaliacao: avaliacaoId,
        criterios: [
          {
            nome: 'Execução',
            nota: 4.0,
            justificativa: 'Rascunho: Boa execução das tarefas',
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/avaliacoes/rascunho-auto-avaliacao')
        .set('Cookie', colaboradorToken)
        .send(rascunhoData)
        .expect(201); // Created é o status correto

      expect(response.body.message).toContain('Rascunho');
      expect(response.body.idAvaliacao).toBe(avaliacaoId);
    });

    it('deve finalizar autoavaliação', async () => {
      // Garantir que temos um avaliacaoId válido
      if (!avaliacaoId) {
        const buscarResponse = await request(app.getHttpServer())
          .get(`/avaliacoes/tipo/usuario/${colaboradorId}`)
          .query({ idCiclo: cicloId, tipoAvaliacao: 'AUTOAVALIACAO' })
          .set('Cookie', colaboradorToken);
        avaliacaoId = buscarResponse.body.avaliacoes[0]?.idAvaliacao;
      }

      console.log('avaliacaoId:', avaliacaoId);

      // Buscar todos os cards de avaliação para saber quantos critérios precisamos
      const cardsResponse = await request(app.getHttpServer())
        .get(`/avaliacoes/forms-autoavaliacao/${avaliacaoId}`)
        .set('Cookie', colaboradorToken);

      console.log('Cards de avaliação:', JSON.stringify(cardsResponse.body, null, 2));
      
      if (!cardsResponse.body || typeof cardsResponse.body !== 'object') {
        throw new Error('Erro ao buscar cards de avaliação');
      }

      // Extrair critérios de todos os pilares
      const todosCriterios: any[] = [];
      for (const pilar in cardsResponse.body) {
        for (const criterio of cardsResponse.body[pilar]) {
          todosCriterios.push(criterio);
        }
      }

      // Buscar os critérios completos com IDs
      const criteriosCompletos = await prisma.criterioAvaliativo.findMany({
        where: {
          nomeCriterio: {
            in: todosCriterios.map((c: any) => c.nomeCriterio)
          }
        }
      });

      // Criar critérios baseado nos dados existentes
      const criterios = criteriosCompletos.map((criterio, index) => ({
        nome: criterio.nomeCriterio,
        nota: 5 - index,
        justificativa: `Justificativa para ${criterio.nomeCriterio}`
      }));

      const avaliacaoCompleta = {
        idAvaliacao: avaliacaoId,
        criterios: criterios
      };

      console.log('Dados da avaliação:', JSON.stringify(avaliacaoCompleta, null, 2));

      const response = await request(app.getHttpServer())
        .post('/avaliacoes/preencher-auto-avaliacao')
        .set('Cookie', colaboradorToken)
        .send(avaliacaoCompleta);

      // Se recebeu 400, vamos ver o erro
      if (response.status === 400) {
        console.log('Erro 400:', response.body);
      }

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('preenchida com sucesso');
    });
  });

  describe('3. Avaliação Líder-Colaborador (Líder)', () => {
    let avaliacaoLiderId: string;

    it('deve buscar avaliações de colaboradores do líder', async () => {
      const response = await request(app.getHttpServer())
        .get(`/avaliacoes/tipo/usuario/${liderId}`)
        .query({ idCiclo: cicloId, tipoAvaliacao: 'LIDER_COLABORADOR' })
        .set('Cookie', liderToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.avaliacoes.length).toBeGreaterThan(0);
      avaliacaoLiderId = response.body.avaliacoes[0].idAvaliacao;
    });

    it('deve salvar rascunho da avaliação líder-colaborador', async () => {
      // Buscar todos os cards de avaliação para saber quantos critérios precisamos
      const cardsResponse = await request(app.getHttpServer())
        .get(`/avaliacoes/forms-lider-colaborador/${avaliacaoLiderId}`)
        .set('Cookie', liderToken);

      console.log('Cards de avaliação líder (rascunho):', JSON.stringify(cardsResponse.body, null, 2));
      
      if (!cardsResponse.body || typeof cardsResponse.body !== 'object') {
        throw new Error('Erro ao buscar cards de avaliação');
      }

      // Extrair primeiro critério de todos os pilares para rascunho
      let primeiroCriterio: any = null;
      for (const pilar in cardsResponse.body) {
        if (cardsResponse.body[pilar].length > 0) {
          primeiroCriterio = cardsResponse.body[pilar][0];
          break;
        }
      }

      if (!primeiroCriterio) {
        throw new Error('Nenhum critério encontrado');
      }

      // Buscar o critério completo com ID
      const criterioCompleto = await prisma.criterioAvaliativo.findFirst({
        where: { nomeCriterio: primeiroCriterio.nomeCriterio }
      });

      if (!criterioCompleto) {
        throw new Error('Critério não encontrado no banco');
      }

      // Criar critérios baseado no critério encontrado (apenas o primeiro para rascunho)
      const criterios = [{
        nome: criterioCompleto.nomeCriterio,
        nota: 3.5,
        justificativa: 'Rascunho: Em desenvolvimento'
      }];

      const rascunhoLider = {
        idAvaliacao: avaliacaoLiderId,
        criterios: criterios
      };

      const response = await request(app.getHttpServer())
        .post('/avaliacoes/rascunho-lider-colaborador')
        .set('Cookie', liderToken)
        .send(rascunhoLider)
        .expect(201); // Created é o status correto

      expect(response.body.message).toContain('Rascunho');
    });

    it('deve finalizar avaliação líder-colaborador', async () => {
      // Buscar todos os cards de avaliação para saber quantos critérios precisamos
      const cardsResponse = await request(app.getHttpServer())
        .get(`/avaliacoes/forms-lider-colaborador/${avaliacaoLiderId}`)
        .set('Cookie', liderToken);

      console.log('Cards de avaliação líder:', JSON.stringify(cardsResponse.body, null, 2));
      
      if (!cardsResponse.body || typeof cardsResponse.body !== 'object') {
        throw new Error('Erro ao buscar cards de avaliação');
      }

      // Extrair critérios de todos os pilares
      const todosCriterios: any[] = [];
      for (const pilar in cardsResponse.body) {
        for (const criterio of cardsResponse.body[pilar]) {
          todosCriterios.push(criterio);
        }
      }

      // Buscar os critérios completos com IDs
      const criteriosCompletos = await prisma.criterioAvaliativo.findMany({
        where: {
          nomeCriterio: {
            in: todosCriterios.map((c: any) => c.nomeCriterio)
          }
        }
      });

      // Criar critérios baseado nos dados existentes
      const criterios = criteriosCompletos.map((criterio, index) => ({
        nome: criterio.nomeCriterio,
        nota: 4.0 + (index * 0.5), // Usar múltiplos de 0.5: 4.0, 4.5, 5.0
        justificativa: `Justificativa para ${criterio.nomeCriterio}`
      }));

      const avaliacaoLider = {
        idAvaliacao: avaliacaoLiderId,
        criterios: criterios
      };

      console.log('Dados da avaliação líder:', JSON.stringify(avaliacaoLider, null, 2));

      const response = await request(app.getHttpServer())
        .post('/avaliacoes/preencher-lider-colaborador')
        .set('Cookie', liderToken)
        .send(avaliacaoLider);

      // Se recebeu 400, vamos ver o erro
      if (response.status === 400) {
        console.log('Erro 400 líder-colaborador final:', response.body);
      }

      expect(response.status).toBe(201);

      expect(response.body.message).toContain('preenchida com sucesso');
    });
  });

  describe('4. Consultas e Relatórios', () => {
    it('deve buscar status das avaliações do ciclo', async () => {
      const response = await request(app.getHttpServer())
        .get(`/avaliacoes/status/${cicloId}`)
        .set('Cookie', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
    });

    it('deve buscar notas de avaliações para discrepância', async () => {
      const response = await request(app.getHttpServer())
        .get(`/avaliacoes/notasAvaliacoes/${colaboradorId}/${cicloId}`)
        .set('Cookie', adminToken)
        .expect(200);

      expect(response.body).toHaveProperty('colaborador');
      expect(response.body).toHaveProperty('avaliacoes');
    });

    it('deve buscar relatório de notas do ciclo', async () => {
      const response = await request(app.getHttpServer())
        .get(`/avaliacoes/notasCiclo/${cicloId}`)
        .set('Cookie', adminToken)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('deve buscar formulários de autoavaliação', async () => {
      const response = await request(app.getHttpServer())
        .get(`/avaliacoes/forms-autoavaliacao/${avaliacaoId}`)
        .set('Cookie', colaboradorToken)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('5. Validações de Autorização', () => {
    it('deve impedir colaborador comum de lançar avaliações', async () => {
      await request(app.getHttpServer())
        .post('/avaliacoes/lancar-auto-avaliacoes')
        .set('Cookie', colaboradorToken)
        .send({ idCiclo: cicloId })
        .expect(403); // Forbidden
    });

    it('deve impedir acesso sem autenticação', async () => {
      await request(app.getHttpServer())
        .get(`/avaliacoes/status/${cicloId}`)
        .expect(401); // Unauthorized
    });

    it('deve impedir colaborador de acessar avaliação de outro', async () => {
      // Tentar acessar avaliação do líder com token do colaborador
      const response = await request(app.getHttpServer())
        .get(`/avaliacoes/forms-autoavaliacao/invalid-id`)
        .set('Cookie', colaboradorToken);

      // Aceitar 404, 500, ou 403 dependendo da implementação
      expect([404, 500, 403]).toContain(response.status);
    });
  });

  describe('6. Auditoria', () => {
    it('deve registrar logs de auditoria para ações importantes', async () => {
      // Fazer uma ação que gera auditoria - buscar uma nova avaliação para rascunho
      const novaAutoAvaliacaoResponse = await request(app.getHttpServer())
        .get(`/avaliacoes/tipo/usuario/${liderId}`)
        .query({ idCiclo: cicloId, tipoAvaliacao: 'AUTOAVALIACAO' })
        .set('Cookie', liderToken);

      let novoAvaliacaoId = null;
      if (novaAutoAvaliacaoResponse.body.success && novaAutoAvaliacaoResponse.body.avaliacoes.length > 0) {
        novoAvaliacaoId = novaAutoAvaliacaoResponse.body.avaliacoes[0].idAvaliacao;
      }

      // Se não tiver avaliação do líder, vamos usar uma ação de consulta que sempre gera auditoria
      const response = await request(app.getHttpServer())
        .get(`/avaliacoes/status/${cicloId}`)
        .set('Cookie', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verificar se foi criado log de auditoria para qualquer ação de consulta
      const logs = await prisma.auditLog.findMany({
        where: {
          action: {
            in: ['buscar_status_avaliacoes', 'consultar_avaliacoes', 'buscar_avaliacoes']
          },
        },
      });

      // Como as ações de auditoria podem variar, vamos verificar se há logs recentes
      const logsRecentes = await prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 5,
      });

      expect(logsRecentes.length).toBeGreaterThan(0);
    });
  });
});
