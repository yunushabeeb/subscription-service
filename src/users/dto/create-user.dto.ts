import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'Yunus Habeeb',
    description: 'Full name of the user',
  })
  // Name must be a non-empty string
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'yunus@example.com',
    description: 'Valid email address',
  })
  // Email must be valid and not empty
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'StrongPass@123',
    description: 'Minimum 8 characters',
  })
  // Password must be at least 8 characters long
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
