import { Test, TestingModule } from '@nestjs/testing';
import { EqualizacaoController } from './equalizacao.controller';

describe('EqualizacaoController', () => {
  let controller: EqualizacaoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EqualizacaoController],
    }).compile();

    controller = module.get<EqualizacaoController>(EqualizacaoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
