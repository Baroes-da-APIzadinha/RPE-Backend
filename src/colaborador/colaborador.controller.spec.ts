import { Test, TestingModule } from '@nestjs/testing';
import { ColaboradorController } from './colaborador.controller';

describe('ColaboradorController', () => {
  let controller: ColaboradorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ColaboradorController],
    }).compile();

    controller = module.get<ColaboradorController>(ColaboradorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
