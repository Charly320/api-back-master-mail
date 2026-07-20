import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationCode } from './modules/verification/entities/verification-code.entity';
import { Usuario } from './modules/shared/entities/usuario.entity';
import { Tenant } from './modules/shared/entities/tenant.entity';
import { VerificationModule } from './modules/verification/verification.module';
import { SecurityClientModule } from './common/security/security-client.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SecurityClientModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('POSTGRES_HOST'),
        port: Number(configService.get<string | number>('POSTGRES_PORT')),
        username: configService.get<string>('POSTGRES_USER'),
        password: configService.get<string>('POSTGRES_PASSWORD'),
        database: configService.get<string>('POSTGRES_DB'),
        schema: configService.get<string>('POSTGRES_SCHEMA'),
        entities: [VerificationCode, Usuario, Tenant],
        synchronize: false,
      }),
    }),
    VerificationModule,
  ],
})
export class AppModule {}
