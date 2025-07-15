import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prismaService';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

// Mock do bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let prismaService: PrismaService;
  let auditoriaService: AuditoriaService;

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

  // Mock do AuditoriaService
  const mockAuditoriaService = {
    log: jest.fn(),
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
        {
          provide: AuditoriaService,
          useValue: mockAuditoriaService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    prismaService = module.get<PrismaService>(PrismaService);
    auditoriaService = module.get<AuditoriaService>(AuditoriaService);
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

    it('deve ter AuditoriaService injetado', () => {
      expect(auditoriaService).toBeDefined();
    });
  });

  describe('login', () => {
    describe('Casos de sucesso', () => {
      it('deve fazer login com sucesso e retornar token JWT', async () => {
        // Arrange
        mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
        mockedBcrypt.compare.mockResolvedValue(true as never);
        mockJwtService.sign.mockReturnValue(mockToken);
        mockAuditoriaService.log.mockResolvedValue(undefined);

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
        expect(mockAuditoriaService.log).toHaveBeenCalledWith({
          userId: mockColaborador.idColaborador,
          action: 'login_success',
          resource: 'Auth',
          details: { email: mockColaborador.email },
          ip: undefined,
        });
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
        mockAuditoriaService.log.mockResolvedValue(undefined);

        // Act
        const resultado = await service.login(mockLoginDto);

        // Assert
        expect(resultado).toBe(mockToken);
        expect(mockJwtService.sign).toHaveBeenCalledWith(payloadSemPerfis);
        expect(mockAuditoriaService.log).toHaveBeenCalledWith({
          userId: mockColaborador.idColaborador,
          action: 'login_success',
          resource: 'Auth',
          details: { email: mockColaborador.email },
          ip: undefined,
        });
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
        mockAuditoriaService.log.mockResolvedValue(undefined);

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
        mockAuditoriaService.log.mockResolvedValue(undefined);

        // Act
        const resultado = await service.login(loginDtoUpperCase);

        // Assert
        expect(resultado).toBe(mockToken);
        expect(mockPrismaService.colaborador.findUnique).toHaveBeenCalledWith({
          where: { email: loginDtoUpperCase.email },
          include: { perfis: true },
        });
      });

      it('deve fazer login com sucesso e registrar IP na auditoria', async () => {
        // Arrange
        const ipTeste = '192.168.1.100';
        mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
        mockedBcrypt.compare.mockResolvedValue(true as never);
        mockJwtService.sign.mockReturnValue(mockToken);
        mockAuditoriaService.log.mockResolvedValue(undefined);

        // Act
        const resultado = await service.login(mockLoginDto, ipTeste);

        // Assert
        expect(resultado).toBe(mockToken);
        expect(mockAuditoriaService.log).toHaveBeenCalledWith({
          userId: mockColaborador.idColaborador,
          action: 'login_success',
          resource: 'Auth',
          details: { email: mockColaborador.email },
          ip: ipTeste,
        });
      });
    });

    describe('Casos de falha', () => {
      it('deve retornar null quando usuário não existe', async () => {
        // Arrange
        mockPrismaService.colaborador.findUnique.mockResolvedValue(null);
        mockAuditoriaService.log.mockResolvedValue(undefined);

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
        expect(mockAuditoriaService.log).toHaveBeenCalledWith({
          userId: undefined,
          action: 'login_failed',
          resource: 'Auth',
          details: { email: mockLoginDto.email },
          ip: undefined,
        });
      });

      it('deve retornar null quando senha está incorreta', async () => {
        // Arrange
        mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
        mockedBcrypt.compare.mockResolvedValue(false as never);
        mockAuditoriaService.log.mockResolvedValue(undefined);

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
        expect(mockAuditoriaService.log).toHaveBeenCalledWith({
          userId: mockColaborador.idColaborador,
          action: 'login_failed',
          resource: 'Auth',
          details: { email: mockLoginDto.email },
          ip: undefined,
        });
      });

      it('deve retornar null quando usuário existe mas senha está vazia/null no banco', async () => {
        // Arrange
        const colaboradorSemSenha = {
          ...mockColaborador,
          senha: null,
        };

        mockPrismaService.colaborador.findUnique.mockResolvedValue(colaboradorSemSenha);
        mockedBcrypt.compare.mockResolvedValue(false as never);
        mockAuditoriaService.log.mockResolvedValue(undefined);

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
        mockAuditoriaService.log.mockResolvedValue(undefined);

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
        mockAuditoriaService.log.mockResolvedValue(undefined);

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

    describe('Testes de auditoria', () => {
      it('deve registrar auditoria de sucesso com todos os campos', async () => {
        // Arrange
        const ipTeste = '203.0.113.1';
        mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
        mockedBcrypt.compare.mockResolvedValue(true as never);
        mockJwtService.sign.mockReturnValue(mockToken);
        mockAuditoriaService.log.mockResolvedValue(undefined);

        // Act
        await service.login(mockLoginDto, ipTeste);

        // Assert
        expect(mockAuditoriaService.log).toHaveBeenCalledTimes(1);
        expect(mockAuditoriaService.log).toHaveBeenCalledWith({
          userId: mockColaborador.idColaborador,
          action: 'login_success',
          resource: 'Auth',
          details: { email: mockColaborador.email },
          ip: ipTeste,
        });
      });

      it('deve registrar auditoria de falha com userId undefined quando usuário não existe', async () => {
        // Arrange
        const ipTeste = '198.51.100.1';
        mockPrismaService.colaborador.findUnique.mockResolvedValue(null);
        mockAuditoriaService.log.mockResolvedValue(undefined);

        // Act
        await service.login(mockLoginDto, ipTeste);

        // Assert
        expect(mockAuditoriaService.log).toHaveBeenCalledTimes(1);
        expect(mockAuditoriaService.log).toHaveBeenCalledWith({
          userId: undefined,
          action: 'login_failed',
          resource: 'Auth',
          details: { email: mockLoginDto.email },
          ip: ipTeste,
        });
      });

      it('deve registrar auditoria de falha com userId quando senha está incorreta', async () => {
        // Arrange
        const ipTeste = '192.0.2.1';
        mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
        mockedBcrypt.compare.mockResolvedValue(false as never);
        mockAuditoriaService.log.mockResolvedValue(undefined);

        // Act
        await service.login(mockLoginDto, ipTeste);

        // Assert
        expect(mockAuditoriaService.log).toHaveBeenCalledTimes(1);
        expect(mockAuditoriaService.log).toHaveBeenCalledWith({
          userId: mockColaborador.idColaborador,
          action: 'login_failed',
          resource: 'Auth',
          details: { email: mockLoginDto.email },
          ip: ipTeste,
        });
      });

      it('deve propagar erro quando auditoria de sucesso falha', async () => {
        // Arrange
        const auditoriaError = new Error('Falha na auditoria');
        mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
        mockedBcrypt.compare.mockResolvedValue(true as never);
        mockJwtService.sign.mockReturnValue(mockToken);
        mockAuditoriaService.log.mockRejectedValue(auditoriaError);

        // Act & Assert
        await expect(service.login(mockLoginDto)).rejects.toThrow(auditoriaError);
      });

      it('deve propagar erro quando auditoria de falha falha', async () => {
        // Arrange
        const auditoriaError = new Error('Falha na auditoria de login_failed');
        mockPrismaService.colaborador.findUnique.mockResolvedValue(null);
        mockAuditoriaService.log.mockRejectedValue(auditoriaError);

        // Act & Assert
        await expect(service.login(mockLoginDto)).rejects.toThrow(auditoriaError);
      });

      it('deve funcionar sem IP fornecido', async () => {
        // Arrange
        mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
        mockedBcrypt.compare.mockResolvedValue(true as never);
        mockJwtService.sign.mockReturnValue(mockToken);
        mockAuditoriaService.log.mockResolvedValue(undefined);

        // Act
        await service.login(mockLoginDto);

        // Assert
        expect(mockAuditoriaService.log).toHaveBeenCalledWith({
          userId: mockColaborador.idColaborador,
          action: 'login_success',
          resource: 'Auth',
          details: { email: mockColaborador.email },
          ip: undefined,
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
        const ipCompleto = '10.0.0.100';

        mockPrismaService.colaborador.findUnique.mockResolvedValue(colaboradorCompleto);
        mockedBcrypt.compare.mockResolvedValue(true as never);
        mockJwtService.sign.mockReturnValue(tokenCompleto);
        mockAuditoriaService.log.mockResolvedValue(undefined);

        // Act
        const resultado = await service.login(loginCompleto, ipCompleto);

        // Assert
        expect(resultado).toBe(tokenCompleto);
        
        // Verificar todas as chamadas na ordem correta
        expect(mockPrismaService.colaborador.findUnique).toHaveBeenCalledWith({
          where: { email: loginCompleto.email },
          include: { perfis: true },
        });
        expect(bcrypt.compare).toHaveBeenCalledWith(loginCompleto.senha, colaboradorCompleto.senha);
        expect(mockJwtService.sign).toHaveBeenCalledWith({
          sub: colaboradorCompleto.idColaborador,
          email: colaboradorCompleto.email,
          roles: ['ADMIN', 'USER'],
        });
        expect(mockAuditoriaService.log).toHaveBeenCalledWith({
          userId: colaboradorCompleto.idColaborador,
          action: 'login_success',
          resource: 'Auth',
          details: { email: colaboradorCompleto.email },
          ip: ipCompleto,
        });
      });

      it('deve simular fluxo completo de login falhado', async () => {
        // Arrange
        const loginFalho: LoginDto = {
          email: 'hacker@fake.com',
          senha: 'senhaErrada',
        };
        const ipSuspeito = '1.2.3.4';

        mockPrismaService.colaborador.findUnique.mockResolvedValue(null);
        mockAuditoriaService.log.mockResolvedValue(undefined);

        // Act
        const resultado = await service.login(loginFalho, ipSuspeito);

        // Assert
        expect(resultado).toBeNull();
        expect(mockPrismaService.colaborador.findUnique).toHaveBeenCalledWith({
          where: { email: loginFalho.email },
          include: { perfis: true },
        });
        expect(bcrypt.compare).not.toHaveBeenCalled();
        expect(mockJwtService.sign).not.toHaveBeenCalled();
        expect(mockAuditoriaService.log).toHaveBeenCalledWith({
          userId: undefined,
          action: 'login_failed',
          resource: 'Auth',
          details: { email: loginFalho.email },
          ip: ipSuspeito,
        });
      });
    });
  });
});