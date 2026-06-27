import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { VerificationCodeService } from './verification.service';
import { SendCodeDto } from './dto/send-code.dto';
import { ValidateCodeDto } from './dto/validate-code.dto';

@Controller('v1/verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationCodeService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendCode(@Body() sendCodeDto: SendCodeDto) {
    return this.verificationService.sendVerificationCode(sendCodeDto);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateCode(@Body() validateCodeDto: ValidateCodeDto) {
    return this.verificationService.validateCode(validateCodeDto);
  }
}
