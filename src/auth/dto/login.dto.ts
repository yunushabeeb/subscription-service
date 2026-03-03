import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'yunus@example.com',
    description: 'Registered email address',
  })
  // Email must be valid and not empty
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'StrongPass@123',
    description: 'Account password',
  })
  // Password must be a non-empty string
  @IsString()
  @IsNotEmpty()
  password: string;
}
