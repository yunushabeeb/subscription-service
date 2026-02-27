import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  // Create a new user with the provided data, ensuring email uniqueness and password hashing
  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.usersRepository.findByEmail(
      createUserDto.email,
    );

    // If a user with the provided email already exists, throw a conflict exception
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash the user's password before storing it in the database
    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

    // Create the user in the database using the repository, passing the hashed password
    const user = await this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    // Exclude the password from the returned user object for security reasons
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  // Find a user by their email address using the repository
  async findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }

  // Find a user by their unique ID, throwing a not found exception if the user does not exist
  async findById(id: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  // Find users by their status (e.g., ACTIVE, INACTIVE) using the repository
  async findByStatus(status: UserStatus) {
    return this.usersRepository.findByStatus(status);
  }
}
