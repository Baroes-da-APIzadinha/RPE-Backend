import { Test, TestingModule } from '@nestjs/testing';
import { ColaboradorService } from './colaborador.service';
import { PrismaService } from 'src/database/prismaService';

describe('ColaboradorService', () => {
  let service: ColaboradorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ColaboradorService, PrismaService],
    }).compile();

    service = module.get<ColaboradorService>(ColaboradorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
