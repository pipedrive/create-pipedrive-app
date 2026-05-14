import dedent from 'dedent';
import { join } from 'node:path';
import { writeFile } from '../../utils/writeFile.js';

export async function generateCrypto(outputDir: string): Promise<void> {
	await writeFile(
		join(outputDir, 'src/crypto/encrypt.ts'),
		dedent`
			import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

			const ALGORITHM = 'aes-256-gcm';

			function getKey(): Buffer {
				const key = process.env.ENCRYPTION_KEY;
				if (!key) throw new Error('ENCRYPTION_KEY is required');
				const buf = Buffer.from(key, 'hex');
				if (buf.length !== 32) throw new Error('ENCRYPTION_KEY must be a 64-char hex string (32 bytes)');
				return buf;
			}

			export function encrypt(plaintext: string): string {
				const iv = randomBytes(12);
				const cipher = createCipheriv(ALGORITHM, getKey(), iv);
				const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
				const authTag = cipher.getAuthTag();
				return \`\${iv.toString('base64url')}.\${authTag.toString('base64url')}.\${ciphertext.toString('base64url')}\`;
			}

			export function decrypt(ciphertext: string): string {
				const [ivB64, authTagB64, dataB64] = ciphertext.split('.');
				if (!ivB64 || !authTagB64 || !dataB64) throw new Error('Invalid ciphertext format');
				const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64url'));
				decipher.setAuthTag(Buffer.from(authTagB64, 'base64url'));
				return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64url')), decipher.final()]).toString('utf8');
			}
		`,
	);
}
