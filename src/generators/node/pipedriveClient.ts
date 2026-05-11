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

			const oauth2 = new v2.OAuth2Configuration({
				clientId: process.env.PIPEDRIVE_CLIENT_ID ?? '',
				clientSecret: process.env.PIPEDRIVE_CLIENT_SECRET ?? '',
				redirectUri: process.env.PIPEDRIVE_REDIRECT_URI ?? '',
			});

			// TODO: replace with database module call
			async function getStoredToken(_companyId: number): Promise<v2.TokenResponse | null> {
				throw new Error('getStoredToken not implemented — wire up database module');
			}

			// TODO: replace with database module call
			async function saveToken(_companyId: number, _token: v2.TokenResponse): Promise<void> {
				throw new Error('saveToken not implemented — wire up database module');
			}

			export async function getClient(companyId: number) {
				const storedToken = await getStoredToken(companyId);
				oauth2.updateToken(storedToken);
				oauth2.onTokenUpdate = (token) => saveToken(companyId, token);

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
