import { Test, TestingModule } from '@nestjs/testing';
import { AssociacaoCriterioCicloController } from './criterioCiclo.controller';

describe('ColaboradorController', () => {
  let controller: AssociacaoCriterioCicloController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssociacaoCriterioCicloController],
    }).compile();

    controller = module.get<AssociacaoCriterioCicloController>(AssociacaoCriterioCicloController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
