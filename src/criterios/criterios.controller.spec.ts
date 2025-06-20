import { Test, TestingModule } from '@nestjs/testing';
import { CriteriosController } from './criterios.controller';

describe('CriteriosController', () => {
  let controller: CriteriosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CriteriosController],
    }).compile();

    controller = module.get<CriteriosController>(CriteriosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
