import dedent from 'dedent';
import { join } from 'path';
import { writeFile } from '../../../utils/writeFile.js';
import { modalReactSnippets } from './modal.js';
import { panelReactSnippets, type ReactSnippetContribution } from './panel.js';
import { sdkWrapperContent } from './sdk.js';
import { stylesContent } from './styles.js';

interface AppExtensionFrontendOptions {
	hasPanel: boolean;
	hasModal: boolean;
}

const frontendRoot = 'frontend/app-extension-ui';

export async function generateFrontend(outputDir: string, options: AppExtensionFrontendOptions): Promise<void> {
	await writeFile(join(outputDir, frontendRoot, 'vite.config.ts'), viteConfigContent());
	await writeFile(join(outputDir, frontendRoot, 'index.html'), indexHtmlContent());
	await writeFile(join(outputDir, frontendRoot, 'tsconfig.json'), JSON.stringify(frontendTsConfig(), null, 2));
	await writeFile(join(outputDir, frontendRoot, 'src/config.ts'), configContent(options));
	await writeFile(join(outputDir, frontendRoot, 'src/main.tsx'), mainContent());
	await writeFile(join(outputDir, frontendRoot, 'src/pipedriveSdk.ts'), sdkWrapperContent());
	await writeFile(join(outputDir, frontendRoot, 'src/App.tsx'), appContent(options));
	await writeFile(join(outputDir, frontendRoot, 'src/styles.css'), stylesContent());
}

function viteConfigContent(): string {
	return dedent`
		import { fileURLToPath, URL } from 'node:url';
		import react from '@vitejs/plugin-react';
		import { defineConfig } from 'vite';

		const root = fileURLToPath(new URL('.', import.meta.url));

		export default defineConfig({
			root,
			base: '/extensions/',
			plugins: [react()],
			css: {
				postcss: {},
			},
			build: {
				outDir: 'dist',
				emptyOutDir: true,
			},
			server: {
				host: '0.0.0.0',
				port: 5173,
			},
			preview: {
				host: '0.0.0.0',
				port: 4173,
			},
		});
	`;
}

function indexHtmlContent(): string {
	return dedent`
		<!doctype html>
		<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>Pipedrive App Extension</title>
			</head>
			<body>
				<div id="root"></div>
				<script type="module" src="/src/main.tsx"></script>
			</body>
		</html>
	`;
}

function frontendTsConfig(): Record<string, unknown> {
	return {
		compilerOptions: {
			target: 'ES2020',
			useDefineForClassFields: true,
			lib: ['DOM', 'DOM.Iterable', 'ES2020'],
			allowJs: false,
			skipLibCheck: true,
			esModuleInterop: true,
			allowSyntheticDefaultImports: true,
			strict: true,
			forceConsistentCasingInFileNames: true,
			module: 'ESNext',
			moduleResolution: 'Bundler',
			resolveJsonModule: true,
			isolatedModules: true,
			noEmit: true,
			jsx: 'react-jsx',
			types: ['vite/client', 'node'],
		},
		include: ['src', 'vite.config.ts'],
	};
}

function configContent(options: AppExtensionFrontendOptions): string {
	const defaultSurface = options.hasPanel ? 'panel' : 'modal';

	return dedent`
		export const EXTENSION_CONFIG = {
			hasPanel: ${String(options.hasPanel)},
			hasModal: ${String(options.hasModal)},
			defaultSurface: '${defaultSurface}',
			modalActionId: 'custom-modal',
		} as const;
	`;
}

function mainContent(): string {
	return dedent`
		import { StrictMode } from 'react';
		import { createRoot } from 'react-dom/client';
		import App from './App';
		import './styles.css';

		const rootElement = document.getElementById('root');

		if (!rootElement) {
			throw new Error('Root element not found');
		}

		createRoot(rootElement).render(
			<StrictMode>
				<App />
			</StrictMode>,
		);
	`;
}

function mergeSnippetContributions(contributions: ReactSnippetContribution[]): ReactSnippetContribution {
	return {
		sdkImports: [...new Set(contributions.flatMap((contribution) => contribution.sdkImports))],
		handlers: contributions.flatMap((contribution) => contribution.handlers),
		buttons: contributions.flatMap((contribution) => contribution.buttons),
	};
}

function appContent(options: AppExtensionFrontendOptions): string {
	const snippets = mergeSnippetContributions([
		...(options.hasPanel ? [panelReactSnippets(options.hasModal)] : []),
		...(options.hasModal ? [modalReactSnippets()] : []),
	]);
	const sdkImport =
		snippets.sdkImports.length > 0
			? `import { ${snippets.sdkImports.join(', ')} } from '@pipedrive/app-extensions-sdk';\n`
			: '';
	const actionHandlers = snippets.handlers.join('\n\n');
	const actionButtons = snippets.buttons.join('\n');

	return dedent`
		${sdkImport}import { EXTENSION_CONFIG } from './config';
		import { type Surface, usePipedriveSdk } from './pipedriveSdk';

		function detectSurface(): Surface {
			const path = window.location.pathname;

			if (EXTENSION_CONFIG.hasModal && path.includes('/modal')) return 'modal';
			if (EXTENSION_CONFIG.hasPanel && path.includes('/panel')) return 'panel';

			return EXTENSION_CONFIG.defaultSurface;
		}

		function surfaceLabel(surface: Surface): string {
			return surface === 'modal' ? 'Custom Modal' : 'Custom Panel';
		}

		function formatQueryValue(key: string, value: string): string {
			return /token|secret|code/i.test(key) ? 'Present' : value;
		}

		function formatData(data: unknown): string {
			if (data === null || data === undefined || data === '') return 'None';
			if (typeof data === 'string') return data;

			return JSON.stringify(data, null, 2);
		}

		export default function App() {
			const surface = detectSurface();
			const {
				context,
				status,
				theme,
				visibility,
				pageState,
				lastAction,
				signedTokenPreview,
				isReady,
				runSdkAction,
				actions,
			} = usePipedriveSdk(surface);
			const queryEntries = Object.entries(context.query);

			${actionHandlers}

			return (
				<main className={'app app--' + surface}>
					<header className="topbar">
						<div>
							<span className="surface-label">{surfaceLabel(surface)}</span>
							<h1>Pipedrive App Extension</h1>
						</div>
						<span className={isReady ? 'status status--ready' : 'status'}>{status}</span>
					</header>

					<section className="summary-grid" aria-label="Extension state">
						<div className="stat">
							<span>Theme</span>
							<strong>{theme}</strong>
						</div>
						<div className="stat">
							<span>Extension</span>
							<strong>{visibility}</strong>
						</div>
						<div className="stat">
							<span>Page</span>
							<strong>{pageState}</strong>
						</div>
						<div className="stat">
							<span>Token</span>
							<strong>{context.tokenPresent ? 'Present' : 'Absent'}</strong>
						</div>
					</section>

					<section className="toolbar" aria-label="SDK actions">
						<button type="button" disabled={!isReady} onClick={actions.showSnackbar}>
							Snackbar
						</button>
						<button type="button" disabled={!isReady} onClick={actions.showConfirmation}>
							Confirm
						</button>
						<button type="button" disabled={!isReady} onClick={actions.getSignedToken}>
							Signed token
						</button>
						<button type="button" disabled={!isReady} onClick={actions.resize}>
							Resize {surface}
						</button>
						${actionButtons}
					</section>

					<section className="content-grid">
						<article className="panel">
							<h2>Iframe context</h2>
							{queryEntries.length > 0 ? (
								<dl className="key-values">
									{queryEntries.map(([key, value]) => (
										<div key={key}>
											<dt>{key}</dt>
											<dd>{formatQueryValue(key, value)}</dd>
										</div>
									))}
								</dl>
							) : (
								<p className="empty">No query params</p>
							)}
						</article>

						<article className="panel">
							<h2>SDK state</h2>
							<dl className="key-values">
								<div>
									<dt>Last action</dt>
									<dd>{lastAction}</dd>
								</div>
								<div>
									<dt>Signed token</dt>
									<dd>{signedTokenPreview}</dd>
								</div>
								<div>
									<dt>Data</dt>
									<dd>
										<pre>{formatData(context.data)}</pre>
									</dd>
								</div>
							</dl>
						</article>
					</section>
				</main>
			);
		}
	`;
}
