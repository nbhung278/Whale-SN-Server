import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserResolver } from './users.resolver';
import { EmailService } from '../emails/emails.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [],
  controllers: [UsersController],
  providers: [
    UsersService,
    UserResolver,
    ConfigService,
    JwtService,
    PrismaService,
    EmailService,
  ],
})
export class UsersModule {}
