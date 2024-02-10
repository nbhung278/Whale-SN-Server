import { Module } from '@nestjs/common';
import { StreamsController } from './streams.controller';
import { StreamsService } from './streams.service';
import { StreamsResolver } from './streams.resolver';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [StreamsController],
  providers: [StreamsService, StreamsResolver, JwtService, PrismaService],
})
export class StreamsModule {}
