import dedent from 'dedent';

export function stylesContent(): string {
	return dedent`
		:root {
			color-scheme: light;
			--bg: #f7f8fa;
			--panel: #ffffff;
			--text: #172026;
			--muted: #5f6b7a;
			--border: #d8dee6;
			--accent: #087f5b;
			--accent-strong: #06624a;
			--focus: #1c64f2;
			--warning: #9a5b00;
			font-family:
				Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		}

		[data-theme='dark'] {
			color-scheme: dark;
			--bg: #111418;
			--panel: #181d23;
			--text: #edf1f5;
			--muted: #a8b2bf;
			--border: #303945;
			--accent: #4cc38a;
			--accent-strong: #78d6a7;
			--focus: #8ab4ff;
			--warning: #f2bd6b;
		}

		* {
			box-sizing: border-box;
		}

		body {
			margin: 0;
			background: var(--bg);
			color: var(--text);
			font-size: 14px;
			line-height: 1.4;
		}

		button {
			min-height: 36px;
			border: 1px solid var(--accent);
			border-radius: 6px;
			background: var(--accent);
			color: #ffffff;
			font: inherit;
			font-weight: 600;
			padding: 0 12px;
			cursor: pointer;
		}

		button:hover:not(:disabled) {
			background: var(--accent-strong);
			border-color: var(--accent-strong);
		}

		button:focus-visible {
			outline: 2px solid var(--focus);
			outline-offset: 2px;
		}

		button:disabled {
			cursor: not-allowed;
			opacity: 0.55;
		}

		h1,
		h2,
		p,
		pre,
		dl {
			margin: 0;
		}

		h1 {
			margin-top: 4px;
			font-size: 22px;
			line-height: 1.2;
		}

		h2 {
			margin-bottom: 12px;
			font-size: 15px;
			line-height: 1.3;
		}

		pre {
			white-space: pre-wrap;
			overflow-wrap: anywhere;
			font: inherit;
		}

		.app {
			min-height: 100vh;
			padding: 16px;
		}

		.app--modal {
			max-width: 760px;
			min-height: 420px;
			margin: 0 auto;
		}

		.topbar {
			display: flex;
			align-items: flex-start;
			justify-content: space-between;
			gap: 16px;
		}

		.surface-label {
			display: block;
			color: var(--muted);
			font-size: 12px;
			font-weight: 700;
			text-transform: uppercase;
		}

		.status {
			display: inline-flex;
			min-height: 28px;
			align-items: center;
			justify-content: center;
			border: 1px solid var(--border);
			border-radius: 999px;
			color: var(--warning);
			padding: 0 10px;
			white-space: nowrap;
		}

		.status--ready {
			color: var(--accent);
		}

		.summary-grid {
			display: grid;
			grid-template-columns: repeat(4, minmax(0, 1fr));
			gap: 8px;
			margin: 16px 0;
		}

		.stat,
		.panel {
			border: 1px solid var(--border);
			border-radius: 8px;
			background: var(--panel);
			padding: 12px;
		}

		.stat span,
		dt {
			color: var(--muted);
			font-size: 12px;
			font-weight: 600;
		}

		.stat strong {
			display: block;
			margin-top: 4px;
			overflow-wrap: anywhere;
		}

		.toolbar {
			display: flex;
			flex-wrap: wrap;
			gap: 8px;
			margin-bottom: 16px;
		}

		.content-grid {
			display: grid;
			grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
			gap: 12px;
		}

		.key-values {
			display: grid;
			gap: 10px;
		}

		.key-values div {
			display: grid;
			grid-template-columns: minmax(88px, 0.35fr) minmax(0, 1fr);
			gap: 8px;
		}

		dd {
			margin: 0;
			overflow-wrap: anywhere;
		}

		.empty {
			color: var(--muted);
		}

		@media (max-width: 620px) {
			.app {
				padding: 12px;
			}

			.topbar {
				flex-direction: column;
			}

			.summary-grid,
			.content-grid {
				grid-template-columns: 1fr;
			}

			.key-values div {
				grid-template-columns: 1fr;
			}
		}
	`;
}
