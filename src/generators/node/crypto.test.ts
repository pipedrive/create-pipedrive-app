import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

describe('generateCrypto', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(join(tmpdir(), 'cpa-crypto-test-'));
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	it('generates src/crypto/encrypt.ts', async () => {
		const { generateCrypto } = await import('./crypto.js');
		await generateCrypto(tmpDir);
		const content = await readFile(join(tmpDir, 'src/crypto/encrypt.ts'), 'utf8');
		expect(content).toContain("from 'node:crypto'");
		expect(content).toContain('aes-256-gcm');
		expect(content).toContain('ENCRYPTION_KEY');
		expect(content).toContain('export function encrypt');
		expect(content).toContain('export function decrypt');
		expect(content).toContain('randomBytes(12)');
		expect(content).toContain('getAuthTag');
		expect(content).toContain('base64url');
	});

	it('generated encrypt/decrypt round-trips correctly', async () => {
		const { generateCrypto } = await import('./crypto.js');
		await generateCrypto(tmpDir);

		const runner = join(tmpDir, 'test-runner.ts');
		await writeFile(
			runner,
			`
import { encrypt, decrypt } from '${join(tmpDir, 'src/crypto/encrypt.ts')}';
process.env.ENCRYPTION_KEY = 'a'.repeat(64);
const plain = 'hello-token-value';
const enc = encrypt(plain);
const dec = decrypt(enc);
if (dec !== plain) throw new Error(\`expected \${plain}, got \${dec}\`);
const parts = enc.split('.');
if (parts.length !== 3) throw new Error('expected 3 parts');
console.log('ok');
`,
		);
		const { execSync } = await import('node:child_process');
		const out = execSync(`./node_modules/.bin/tsx ${runner}`, {
			cwd: repoRoot,
		})
			.toString()
			.trim();
		expect(out).toBe('ok');
	});
});
