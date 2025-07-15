import { Controller, Post, Body, UnauthorizedException, Res, HttpCode, Get, UseGuards, Req } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RemindersService } from '../reminders/reminders.service'; 

@Controller('auth')
export class AuthController {

  constructor(private readonly authService: AuthService, private readonly remindersService: RemindersService) {}
  @HttpCode(200)
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response, @Req() req) {
    const token = await this.authService.login(loginDto, req.ip);
    if (!token) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', //https em produção
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24, // 1 dia
    });

    const reminder = await this.remindersService.getGlobalReminder();

    return { message: 'Login bem-sucedido', reminder };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req) {
    return req.user; // { userId, email, roles }
}

@Post('logout')
  logout(@Res() res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    return res.status(200).json({ message: 'Logout realizado com sucesso' });
  }

} 