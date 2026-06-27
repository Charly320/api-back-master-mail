import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ schema: 'security', name: 'usuario' })
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column({ nullable: true })
  email: string;

  @Column({ name: 'tenant_id' })
  tenantId: number;
}
