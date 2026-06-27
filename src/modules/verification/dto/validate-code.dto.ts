import { IsString, IsNotEmpty, Length } from 'class-validator';

export class ValidateCodeDto {
  @IsString()
  @IsNotEmpty()
  tenant: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}
