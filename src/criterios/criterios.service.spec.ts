import { Test, TestingModule } from '@nestjs/testing';
import { CriteriosService } from './criterios.service';

describe('CriteriosService', () => {
  let service: CriteriosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CriteriosService],
    }).compile();

    service = module.get<CriteriosService>(CriteriosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});