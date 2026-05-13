import dedent from 'dedent';
import { join } from 'path';
import { writeFile } from '../../../utils/writeFile.js';
import { sdkWrapperContent } from './sdk.js';
import { stylesContent } from './styles.js';

interface AppExtensionFrontendOptions {
	hasPanel: boolean;
	hasModal: boolean;
}

const frontendRoot = 'frontend/app-extension-ui';

export async function generateFrontend(outputDir: string, options: AppExtensionFrontendOptions): Promise<void> {
	await writeFile(join(outputDir, frontendRoot, 'vite.config.ts'), viteConfigContent());
	await writeFile(join(outputDir, frontendRoot, 'tsconfig.json'), JSON.stringify(frontendTsConfig(), null, 2));
	await writeFile(join(outputDir, frontendRoot, 'shared/pipedriveSdk.ts'), sdkWrapperContent());
	await writeFile(join(outputDir, frontendRoot, 'shared/styles.css'), stylesContent());
	await writeFile(join(outputDir, frontendRoot, 'index.html'), indexHtmlContent());
	await writeFile(join(outputDir, frontendRoot, 'src/main.tsx'), mainContent(options));

	if (options.hasPanel) {
		await writeFile(join(outputDir, frontendRoot, 'src/Panel.tsx'), panelComponentContent(options.hasModal));
	}

	if (options.hasModal) {
		await writeFile(join(outputDir, frontendRoot, 'src/Modal.tsx'), modalComponentContent());
	}
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
				<script type="module" src="./src/main.tsx"></script>
			</body>
		</html>
	`;
}

function mainContent(options: AppExtensionFrontendOptions): string {
	if (options.hasPanel && options.hasModal) {
		return dedent`
			import { StrictMode } from 'react';
			import { createRoot } from 'react-dom/client';
			import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
			import Modal from './Modal';
			import Panel from './Panel';
			import '../shared/styles.css';

			const rootElement = document.getElementById('root');
			if (!rootElement) throw new Error('Root element not found');

			createRoot(rootElement).render(
				<StrictMode>
					<BrowserRouter>
						<Routes>
							<Route path="/extensions/panel" element={<Panel />} />
							<Route path="/extensions/modal" element={<Modal />} />
							<Route path="*" element={<Navigate to="/extensions/panel" replace />} />
						</Routes>
					</BrowserRouter>
				</StrictMode>,
			);
		`;
	}

	if (options.hasModal) {
		return dedent`
			import { StrictMode } from 'react';
			import { createRoot } from 'react-dom/client';
			import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
			import Modal from './Modal';
			import '../shared/styles.css';

			const rootElement = document.getElementById('root');
			if (!rootElement) throw new Error('Root element not found');

			createRoot(rootElement).render(
				<StrictMode>
					<BrowserRouter>
						<Routes>
							<Route path="/extensions/modal" element={<Modal />} />
							<Route path="*" element={<Navigate to="/extensions/modal" replace />} />
						</Routes>
					</BrowserRouter>
				</StrictMode>,
			);
		`;
	}

	return dedent`
		import { StrictMode } from 'react';
		import { createRoot } from 'react-dom/client';
		import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
		import Panel from './Panel';
		import '../shared/styles.css';

		const rootElement = document.getElementById('root');
		if (!rootElement) throw new Error('Root element not found');

		createRoot(rootElement).render(
			<StrictMode>
				<BrowserRouter>
					<Routes>
						<Route path="/extensions/panel" element={<Panel />} />
						<Route path="*" element={<Navigate to="/extensions/panel" replace />} />
					</Routes>
				</BrowserRouter>
			</StrictMode>,
		);
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
		include: ['src', 'shared', 'vite.config.ts'],
	};
}

function panelComponentContent(hasModal: boolean): string {
	const sdkImportLine = hasModal ? "import { Command, Modal } from '@pipedrive/app-extensions-sdk';" : '';
	const runSdkActionDestructure = hasModal ? ', runSdkAction' : '';
	const openModalHandler = hasModal
		? dedent`
			async function openCustomModal(): Promise<void> {
				await runSdkAction('Custom modal opened', (client) =>
					client.execute(Command.OPEN_MODAL, {
						type: Modal.CUSTOM_MODAL,
						action_id: 'custom-modal',
						data: { source: 'panel' },
					}),
				);
			}
		`
		: '';
	const openModalButton = hasModal
		? dedent`
			<button type="button" className="ghost" disabled={!isReady} onClick={openCustomModal}>
				Open modal
			</button>
		`
		: '';

	const sdkImportPrefix = sdkImportLine ? sdkImportLine + '\n' : '';

	return dedent`
		import { useEffect } from 'react';
		${sdkImportPrefix}import { usePipedriveSdk } from '../shared/pipedriveSdk';

		function formatQueryValue(key: string, value: string): string {
			return /token|secret|code/i.test(key) ? 'Present' : value;
		}

		function formatData(data: unknown): string {
			if (data === null || data === undefined || data === '') return 'None';
			if (typeof data === 'string') return data;
			return JSON.stringify(data, null, 2);
		}

		export default function Panel() {
			const { context, status, theme, visibility, pageState, lastAction, signedTokenPreview, isReady${runSdkActionDestructure}, actions } =
				usePipedriveSdk('panel');
			const queryEntries = Object.entries(context.query);

			useEffect(() => {
				document.title = 'Custom Panel';
			}, []);

			${openModalHandler}

			if (!isReady && status !== 'Local preview') {
				return (
					<main className="app">
						<header className="topbar">
							<div>
								<span className="surface-label">Custom Panel</span>
								<h1>Pipedrive App Extension</h1>
							</div>
							<span className="status">{status}</span>
						</header>
					</main>
				);
			}

			return (
				<main className="app">
					<header className="topbar">
						<div>
							<span className="surface-label">Custom Panel</span>
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
						<button type="button" className="secondary" disabled={!isReady} onClick={actions.showConfirmation}>
							Confirm
						</button>
						<button type="button" className="ghost" disabled={!isReady} onClick={actions.resize}>
							Resize panel
						</button>
						<button type="button" className="ghost" disabled={!isReady} onClick={actions.getSignedToken}>
							Get token
						</button>
						${openModalButton}
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

function modalComponentContent(): string {
	return dedent`
		import { useEffect } from 'react';
		import { Command } from '@pipedrive/app-extensions-sdk';
		import { usePipedriveSdk } from '../shared/pipedriveSdk';

		function formatQueryValue(key: string, value: string): string {
			return /token|secret|code/i.test(key) ? 'Present' : value;
		}

		function formatData(data: unknown): string {
			if (data === null || data === undefined || data === '') return 'None';
			if (typeof data === 'string') return data;
			return JSON.stringify(data, null, 2);
		}

		export default function Modal() {
			const { context, status, theme, visibility, pageState, lastAction, signedTokenPreview, isReady, runSdkAction, actions } =
				usePipedriveSdk('modal');
			const queryEntries = Object.entries(context.query);

			useEffect(() => {
				document.title = 'Custom Modal';
			}, []);

			async function closeModal(): Promise<void> {
				await runSdkAction('Modal close requested', (client) => client.execute(Command.CLOSE_MODAL));
			}

			if (!isReady && status !== 'Local preview') {
				return (
					<main className="app">
						<header className="topbar">
							<div>
								<span className="surface-label">Custom Modal</span>
								<h1>Pipedrive App Extension</h1>
							</div>
							<span className="status">{status}</span>
						</header>
					</main>
				);
			}

			return (
				<main className="app">
					<header className="topbar">
						<div>
							<span className="surface-label">Custom Modal</span>
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
						<button type="button" className="secondary" disabled={!isReady} onClick={actions.showConfirmation}>
							Confirm
						</button>
						<button type="button" className="ghost" disabled={!isReady} onClick={actions.resize}>
							Resize modal
						</button>
						<button type="button" className="ghost" disabled={!isReady} onClick={actions.getSignedToken}>
							Get token
						</button>
						<button type="button" className="danger" disabled={!isReady} onClick={closeModal}>
							Close modal
						</button>
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
