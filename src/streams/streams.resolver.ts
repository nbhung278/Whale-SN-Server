import { Args, Query, Resolver } from '@nestjs/graphql';
import { StreamsService } from './streams.service';
import { LiveKitTokenResponse } from './types/stream.types';
import { IngressInput } from 'livekit-server-sdk';
import { CreateLiveKitTokenDto } from './dto';

@Resolver()
export class StreamsResolver {
  constructor(private readonly streamsService: StreamsService) {}

  @Query(() => LiveKitTokenResponse)
  async createLiveKitToken(
    @Args('createLiveKitTokenDto') createLiveKitTokenDto: CreateLiveKitTokenDto, //
    // @Context() context: { res: Response },
  ): Promise<any> {
    const token = await this.streamsService.createIngress(
      IngressInput.RTMP_INPUT,
      createLiveKitTokenDto,
    );

    return token;
  }
}
