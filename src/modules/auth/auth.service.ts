import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { CacheService } from '../cache/cache.service';
import { SignUpDto } from './dto/sign-up.dto';
import { UserRole } from '../users/entity/user.entity';
import { MailService } from '../mail/mail.service';
import { UserAdvance } from '../users/entity/user-advance.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly cacheService: CacheService,
    private readonly mailService: MailService,
  ) { }

  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role, // single role as string
      roles: [user.role], // array for compatibility
      isVerified: user.isVerified, // đưa vào token để FE / Guard kiểm tra
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.REFRESH_TOKEN_SECRET,
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  /** Sinh mã OTP 6 chữ số */
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async signIn(loginDto: LoginDto): Promise<any> {
    const { email, password } = loginDto;

    const user = await this.usersService.findOneWithPassword(email);

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    // ✅ Cho phép login dù chưa xác thực — chỉ hạn chế một số tính năng
    // FE sẽ nhận isVerified qua token và hiển cảnh báo UI

    // Tạo token
    const { accessToken, refreshToken } = await this.generateTokens(user);

    // Lưu refresh token vào Redis hoặc DB
    await this.cacheService.set(
      `refresh_token_${user.id}`,
      refreshToken,
      7 * 24 * 3600,
    );

    return {
      user: {
        ...user,
        password: undefined, // không trả về password
      },
      accessToken,
      refreshToken,
      isVerified: user.isVerified,
    };
  }

  async signOut(uuid: string): Promise<void> {
    const user = await this.usersService.findOneByUuid(uuid);
    if (user) {
      await this.cacheService.delete(`auth_token_${user.id}`);
    }
    return;
  }

  async signUp(signUpDto: SignUpDto) {
    // Tạo user chưa xác thực
    const user = await this.usersService.create({
      ...signUpDto,
      role: 'User' as UserRole,
    });

    // Sinh OTP và lưu DB
    const otp = this.generateOtp();
    await this.usersService.saveVerificationCode(user.id, otp);

    // Gửi email xác thực (không await để không block response)
    this.mailService
      .sendVerificationCode(user.email, user.name, otp)
      .catch((err) => console.error('Gửi mail thất bại:', err));

    return {
      message: 'Đăng ký thành công! Vui lòng kiểm tra email để lấy mã OTP xác thực.',
      email: user.email,
    };
  }

  /** Xác thực OTP do user nhập */
  async verifyEmail(email: string, code: string) {
    const user = await this.usersService.verifyCode(email, code);

    // Gửi email chào mừng qua hàng đợi (Background Job)
    this.mailService.queueWelcomeEmail(user.email, user.name).catch((err) => {
      console.error('Lỗi khi đẩy mail Welcome vào hàng đợi:', err);
    });

    return {
      message: 'Xác thực email thành công! Bạn có thể đăng nhập ngay bây giờ.',
      userId: user.id,
      email: user.email,
    };
  }

  /**
   * Xác thực OTP + phát hành token mới có isVerified=true ngay lập tức.
   * Dùng khi user đang đăng nhập nhưng chưa verify, click "Xác thực ngay" từ banner.
   */
  async verifyEmailAndRefreshToken(email: string, code: string) {
    // 1. Verify OTP (throw nếu sai mã)
    const user = await this.usersService.verifyCode(email, code);

    // Gửi email chào mừng qua hàng đợi (Background Job)
    this.mailService.queueWelcomeEmail(user.email, user.name).catch((err) => {
      console.error('Lỗi khi đẩy mail Welcome vào hàng đợi:', err);
    });

    // 2. Tạo token mới — lần này isVerified = true
    const { accessToken, refreshToken } = await this.generateTokens(user);

    // 3. Lưu refresh token vào cache
    await this.cacheService.set(
      `refresh_token_${user.id}`,
      refreshToken,
      7 * 24 * 3600,
    );

    return {
      message: 'Xác thực email thành công!',
      accessToken,
      refreshToken,
    };
  }

  /** Gửi lại OTP (resend) */
  async resendVerification(email: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) throw new BadRequestException('Email không tồn tại');
    if (user.isVerified) throw new BadRequestException('Tài khoản đã được xác thực rồi');

    const otp = this.generateOtp();
    await this.usersService.saveVerificationCode(user.id, otp);

    await this.mailService.sendVerificationCode(user.email, user.name, otp);

    return { message: 'Đã gửi lại mã OTP. Vui lòng kiểm tra email!' };
  }

  async getUserProfile(userId: number): Promise<UserAdvance> {
    return this.usersService.profile(userId);
  }

  /**
   * Dùng refresh token (từ cookie) để cấp lại access token mới.
   * Kiểm tra refresh token trong Redis để phòng reuse sau logout.
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    // 1. Verify chữ ký
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.REFRESH_TOKEN_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    // 2. Kiểm tra refresh token trong Redis có khớp không (phòng reuse)
    const storedToken = await this.cacheService.get(`refresh_token_${payload.sub}`) as string | undefined;
    if (!storedToken || storedToken !== refreshToken) {
      throw new UnauthorizedException('Refresh token đã bị thu hồi');
    }

    // 3. Lấy thông tin user mới nhất từ DB
    const user = await this.usersService.findOneById(payload.sub);
    if (!user) throw new UnauthorizedException('User không tồn tại');

    // 4. Cấp token mới (Rotate refresh token)
    const tokens = await this.generateTokens(user);

    // 5. Lưu refresh token mới vào Redis (xoá cái cũ)
    await this.cacheService.set(
      `refresh_token_${user.id}`,
      tokens.refreshToken,
      7 * 24 * 3600,
    );

    return tokens;
  }
}
