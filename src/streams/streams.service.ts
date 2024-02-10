import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AccessToken,
  IngressAudioEncodingPreset,
  IngressInput,
  IngressVideoEncodingPreset,
  RoomServiceClient,
  type CreateIngressOptions,
  IngressClient,
} from 'livekit-server-sdk';
import { TrackSource } from 'livekit-server-sdk/dist/proto/livekit_models';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateLiveKitTokenDto } from './dto';

@Injectable()
export class StreamsService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  async createLiveKitToken() {
    const roomName = 'quickstart-room';
    const participantName = 'quickstart-username';

    const at = new AccessToken(
      this.configService.get<string>('LIVEKIT_API_KEY'),
      this.configService.get<string>('LIVEKIT_API_SECRET'),
      {
        identity: participantName,
      },
    );
    at.addGrant({ roomJoin: true, room: roomName });

    const token: string = at.toJwt();

    console.log(token);

    return { token };
  }
  //WHIP_INPUT
  //RTMP_INPUT
  async createIngress(
    ingressType: IngressInput,
    createLiveKitTokenDto: CreateLiveKitTokenDto,
  ) {
    try {
      const { email } = createLiveKitTokenDto;
      const user = await this.prismaService.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new NotFoundException(`User with ID not found`);
      }
      await this.resetIngresses(user.id);

      const options: CreateIngressOptions = {
        name: user.name,
        roomName: String(user.name),
        participantName: user.name,
        participantIdentity: String(user.name),
      };

      console.log('options', options);

      if (ingressType === IngressInput.WHIP_INPUT) {
        options.bypassTranscoding = true;
      } else {
        options.video = {
          source: TrackSource.CAMERA,
          preset: IngressVideoEncodingPreset.H264_1080P_30FPS_3_LAYERS,
        };
        options.audio = {
          source: TrackSource.MICROPHONE,
          preset: IngressAudioEncodingPreset.OPUS_STEREO_96KBPS,
        };
      }

      const ingressClient = new IngressClient(
        this.configService.get<string>('LIVEKIT_API_URL'),
        this.configService.get<string>('LIVEKIT_API_KEY'),
        this.configService.get<string>('LIVEKIT_API_SECRET'),
      );
      const ingress = await ingressClient.createIngress(ingressType, options);

      if (!ingress || !ingress.url || !ingress.streamKey) {
        throw new Error('Failed to create ingress');
      }

      await this.prismaService.stream.updateMany({
        where: { userId: user.id },
        data: {
          ingressId: ingress.ingressId,
          serverUrl: ingress.url,
          streamKey: ingress.streamKey,
        },
      });

      console.log('ingress', ingress);

      // revalidatePath(`/u/${user.name}/keys`);
      return ingress;
    } catch (error) {
      console.log('error', error);
    }
  }

  async resetIngresses(hostIdentity: number) {
    const roomService = new RoomServiceClient(
      this.configService.get<string>('LIVEKIT_API_URL'),
      this.configService.get<string>('LIVEKIT_API_KEY'),
      this.configService.get<string>('LIVEKIT_API_SECRET'),
    );
    const ingressClient = new IngressClient(
      this.configService.get<string>('LIVEKIT_API_URL'),
    );
    const ingresses = await ingressClient.listIngress({
      roomName: hostIdentity.toString(),
    });

    const rooms = await roomService.listRooms([hostIdentity.toString()]);

    for (const room of rooms) {
      await roomService.deleteRoom(room.name);
    }

    for (const ingress of ingresses) {
      if (ingress.ingressId) {
        await ingressClient.deleteIngress(ingress.ingressId);
      }
    }
  }
}
