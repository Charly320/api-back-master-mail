import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ schema: 'security', name: 'tenant' })
export class Tenant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column({ name: 'nombre_hmac', nullable: true })
  nombre_hmac: string;

  @Column({ nullable: true })
  rut: string;

  @Column({ name: 'rut_hmac', nullable: true })
  rut_hmac: string;

  @Column({ nullable: true })
  email: string;

  @Column({ name: 'email_hmac', nullable: true })
  email_hmac: string;

  @Column({ nullable: true })
  telefono: string;

  @Column({ name: 'telefono_hmac', nullable: true })
  telefono_hmac: string;

  @Column()
  subdominio: string;
}
