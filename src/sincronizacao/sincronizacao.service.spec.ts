import { Test, TestingModule } from '@nestjs/testing';
import { SincronizacaoService } from './sincronizacao.service';

describe('SincronizacaoService', () => {
  let service: SincronizacaoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SincronizacaoService],
    }).compile();

    service = module.get<SincronizacaoService>(SincronizacaoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
