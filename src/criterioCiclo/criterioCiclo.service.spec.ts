import { Test, TestingModule } from '@nestjs/testing';
import { AssociacaoCriterioCicloService } from './criterioCiclo.service';
import { PrismaService } from 'src/database/prismaService';

describe('ColaboradorService', () => {
  let service: AssociacaoCriterioCicloService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AssociacaoCriterioCicloService, PrismaService],
    }).compile();

    service = module.get<AssociacaoCriterioCicloService>(AssociacaoCriterioCicloService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
