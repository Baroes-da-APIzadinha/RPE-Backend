import { Test, TestingModule } from '@nestjs/testing';
import { CicloService } from './ciclo.service';

describe('CicloService', () => {
  let service: CicloService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CicloService],
    }).compile();

    service = module.get<CicloService>(CicloService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
