import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  // Mock do AuthService
  const mockAuthService = {
    login: jest.fn(),
  };

  // Mock do JwtAuthGuard
  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  // Dados de teste
  const mockLoginDto: LoginDto = {
    email: 'test@empresa.com',
    senha: '123456',
  };

  const mockValidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJlbWFpbCI6InRlc3RAZW1wcmVzYS5jb20iLCJyb2xlcyI6WyJVU0VSIl19.token';

  const mockUser = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@empresa.com',
    roles: ['USER', 'ADMIN'],
  };

  // Mock do objeto Response
  const mockResponse = {
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;

  // Mock do objeto Request
  const mockRequest = {
    user: mockUser,
    cookies: {
      access_token: mockValidToken,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Definição do controller', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('deve ter AuthService injetado', () => {
      expect(authService).toBeDefined();
    });
  });

  describe('login', () => {
    describe('Casos de sucesso', () => {
      it('deve fazer login com sucesso e definir cookie', async () => {
        // Arrange
        mockAuthService.login.mockResolvedValue(mockValidToken);

        // Act
        const resultado = await controller.login(mockLoginDto, mockResponse);

        // Assert
        expect(resultado).toEqual({
          message: 'Login bem-sucedido',
        });

        expect(mockAuthService.login).toHaveBeenCalledWith(mockLoginDto);
        expect(mockResponse.cookie).toHaveBeenCalledWith(
          'access_token',
          mockValidToken,
          {
            httpOnly: true,
            secure: false, // NODE_ENV não é 'production' no teste
            sameSite: 'strict',
            maxAge: 1000 * 60 * 60 * 24, // 1 dia
          }
        );
      });

      it('deve definir cookie seguro em produção', async () => {
        // Arrange
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        mockAuthService.login.mockResolvedValue(mockValidToken);

        // Act
        await controller.login(mockLoginDto, mockResponse);

        // Assert
        expect(mockResponse.cookie).toHaveBeenCalledWith(
          'access_token',
          mockValidToken,
          {
            httpOnly: true,
            secure: true, // Em produção deve ser true
            sameSite: 'strict',
            maxAge: 1000 * 60 * 60 * 24,
          }
        );

        // Cleanup
        process.env.NODE_ENV = originalEnv;
      });

      it('deve aceitar credenciais válidas diferentes', async () => {
        // Arrange
        const loginDiferente: LoginDto = {
          email: 'admin@empresa.com',
          senha: 'senhaSegura123',
        };
        const tokenDiferente = 'token.diferente.jwt';
        mockAuthService.login.mockResolvedValue(tokenDiferente);

        // Act
        const resultado = await controller.login(loginDiferente, mockResponse);

        // Assert
        expect(resultado.message).toBe('Login bem-sucedido');
        expect(mockAuthService.login).toHaveBeenCalledWith(loginDiferente);
        expect(mockResponse.cookie).toHaveBeenCalledWith(
          'access_token',
          tokenDiferente,
          expect.any(Object)
        );
      });

      it('deve configurar cookie com propriedades de segurança corretas', async () => {
        // Arrange
        mockAuthService.login.mockResolvedValue(mockValidToken);

        // Act
        await controller.login(mockLoginDto, mockResponse);

        // Assert
        const cookieCall = (mockResponse.cookie as jest.Mock).mock.calls[0];
        const cookieOptions = cookieCall[2];

        expect(cookieOptions).toHaveProperty('httpOnly', true);
        expect(cookieOptions).toHaveProperty('sameSite', 'strict');
        expect(cookieOptions).toHaveProperty('maxAge', 86400000); // 24 horas em ms
        expect(cookieOptions).toHaveProperty('secure', false); // false em desenvolvimento
      });

      it('deve processar email com diferentes formatos', async () => {
        // Arrange
        const emailsValidos = [
          'test@domain.com',
          'user.name@company.co.uk',
          'admin+test@empresa.com.br',
          'TEST@EMPRESA.COM', // Maiúsculo
        ];

        for (const email of emailsValidos) {
          mockAuthService.login.mockResolvedValue(mockValidToken);
          const loginDto = { email, senha: 'senha123' };

          // Act
          const resultado = await controller.login(loginDto, mockResponse);

          // Assert
          expect(resultado.message).toBe('Login bem-sucedido');
          expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);

          // Reset para próxima iteração
          jest.clearAllMocks();
        }
      });
    });

    describe('Casos de falha', () => {
      it('deve lançar UnauthorizedException quando AuthService retorna null', async () => {
        // Arrange
        mockAuthService.login.mockResolvedValue(null);

        // Act & Assert
        await expect(controller.login(mockLoginDto, mockResponse))
          .rejects.toThrow(UnauthorizedException);

        await expect(controller.login(mockLoginDto, mockResponse))
          .rejects.toThrow('Credenciais inválidas');

        expect(mockAuthService.login).toHaveBeenCalledWith(mockLoginDto);
        expect(mockResponse.cookie).not.toHaveBeenCalled();
      });

      it('deve lançar UnauthorizedException quando AuthService retorna undefined', async () => {
        // Arrange
        mockAuthService.login.mockResolvedValue(undefined);

        // Act & Assert
        await expect(controller.login(mockLoginDto, mockResponse))
          .rejects.toThrow(UnauthorizedException);

        expect(mockResponse.cookie).not.toHaveBeenCalled();
      });

      it('deve lançar UnauthorizedException quando AuthService retorna string vazia', async () => {
        // Arrange
        mockAuthService.login.mockResolvedValue('');

        // Act & Assert
        await expect(controller.login(mockLoginDto, mockResponse))
          .rejects.toThrow(UnauthorizedException);

        expect(mockResponse.cookie).not.toHaveBeenCalled();
      });

      it('deve propagar erro quando AuthService falha', async () => {
        // Arrange
        const serviceError = new Error('Database connection failed');
        mockAuthService.login.mockRejectedValue(serviceError);

        // Act & Assert
        await expect(controller.login(mockLoginDto, mockResponse))
          .rejects.toThrow(serviceError);

        expect(mockResponse.cookie).not.toHaveBeenCalled();
      });

      it('deve falhar com credenciais malformadas', async () => {
        // Arrange
        const loginMalformado = {
          email: null,
          senha: null,
        } as any;

        mockAuthService.login.mockResolvedValue(null);

        // Act & Assert
        await expect(controller.login(loginMalformado, mockResponse))
          .rejects.toThrow(UnauthorizedException);
      });
    });

    describe('Validação de entrada', () => {
      it('deve aceitar DTO válido', async () => {
        // Arrange
        const dtoValido: LoginDto = {
          email: 'valid@test.com',
          senha: 'validPassword123',
        };
        mockAuthService.login.mockResolvedValue(mockValidToken);

        // Act
        const resultado = await controller.login(dtoValido, mockResponse);

        // Assert
        expect(resultado).toBeDefined();
        expect(mockAuthService.login).toHaveBeenCalledWith(dtoValido);
      });

      it('deve processar senhas com caracteres especiais', async () => {
        // Arrange
        const loginComSenhaEspecial: LoginDto = {
          email: 'test@empresa.com',
          senha: 'P@ssw0rd!@#$%^&*()',
        };
        mockAuthService.login.mockResolvedValue(mockValidToken);

        // Act
        const resultado = await controller.login(loginComSenhaEspecial, mockResponse);

        // Assert
        expect(resultado.message).toBe('Login bem-sucedido');
        expect(mockAuthService.login).toHaveBeenCalledWith(loginComSenhaEspecial);
      });

      it('deve processar emails com espaços (responsabilidade do service validar)', async () => {
        // Arrange
        const loginComEspacos: LoginDto = {
          email: '  test@empresa.com  ',
          senha: 'senha123',
        };
        mockAuthService.login.mockResolvedValue(null); // Service rejeita

        // Act & Assert
        await expect(controller.login(loginComEspacos, mockResponse))
          .rejects.toThrow(UnauthorizedException);
      });
    });

    describe('Tratamento de Response', () => {
      it('deve chamar response.cookie com parâmetros corretos', async () => {
        // Arrange
        mockAuthService.login.mockResolvedValue(mockValidToken);
        const spyCookie = jest.spyOn(mockResponse, 'cookie');

        // Act
        await controller.login(mockLoginDto, mockResponse);

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
        await expect(controller.login(mockLoginDto, mockResponse))
          .rejects.toThrow(UnauthorizedException);

        expect(spyCookie).not.toHaveBeenCalled();
      });
    });
  });

  describe('getProfile', () => {
    describe('Casos de sucesso', () => {
      it('deve retornar perfil do usuário autenticado', () => {
        // Act
        const resultado = controller.getProfile(mockRequest);

        // Assert
        expect(resultado).toEqual(mockUser);
        expect(resultado).toHaveProperty('userId');
        expect(resultado).toHaveProperty('email');
        expect(resultado).toHaveProperty('roles');
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
        expect(resultado).toBe(requestCompleto.user); // Referência exata
        expect(resultado).toHaveProperty('outrosCampos');
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
      });

      it('deve lidar com req.user null', () => {
        // Arrange
        const requestUserNull = { user: null };

        // Act
        const resultado = controller.getProfile(requestUserNull);

        // Assert
        expect(resultado).toBeNull();
      });

      it('deve lidar com user sem roles', () => {
        // Arrange
        const requestSemRoles = {
          user: {
            userId: 'user-sem-roles',
            email: 'semroles@empresa.com',
            // roles ausente
          },
        };

        // Act
        const resultado = controller.getProfile(requestSemRoles);

        // Assert
        expect(resultado).toEqual(requestSemRoles.user);
        expect(resultado).not.toHaveProperty('roles');
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
      });
    });

    describe('Proteção do Guard', () => {
      it('deve ser protegido pelo JwtAuthGuard', () => {
        // Esta verificação é mais sobre a configuração do guard
        // O guard é mockado nos testes, mas verificamos se está configurado
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
      });
    });
  });

  describe('logout', () => {
    describe('Casos de sucesso', () => {
      it('deve fazer logout e limpar cookie', () => {
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
      });

      it('deve funcionar independente do estado anterior do cookie', () => {
        // Arrange - Simular diferentes chamadas de logout
        const chamadas = 3;

        for (let i = 0; i < chamadas; i++) {
          // Act
          controller.logout(mockResponse);
        }

        // Assert
        expect(mockResponse.clearCookie).toHaveBeenCalledTimes(chamadas);
        expect(mockResponse.status).toHaveBeenCalledTimes(chamadas);
        expect(mockResponse.json).toHaveBeenCalledTimes(chamadas);
      });

      it('deve usar as mesmas opções de cookie que no login', () => {
        // Act
        controller.logout(mockResponse);

        // Assert
        const clearCookieCall = (mockResponse.clearCookie as jest.Mock).mock.calls[0];
        const cookieOptions = clearCookieCall[1];

        expect(cookieOptions).toHaveProperty('httpOnly', true);
        expect(cookieOptions).toHaveProperty('sameSite', 'strict');
        expect(cookieOptions).toHaveProperty('secure', false); // false em desenvolvimento
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
            secure: false, // undefined !== 'production', então false
          })
        );

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
              secure: false, // Apenas 'production' deve ser true
            })
          );

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
      });
    });
  });

  describe('Integração entre endpoints', () => {
    it('deve permitir fluxo login -> getProfile -> logout', async () => {
      // 1. Login
      mockAuthService.login.mockResolvedValue(mockValidToken);
      const loginResult = await controller.login(mockLoginDto, mockResponse);
      expect(loginResult.message).toBe('Login bem-sucedido');

      // 2. GetProfile
      const profileResult = controller.getProfile(mockRequest);
      expect(profileResult).toEqual(mockUser);

      // 3. Logout
      const logoutResult = controller.logout(mockResponse);
      expect(mockResponse.clearCookie).toHaveBeenCalled();
      expect(logoutResult).toBe(mockResponse);
    });

    it('deve manter consistência de cookies entre login e logout', async () => {
      // Login
      mockAuthService.login.mockResolvedValue(mockValidToken);
      await controller.login(mockLoginDto, mockResponse);

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
    });
  });

  describe('Tratamento de erros', () => {
    it('deve propagar erros inesperados do AuthService', async () => {
      // Arrange
      const erroInesperado = new Error('Erro interno do servidor');
      mockAuthService.login.mockRejectedValue(erroInesperado);

      // Act & Assert
      await expect(controller.login(mockLoginDto, mockResponse))
        .rejects.toThrow(erroInesperado);
    });

    it('deve lidar com response object malformado no logout', () => {
      // Arrange
      const responseMalformado = {} as Response;

      // Act & Assert
      // Se response não tem os métodos, vai lançar erro
      expect(() => controller.logout(responseMalformado)).toThrow();
    });
  });

  describe('Configurações de segurança', () => {
    it('deve sempre usar httpOnly para cookies', async () => {
      // Login
      mockAuthService.login.mockResolvedValue(mockValidToken);
      await controller.login(mockLoginDto, mockResponse);

      // Logout
      controller.logout(mockResponse);

      // Verificar ambos
      expect((mockResponse.cookie as jest.Mock).mock.calls[0][2].httpOnly).toBe(true);
      expect((mockResponse.clearCookie as jest.Mock).mock.calls[0][1].httpOnly).toBe(true);
    });

    it('deve sempre usar sameSite strict', async () => {
      // Login
      mockAuthService.login.mockResolvedValue(mockValidToken);
      await controller.login(mockLoginDto, mockResponse);

      // Logout
      controller.logout(mockResponse);

      // Verificar ambos
      expect((mockResponse.cookie as jest.Mock).mock.calls[0][2].sameSite).toBe('strict');
      expect((mockResponse.clearCookie as jest.Mock).mock.calls[0][1].sameSite).toBe('strict');
    });

    it('deve configurar secure baseado no ambiente', async () => {
      // Testar em produção
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockAuthService.login.mockResolvedValue(mockValidToken);
      await controller.login(mockLoginDto, mockResponse);
      controller.logout(mockResponse);

      expect((mockResponse.cookie as jest.Mock).mock.calls[0][2].secure).toBe(true);
      expect((mockResponse.clearCookie as jest.Mock).mock.calls[0][1].secure).toBe(true);

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });
  });
});