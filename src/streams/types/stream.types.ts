import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class ErrorTokenType {
  @Field()
  message: string;

  @Field({ nullable: true })
  code: number;
}

@ObjectType()
export class TokenType {
  @Field()
  ingressId: string;
  name: string;
  roomName: string;
  participantIdentity: string;
  participantName: string;
  streamKey: string;
  url: string;
}
@ObjectType()
export class LiveKitTokenResponse {
  @Field(() => TokenType)
  token: TokenType | any;

  @Field(() => ErrorTokenType, { nullable: true })
  error?: ErrorTokenType;
}
