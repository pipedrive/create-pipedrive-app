import dedent from 'dedent';
import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { GeneratorOptions } from '../interface.js';

export async function generatePipedriveClient(
	outputDir: string,
	_options: GeneratorOptions,
): Promise<void> {
	// pipedrive v21 ships no .d.ts files; this shim satisfies tsc
	await writeFile(
		join(outputDir, 'src/pipedrive/pipedrive.d.ts'),
		`declare module 'pipedrive';\n`,
	);

	await writeFile(
		join(outputDir, 'src/pipedrive/client.ts'),
		dedent`
			import { Configuration, DealsApi, PersonsApi, OrganizationsApi } from 'pipedrive';

			interface TokenRecord {
				accessToken: string;
				expiresAt: Date;
			}

			// TODO: replace with database module call
			async function getStoredToken(_companyId: number): Promise<TokenRecord> {
				throw new Error('getStoredToken not implemented — wire up database module');
			}

			// TODO: replace with oauth module call
			async function refreshStoredToken(_companyId: number): Promise<TokenRecord> {
				throw new Error('refreshStoredToken not implemented — wire up oauth module');
			}

			async function getValidToken(companyId: number): Promise<string> {
				let token = await getStoredToken(companyId);
				if (token.expiresAt <= new Date()) {
					token = await refreshStoredToken(companyId);
				}
				return token.accessToken;
			}

			export async function getClient(companyId: number) {
				const accessToken = await getValidToken(companyId);
				const config = new Configuration({ accessToken });
				return {
					deals: new DealsApi(config),
					persons: new PersonsApi(config),
					organizations: new OrganizationsApi(config),
				};
			}
		`,
	);
}
