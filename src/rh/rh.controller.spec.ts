import { Test, TestingModule } from '@nestjs/testing';
import { RhController } from './rh.controller';

describe('RhController', () => {
  let controller: RhController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RhController],
    }).compile();

    controller = module.get<RhController>(RhController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
