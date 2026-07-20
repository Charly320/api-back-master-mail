import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type EncryptResponse = {
  encrypted: string;
  hmac: string;
  algorithm: string;
};

@Injectable()
export class SecurityClientService {
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('SECURITY_API_URL') || 'http://localhost:3004/api/crypto';
  }

  async encrypt(value: string): Promise<EncryptResponse> {
    const response = await fetch(`${this.baseUrl}/encrypt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });

    if (!response.ok) {
      throw new BadGatewayException('No se pudo encriptar el dato en api-back-core-security.');
    }

    return (await response.json()) as EncryptResponse;
  }

  async decrypt(value: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/decrypt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });

    if (!response.ok) {
      throw new BadGatewayException('No se pudo desencriptar el dato desde api-back-core-security.');
    }

    const payload = (await response.json()) as { value: string };
    return payload.value;
  }

  async decryptNullable(value: string | null | undefined): Promise<string | null> {
    if (!value) {
      return null;
    }

    return this.decrypt(value);
  }
}

