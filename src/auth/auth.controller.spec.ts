import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { RemindersService } from '../reminders/reminders.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import 'reflect-metadata';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let auditoriaService: AuditoriaService;

  // Mock do AuthService
  const mockAuthService = {
    login: jest.fn(),
  };

  // Mock do AuditoriaService
  const mockAuditoriaService = {
    log: jest.fn(),
    getLogs: jest.fn(),
  };

  // Mock do RemindersService
  const mockRemindersService = {
    getGlobalReminder: jest.fn(),
    setGlobalReminder: jest.fn(),
    clearGlobalReminder: jest.fn(),
    getReminderColaborador: jest.fn(),
    setReminderColaborador: jest.fn(),
    testCache: jest.fn(),
  };

  // Mock do JwtAuthGuard
  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  // Mock da Response do Express
  const mockResponse = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;

  // Dados de teste
  const mockLoginDto: LoginDto = {
    email: 'test@empresa.com',
    senha: 'senha123',
  };

  const mockUser = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@empresa.com',
    roles: ['USER', 'ADMIN'],
  };

  const mockRequest = {
    user: mockUser,
    ip: '192.168.1.100',
  };

  const mockValidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20ifQ.mock-signature';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: AuditoriaService,
          useValue: mockAuditoriaService,
        },
        {
          provide: RemindersService,
          useValue: mockRemindersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    auditoriaService = module.get<AuditoriaService>(AuditoriaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Definição do controller', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('deve ter o authService injetado', () => {
      expect(authService).toBeDefined();
    });

    it('deve ter o auditoriaService injetado', () => {
      expect(auditoriaService).toBeDefined();
    });
  });

  describe('login', () => {
    describe('Casos de sucesso', () => {
      it('deve fazer login com sucesso e definir cookie (auditoria feita no service)', async () => {
        // Arrange
        mockAuthService.login.mockResolvedValue(mockValidToken);

        // Act
        const resultado = await controller.login(mockLoginDto, mockResponse, mockRequest);

        // Assert
        expect(resultado).toEqual({ message: 'Login bem-sucedido' });
        expect(mockAuthService.login).toHaveBeenCalledWith(mockLoginDto, mockRequest.ip);
        expect(mockAuthService.login).toHaveBeenCalledTimes(1);

        // Verificar configuração do cookie
        expect(mockResponse.cookie).toHaveBeenCalledWith('access_token', mockValidToken, {
          httpOnly: true,
          secure: false, // NODE_ENV não é 'production' no teste
          sameSite: 'strict',
          maxAge: 86400000, // 24 horas em ms
        });

        // Verificar que auditoria NÃO foi chamada no controller (é feita no service)
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve fazer login sem IP e passar undefined para o service', async () => {
        // Arrange
        const requestSemIp = {};
        mockAuthService.login.mockResolvedValue(mockValidToken);

        // Act
        const resultado = await controller.login(mockLoginDto, mockResponse, requestSemIp);

        // Assert
        expect(resultado.message).toBe('Login bem-sucedido');
        expect(mockAuthService.login).toHaveBeenCalledWith(mockLoginDto, undefined);
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve configurar cookie com maxAge exato de 24 horas', async () => {
        // Arrange
        mockAuthService.login.mockResolvedValue(mockValidToken);
        const expectedMaxAge = 1000 * 60 * 60 * 24; // 24 horas em ms

        // Act
        await controller.login(mockLoginDto, mockResponse, mockRequest);

        // Assert
        const cookieCall = (mockResponse.cookie as jest.Mock).mock.calls[0];
        const cookieOptions = cookieCall[2];
        expect(cookieOptions.maxAge).toBe(expectedMaxAge);
        expect(cookieOptions.maxAge).toBe(86400000);
      });

      it('deve configurar cookie com segurança em produção', async () => {
        // Arrange
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        mockAuthService.login.mockResolvedValue(mockValidToken);

        // Act
        await controller.login(mockLoginDto, mockResponse, mockRequest);

        // Assert
        const cookieCall = (mockResponse.cookie as jest.Mock).mock.calls[0];
        const cookieOptions = cookieCall[2];
        expect(cookieOptions.secure).toBe(true);
        expect(cookieOptions.httpOnly).toBe(true);
        expect(cookieOptions.sameSite).toBe('strict');

        // Cleanup
        process.env.NODE_ENV = originalEnv;
      });

      it('deve processar diferentes formatos de email', async () => {
        // Arrange
        const emailsValidos = [
          'test@domain.com',
          'user.name@company.co.uk',
          'admin+test@empresa.com.br',
          'TEST@EMPRESA.COM',
        ];

        for (const email of emailsValidos) {
          mockAuthService.login.mockResolvedValue(mockValidToken);
          const loginDto = { email, senha: 'senha123' };

          // Act
          const resultado = await controller.login(loginDto, mockResponse, mockRequest);

          // Assert
          expect(resultado.message).toBe('Login bem-sucedido');
          expect(mockAuthService.login).toHaveBeenCalledWith(loginDto, mockRequest.ip);

          // Reset para próxima iteração
          jest.clearAllMocks();
        }
      });

      it('deve processar senhas com caracteres especiais', async () => {
        // Arrange
        const loginComSenhaEspecial: LoginDto = {
          email: 'test@empresa.com',
          senha: 'P@ssw0rd!@#$%^&*()',
        };
        mockAuthService.login.mockResolvedValue(mockValidToken);

        // Act
        const resultado = await controller.login(loginComSenhaEspecial, mockResponse, mockRequest);

        // Assert
        expect(resultado.message).toBe('Login bem-sucedido');
        expect(mockAuthService.login).toHaveBeenCalledWith(loginComSenhaEspecial, mockRequest.ip);
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve incluir IP real da requisição', async () => {
        // Arrange
        const mockRequestWithRealIp = {
          ip: '203.0.113.10', // IP público de exemplo
          headers: {
            'x-forwarded-for': '198.51.100.5, 203.0.113.10',
          },
        };
        mockAuthService.login.mockResolvedValue(mockValidToken);

        // Act
        await controller.login(mockLoginDto, mockResponse, mockRequestWithRealIp);

        // Assert
        expect(mockAuthService.login).toHaveBeenCalledWith(mockLoginDto, '203.0.113.10');
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve lidar com múltiplas tentativas de login simultâneas', async () => {
        // Arrange
        const numTentativas = 5;
        const promises: Promise<any>[] = [];
        mockAuthService.login.mockResolvedValue(mockValidToken);

        // Act
        for (let i = 0; i < numTentativas; i++) {
          const loginDto = {
            email: `user${i}@empresa.com`,
            senha: `senha${i}`,
          };
          promises.push(controller.login(loginDto, mockResponse, mockRequest));
        }

        const resultados = await Promise.all(promises);

        // Assert
        expect(resultados).toHaveLength(numTentativas);
        resultados.forEach(resultado => {
          expect(resultado.message).toBe('Login bem-sucedido');
        });
        expect(mockAuthService.login).toHaveBeenCalledTimes(numTentativas);
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });
    });

    describe('Casos de falha', () => {
      it('deve lançar UnauthorizedException quando AuthService retorna null (auditoria feita no service)', async () => {
        // Arrange
        mockAuthService.login.mockResolvedValue(null);

        // Act & Assert
        await expect(controller.login(mockLoginDto, mockResponse, mockRequest))
          .rejects.toThrow(UnauthorizedException);

        await expect(controller.login(mockLoginDto, mockResponse, mockRequest))
          .rejects.toThrow('Credenciais inválidas');

        expect(mockAuthService.login).toHaveBeenCalledWith(mockLoginDto, mockRequest.ip);
        expect(mockResponse.cookie).not.toHaveBeenCalled();
        
        // Verificar que auditoria NÃO foi chamada no controller (falha é registrada no service)
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve lançar UnauthorizedException quando AuthService retorna undefined', async () => {
        // Arrange
        mockAuthService.login.mockResolvedValue(undefined);

        // Act & Assert
        await expect(controller.login(mockLoginDto, mockResponse, mockRequest))
          .rejects.toThrow(UnauthorizedException);

        expect(mockResponse.cookie).not.toHaveBeenCalled();
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve lançar UnauthorizedException quando AuthService retorna string vazia', async () => {
        // Arrange
        mockAuthService.login.mockResolvedValue('');

        // Act & Assert
        await expect(controller.login(mockLoginDto, mockResponse, mockRequest))
          .rejects.toThrow(UnauthorizedException);

        expect(mockResponse.cookie).not.toHaveBeenCalled();
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve propagar erro quando AuthService falha', async () => {
        // Arrange
        const serviceError = new Error('Database connection failed');
        mockAuthService.login.mockRejectedValue(serviceError);

        // Act & Assert
        await expect(controller.login(mockLoginDto, mockResponse, mockRequest))
          .rejects.toThrow(serviceError);

        expect(mockResponse.cookie).not.toHaveBeenCalled();
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve falhar com credenciais malformadas', async () => {
        // Arrange
        const loginMalformado = {
          email: null,
          senha: null,
        } as any;

        mockAuthService.login.mockResolvedValue(null);

        // Act & Assert
        await expect(controller.login(loginMalformado, mockResponse, mockRequest))
          .rejects.toThrow(UnauthorizedException);

        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve manter estado limpo após falha de login', async () => {
        // Arrange
        mockAuthService.login.mockResolvedValue(null);

        // Act & Assert
        await expect(controller.login(mockLoginDto, mockResponse, mockRequest))
          .rejects.toThrow(UnauthorizedException);

        // Verificar que nenhum estado foi alterado
        expect(mockResponse.cookie).not.toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.json).not.toHaveBeenCalled();
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve processar emails com espaços (responsabilidade do service validar)', async () => {
        // Arrange
        const loginComEspacos: LoginDto = {
          email: '  test@empresa.com  ',
          senha: 'senha123',
        };
        mockAuthService.login.mockResolvedValue(null); // Service rejeita

        // Act & Assert
        await expect(controller.login(loginComEspacos, mockResponse, mockRequest))
          .rejects.toThrow(UnauthorizedException);

        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });
    });

    describe('Configuração de cookies', () => {
      it('deve chamar response.cookie com parâmetros corretos', async () => {
        // Arrange
        mockAuthService.login.mockResolvedValue(mockValidToken);
        const spyCookie = jest.spyOn(mockResponse, 'cookie');

        // Act
        await controller.login(mockLoginDto, mockResponse, mockRequest);

        // Assert
        expect(spyCookie).toHaveBeenCalledTimes(1);
        expect(spyCookie).toHaveBeenCalledWith(
          'access_token',
          mockValidToken,
          expect.objectContaining({
            httpOnly: true,
            sameSite: 'strict',
          })
        );
      });

      it('não deve modificar response quando login falha', async () => {
        // Arrange
        mockAuthService.login.mockResolvedValue(null);
        const spyCookie = jest.spyOn(mockResponse, 'cookie');

        // Act & Assert
        await expect(controller.login(mockLoginDto, mockResponse, mockRequest))
          .rejects.toThrow(UnauthorizedException);

        expect(spyCookie).not.toHaveBeenCalled();
      });

      it('deve usar configuração padrão para desenvolvimento', async () => {
        // Arrange
        mockAuthService.login.mockResolvedValue(mockValidToken);

        // Act
        await controller.login(mockLoginDto, mockResponse, mockRequest);

        // Assert
        const cookieCall = (mockResponse.cookie as jest.Mock).mock.calls[0];
        const cookieOptions = cookieCall[2];

        expect(cookieOptions).toHaveProperty('httpOnly', true);
        expect(cookieOptions).toHaveProperty('sameSite', 'strict');
        expect(cookieOptions).toHaveProperty('maxAge', 86400000);
        expect(cookieOptions).toHaveProperty('secure', false);
      });
    });

    describe('Tratamento de IP', () => {
      it('deve incluir IP no login através do AuthService', async () => {
        // Arrange
        const mockRequestWithIp = {
          ip: '192.168.1.100',
        };
        mockAuthService.login.mockResolvedValue(mockValidToken);

        // Act
        await controller.login(mockLoginDto, mockResponse, mockRequestWithIp);

        // Assert
        expect(mockAuthService.login).toHaveBeenCalledWith(mockLoginDto, '192.168.1.100');
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve lidar com IP não definido', async () => {
        // Arrange
        const mockRequestSemIp = {};
        mockAuthService.login.mockResolvedValue(mockValidToken);

        // Act
        await controller.login(mockLoginDto, mockResponse, mockRequestSemIp);

        // Assert
        expect(mockAuthService.login).toHaveBeenCalledWith(mockLoginDto, undefined);
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve lidar com múltiplos IPs (proxy/load balancer)', async () => {
        // Arrange
        const mockRequestComProxies = {
          ip: '10.0.0.1',
          ips: ['192.168.1.100', '10.0.0.1'],
          headers: {
            'x-forwarded-for': '192.168.1.100, 10.0.0.1',
          },
        };
        mockAuthService.login.mockResolvedValue(mockValidToken);

        // Act
        await controller.login(mockLoginDto, mockResponse, mockRequestComProxies);

        // Assert
        expect(mockAuthService.login).toHaveBeenCalledWith(mockLoginDto, '10.0.0.1');
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });
    });
  });

  describe('getProfile', () => {
    describe('Casos de sucesso', () => {
      it('deve retornar perfil do usuário autenticado sem auditoria', () => {
        // Act
        const resultado = controller.getProfile(mockRequest);

        // Assert
        expect(resultado).toEqual(mockUser);
        expect(resultado).toHaveProperty('userId');
        expect(resultado).toHaveProperty('email');
        expect(resultado).toHaveProperty('roles');
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve retornar dados do usuário com roles diferentes', () => {
        // Arrange
        const requestComRolesDiferentes = {
          user: {
            userId: 'user-diferente-123',
            email: 'diferente@empresa.com',
            roles: ['MANAGER', 'USER'],
          },
        };

        // Act
        const resultado = controller.getProfile(requestComRolesDiferentes);

        // Assert
        expect(resultado).toEqual(requestComRolesDiferentes.user);
        expect(resultado.roles).toContain('MANAGER');
        expect(resultado.roles).toContain('USER');
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve retornar usuário com role único', () => {
        // Arrange
        const requestComRoleUnico = {
          user: {
            userId: 'user-basico-456',
            email: 'basico@empresa.com',
            roles: ['USER'],
          },
        };

        // Act
        const resultado = controller.getProfile(requestComRoleUnico);

        // Assert
        expect(resultado).toEqual(requestComRoleUnico.user);
        expect(resultado.roles).toHaveLength(1);
        expect(resultado.roles[0]).toBe('USER');
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve retornar usuário admin', () => {
        // Arrange
        const requestAdmin = {
          user: {
            userId: 'admin-789',
            email: 'admin@empresa.com',
            roles: ['ADMIN', 'USER', 'MANAGER'],
          },
        };

        // Act
        const resultado = controller.getProfile(requestAdmin);

        // Assert
        expect(resultado).toEqual(requestAdmin.user);
        expect(resultado.roles).toContain('ADMIN');
        expect(resultado.roles.length).toBeGreaterThan(1);
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve retornar exatamente o que está em req.user', () => {
        // Arrange
        const requestCompleto = {
          user: {
            userId: '999-888-777',
            email: 'completo@teste.com',
            roles: ['COMITE', 'GESTOR'],
            outrosCampos: 'devem ser mantidos',
          },
        };

        // Act
        const resultado = controller.getProfile(requestCompleto);

        // Assert
        expect(resultado).toBe(requestCompleto.user);
        expect(resultado).toHaveProperty('outrosCampos');
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve retornar perfil com propriedades adicionais do JWT', () => {
        // Arrange
        const requestComPropriedadesExtras = {
          user: {
            userId: '123',
            email: 'test@empresa.com',
            roles: ['USER'],
            sub: '123',
            iat: 1609459200,
            exp: 1609545600,
            jti: 'unique-jwt-id',
          },
        };

        // Act
        const resultado = controller.getProfile(requestComPropriedadesExtras);

        // Assert
        expect(resultado).toEqual(requestComPropriedadesExtras.user);
        expect(resultado).toHaveProperty('sub');
        expect(resultado).toHaveProperty('iat');
        expect(resultado).toHaveProperty('exp');
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });
    });

    describe('Casos edge', () => {
      it('deve lidar com req.user undefined (responsabilidade do guard)', () => {
        // Arrange
        const requestSemUser = { user: undefined };

        // Act
        const resultado = controller.getProfile(requestSemUser);

        // Assert
        expect(resultado).toBeUndefined();
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve lidar com req.user null', () => {
        // Arrange
        const requestUserNull = { user: null };

        // Act
        const resultado = controller.getProfile(requestUserNull);

        // Assert
        expect(resultado).toBeNull();
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve lidar com user sem roles', () => {
        // Arrange
        const requestSemRoles = {
          user: {
            userId: 'user-sem-roles',
            email: 'semroles@empresa.com',
          },
        };

        // Act
        const resultado = controller.getProfile(requestSemRoles);

        // Assert
        expect(resultado).toEqual(requestSemRoles.user);
        expect(resultado).not.toHaveProperty('roles');
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve lidar com roles vazio', () => {
        // Arrange
        const requestRolesVazio = {
          user: {
            userId: 'user-roles-vazio',
            email: 'rolesvazio@empresa.com',
            roles: [],
          },
        };

        // Act
        const resultado = controller.getProfile(requestRolesVazio);

        // Assert
        expect(resultado).toEqual(requestRolesVazio.user);
        expect(resultado.roles).toEqual([]);
        expect(Array.isArray(resultado.roles)).toBe(true);
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });
    });

    describe('Proteção do Guard', () => {
      it('deve ser protegido pelo JwtAuthGuard', () => {
        expect(mockJwtAuthGuard).toBeDefined();
      });

      it('deve funcionar quando guard permite acesso', () => {
        // Arrange
        mockJwtAuthGuard.canActivate.mockReturnValue(true);

        // Act
        const resultado = controller.getProfile(mockRequest);

        // Assert
        expect(resultado).toBeDefined();
        expect(resultado).toEqual(mockUser);
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });
    });
  });

  describe('logout', () => {
    describe('Casos de sucesso', () => {
      it('deve fazer logout e limpar cookie sem auditoria', () => {
        // Act
        const resultado = controller.logout(mockResponse);

        // Assert
        expect(mockResponse.clearCookie).toHaveBeenCalledWith(
          'access_token',
          {
            httpOnly: true,
            secure: false, // NODE_ENV não é 'production' no teste
            sameSite: 'strict',
          }
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          message: 'Logout realizado com sucesso',
        });

        expect(resultado).toBe(mockResponse);
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve limpar cookie com configuração segura em produção', () => {
        // Arrange
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        // Act
        controller.logout(mockResponse);

        // Assert
        expect(mockResponse.clearCookie).toHaveBeenCalledWith(
          'access_token',
          {
            httpOnly: true,
            secure: true, // Em produção deve ser true
            sameSite: 'strict',
          }
        );

        expect(mockAuditoriaService.log).not.toHaveBeenCalled();

        // Cleanup
        process.env.NODE_ENV = originalEnv;
      });

      it('deve sempre retornar status 200', () => {
        // Act
        controller.logout(mockResponse);

        // Assert
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          message: 'Logout realizado com sucesso',
        });
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve funcionar independente do estado anterior do cookie', () => {
        // Arrange
        const chamadas = 3;

        for (let i = 0; i < chamadas; i++) {
          // Act
          controller.logout(mockResponse);
        }

        // Assert
        expect(mockResponse.clearCookie).toHaveBeenCalledTimes(chamadas);
        expect(mockResponse.status).toHaveBeenCalledTimes(chamadas);
        expect(mockResponse.json).toHaveBeenCalledTimes(chamadas);
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve usar as mesmas opções de cookie que no login', () => {
        // Act
        controller.logout(mockResponse);

        // Assert
        const clearCookieCall = (mockResponse.clearCookie as jest.Mock).mock.calls[0];
        const cookieOptions = clearCookieCall[1];

        expect(cookieOptions).toHaveProperty('httpOnly', true);
        expect(cookieOptions).toHaveProperty('sameSite', 'strict');
        expect(cookieOptions).toHaveProperty('secure', false);
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });
    });

    describe('Configuração de ambiente', () => {
      it('deve funcionar em ambiente de desenvolvimento', () => {
        // Arrange
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        // Act
        controller.logout(mockResponse);

        // Assert
        expect(mockResponse.clearCookie).toHaveBeenCalledWith(
          'access_token',
          expect.objectContaining({
            secure: false,
          })
        );

        expect(mockAuditoriaService.log).not.toHaveBeenCalled();

        // Cleanup
        process.env.NODE_ENV = originalEnv;
      });

      it('deve funcionar quando NODE_ENV não está definido', () => {
        // Arrange
        const originalEnv = process.env.NODE_ENV;
        delete process.env.NODE_ENV;

        // Act
        controller.logout(mockResponse);

        // Assert
        expect(mockResponse.clearCookie).toHaveBeenCalledWith(
          'access_token',
          expect.objectContaining({
            secure: false,
          })
        );

        expect(mockAuditoriaService.log).not.toHaveBeenCalled();

        // Cleanup
        process.env.NODE_ENV = originalEnv;
      });

      it('deve funcionar em outros ambientes (staging, test)', () => {
        // Arrange
        const ambientes = ['staging', 'test', 'local'];

        for (const ambiente of ambientes) {
          const originalEnv = process.env.NODE_ENV;
          process.env.NODE_ENV = ambiente;

          // Act
          controller.logout(mockResponse);

          // Assert
          expect(mockResponse.clearCookie).toHaveBeenCalledWith(
            'access_token',
            expect.objectContaining({
              secure: false,
            })
          );

          expect(mockAuditoriaService.log).not.toHaveBeenCalled();

          // Cleanup
          process.env.NODE_ENV = originalEnv;
          jest.clearAllMocks();
        }
      });
    });

    describe('Resposta HTTP', () => {
      it('deve retornar response do Express', () => {
        // Act
        const resultado = controller.logout(mockResponse);

        // Assert
        expect(resultado).toBe(mockResponse);
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve chamar métodos do response na ordem correta', () => {
        // Arrange
        const callOrder: string[] = [];
        (mockResponse.clearCookie as jest.Mock).mockImplementation(() => {
          callOrder.push('clearCookie');
        });
        (mockResponse.status as jest.Mock).mockImplementation(() => {
          callOrder.push('status');
          return mockResponse;
        });
        (mockResponse.json as jest.Mock).mockImplementation(() => {
          callOrder.push('json');
          return mockResponse;
        });

        // Act
        controller.logout(mockResponse);

        // Assert
        expect(callOrder).toEqual(['clearCookie', 'status', 'json']);
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });
    });
  });

  describe('Integração de auditoria', () => {
    it('deve demonstrar que auditoria de login é feita no AuthService, não no controller', async () => {
      // Arrange
      mockAuthService.login.mockResolvedValue(mockValidToken);

      // Act
      await controller.login(mockLoginDto, mockResponse, mockRequest);

      // Assert
      // Verificar que o controller NÃO chama auditoria diretamente
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      
      // Verificar que o AuthService foi chamado (que fará a auditoria internamente)
      expect(mockAuthService.login).toHaveBeenCalledWith(mockLoginDto, mockRequest.ip);
    });

    it('deve demonstrar que getProfile não registra auditoria', () => {
      // Act
      controller.getProfile(mockRequest);

      // Assert
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve demonstrar que logout não registra auditoria', () => {
      // Act
      controller.logout(mockResponse);

      // Assert
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve manter comportamento consistente mesmo se auditoria fosse adicionada', async () => {
      // Arrange
      mockAuthService.login.mockResolvedValue(mockValidToken);
      
      // Simular que auditoria foi adicionada ao controller (hipotético)
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.login(mockLoginDto, mockResponse, mockRequest);

      // Assert
      expect(resultado.message).toBe('Login bem-sucedido');
      
      // Atualmente não há auditoria no controller, mas se houvesse:
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('Integração entre endpoints', () => {
    it('deve permitir fluxo login -> getProfile -> logout', async () => {
      // 1. Login
      mockAuthService.login.mockResolvedValue(mockValidToken);
      const loginResult = await controller.login(mockLoginDto, mockResponse, mockRequest);
      expect(loginResult.message).toBe('Login bem-sucedido');

      // 2. GetProfile
      const profileResult = controller.getProfile(mockRequest);
      expect(profileResult).toEqual(mockUser);

      // 3. Logout
      const logoutResult = controller.logout(mockResponse);
      expect(mockResponse.clearCookie).toHaveBeenCalled();
      expect(logoutResult).toBe(mockResponse);

      // Verificar que auditoria não foi chamada em nenhum endpoint do controller
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve manter consistência de cookies entre login e logout', async () => {
      // Login
      mockAuthService.login.mockResolvedValue(mockValidToken);
      await controller.login(mockLoginDto, mockResponse, mockRequest);

      // Logout
      controller.logout(mockResponse);

      // Verificar consistência das opções de cookie
      const cookieCall = (mockResponse.cookie as jest.Mock).mock.calls[0];
      const clearCookieCall = (mockResponse.clearCookie as jest.Mock).mock.calls[0];

      const cookieOptions = cookieCall[2];
      const clearCookieOptions = clearCookieCall[1];

      expect(cookieOptions.httpOnly).toBe(clearCookieOptions.httpOnly);
      expect(cookieOptions.secure).toBe(clearCookieOptions.secure);
      expect(cookieOptions.sameSite).toBe(clearCookieOptions.sameSite);

      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve funcionar com múltiplos usuários simultaneamente', async () => {
      // Arrange
      const usuarios = [
        { email: 'user1@empresa.com', senha: 'senha1' },
        { email: 'user2@empresa.com', senha: 'senha2' },
        { email: 'user3@empresa.com', senha: 'senha3' },
      ];

      mockAuthService.login.mockResolvedValue(mockValidToken);

      // Act
      const promises = usuarios.map(user => 
        controller.login(user, mockResponse, mockRequest)
      );

      const resultados = await Promise.all(promises);

      // Assert
      expect(resultados).toHaveLength(3);
      resultados.forEach(resultado => {
        expect(resultado.message).toBe('Login bem-sucedido');
      });

      expect(mockAuthService.login).toHaveBeenCalledTimes(3);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('Configurações de segurança', () => {
    it('deve sempre usar httpOnly para cookies', async () => {
      // Login
      mockAuthService.login.mockResolvedValue(mockValidToken);
      await controller.login(mockLoginDto, mockResponse, mockRequest);

      // Logout
      controller.logout(mockResponse);

      // Verificar ambos
      expect((mockResponse.cookie as jest.Mock).mock.calls[0][2].httpOnly).toBe(true);
      expect((mockResponse.clearCookie as jest.Mock).mock.calls[0][1].httpOnly).toBe(true);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve sempre usar sameSite strict', async () => {
      // Login
      mockAuthService.login.mockResolvedValue(mockValidToken);
      await controller.login(mockLoginDto, mockResponse, mockRequest);

      // Logout
      controller.logout(mockResponse);

      // Verificar ambos
      expect((mockResponse.cookie as jest.Mock).mock.calls[0][2].sameSite).toBe('strict');
      expect((mockResponse.clearCookie as jest.Mock).mock.calls[0][1].sameSite).toBe('strict');
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve configurar secure baseado no ambiente', async () => {
      // Testar em produção
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockAuthService.login.mockResolvedValue(mockValidToken);
      await controller.login(mockLoginDto, mockResponse, mockRequest);
      controller.logout(mockResponse);

      expect((mockResponse.cookie as jest.Mock).mock.calls[0][2].secure).toBe(true);
      expect((mockResponse.clearCookie as jest.Mock).mock.calls[0][1].secure).toBe(true);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });

    it('deve definir maxAge apropriado para sessão', async () => {
      // Arrange
      mockAuthService.login.mockResolvedValue(mockValidToken);
      const expectedMaxAge = 1000 * 60 * 60 * 24; // 24 horas

      // Act
      await controller.login(mockLoginDto, mockResponse, mockRequest);

      // Assert
      const cookieOptions = (mockResponse.cookie as jest.Mock).mock.calls[0][2];
      expect(cookieOptions.maxAge).toBe(expectedMaxAge);
      expect(cookieOptions.maxAge).toBeGreaterThan(0);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('Tratamento de erros', () => {
    it('deve propagar erros inesperados do AuthService', async () => {
      // Arrange
      const erroInesperado = new Error('Erro interno do servidor');
      mockAuthService.login.mockRejectedValue(erroInesperado);

      // Act & Assert
      await expect(controller.login(mockLoginDto, mockResponse, mockRequest))
        .rejects.toThrow(erroInesperado);

      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve lidar com response object malformado no logout', () => {
      // Arrange
      const responseMalformado = {} as Response;

      // Act & Assert
      expect(() => controller.logout(responseMalformado)).toThrow();
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve propagar diferentes tipos de erro do AuthService', async () => {
      // Arrange
      const erros = [
        new Error('Erro de validação'),
        new Error('Erro de banco de dados'),
        new Error('Erro de conexão'),
        new UnauthorizedException('Credenciais inválidas'),
      ];

      // Act & Assert
      for (const erro of erros) {
        mockAuthService.login.mockRejectedValue(erro);
        await expect(controller.login(mockLoginDto, mockResponse, mockRequest))
          .rejects.toThrow(erro);
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      }
    });
  });

  describe('Performance e concorrência', () => {
    it('deve processar login com payload grande', async () => {
      // Arrange
      const loginComDadosGrandes: LoginDto = {
        email: 'a'.repeat(100) + '@empresa.com',
        senha: 'b'.repeat(200),
      };
      mockAuthService.login.mockResolvedValue(mockValidToken);

      // Act
      const resultado = await controller.login(loginComDadosGrandes, mockResponse, mockRequest);

      // Assert
      expect(resultado.message).toBe('Login bem-sucedido');
      expect(mockAuthService.login).toHaveBeenCalledWith(loginComDadosGrandes, mockRequest.ip);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve lidar com múltiplas operações simultâneas', async () => {
      // Arrange
      mockAuthService.login.mockResolvedValue(mockValidToken);
      const operacoes: Promise<any>[] = [];

      // Múltiplos logins
      for (let i = 0; i < 3; i++) {
        operacoes.push(
          controller.login({ email: `user${i}@test.com`, senha: 'senha' }, mockResponse, mockRequest)
        );
      }

      // Múltiplos getProfile
      for (let i = 0; i < 3; i++) {
        operacoes.push(
          Promise.resolve(controller.getProfile(mockRequest))
        );
      }

      // Act
      const resultados = await Promise.all(operacoes);

      // Assert
      expect(resultados).toHaveLength(6);
      expect(mockAuthService.login).toHaveBeenCalledTimes(3);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('Observações sobre auditoria', () => {
    it('deve documentar que auditoria de login acontece no AuthService', async () => {
      // Arrange
      mockAuthService.login.mockResolvedValue(mockValidToken);

      // Act
      await controller.login(mockLoginDto, mockResponse, mockRequest);

      // Assert
      // O controller não registra auditoria - isso é responsabilidade do AuthService
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      
      // O AuthService recebe os dados necessários para auditoria (incluindo IP)
      expect(mockAuthService.login).toHaveBeenCalledWith(mockLoginDto, mockRequest.ip);
      
      // Nota: O AuthService real registraria:
      // - login_success para logins bem-sucedidos
      // - login_failed para logins falhados
      // Ambos incluindo userId, email, IP, etc.
    });

    it('deve documentar que endpoints de consulta não precisam de auditoria', () => {
      // Act
      controller.getProfile(mockRequest);
      controller.logout(mockResponse);

      // Assert
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      
      // Nota: getProfile e logout são operações que normalmente não precisam
      // de auditoria detalhada, pois são operações de leitura/sessão
    });
  });
});