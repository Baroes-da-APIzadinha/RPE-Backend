import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

@Injectable()
export class HashService {
  hash(value: string): string {
    if (!value) return '';
    return createHash('sha256').update(value).digest('hex');
  }
} 