import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
  }

  async sendVerificationCode(email: string, code: string): Promise<any> {
    try {
      let templatePath = path.join(
        __dirname,
        'templates',
        'password-recovery.html',
      );
      if (!fs.existsSync(templatePath)) {
        templatePath = path.join(
          process.cwd(),
          'src',
          'modules',
          'mail',
          'templates',
          'password-recovery.html',
        );
      }
      let htmlContent = fs.readFileSync(templatePath, 'utf8');
      htmlContent = htmlContent.replace('{{CODE}}', code);

      const from =
        this.configService.get<string>('RESEND_FROM') ||
        'onboarding@resend.dev';
      const subject = 'Recuperación de contraseña - EasyNotaria';

      // Limpieza agresiva: quitar cualquier carácter que no sea de un email válido
      const cleanEmail = email
        .toLowerCase()
        .replace(/[^a-z0-9@._+-]/g, '')
        .trim();

      this.logger.debug(`Sending email From: [${from}], To: [${cleanEmail}]`);

      const response = await this.resend.emails.send({
        from: from.trim(),
        to: cleanEmail,
        subject,
        html: htmlContent,
      });

      if (response.error) {
        this.logger.error(
          `Resend error for ${email}: ${JSON.stringify(response.error)}`,
        );
        return response; // Devolvemos el error para que el servicio lo maneje
      }

      const messageId = response.data?.id;
      if (messageId) {
        this.logger.log(`Email sent to ${email}. ID: ${messageId}`);
      } else {
        this.logger.warn(
          `Email response for ${email} did not contain an ID. Full response: ${JSON.stringify(response)}`,
        );
      }
      return response;
    } catch (error) {
      this.logger.error(`Error sending email to ${email}: ${error.message}`);
      throw error;
    }
  }
}
