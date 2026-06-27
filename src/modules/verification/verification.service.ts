import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { VerificationCode } from './entities/verification-code.entity';
import { Usuario } from '../usuario/entities/usuario.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { MailService } from '../mail/mail.service';
import { SendCodeDto } from './dto/send-code.dto';
import { ValidateCodeDto } from './dto/validate-code.dto';
import { v4 as uuidv4 } from 'uuid';

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
  ) {}

  /**
   * Genera y envía un código de verificación para recuperación de contraseña.
   */
  async sendVerificationCode(dto: SendCodeDto): Promise<any> {
    const { tenant, username } = dto;
    this.logger.log(`Processing verification code request for tenant: [${tenant}], user: [${username}]`);

    // 1. Buscar Tenant (Búsqueda más flexible para desarrollo local)
    let tenantEntity = await this.tenantRepo.findOne({ where: { subdominio: tenant } });
    
    if (!tenantEntity && (tenant === 'CharlyPiterCompany' || tenant === 'CharlyPiter')) {
      this.logger.warn(`Tenant [${tenant}] not found by subdomain, trying fallback search...`);
      // Fallback para CharlyPiter en desarrollo local
      tenantEntity = await this.tenantRepo.findOne({ 
        where: [
          { subdominio: 'CharlyPiter' },
          { nombre: 'CharlyPiter' },
          { nombre: 'CharlyPiterCompany' }
        ] 
      });
    }

    if (!tenantEntity) {
      this.logger.error(`Tenant [${tenant}] definitely not found in database.`);
      throw new NotFoundException(`Tenant ${tenant} not found.`);
    }

    this.logger.log(`Found tenant: ${tenantEntity.nombre} (ID: ${tenantEntity.id})`);

    // 2. Buscar Usuario
    const usuario = await this.usuarioRepo.findOne({
      where: { username, tenantId: tenantEntity.id },
    });
    if (!usuario) {
      throw new NotFoundException(`User ${username} not found in tenant ${tenant}.`);
    }

    if (!usuario.email) {
      throw new BadRequestException(`User ${username} does not have an email registered.`);
    }

    // 3. Cancelar códigos anteriores (tipo PR, estado E)
    await this.verificationRepo.update(
      { usuarioId: usuario.id, verificationType: 'PR', status: 'E' },
      { status: 'C', updatedBy: 'SYSTEM' },
    );

    // 4. Generar código y UUID
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const requestId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    // 5. Insertar nuevo registro
    const verification = this.verificationRepo.create({
      usuarioId: usuario.id,
      username: usuario.username,
      email: usuario.email,
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

    // 6. Enviar correo
    try {
      const resendResponse = await this.mailService.sendVerificationCode(usuario.email.trim(), code);
      
      if (resendResponse.error) {
        this.logger.error(`Resend API Error: ${resendResponse.error.message}`);
        throw new BadRequestException(`Resend API Error: ${resendResponse.error.message}`);
      }

      // 7. Actualizar datos de envío
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
      this.logger.error(`Failed to send email to ${usuario.email}: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to send verification email.');
    }
  }

  /**
   * Valida un código de verificación proporcionado por el usuario.
   */
  async validateCode(dto: ValidateCodeDto): Promise<any> {
    const { tenant, username, code } = dto;
    this.logger.log(`Validating code for tenant: [${tenant}], user: [${username}]`);

    // Buscar Tenant (Búsqueda más flexible para desarrollo local)
    let tenantEntity = await this.tenantRepo.findOne({ where: { subdominio: tenant } });

    if (!tenantEntity && (tenant === 'CharlyPiterCompany' || tenant === 'CharlyPiter')) {
      tenantEntity = await this.tenantRepo.findOne({ 
        where: [
          { subdominio: 'CharlyPiter' },
          { nombre: 'CharlyPiter' },
          { nombre: 'CharlyPiterCompany' }
        ] 
      });
    }

    if (!tenantEntity) {
      throw new NotFoundException(`Tenant ${tenant} not found.`);
    }

    // Buscar Usuario
    const usuario = await this.usuarioRepo.findOne({
      where: { username, tenantId: tenantEntity.id },
    });
    if (!usuario) {
      throw new NotFoundException(`User ${username} not found.`);
    }

    // 1. Buscar el último registro tipo PR
    const verification = await this.verificationRepo.findOne({
      where: { usuarioId: usuario.id, verificationType: 'PR' },
      order: { createdAt: 'DESC' },
    });

    if (!verification) {
      throw new BadRequestException('No verification code found for this user.');
    }

    // 2. Validaciones
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

    // 3. Verificar código
    if (verification.code !== code) {
      await this.verificationRepo.increment({ requestId: verification.requestId }, 'attempts', 1);
      
      // Si con este incremento llega al máximo
      if (verification.attempts + 1 >= verification.maxAttempts) {
        await this.verificationRepo.update(verification.requestId, { status: 'B', updatedBy: 'SYSTEM' });
      }
      
      throw new BadRequestException('Invalid verification code.');
    }

    // 4. Éxito
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
}
