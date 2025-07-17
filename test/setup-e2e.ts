import { PrismaService } from '../src/database/prismaService';

let prisma: PrismaService;

beforeAll(async () => {
  prisma = new PrismaService();
  await prisma.$connect();
});

afterAll(async () => {
  // Limpeza após todos os testes na ordem correta (respeitando constraints)
  await prisma.auditLog.deleteMany();
  await prisma.cardAvaliacaoLiderColaborador.deleteMany();
  await prisma.cardAutoAvaliacao.deleteMany();
  await prisma.avaliacaoLiderColaborador.deleteMany();
  await prisma.avaliacaoColaboradorMentor.deleteMany();
  await prisma.avaliacaoPares.deleteMany();
  await prisma.autoAvaliacao.deleteMany();
  await prisma.avaliacao.deleteMany();
  await prisma.equalizacao.deleteMany();
  await prisma.indicacaoReferencia.deleteMany();
  await prisma.colaboradorCiclo.deleteMany();
  await prisma.mentorColaborador.deleteMany();
  await prisma.liderColaborador.deleteMany();
  await prisma.pares.deleteMany();
  await prisma.gestorColaborador.deleteMany();
  await prisma.alocacaoColaboradorProjeto.deleteMany();
  await prisma.brutalFacts.deleteMany();
  await prisma.associacaoCriterioCiclo.deleteMany();
  await prisma.colaboradorPerfil.deleteMany();
  await prisma.projeto.deleteMany();
  await prisma.criterioAvaliativo.deleteMany();
  await prisma.cicloAvaliacao.deleteMany();
  await prisma.colaborador.deleteMany();
  await prisma.$disconnect();
});

// Timeout global para testes e2e
jest.setTimeout(30000);
