import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

@Injectable()
export class HashService {
  private algorithm = 'aes-256-cbc';
  private key: Buffer; // chave secreta de 32 bytes
  private ivLength = 16; // 16 bytes para AES-256-CBC

  constructor() {
    // Gere uma chave secreta a partir de uma senha fixa (ou carregue de variável de ambiente)
    const password = 'minha-chave-secreta-super-segura';
    this.key = scryptSync(password, 'salt-unico', 32); // Deriva 32 bytes
  }

  private encrypt(text: string): string {
    const iv = randomBytes(this.ivLength); // Gera IV aleatório
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex'); // Junta IV e texto cifrado
  }

  decrypt(encrypted: string): string {
    const [ivHex, encryptedHex] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');
    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return decrypted.toString('utf8');
  }

  hash(value: string): string {
    return this.encrypt(value)
  }
}