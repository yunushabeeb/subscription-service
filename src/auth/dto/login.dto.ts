import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  // Email must be valid and not empty
  @IsEmail()
  @IsNotEmpty()
  email: string;

  // Password must be a non-empty string
  @IsString()
  @IsNotEmpty()
  password: string;
}
