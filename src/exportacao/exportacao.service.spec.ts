import { Test, TestingModule } from '@nestjs/testing';
import { ExportacaoService } from './exportacao.service';

describe('ExportacaoService', () => {
  let service: ExportacaoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExportacaoService],
    }).compile();

    service = module.get<ExportacaoService>(ExportacaoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
