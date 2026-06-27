import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationCodeService } from './verification.service';
import { VerificationController } from './verification.controller';
import { VerificationCode } from './entities/verification-code.entity';
import { Usuario } from '../usuario/entities/usuario.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VerificationCode, Usuario, Tenant]),
    MailModule,
  ],
  providers: [VerificationCodeService],
  controllers: [VerificationController],
})
export class VerificationModule {}
