import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  // Name must be a non-empty string
  @IsString()
  @IsNotEmpty()
  name: string;

  // Email must be valid and not empty
  @IsEmail()
  @IsNotEmpty()
  email: string;

  // Password must be at least 8 characters long
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
