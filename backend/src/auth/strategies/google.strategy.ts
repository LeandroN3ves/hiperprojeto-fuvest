import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get('google.clientId') || 'dummy-id',
      clientSecret: configService.get('google.clientSecret') || 'dummy-secret',
      callbackURL: configService.get('google.callbackUrl') || 'http://localhost:3000/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback) {
    const { name, emails, photos } = profile;
    const user = {
      email: emails[0].value,
      nome: name.givenName + ' ' + name.familyName,
      provider: 'google',
    };
    done(null, user);
  }
}
