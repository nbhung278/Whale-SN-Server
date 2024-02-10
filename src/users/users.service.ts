import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtVerifyOptions } from '@nestjs/jwt';
import {
  ActivationDto,
  ForgotPasswordDto,
  GetUserByNameDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../emails/emails.service';
// import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { TokenSender } from 'utils/sendToken';
import { User } from './entities/user.entity';

interface UserData {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  bio?: string;
  address?: string;
  birthDate?: Date;
  gender?: number;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  //register service
  async register(RegisterDto: RegisterDto, response: Response) {
    const {
      name,
      email,
      password,
      phoneNumber,
      firstName,
      lastName,
      address,
      bio,
      birthDate,
      gender,
    } = RegisterDto;

    const isEmailExist = await this.prismaService.user.findUnique({
      where: {
        email,
      },
    });

    console.log('1111111111');

    const isPhoneNumberExist = await this.prismaService.user.findUnique({
      where: {
        phoneNumber,
      },
    });

    if (isPhoneNumberExist) {
      throw new BadRequestException(
        'User already exist with this phone number!',
      );
    }

    if (isEmailExist) {
      throw new BadRequestException('User already exist with this email!');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      name,
      firstName,
      lastName,
      email,
      phoneNumber,
      password: hashedPassword,
      gender,
      address,
      bio,
      birthDate,
    };

    const activationToken = await this.createActivationToken(user);
    const activation_token = activationToken.token;

    const activationCode = activationToken.activationCode;

    await this.emailService.sendMail({
      email,
      subject: 'Activate your account',
      template: './activation-mail',
      name,
      activationCode,
    });

    return { activation_token, response };
  }

  // create activation token
  async createActivationToken(user: UserData) {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

    const token = this.jwtService.sign(
      {
        user,
        activationCode,
      },
      {
        secret: this.configService.get<string>('ACTIVATION_SECRET'),
        expiresIn: '5m',
      },
    );
    return { token, activationCode };
  }

  // activation user
  async activateUser(activationDto: ActivationDto, response: Response) {
    const { activationToken, activationCode } = activationDto;

    const newUser: { user: UserData; activationCode: string } =
      this.jwtService.verify(activationToken, {
        secret: this.configService.get<string>('ACTIVATION_SECRET'),
      } as JwtVerifyOptions) as { user: UserData; activationCode: string };

    if (newUser.activationCode !== activationCode) {
      throw new BadRequestException('Invalid activation code');
    }

    const {
      name,
      email,
      password,
      phoneNumber,
      firstName,
      lastName,
      address,
      bio,
      birthDate,
      gender,
    } = newUser.user;

    const existUser = await this.prismaService.user.findUnique({
      where: {
        email,
      },
    });

    if (existUser) {
      throw new BadRequestException('User already exist with this email!');
    }

    const user = await this.prismaService.user.create({
      data: {
        name,
        email,
        password,
        phoneNumber,
        firstName,
        lastName,
        address,
        bio,
        birthDate,
        gender,
      },
    });

    return { user, response };
  }

  //login service
  async login(LoginDto: LoginDto) {
    try {
      const { email, password } = LoginDto;
      const user = await this.prismaService.user.findUnique({
        where: {
          email,
        },
      });

      if (user && (await this.comparePassword(password, user.password))) {
        const tokenSender = new TokenSender(
          this.configService,
          this.jwtService,
        );
        return tokenSender.sendToken(user);
      } else {
        throw new BadRequestException('Email or password is incorrect!');
      }
    } catch (error) {
      throw new BadRequestException('Email or password is incorrect!');
    }
  }

  async comparePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  //generate forgot password link
  async generateForgotPasswordLink(user: User) {
    const forgotPasswordToken = this.jwtService.sign(
      {
        user,
      },
      {
        secret: this.configService.get('FORGOT_PASSWORD_SECRET'),
        expiresIn: '5m',
      },
    );
    return forgotPasswordToken;
  }

  //forgot password
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    const user = await this.prismaService.user.findUnique({
      where: {
        email,
      },
    });
    if (!user) {
      throw new BadRequestException('User not found with this email!');
    }

    const forgotPasswordToken = await this.generateForgotPasswordLink(user);
    const resetPasswordUrl =
      this.configService.get<string>('CLIENT_SIDE_URI') +
      `/reset-password?verify=${forgotPasswordToken}`;

    await this.emailService.sendMail({
      email,
      subject: 'Reset your password',
      template: './forgot-password',
      name: user.name,
      activationCode: resetPasswordUrl,
    });
    return { message: 'Your forgot password request successful' };
  }

  //reset password

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { password, activationToken } = resetPasswordDto;

    const decoded = await this.jwtService.decode(activationToken);

    if (!decoded || decoded?.exp * 1000 < Date.now()) {
      throw new BadRequestException('Invalid token!');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prismaService.user.update({
      where: {
        id: decoded.user.id,
      },
      data: {
        password: hashedPassword,
      },
    });
    return { user };
  }

  // get logged in user
  async getLoggedInUser(req: any) {
    const user = req.user;
    const accessToken = req.accessToken;
    const refreshToken = req.refreshToken;

    return { user, refreshToken, accessToken };
  }

  //logout user

  async logout(req: any) {
    req.user = null;
    req.refreshToken = null;
    req.accessToken = null;
    return { message: 'Logged out successfully!' };
  }

  async getUsers() {
    return this.prismaService.user.findMany({});
  }

  async getUserByName(getUserByNameDto: GetUserByNameDto) {
    try {
      const { name } = getUserByNameDto;
      const user = await this.prismaService.user.findUnique({
        where: {
          name,
        },
      });
      if (user) {
        return user;
      } else {
        throw new BadRequestException('User not found!');
      }
    } catch (error) {
      throw new BadRequestException('Error!');
    }
  }
}
