import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VerificationCode } from './entities/verification-code.entity';
import { Usuario } from '../usuario/entities/usuario.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { MailService } from '../mail/mail.service';
import { SendCodeDto } from './dto/send-code.dto';
import { ValidateCodeDto } from './dto/validate-code.dto';
import { v4 as uuidv4 } from 'uuid';
import { SecurityClientService } from '../../common/security/security-client.service';

@Injectable()
export class VerificationCodeService {
  private readonly logger = new Logger(VerificationCodeService.name);

  constructor(
    @InjectRepository(VerificationCode)
    private verificationRepo: Repository<VerificationCode>,
    @InjectRepository(Usuario)
    private usuarioRepo: Repository<Usuario>,
    @InjectRepository(Tenant)
    private tenantRepo: Repository<Tenant>,
    private mailService: MailService,
    private securityClientService: SecurityClientService,
  ) {}

  /**
   * Genera y envía un código de verificación para recuperación de contraseña.
   */
  async sendVerificationCode(dto: SendCodeDto): Promise<any> {
    const { tenant, username } = dto;
    this.logger.log(`Processing verification code request for tenant: [${tenant}], user: [${username}]`);

    const tenantEntity = await this.findTenant(tenant);
    const usuario = await this.findUserByUsernameAndTenant(username, tenantEntity.id);

    const email = await this.decryptEmailOrPassthrough(usuario.email);
    if (!email) {
      throw new BadRequestException(`User ${username} does not have an email registered.`);
    }

    await this.verificationRepo.update(
      { usuarioId: usuario.id, verificationType: 'PR', status: 'E' },
      { status: 'C', updatedBy: 'SYSTEM' },
    );

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const requestId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    const verification = this.verificationRepo.create({
      usuarioId: usuario.id,
      username: usuario.username,
      usernameHmac: usuario.username_hmac,
      email: usuario.email,
      emailHmac: usuario.email_hmac,
      tenantId: tenantEntity.id,
      verificationType: 'PR',
      code,
      requestId,
      status: 'E',
      attempts: 0,
      maxAttempts: 5,
      expiresAt,
      createdBy: 'SYSTEM',
      emailProvider: 'RESEND',
    });

    await this.verificationRepo.save(verification);

    try {
      const resendResponse = await this.mailService.sendVerificationCode(email.trim(), code);

      if (resendResponse.error) {
        this.logger.error(`Resend API Error: ${resendResponse.error.message}`);
        throw new BadRequestException(`Resend API Error: ${resendResponse.error.message}`);
      }

      await this.verificationRepo.update(verification.requestId, {
        sentAt: new Date(),
        providerMessageId: resendResponse.data?.id || null,
      });

      return {
        status: 'OK',
        success: true,
        message: 'Verification code sent.',
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to send email to user ${username}: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to send verification email.');
    }
  }

  /**
   * Valida un código de verificación proporcionado por el usuario.
   */
  async validateCode(dto: ValidateCodeDto): Promise<any> {
    const { tenant, username, code } = dto;
    this.logger.log(`Validating code for tenant: [${tenant}], user: [${username}]`);

    const tenantEntity = await this.findTenant(tenant);
    const usuario = await this.findUserByUsernameAndTenant(username, tenantEntity.id);

    const verification = await this.verificationRepo.findOne({
      where: { usuarioId: usuario.id, verificationType: 'PR' },
      order: { createdAt: 'DESC' },
    });

    if (!verification) {
      throw new BadRequestException('No verification code found for this user.');
    }

    if (verification.status !== 'E') {
      throw new BadRequestException('Verification code is not active.');
    }

    if (new Date() > verification.expiresAt) {
      await this.verificationRepo.update(verification.requestId, { status: 'X', updatedBy: 'SYSTEM' });
      throw new BadRequestException('Verification code has expired.');
    }

    if (verification.attempts >= verification.maxAttempts) {
      await this.verificationRepo.update(verification.requestId, { status: 'B', updatedBy: 'SYSTEM' });
      throw new BadRequestException('Too many attempts. Code blocked.');
    }

    if (verification.code !== code) {
      await this.verificationRepo.increment({ requestId: verification.requestId }, 'attempts', 1);

      if (verification.attempts + 1 >= verification.maxAttempts) {
        await this.verificationRepo.update(verification.requestId, { status: 'B', updatedBy: 'SYSTEM' });
      }

      throw new BadRequestException('Invalid verification code.');
    }

    await this.verificationRepo.update(verification.requestId, {
      status: 'V',
      validatedAt: new Date(),
      updatedBy: 'SYSTEM',
    });

    return {
      status: 'OK',
      success: true,
      validated: true,
    };
  }

  private async findTenant(tenant: string): Promise<Tenant> {
    const tenantCode = tenant.trim().toLowerCase();
    const tenantEntity = await this.tenantRepo.findOne({ where: { nombre: tenantCode } });

    if (!tenantEntity) {
      throw new NotFoundException(`Tenant ${tenant} not found.`);
    }

    return tenantEntity;
  }

  private async findUserByUsernameAndTenant(username: string, tenantId: number): Promise<Usuario> {
    const usernameHmac = (await this.securityClientService.encrypt(username)).hmac;
    const usuario = await this.usuarioRepo.findOne({
      where: { username_hmac: usernameHmac, tenantId },
    });

    if (!usuario) {
      throw new NotFoundException(`User ${username} not found.`);
    }

    return usuario;
  }

  private async decryptEmailOrPassthrough(value: string | null): Promise<string | null> {
    if (!value) {
      return null;
    }

    try {
      return await this.securityClientService.decrypt(value);
    } catch {
      return value;
    }
  }
}
