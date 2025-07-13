import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prismaService';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

// Mock do bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let prismaService: PrismaService;

  // Mock do PrismaService
  const mockPrismaService = {
    colaborador: {
      findUnique: jest.fn(),
    },
  };

  // Mock do JwtService
  const mockJwtService = {
    sign: jest.fn(),
  };

  // Dados de teste
  const mockLoginDto: LoginDto = {
    email: 'test@empresa.com',
    senha: '123456',
  };

  const mockColaborador = {
    idColaborador: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@empresa.com',
    senha: '$2b$10$hashedPassword', // Hash bcrypt simulado
    nomeCompleto: 'João Silva',
    perfis: [
      {
        idPerfil: 'perfil1',
        tipoPerfil: 'USER',
      },
      {
        idPerfil: 'perfil2',
        tipoPerfil: 'ADMIN',
      },
    ],
  };

  const mockColaboradorSemPerfis = {
    ...mockColaborador,
    perfis: [],
  };

  const mockPayload = {
    sub: mockColaborador.idColaborador,
    email: mockColaborador.email,
    roles: ['USER', 'ADMIN'],
  };

  const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjNlNDU2Ny1lODliLTEyZDMtYTQ1Ni00MjY2MTQxNzQwMDAiLCJlbWFpbCI6InRlc3RAZW1wcmVzYS5jb20iLCJyb2xlcyI6WyJVU0VSIiwiQURNSU4iXX0';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Definição do service', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('deve ter JwtService injetado', () => {
      expect(jwtService).toBeDefined();
    });

    it('deve ter PrismaService injetado', () => {
      expect(prismaService).toBeDefined();
    });
  });

  describe('login', () => {
    describe('Casos de sucesso', () => {
      it('deve fazer login com sucesso e retornar token JWT', async () => {
        // Arrange
        mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
        mockedBcrypt.compare.mockResolvedValue(true as never);
        mockJwtService.sign.mockReturnValue(mockToken);

        // Act
        const resultado = await service.login(mockLoginDto);

        // Assert
        expect(resultado).toBe(mockToken);
        expect(mockPrismaService.colaborador.findUnique).toHaveBeenCalledWith({
          where: { email: mockLoginDto.email },
          include: { perfis: true },
        });
        expect(bcrypt.compare).toHaveBeenCalledWith(mockLoginDto.senha, mockColaborador.senha);
        expect(mockJwtService.sign).toHaveBeenCalledWith(mockPayload);
      });

      it('deve fazer login com usuário sem perfis', async () => {
        // Arrange
        const payloadSemPerfis = {
          sub: mockColaborador.idColaborador,
          email: mockColaborador.email,
          roles: [],
        };

        mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaboradorSemPerfis);
        mockedBcrypt.compare.mockResolvedValue(true as never);
        mockJwtService.sign.mockReturnValue(mockToken);

        // Act
        const resultado = await service.login(mockLoginDto);

        // Assert
        expect(resultado).toBe(mockToken);
        expect(mockJwtService.sign).toHaveBeenCalledWith(payloadSemPerfis);
      });

      it('deve mapear múltiplos perfis corretamente', async () => {
        // Arrange
        const colaboradorMultiplosPerfis = {
          ...mockColaborador,
          perfis: [
            { idPerfil: 'p1', tipoPerfil: 'USER' },
            { idPerfil: 'p2', tipoPerfil: 'ADMIN' },
            { idPerfil: 'p3', tipoPerfil: 'MANAGER' },
            { idPerfil: 'p4', tipoPerfil: 'COMITE' },
          ],
        };

        const payloadMultiplos = {
          sub: mockColaborador.idColaborador,
          email: mockColaborador.email,
          roles: ['USER', 'ADMIN', 'MANAGER', 'COMITE'],
        };

        mockPrismaService.colaborador.findUnique.mockResolvedValue(colaboradorMultiplosPerfis);
        mockedBcrypt.compare.mockResolvedValue(true as never);
        mockJwtService.sign.mockReturnValue(mockToken);

        // Act
        const resultado = await service.login(mockLoginDto);

        // Assert
        expect(resultado).toBe(mockToken);
        expect(mockJwtService.sign).toHaveBeenCalledWith(payloadMultiplos);
      });

      it('deve fazer login com email em maiúsculas/minúsculas', async () => {
        // Arrange
        const loginDtoUpperCase: LoginDto = {
          email: 'TEST@EMPRESA.COM',
          senha: '123456',
        };

        mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
        mockedBcrypt.compare.mockResolvedValue(true as never);
        mockJwtService.sign.mockReturnValue(mockToken);

        // Act
        const resultado = await service.login(loginDtoUpperCase);

        // Assert
        expect(resultado).toBe(mockToken);
        expect(mockPrismaService.colaborador.findUnique).toHaveBeenCalledWith({
          where: { email: loginDtoUpperCase.email },
          include: { perfis: true },
        });
      });
    });

    describe('Casos de falha', () => {
      it('deve retornar null quando usuário não existe', async () => {
        // Arrange
        mockPrismaService.colaborador.findUnique.mockResolvedValue(null);

        // Act
        const resultado = await service.login(mockLoginDto);

        // Assert
        expect(resultado).toBeNull();
        expect(mockPrismaService.colaborador.findUnique).toHaveBeenCalledWith({
          where: { email: mockLoginDto.email },
          include: { perfis: true },
        });
        expect(bcrypt.compare).not.toHaveBeenCalled();
        expect(mockJwtService.sign).not.toHaveBeenCalled();
      });

      it('deve retornar null quando senha está incorreta', async () => {
        // Arrange
        mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
        mockedBcrypt.compare.mockResolvedValue(false as never);

        // Act
        const resultado = await service.login(mockLoginDto);

        // Assert
        expect(resultado).toBeNull();
        expect(mockPrismaService.colaborador.findUnique).toHaveBeenCalledWith({
          where: { email: mockLoginDto.email },
          include: { perfis: true },
        });
        expect(bcrypt.compare).toHaveBeenCalledWith(mockLoginDto.senha, mockColaborador.senha);
        expect(mockJwtService.sign).not.toHaveBeenCalled();
      });

      it('deve retornar null quando usuário existe mas senha está vazia/null no banco', async () => {
        // Arrange
        const colaboradorSemSenha = {
          ...mockColaborador,
          senha: null,
        };

        mockPrismaService.colaborador.findUnique.mockResolvedValue(colaboradorSemSenha);
        mockedBcrypt.compare.mockResolvedValue(false as never);

        // Act
        const resultado = await service.login(mockLoginDto);

        // Assert
        expect(resultado).toBeNull();
        expect(bcrypt.compare).toHaveBeenCalledWith(mockLoginDto.senha, null);
      });

      it('deve retornar null quando email está vazio', async () => {
        // Arrange
        const loginDtoEmailVazio: LoginDto = {
          email: '',
          senha: '123456',
        };

        mockPrismaService.colaborador.findUnique.mockResolvedValue(null);

        // Act
        const resultado = await service.login(loginDtoEmailVazio);

        // Assert
        expect(resultado).toBeNull();
        expect(mockPrismaService.colaborador.findUnique).toHaveBeenCalledWith({
          where: { email: '' },
          include: { perfis: true },
        });
      });

      it('deve retornar null quando senha está vazia', async () => {
        // Arrange
        const loginDtoSenhaVazia: LoginDto = {
          email: 'test@empresa.com',
          senha: '',
        };

        mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
        mockedBcrypt.compare.mockResolvedValue(false as never);

        // Act
        const resultado = await service.login(loginDtoSenhaVazia);

        // Assert
        expect(resultado).toBeNull();
        expect(bcrypt.compare).toHaveBeenCalledWith('', mockColaborador.senha);
      });
    });

    describe('Casos de erro', () => {
      it('deve propagar erro quando Prisma falha', async () => {
        // Arrange
        const prismaError = new Error('Database connection failed');
        mockPrismaService.colaborador.findUnique.mockRejectedValue(prismaError);

        // Act & Assert
        await expect(service.login(mockLoginDto)).rejects.toThrow(prismaError);
        expect(bcrypt.compare).not.toHaveBeenCalled();
        expect(mockJwtService.sign).not.toHaveBeenCalled();
      });

      it('deve propagar erro quando bcrypt falha', async () => {
        // Arrange
        const bcryptError = new Error('Bcrypt comparison failed');
        mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
        (mockedBcrypt.compare as jest.Mock).mockRejectedValue(bcryptError);

        // Act & Assert
        await expect(service.login(mockLoginDto)).rejects.toThrow(bcryptError);
        expect(mockJwtService.sign).not.toHaveBeenCalled();
      });

      it('deve propagar erro quando JWT service falha', async () => {
        // Arrange
        const jwtError = new Error('JWT signing failed');
        mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
        mockedBcrypt.compare.mockResolvedValue(true as never);
        mockJwtService.sign.mockImplementation(() => {
          throw jwtError;
        });

        // Act & Assert
        await expect(service.login(mockLoginDto)).rejects.toThrow(jwtError);
      });

      it('deve lidar com usuário malformado do banco', async () => {
        // Arrange
        const usuarioMalformado = {
          idColaborador: mockColaborador.idColaborador,
          email: mockColaborador.email,
          senha: mockColaborador.senha,
          perfis: null, // perfis null em vez de array
        };

        mockPrismaService.colaborador.findUnique.mockResolvedValue(usuarioMalformado);
        mockedBcrypt.compare.mockResolvedValue(true as never);

        // Act & Assert
        await expect(service.login(mockLoginDto)).rejects.toThrow();
      });
    });

    describe('Casos de validação de dados', () => {
      it('deve lidar com email com espaços em branco', async () => {
        // Arrange
        const loginDtoComEspacos: LoginDto = {
          email: '  test@empresa.com  ',
          senha: '123456',
        };

        mockPrismaService.colaborador.findUnique.mockResolvedValue(null);

        // Act
        const resultado = await service.login(loginDtoComEspacos);

        // Assert
        expect(resultado).toBeNull();
        expect(mockPrismaService.colaborador.findUnique).toHaveBeenCalledWith({
          where: { email: '  test@empresa.com  ' },
          include: { perfis: true },
        });
      });

      it('deve lidar com senha com caracteres especiais', async () => {
        // Arrange
        const loginDtoSenhaEspecial: LoginDto = {
          email: 'test@empresa.com',
          senha: 'P@ssw0rd!@#$%^&*()',
        };

        mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
        mockedBcrypt.compare.mockResolvedValue(true as never);
        mockJwtService.sign.mockReturnValue(mockToken);

        // Act
        const resultado = await service.login(loginDtoSenhaEspecial);

        // Assert
        expect(resultado).toBe(mockToken);
        expect(bcrypt.compare).toHaveBeenCalledWith(
          'P@ssw0rd!@#$%^&*()',
          mockColaborador.senha
        );
      });

      it('deve lidar com email muito longo', async () => {
        // Arrange
        const emailLongo = 'a'.repeat(100) + '@empresa.com';
        const loginDtoEmailLongo: LoginDto = {
          email: emailLongo,
          senha: '123456',
        };

        mockPrismaService.colaborador.findUnique.mockResolvedValue(null);

        // Act
        const resultado = await service.login(loginDtoEmailLongo);

        // Assert
        expect(resultado).toBeNull();
        expect(mockPrismaService.colaborador.findUnique).toHaveBeenCalledWith({
          where: { email: emailLongo },
          include: { perfis: true },
        });
      });

      it('deve lidar com senha muito longa', async () => {
        // Arrange
        const senhaLonga = 'a'.repeat(1000);
        const loginDtoSenhaLonga: LoginDto = {
          email: 'test@empresa.com',
          senha: senhaLonga,
        };

        mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
        mockedBcrypt.compare.mockResolvedValue(false as never);

        // Act
        const resultado = await service.login(loginDtoSenhaLonga);

        // Assert
        expect(resultado).toBeNull();
        expect(bcrypt.compare).toHaveBeenCalledWith(senhaLonga, mockColaborador.senha);
      });
    });

    describe('Testes de payload JWT', () => {
      it('deve gerar payload correto com campos obrigatórios', async () => {
        // Arrange
        mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
        mockedBcrypt.compare.mockResolvedValue(true as never);
        mockJwtService.sign.mockReturnValue(mockToken);

        // Act
        await service.login(mockLoginDto);

        // Assert
        expect(mockJwtService.sign).toHaveBeenCalledWith({
          sub: mockColaborador.idColaborador,
          email: mockColaborador.email,
          roles: expect.any(Array),
        });

        const payloadChamado = mockJwtService.sign.mock.calls[0][0];
        expect(payloadChamado).toHaveProperty('sub');
        expect(payloadChamado).toHaveProperty('email');
        expect(payloadChamado).toHaveProperty('roles');
        expect(Array.isArray(payloadChamado.roles)).toBe(true);
      });

      it('deve mapear perfis para roles corretamente', async () => {
        // Arrange
        const colaboradorComPerfisEspecificos = {
          ...mockColaborador,
          perfis: [
            { idPerfil: 'p1', tipoPerfil: 'COLABORADOR' },
            { idPerfil: 'p2', tipoPerfil: 'GESTOR' },
            { idPerfil: 'p3', tipoPerfil: 'RH' },
          ],
        };

        mockPrismaService.colaborador.findUnique.mockResolvedValue(colaboradorComPerfisEspecificos);
        mockedBcrypt.compare.mockResolvedValue(true as never);
        mockJwtService.sign.mockReturnValue(mockToken);

        // Act
        await service.login(mockLoginDto);

        // Assert
        expect(mockJwtService.sign).toHaveBeenCalledWith({
          sub: mockColaborador.idColaborador,
          email: mockColaborador.email,
          roles: ['COLABORADOR', 'GESTOR', 'RH'],
        });
      });

      it('deve lidar com perfis duplicados', async () => {
        // Arrange
        const colaboradorComPerfisDuplicados = {
          ...mockColaborador,
          perfis: [
            { idPerfil: 'p1', tipoPerfil: 'USER' },
            { idPerfil: 'p2', tipoPerfil: 'USER' }, // Duplicado
            { idPerfil: 'p3', tipoPerfil: 'ADMIN' },
          ],
        };

        mockPrismaService.colaborador.findUnique.mockResolvedValue(colaboradorComPerfisDuplicados);
        mockedBcrypt.compare.mockResolvedValue(true as never);
        mockJwtService.sign.mockReturnValue(mockToken);

        // Act
        await service.login(mockLoginDto);

        // Assert
        expect(mockJwtService.sign).toHaveBeenCalledWith({
          sub: mockColaborador.idColaborador,
          email: mockColaborador.email,
          roles: ['USER', 'USER', 'ADMIN'], // Mantém duplicados (responsabilidade do frontend filtrar se necessário)
        });
      });
    });

    describe('Testes de integração simulada', () => {
      it('deve simular fluxo completo de login bem-sucedido', async () => {
        // Arrange
        const loginCompleto: LoginDto = {
          email: 'admin@empresa.com',
          senha: 'senhaSegura123',
        };

        const colaboradorCompleto = {
          idColaborador: 'admin-uuid-123',
          email: 'admin@empresa.com',
          senha: '$2b$10$hashedPasswordCompleto',
          nomeCompleto: 'Administrador Sistema',
          perfis: [
            { idPerfil: 'perfil-admin', tipoPerfil: 'ADMIN' },
            { idPerfil: 'perfil-user', tipoPerfil: 'USER' },
          ],
        };

        const tokenCompleto = 'jwt.token.completo.gerado';

        mockPrismaService.colaborador.findUnique.mockResolvedValue(colaboradorCompleto);
        mockedBcrypt.compare.mockResolvedValue(true as never);
        mockJwtService.sign.mockReturnValue(tokenCompleto);

        // Act
        const resultado = await service.login(loginCompleto);

        // Assert
        expect(resultado).toBe(tokenCompleto);

        // Verificar sequência completa de chamadas
        expect(mockPrismaService.colaborador.findUnique).toHaveBeenCalledTimes(1);
        expect(bcrypt.compare).toHaveBeenCalledTimes(1);
        expect(mockJwtService.sign).toHaveBeenCalledTimes(1);

        // Verificar dados passados entre as etapas
        expect(mockPrismaService.colaborador.findUnique).toHaveBeenCalledWith({
          where: { email: loginCompleto.email },
          include: { perfis: true },
        });

        expect(bcrypt.compare).toHaveBeenCalledWith(
          loginCompleto.senha,
          colaboradorCompleto.senha
        );

        expect(mockJwtService.sign).toHaveBeenCalledWith({
          sub: colaboradorCompleto.idColaborador,
          email: colaboradorCompleto.email,
          roles: ['ADMIN', 'USER'],
        });
      });

      it('deve simular tentativa de login com credenciais inválidas', async () => {
        // Arrange
        const loginInvalido: LoginDto = {
          email: 'usuario@empresa.com',
          senha: 'senhaErrada',
        };

        const colaboradorExistente = {
          idColaborador: 'user-uuid-456',
          email: 'usuario@empresa.com',
          senha: '$2b$10$hashDaSenhaCorreta',
          perfis: [{ idPerfil: 'perfil-user', tipoPerfil: 'USER' }],
        };

        mockPrismaService.colaborador.findUnique.mockResolvedValue(colaboradorExistente);
        mockedBcrypt.compare.mockResolvedValue(false as never);

        // Act
        const resultado = await service.login(loginInvalido);

        // Assert
        expect(resultado).toBeNull();

        // Verificar que processo parou na verificação da senha
        expect(mockPrismaService.colaborador.findUnique).toHaveBeenCalledTimes(1);
        expect(bcrypt.compare).toHaveBeenCalledTimes(1);
        expect(mockJwtService.sign).not.toHaveBeenCalled();
      });
    });
  });

  describe('Verificações de tipos', () => {
    it('deve retornar string quando login é bem-sucedido', async () => {
      // Arrange
      mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockJwtService.sign.mockReturnValue(mockToken);

      // Act
      const resultado = await service.login(mockLoginDto);

      // Assert
      expect(typeof resultado).toBe('string');
      expect(resultado).toBeTruthy();
    });

    it('deve retornar null quando login falha', async () => {
      // Arrange
      mockPrismaService.colaborador.findUnique.mockResolvedValue(null);

      // Act
      const resultado = await service.login(mockLoginDto);

      // Assert
      expect(resultado).toBeNull();
      expect(typeof resultado).toBe('object'); // null é tipo object em JavaScript
    });

    it('deve trabalhar com Promise<string | null>', async () => {
      // Arrange
      mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockJwtService.sign.mockReturnValue(mockToken);

      // Act
      const promiseResultado = service.login(mockLoginDto);

      // Assert
      expect(promiseResultado).toBeInstanceOf(Promise);
      const resultado = await promiseResultado;
      expect(resultado).toBe(mockToken);
    });
  });
});