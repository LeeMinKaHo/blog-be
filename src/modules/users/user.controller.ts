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

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }
  @Get('profile')
  profile(@CurrentUser('sub') userId: number) {
    return this.usersService.profile(userId);
  }

  @Get('stats')
  getStats(@CurrentUser('sub') userId: number) {
    return this.usersService.getStats(userId);
  }
  @Put()
  @Roles(UserRole.USER)
  update(
    @CurrentUser('sub') userId: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(userId, updateUserDto);
  }

  // POST /users
  @Public()
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  // GET /users
  @Public()
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // GET /users/:uuid
  @Get(':uuid')
  findOne(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.usersService.findOneByUuid(uuid);
  }

  // DELETE /users/:uuid
  @Delete(':uuid')
  @Roles(UserRole.USER)
  remove(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.usersService.remove(uuid);
  }
}
