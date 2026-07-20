import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ schema: 'security', name: 'usuario' })
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column({ name: 'username_hmac', nullable: true })
  username_hmac: string;

  @Column({ nullable: true })
  email: string;

  @Column({ name: 'email_hmac', nullable: true })
  email_hmac: string;

  @Column({ nullable: true })
  rut: string;

  @Column({ name: 'rut_hmac', nullable: true })
  rut_hmac: string;

  @Column({ nullable: true })
  nombre: string;

  @Column({ name: 'nombre_hmac', nullable: true })
  nombre_hmac: string;

  @Column({ name: 'apellido_paterno', nullable: true })
  apellido_paterno: string;

  @Column({ name: 'apellido_paterno_hmac', nullable: true })
  apellido_paterno_hmac: string;

  @Column({ name: 'apellido_materno', nullable: true })
  apellido_materno: string;

  @Column({ name: 'apellido_materno_hmac', nullable: true })
  apellido_materno_hmac: string;

  @Column({ nullable: true })
  telefono: string;

  @Column({ name: 'telefono_hmac', nullable: true })
  telefono_hmac: string;

  @Column({ name: 'tenant_id' })
  tenantId: number;
}
