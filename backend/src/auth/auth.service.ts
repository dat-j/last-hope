import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createUser(email: string, name: string, password: string): Promise<User> {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = this.userRepository.create({
      email,
      name,
      passwordHash,
    });

    return this.userRepository.save(user);
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findUserById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findOrCreateTestUser(): Promise<User> {
    const testEmail = 'admin@chatbot.local';
    let user = await this.findUserByEmail(testEmail);
    
    if (!user) {
      user = await this.createUser(testEmail, 'Admin User', 'password123');
    }
    
    return user;
  }
} 