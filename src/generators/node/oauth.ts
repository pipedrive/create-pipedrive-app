import dedent from 'dedent';
import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { GeneratorOptions } from '../interface.js';

export async function generateOauth(outputDir: string, _options: GeneratorOptions): Promise<void> {
	await generateOauthState(outputDir);
	await generateOauthRouter(outputDir);
}

async function generateOauthState(outputDir: string): Promise<void> {
	await writeFile(
		join(outputDir, 'src/oauth/state.ts'),
		dedent`
			import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

			const STATE_TTL_MS = 5 * 60 * 1000;

			const CLIENT_SECRET = process.env.PIPEDRIVE_CLIENT_SECRET!;
			if (!CLIENT_SECRET) throw new Error('PIPEDRIVE_CLIENT_SECRET is required');

			function base64url(data: string): string {
				return Buffer.from(data).toString('base64url');
			}

			export function createState(): string {
				const payload = JSON.stringify({ nonce: randomBytes(16).toString('hex'), exp: Date.now() + STATE_TTL_MS });
				const encoded = base64url(payload);
				const sig = createHmac('sha256', CLIENT_SECRET).update(encoded).digest('base64url');
				return \`\${encoded}.\${sig}\`;
			}

			export function verifyState(state: string): boolean {
				const dot = state.lastIndexOf('.');
				if (dot === -1) return false;
				const encoded = state.slice(0, dot);
				const sig = state.slice(dot + 1);
				const expected = createHmac('sha256', CLIENT_SECRET).update(encoded).digest('base64url');
				const sigBuf = Buffer.from(sig);
				const expectedBuf = Buffer.from(expected);
				if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return false;
				try {
					const { exp } = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as { exp: number };
					return Date.now() < exp;
				} catch {
					return false;
				}
			}
		`,
	);
}

async function generateOauthRouter(outputDir: string): Promise<void> {
	await writeFile(
		join(outputDir, 'src/oauth/index.ts'),
		`import { Router } from 'express';\n\nexport default Router();`,
	);
}
