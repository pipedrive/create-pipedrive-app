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

			function base64url(data: string): string {
				return Buffer.from(data).toString('base64url');
			}

			function getClientSecret(): string {
				const secret = process.env.PIPEDRIVE_CLIENT_SECRET;
				if (!secret) throw new Error('PIPEDRIVE_CLIENT_SECRET is required');
				return secret;
			}

			export function createState(): string {
				const payload = JSON.stringify({ nonce: randomBytes(16).toString('hex'), exp: Date.now() + STATE_TTL_MS });
				const encoded = base64url(payload);
				const sig = createHmac('sha256', getClientSecret()).update(encoded).digest('base64url');
				return \`\${encoded}.\${sig}\`;
			}

			export function verifyState(state: string): boolean {
				const dot = state.lastIndexOf('.');
				if (dot === -1) return false;
				const encoded = state.slice(0, dot);
				const sig = state.slice(dot + 1);
				const expected = createHmac('sha256', getClientSecret()).update(encoded).digest('base64url');
				const sigBuf = Buffer.from(sig, 'base64url');
				const expectedBuf = Buffer.from(expected, 'base64url');
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
		dedent`
			import { Router } from 'express';
			import * as v2 from 'pipedrive/v2';
			import { upsertToken } from '../database/tokenRepository.js';
			import { createState, verifyState } from './state.js';

			const oauth2 = new v2.OAuth2Configuration({
				clientId: process.env.PIPEDRIVE_CLIENT_ID ?? '',
				clientSecret: process.env.PIPEDRIVE_CLIENT_SECRET ?? '',
				redirectUri: process.env.PIPEDRIVE_REDIRECT_URI ?? '',
			});

			export function createAuthRedirect(): string {
				const state = createState();
				return \`\${oauth2.authorizationUrl}&state=\${encodeURIComponent(state)}\`;
			}

			const router = Router();

			router.get('/callback', async (req, res, next) => {
				const { code, state } = req.query as { code?: string; state?: string };

				if (!state || !verifyState(state)) {
					res.status(400).send('Invalid state parameter');
					return;
				}

				if (!code) {
					res.status(400).send('Missing authorization code');
					return;
				}

				try {
					const token = await oauth2.authorize(code);

					if (!token.api_domain) throw new Error('Missing api_domain in token response');

					const apiDomain = token.api_domain.replace('https://', '').replace('http://', '');
					const response = await fetch(\`https://\${apiDomain}/v1/users/me\`, {
						headers: { Authorization: \`Bearer \${token.access_token}\` },
					});

					if (!response.ok) throw new Error(\`/v1/users/me returned \${response.status}\`);

					const { data } = (await response.json()) as { data: { id: number; company_id: number } };

					await upsertToken(data.company_id, data.id, token);
					res.redirect('/');
				} catch (err) {
					next(err);
				}
			});

			export default router;
		`,
	);
}
