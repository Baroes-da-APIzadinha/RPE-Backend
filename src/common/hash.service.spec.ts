import { Test, TestingModule } from '@nestjs/testing';
import { HashService } from './hash.service';

describe('HashService', () => {
  let service: HashService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HashService],
    }).compile();

    service = module.get<HashService>(HashService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hash', () => {
    it('should hash a simple string', () => {
      const input = 'test-string';
      const result = service.hash(input);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain(':'); // Should contain IV:encrypted format
    });

    it('should generate different hashes for same input (due to random IV)', () => {
      const input = 'same-input';
      const hash1 = service.hash(input);
      const hash2 = service.hash(input);

      expect(hash1).toBeDefined();
      expect(hash2).toBeDefined();
      expect(hash1).not.toBe(hash2); // Different due to random IV
      expect(hash1).toContain(':');
      expect(hash2).toContain(':');
    });

    it('should hash empty string', () => {
      const result = service.hash('');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain(':');
    });

    it('should hash strings with special characters', () => {
      const specialStrings = [
        'áéíóú@#$%',
        '🚀🎉💻',
        'line1\nline2\ttab',
        'quotes"and\'apostrophes',
        'spaces   and   tabs\t\t',
      ];

      specialStrings.forEach(input => {
        const result = service.hash(input);
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
        expect(result).toContain(':');
      });
    });

    it('should hash very long strings', () => {
      const longString = 'a'.repeat(10000);
      const result = service.hash(longString);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain(':');
    });

    it('should have consistent IV length in output', () => {
      const inputs = ['short', 'medium-length-string', 'very-long-string'.repeat(100)];

      inputs.forEach(input => {
        const result = service.hash(input);
        const [ivHex] = result.split(':');
        
        // IV should always be 16 bytes = 32 hex characters
        expect(ivHex.length).toBe(32);
        expect(/^[0-9a-f]+$/.test(ivHex)).toBe(true); // Should be valid hex
      });
    });
  });

  describe('decrypt', () => {
    it('should decrypt a hashed value back to original', () => {
      const original = 'test-decryption';
      const hashed = service.hash(original);
      const decrypted = service.decrypt(hashed);

      expect(decrypted).toBe(original);
    });

    it('should handle multiple encrypt/decrypt cycles', () => {
      const testData = [
        'simple-string',
        'complex@string#with$symbols',
        '123456789',
        'áéíóú çñü',
        '',
        'very-long-string-that-should-be-encrypted-and-decrypted-correctly'.repeat(10),
      ];

      testData.forEach(original => {
        const hashed = service.hash(original);
        const decrypted = service.decrypt(hashed);
        expect(decrypted).toBe(original);
      });
    });

    it('should return null for null input', () => {
      const result = service.decrypt(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = service.decrypt(undefined);
      expect(result).toBeNull();
    });

    it('should return null for empty string input', () => {
      const result = service.decrypt('');
      expect(result).toBeNull();
    });

    it('should return null for non-string input', () => {
      // @ts-ignore - Testing runtime behavior
      const result = service.decrypt(123);
      expect(result).toBeNull();
    });

    it('should return original value if no colon separator found', () => {
      const input = 'no-colon-separator';
      const result = service.decrypt(input);
      expect(result).toBe(input);
    });

    it('should return null for invalid format (missing IV)', () => {
      const invalidFormats = [
        ':encryptedpart',  // Missing IV
        'ivpart:',         // Missing encrypted part
        ':',               // Both missing
        'nocolon',         // No separator (returns original)
        'multiple:colons:here', // Multiple colons (should still work with first split)
      ];

      const result1 = service.decrypt(invalidFormats[0]); // Missing IV
      const result2 = service.decrypt(invalidFormats[1]); // Missing encrypted
      const result3 = service.decrypt(invalidFormats[2]); // Both missing
      
      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toBeNull();
    });

    it('should return null for invalid hex characters', () => {
      const invalidHex = 'invalidhex:alsoinvalidhex';
      const result = service.decrypt(invalidHex);
      expect(result).toBeNull();
    });

    it('should return null for wrong IV length', () => {
      const shortIV = 'abc:def123'; // IV too short
      const result = service.decrypt(shortIV);
      expect(result).toBeNull();
    });

    it('should handle corrupted encrypted data gracefully', () => {
      // Create a valid format but with corrupted data
      const validIV = 'a'.repeat(32); // 32 hex chars for 16-byte IV
      const corruptedEncrypted = 'invalidencrypteddata';
      const corruptedInput = `${validIV}:${corruptedEncrypted}`;
      
      const result = service.decrypt(corruptedInput);
      expect(result).toBeNull();
    });

    it('should handle decryption errors gracefully', () => {
      // Create seemingly valid hex that will fail during decryption
      const fakeIV = '1234567890abcdef1234567890abcdef'; // Valid 32 hex chars
      const fakeEncrypted = '1234567890abcdef1234567890abcdef'; // Valid hex but wrong data
      const fakeInput = `${fakeIV}:${fakeEncrypted}`;
      
      const result = service.decrypt(fakeInput);
      expect(result).toBeNull();
    });
  });

  describe('encryption consistency', () => {
    it('should maintain data integrity across multiple operations', () => {
      const testData = [
        'user@example.com',
        'password123',
        'sensitive-data-here',
        JSON.stringify({ id: 123, name: 'Test User' }),
        '{"complex": "json", "with": ["arrays", "and", {"nested": "objects"}]}',
      ];

      testData.forEach(data => {
        // Hash and decrypt multiple times
        for (let i = 0; i < 5; i++) {
          const hashed = service.hash(data);
          const decrypted = service.decrypt(hashed);
          expect(decrypted).toBe(data);
        }
      });
    });

    it('should produce different encrypted outputs for same input', () => {
      const input = 'consistent-input';
      const results: string[] = [];
      
      // Generate 10 hashes of the same input
      for (let i = 0; i < 10; i++) {
        results.push(service.hash(input));
      }

      // All should be different (due to random IV)
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(10);

      // But all should decrypt to the same original value
      results.forEach(hashed => {
        expect(service.decrypt(hashed)).toBe(input);
      });
    });

    it('should handle unicode and special characters correctly', () => {
      const unicodeStrings = [
        '🔐 Encrypted Data 🔐',
        'Русский текст',
        '中文字符',
        'العربية',
        'עברית',
        'Ñañó español',
        'Café français',
        'Größe Übung',
      ];

      unicodeStrings.forEach(original => {
        const hashed = service.hash(original);
        const decrypted = service.decrypt(hashed);
        expect(decrypted).toBe(original);
      });
    });
  });

  describe('format validation', () => {
    it('should produce output in correct format', () => {
      const input = 'format-test';
      const result = service.hash(input);

      expect(result).toMatch(/^[0-9a-f]{32}:[0-9a-f]+$/); // IV:encrypted format
      
      const [ivPart, encryptedPart] = result.split(':');
      expect(ivPart.length).toBe(32); // 16 bytes = 32 hex chars
      expect(encryptedPart.length).toBeGreaterThan(0);
      expect(encryptedPart.length % 2).toBe(0); // Should be even (valid hex)
    });

    it('should handle edge cases in format parsing', () => {
      const edgeCases = [
        'a:b:c:d', // Multiple colons - should use first as separator
        '1234567890abcdef1234567890abcdef:validencrypted', // Exact IV length
      ];

      // For multiple colons, it should still attempt to parse
      const result1 = service.decrypt(edgeCases[0]);
      // This will likely return null due to invalid hex, but shouldn't crash
      expect(result1).toBeNull();
    });
  });

  describe('security considerations', () => {
    it('should use different IVs for same plaintext', () => {
      const plaintext = 'security-test';
      const hash1 = service.hash(plaintext);
      const hash2 = service.hash(plaintext);

      const [iv1] = hash1.split(':');
      const [iv2] = hash2.split(':');

      expect(iv1).not.toBe(iv2); // IVs should be different
      expect(service.decrypt(hash1)).toBe(plaintext);
      expect(service.decrypt(hash2)).toBe(plaintext);
    });

    it('should not expose internal state', () => {
      // Service should work consistently regardless of previous operations
      const test1 = 'first-test';
      const test2 = 'second-test';

      const hash1a = service.hash(test1);
      const hash2a = service.hash(test2);
      const hash1b = service.hash(test1);
      const hash2b = service.hash(test2);

      // Operations should be independent
      expect(service.decrypt(hash1a)).toBe(test1);
      expect(service.decrypt(hash2a)).toBe(test2);
      expect(service.decrypt(hash1b)).toBe(test1);
      expect(service.decrypt(hash2b)).toBe(test2);
    });
  });
});
