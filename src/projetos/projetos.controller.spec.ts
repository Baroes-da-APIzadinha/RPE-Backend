import { Test, TestingModule } from '@nestjs/testing';
import { ProjetosController } from './projetos.controller';

describe('ProjetosController', () => {
  let controller: ProjetosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjetosController],
    }).compile();

    controller = module.get<ProjetosController>(ProjetosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
