import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { Public } from 'src/common/decorators/public.decorator';
import { Roles } from 'src/common/decorators/roles.decorators';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from './entity/user.entity';
import { UsersService } from './users.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('profile')
  @ApiOperation({ summary: 'Lấy profile cá nhân', description: 'Trả về thông tin profile của user đang đăng nhập.' })
  @ApiResponse({ status: 200, description: 'Thông tin profile (name, avatar, phone, address...).' })
  profile(@CurrentUser('sub') userId: number) {
    return this.usersService.profile(userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Lấy thống kê cá nhân', description: 'Số bài viết, followers, following của user đang đăng nhập.' })
  @ApiResponse({ status: 200, description: 'Thống kê user.' })
  getStats(@CurrentUser('sub') userId: number) {
    return this.usersService.getStats(userId);
  }

  @Public()
  @Get(':id/profile')
  @ApiOperation({ summary: 'Xem profile công khai', description: 'Xem thông tin profile của user khác (không cần đăng nhập).' })
  @ApiParam({ name: 'id', description: 'ID user cần xem', example: 1 })
  @ApiResponse({ status: 200, description: 'Thông tin profile công khai.' })
  @ApiResponse({ status: 404, description: 'User không tồn tại.' })
  getPublicProfile(@Param('id') userId: number) {
    return this.usersService.profile(+userId);
  }

  @Public()
  @Get(':id/stats')
  @ApiOperation({ summary: 'Xem thống kê công khai', description: 'Xem thống kê (bài viết, followers) của user khác.' })
  @ApiParam({ name: 'id', description: 'ID user', example: 1 })
  @ApiResponse({ status: 200, description: 'Thống kê công khai.' })
  getPublicStats(@Param('id') userId: number) {
    return this.usersService.getStats(+userId);
  }

  @Put()
  @ApiOperation({ summary: 'Cập nhật profile', description: 'Cập nhật tên, avatar, phone, address, gender, birthday.' })
  @ApiResponse({ status: 200, description: 'Profile đã được cập nhật.' })
  update(
    @CurrentUser('sub') userId: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(userId, updateUserDto);
  }

  // POST /users
  @Public()
  @Post()
  @ApiOperation({ summary: 'Tạo user (internal)', description: 'Endpoint nội bộ để tạo user. Thông thường nên dùng /auth/sign-up.' })
  @ApiResponse({ status: 201, description: 'User đã được tạo.' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  // GET /users
  @Public()
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả users' })
  @ApiResponse({ status: 200, description: 'Danh sách users.' })
  findAll() {
    return this.usersService.findAll();
  }

  // GET /users/:uuid
  @Get(':uuid')
  @ApiOperation({ summary: 'Tìm user theo UUID' })
  @ApiParam({ name: 'uuid', description: 'UUID của user', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ status: 200, description: 'Thông tin user.' })
  @ApiResponse({ status: 404, description: 'User không tồn tại.' })
  findOne(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.usersService.findOneByUuid(uuid);
  }

  @Post(':id/follow')
  @ApiOperation({ summary: 'Follow / Unfollow user (Toggle)', description: 'Nếu chưa follow → follow, nếu đã follow → unfollow.' })
  @ApiParam({ name: 'id', description: 'ID user cần follow/unfollow', example: 2 })
  @ApiResponse({ status: 201, description: 'Toggle follow thành công.' })
  toggleFollow(@CurrentUser('sub') followerId: number, @Param('id') followingId: number) {
    return this.usersService.toggleFollow(followerId, +followingId);
  }

  @Public()
  @Get(':id/followers')
  @ApiOperation({ summary: 'Lấy danh sách followers', description: 'Danh sách người theo dõi một user.' })
  @ApiParam({ name: 'id', description: 'ID user', example: 1 })
  @ApiResponse({ status: 200, description: 'Danh sách followers.' })
  getFollowers(@Param('id') userId: number) {
    return this.usersService.getFollowers(+userId);
  }

  @Public()
  @Get(':id/following')
  @ApiOperation({ summary: 'Lấy danh sách đang follow', description: 'Danh sách user mà người này đang theo dõi.' })
  @ApiParam({ name: 'id', description: 'ID user', example: 1 })
  @ApiResponse({ status: 200, description: 'Danh sách following.' })
  getFollowing(@Param('id') userId: number) {
    return this.usersService.getFollowing(+userId);
  }

  @Get(':id/is-following')
  @ApiOperation({ summary: 'Kiểm tra trạng thái follow', description: 'Kiểm tra xem user hiện tại có đang follow user kia không.' })
  @ApiParam({ name: 'id', description: 'ID user cần kiểm tra', example: 2 })
  @ApiResponse({ status: 200, description: 'Trạng thái follow (true/false).' })
  isFollowing(@CurrentUser('sub') followerId: number, @Param('id') followingId: number) {
    return this.usersService.isFollowing(followerId, +followingId);
  }

  // DELETE /users/:uuid
  @Delete(':uuid')
  @Roles(UserRole.USER)
  @ApiOperation({ summary: 'Xóa tài khoản', description: 'Xóa tài khoản user theo UUID.' })
  @ApiParam({ name: 'uuid', description: 'UUID của user cần xóa' })
  @ApiResponse({ status: 200, description: 'User đã bị xóa.' })
  remove(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.usersService.remove(uuid);
  }
}
