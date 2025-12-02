import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Public()
  @Post('sign-in')
  signIn(@Body() loginDto: LoginDto) {
    // Placeholder for sign-in logic
    return this.authService.signIn(loginDto);
  }
  @Post()
  signOut(uuid: string) {
    return this.authService.signOut(uuid);
  }
}
