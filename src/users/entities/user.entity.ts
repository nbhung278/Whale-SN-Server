import { ObjectType, Field, Directive } from '@nestjs/graphql';

@ObjectType()
@Directive('@key(fields: "id")')
export class Avatars {
  @Field()
  id: number;

  @Field()
  publicId: string;

  @Field()
  url: string;

  @Field()
  userId: string;
}

@ObjectType()
export class User {
  @Field()
  id: number;

  @Field()
  name: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field()
  email: string;

  @Field()
  password: string;

  @Field(() => Avatars, { nullable: true })
  avatar?: Avatars | null;

  @Field()
  role: string;

  @Field()
  phoneNumber: string;

  @Field({ nullable: true })
  bio?: string;

  @Field({ nullable: true })
  address?: string;

  @Field({ nullable: true })
  gender?: number;

  @Field({ nullable: true })
  birthDate?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
