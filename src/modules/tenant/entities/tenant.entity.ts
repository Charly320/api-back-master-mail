import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ schema: 'security', name: 'tenant' })
export class Tenant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column()
  subdominio: string;
}
