import { Body, Controller, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Public()
  @Post('sign-in')
  signIn(@Req() req,@Body() loginDto: LoginDto) {
    console.log(req.body)
    // Placeholder for sign-in logic
    return this.authService.signIn(loginDto);
  }
  @Post()
  signOut(uuid: string) {
    return this.authService.signOut(uuid);
  }
}
