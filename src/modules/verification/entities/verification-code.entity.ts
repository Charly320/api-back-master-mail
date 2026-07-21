import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryColumn,
} from 'typeorm';

@Entity({ schema: 'security', name: 'verification_code' })
export class VerificationCode {
  @PrimaryColumn({ name: 'request_id', type: 'uuid' })
  requestId: string;

  @Column({ name: 'user_id' })
  usuarioId: number;

  @Column({ length: 100 })
  username: string;

  @Column({ name: 'username_hmac', nullable: true })
  usernameHmac: string;

  @Column({ length: 255 })
  email: string;

  @Column({ name: 'email_hmac', nullable: true })
  emailHmac: string;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  @Column({ name: 'verification_type', length: 2 })
  verificationType: string; // PR, EM, 2F, etc.

  @Column({ length: 6 })
  code: string;

  @Column({ length: 1, default: 'E' })
  status: string; // E: En enviado, V: Validado, C: Cancelado, B: Bloqueado, X: Expirado

  @Column({ default: 0 })
  attempts: number;

  @Column({ name: 'max_attempts', default: 5 })
  maxAttempts: number;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', default: 'SYSTEM' })
  createdBy: string;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt: Date;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string;

  @Column({ name: 'email_provider', nullable: true })
  emailProvider: string;

  @Column({ name: 'sent_at', nullable: true })
  sentAt: Date;

  @Column({ name: 'validated_at', nullable: true })
  validatedAt: Date;

  @Column({ name: 'provider_message_id', nullable: true })
  providerMessageId: string;
}
