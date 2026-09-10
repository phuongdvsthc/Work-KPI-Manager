import crypto from 'crypto';

// The encryption key should ideally come from process.env.AI_CONFIG_ENCRYPTION_KEY
// We use a fallback strictly for development/testing if not provided.
const ENCRYPTION_KEY = process.env.AI_CONFIG_ENCRYPTION_KEY || 'fallback_secret_key_32_bytes_long_!!!'; // 32 bytes required for AES-256
const ALGORITHM = 'aes-256-gcm';

// Normalize key to exactly 32 bytes
const normalizedKey = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();

export const aiCrypto = {
  encrypt(text: string): { encryptedText: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, normalizedKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    return {
      encryptedText: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag
    };
  },

  decrypt(encryptedText: string, ivHex: string, authTagHex: string): string {
    const decipher = crypto.createDecipheriv(
      ALGORITHM, 
      normalizedKey, 
      Buffer.from(ivHex, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
};
