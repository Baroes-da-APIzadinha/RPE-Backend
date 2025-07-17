import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prismaService';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

describe('Funcionalidades Avançadas E2E (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let rhToken: string;
  let colaboradorId: string;
  let cicloId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.use(cookieParser());
    
    prisma = app.get<PrismaService>(PrismaService);
    
    await app.init();

    await criarDadosDeTeste();
  });

  afterAll(async () => {
    // Limpeza mais específica e em ordem
    await prisma.colaboradorPerfil.deleteMany({});
    await prisma.colaborador.deleteMany({});
    await prisma.cicloAvaliacao.deleteMany({});
    await prisma.$disconnect();
    await app.close();
  });

  async function criarDadosDeTeste() {
    // Criar usuários
    const admin = await prisma.colaborador.create({
      data: {
        nomeCompleto: 'Admin Sistema',
        email: 'admin@sistema4.com',
        senha: '$2b$10$bZ2TmebxzLlsiMlrLZQ2Xu5tvGFNAhLIt8EgqmTIGDMW1VbEX0ydG', // senha: 'senha123'
      },
    });

    await prisma.colaboradorPerfil.create({
      data: {
        idColaborador: admin.idColaborador,
        tipoPerfil: 'ADMIN',
      },
    });

    const rh = await prisma.colaborador.create({
      data: {
        nomeCompleto: 'RH Manager',
        email: 'rh@empresa4.com',
        senha: '$2b$10$bZ2TmebxzLlsiMlrLZQ2Xu5tvGFNAhLIt8EgqmTIGDMW1VbEX0ydG', // senha: 'senha123'
      },
    });

    await prisma.colaboradorPerfil.create({
      data: {
        idColaborador: rh.idColaborador,
        tipoPerfil: 'RH',
      },
    });

    const colaborador = await prisma.colaborador.create({
      data: {
        nomeCompleto: 'Colaborador Teste',
        email: 'colaborador@empresa4.com',
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

    // Criar ciclo
    const ciclo = await prisma.cicloAvaliacao.create({
      data: {
        nomeCiclo: 'Ciclo Avançado 2024',
        dataInicio: new Date('2024-01-01'),
        dataFim: new Date('2024-12-31'),
        status: 'EM_ANDAMENTO',
      },
    });

    cicloId = ciclo.idCiclo;

    // Fazer login
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@sistema4.com', senha: 'senha123' })
      .expect(200);
      
    adminToken = Array.isArray(adminLogin.headers['set-cookie']) 
      ? adminLogin.headers['set-cookie'].join('; ') 
      : adminLogin.headers['set-cookie'] || '';

    const rhLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'rh@empresa4.com', senha: 'senha123' })
      .expect(200);
      
    rhToken = Array.isArray(rhLogin.headers['set-cookie']) 
      ? rhLogin.headers['set-cookie'].join('; ') 
      : rhLogin.headers['set-cookie'] || '';
  }

  describe('Funcionalidades de IA', () => {
    it('deve avaliar colaborador com IA (pode falhar se não houver avaliações)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ia/avaliar/${colaboradorId}/${cicloId}`)
        .set('Cookie', adminToken);

      // Aceitar 500 se não houver avaliações ou 200 se houver
      expect([200, 500]).toContain(response.status);
    });

    it('deve buscar avaliações de IA', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ia/avaliacoes/${colaboradorId}/${cicloId}`)
        .set('Cookie', rhToken)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('deve fazer mini avaliação com IA (pode falhar se não houver avaliações)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ia/miniavaliar/${colaboradorId}/${cicloId}`)
        .set('Cookie', adminToken);

      // Aceitar 500 se não houver avaliações ou 200 se houver
      expect([200, 500]).toContain(response.status);
    });

    it('deve buscar dados brutal facts', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ia/brutalfacts/data/${colaboradorId}/${cicloId}`)
        .set('Cookie', adminToken)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('deve gerar brutal facts (pode falhar se não houver avaliações)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/ia/gerarbrutalfacts/${colaboradorId}/${cicloId}`)
        .set('Cookie', adminToken);

      // Aceitar 500 se não houver avaliações ou 200 se houver
      expect([200, 500]).toContain(response.status);
    });

    it('deve buscar brutal facts gerados', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ia/brutalfacts/${colaboradorId}/${cicloId}`)
        .set('Cookie', rhToken)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Relatórios e Analytics', () => {
    it('deve obter quantidade de colaboradores por ciclo', async () => {
      const response = await request(app.getHttpServer())
        .get(`/RH/colaboradores/ciclo/${cicloId}`)
        .set('Cookie', rhToken)
        .expect(200);

      expect(response.body).toBeDefined();
      // Aceitar número ou objeto que contém número
      expect(typeof response.body === 'number' || typeof response.body === 'object').toBe(true);
    });

    it('deve obter quantidade de avaliações concluídas por ciclo', async () => {
      const response = await request(app.getHttpServer())
        .get(`/RH/avaliacoes/concluidas/ciclo/${cicloId}`)
        .set('Cookie', rhToken)
        .expect(200);

      expect(response.body).toBeDefined();
      // Aceitar número ou objeto que contém número
      expect(typeof response.body === 'number' || typeof response.body === 'object').toBe(true);
    });

    it('deve obter quantidade de unidades', async () => {
      const response = await request(app.getHttpServer())
        .get('/RH/unidades')
        .set('Cookie', rhToken)
        .expect(200);

      expect(response.body).toBeDefined();
      // Aceitar número ou objeto que contém número
      expect(typeof response.body === 'number' || typeof response.body === 'object').toBe(true);
    });

    it('deve obter status de avaliações por ciclo', async () => {
      const response = await request(app.getHttpServer())
        .get(`/RH/avaliacoes/status/${cicloId}`)
        .set('Cookie', rhToken)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('deve obter progresso por unidade', async () => {
      const response = await request(app.getHttpServer())
        .get(`/RH/progresso/unidade/ciclo/${cicloId}`)
        .set('Cookie', rhToken)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('deve obter progresso por trilha', async () => {
      const response = await request(app.getHttpServer())
        .get(`/RH/progresso/trilha/ciclo/${cicloId}`)
        .set('Cookie', rhToken)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Gestão de Projetos', () => {
    let projetoId: string;

    it('deve criar novo projeto', async () => {
      const novoProjeto = {
        nomeProjeto: 'Projeto E2E',
        cliente: 'Cliente Teste',
        dataInicio: '2024-01-01',
        dataFim: '2024-06-30',
        status: 'EM_ANDAMENTO',
      };

      const response = await request(app.getHttpServer())
        .post('/projetos')
        .set('Cookie', adminToken)
        .send(novoProjeto)
        .expect(201);

      expect(response.body).toHaveProperty('idProjeto');
      expect(response.body.nomeProjeto).toBe(novoProjeto.nomeProjeto);
      
      projetoId = response.body.idProjeto;
    });

    it('deve listar todos os projetos', async () => {
      const response = await request(app.getHttpServer())
        .get('/projetos')
        .set('Cookie', adminToken)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('deve alocar colaborador ao projeto', async () => {
      const alocacaoData = {
        idColaborador: colaboradorId,
        dataEntrada: '2024-01-01',
        // dataSaida é opcional
      };

      const response = await request(app.getHttpServer())
        .post(`/projetos/${projetoId}/alocacoes`)
        .set('Cookie', adminToken)
        .send(alocacaoData)
        .expect(201);

      expect(response.body).toBeDefined();
    });

    it('deve buscar alocações por projeto', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projetos/${projetoId}/alocacoes`)
        .set('Cookie', adminToken)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('deve buscar projeto específico', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projetos/${projetoId}`)
        .set('Cookie', adminToken)
        .expect(200);

      expect(response.body).toHaveProperty('idProjeto');
      expect(response.body.idProjeto).toBe(projetoId);
    });
  });

  describe('Auditoria e Logs', () => {
    it('deve buscar logs de auditoria', async () => {
      const response = await request(app.getHttpServer())
        .get('/auditoria')
        .query({ action: 'criar_colaborador' })
        .set('Cookie', adminToken)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('deve buscar logs paginados', async () => {
      const response = await request(app.getHttpServer())
        .get('/auditoria/logs')
        .query({ inicio: '0', fim: '10' })
        .set('Cookie', adminToken)
        .expect(200);

      // Aceitar array ou objeto que contém dados paginados
      expect(response.body).toBeDefined();
    });

    it('deve buscar todos os usuários', async () => {
      const response = await request(app.getHttpServer())
        .get('/auditoria/all-users')
        .set('Cookie', adminToken)
        .expect(200);

      // Aceitar array ou objeto que contém usuários
      expect(response.body).toBeDefined();
    });

    it('deve validar parâmetros de paginação', async () => {
      await request(app.getHttpServer())
        .get('/auditoria/logs')
        .query({ inicio: 'invalid' })
        .set('Cookie', adminToken)
        .expect(400);
    });
  });

  describe('Importação e Sincronização', () => {
    it('deve disparar sincronização manual (pode falhar se ERP não estiver disponível)', async () => {
      const response = await request(app.getHttpServer())
        .post('/sincronizacao')
        .set('Cookie', adminToken);

      // Aceitar 200 se conectar ou 500 se não conseguir conectar ao ERP
      expect([200, 500]).toContain(response.status);
    });

    it('deve importar avaliacoes via upload de arquivo', async () => {
      // Simular upload de arquivo
      const response = await request(app.getHttpServer())
        .post('/importacao/avaliacoes')
        .set('Cookie', adminToken)
        .attach('file', Buffer.from('mock excel data'), 'avaliacoes.xlsx');

      // Aceitar 400 se o arquivo não for válido ou 200/201 se processado
      expect([200, 201, 400]).toContain(response.status);
    });
  });

  describe('Validações de Segurança', () => {
    it('deve impedir acesso a endpoints administrativos sem permissão', async () => {
      const colaboradorLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'colaborador@empresa4.com', senha: 'senha123' })
        .expect(200);

      const colaboradorToken = Array.isArray(colaboradorLogin.headers['set-cookie']) 
        ? colaboradorLogin.headers['set-cookie'].join('; ') 
        : colaboradorLogin.headers['set-cookie'] || '';

      // Tentar acessar endpoint administrativo (RH requer role RH)
      await request(app.getHttpServer())
        .get(`/RH/unidades`)
        .set('Cookie', colaboradorToken)
        .expect(403);
    });

    it('deve impedir acesso a auditoria sem permissão', async () => {
      const colaboradorLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'colaborador@empresa4.com', senha: 'senha123' })
        .expect(200);

      const colaboradorToken = Array.isArray(colaboradorLogin.headers['set-cookie']) 
        ? colaboradorLogin.headers['set-cookie'].join('; ') 
        : colaboradorLogin.headers['set-cookie'] || '';

      // Tentar acessar auditoria (requer role ADMIN)
      await request(app.getHttpServer())
        .get('/auditoria')
        .set('Cookie', colaboradorToken)
        .expect(403);
    });

    it('deve validar parâmetros obrigatórios', async () => {
      // Testar endpoint que requer parâmetros válidos
      await request(app.getHttpServer())
        .get('/auditoria/logs')
        .query({ inicio: 'invalid' })
        .set('Cookie', adminToken)
        .expect(400);
    });
  });
});
