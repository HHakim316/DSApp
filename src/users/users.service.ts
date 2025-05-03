import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(user: Partial<User>): Promise<User> {
    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOneById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id: id.toString() } });
  }

  async findOne(email: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'role', 'phoneNumber'], // ✅ Corrected to `phoneNumber`
    });

    console.log('User found in database:', user);
    return user;
  }

  // Find user by phone number
  async findOneByPhoneNumber(phoneNumber: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { phoneNumber },
      select: ['id', 'email', 'password', 'role', 'phoneNumber'], // Corrected to `phoneNumber`
    });

    console.log('User found by phone number:', user);
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: id.toString() } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    Object.assign(user, updateUserDto); // ✅ Merge new data safely
    return this.usersRepository.save(user);
  }
}
