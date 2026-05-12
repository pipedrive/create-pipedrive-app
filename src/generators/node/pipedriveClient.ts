import dedent from 'dedent';
import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { GeneratorOptions } from '../interface.js';

export async function generatePipedriveClient(outputDir: string, _options: GeneratorOptions): Promise<void> {
	await writeFile(
		join(outputDir, 'src/pipedrive/client.ts'),
		dedent`
			import * as v2 from 'pipedrive/v2';
			import * as v1 from 'pipedrive/v1';
			import { getTokenByCompany, upsertToken } from '../database/tokenRepository.js';

			const oauth2 = new v2.OAuth2Configuration({
				clientId: process.env.PIPEDRIVE_CLIENT_ID ?? '',
				clientSecret: process.env.PIPEDRIVE_CLIENT_SECRET ?? '',
				redirectUri: process.env.PIPEDRIVE_REDIRECT_URI ?? '',
			});

			export async function getClient(companyId: number) {
				const stored = await getTokenByCompany(companyId);
				oauth2.updateToken(stored?.token ?? null);
				// For multi-user access, accept userId as a second parameter and use getToken(companyId, userId).
				oauth2.onTokenUpdate = (token) => {
					if (stored) upsertToken(stored.companyId, stored.userId, token);
				};

				const accessToken = oauth2.getAccessToken;
				const basePath = oauth2.basePath;

				return {
					deals: new v2.DealsApi(new v2.Configuration({ accessToken, basePath })),
					persons: new v2.PersonsApi(new v2.Configuration({ accessToken, basePath })),
					organizations: new v2.OrganizationsApi(new v2.Configuration({ accessToken, basePath })),
					notes: new v1.NotesApi(new v1.Configuration({ accessToken, basePath })),
				};
			}
		`,
	);
}
