import { Test, TestingModule } from '@nestjs/testing';
import { ExportacaoController } from './exportacao.controller';

describe('ExportacaoController', () => {
  let controller: ExportacaoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExportacaoController],
    }).compile();

    controller = module.get<ExportacaoController>(ExportacaoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
