import dedent from 'dedent';

export function stylesContent(): string {
	return dedent`
		:root {
			color-scheme: light;
			--primary: #6861f2;
			--primary-strong: #413d99;
			--primary-light: #e1e1ff;
			--primary-mid: #c4c2ff;
			--text: #192435;
			--text-secondary: #656e7a;
			--text-muted: #999fa7;
			--bg: #f4f5f6;
			--surface: #ffffff;
			--border: #e4e6e9;
			--positive: #017737;
			--positive-bg: #e3fae1;
			--positive-border: #b8e8c9;
			--warning: #a76800;
			--warning-bg: #fff4d9;
			--negative: #c7201b;
			--negative-bg: #ffe7e6;
			--negative-border: #ffb8b5;
			--radius: 4px;
			--radius-pill: 999px;
			font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		}

		[data-theme='dark'] {
			color-scheme: dark;
			--text: #e2e2e4;
			--text-secondary: #9ea5ad;
			--text-muted: #686e75;
			--bg: #0e1017;
			--surface: #1e2029;
			--border: rgba(226, 226, 228, 0.15);
		}

		*,
		*::before,
		*::after {
			box-sizing: border-box;
		}

		body {
			margin: 0;
			background: var(--bg);
			color: var(--text);
			font-size: 13px;
			line-height: 1.5;
		}

		h1,
		h2,
		p,
		pre,
		dl {
			margin: 0;
		}

		pre {
			white-space: pre-wrap;
			overflow-wrap: anywhere;
			font: inherit;
		}

		button {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			height: 32px;
			padding: 0 10px;
			border-radius: var(--radius);
			border: none;
			font: 700 13px/1 Inter, system-ui, sans-serif;
			cursor: pointer;
			white-space: nowrap;
			background: var(--primary);
			color: #fff;
			transition: background-color 0.18s ease-in-out;
		}

		button:hover:not(:disabled) {
			background: var(--primary-strong);
		}

		button:focus-visible {
			outline: 2px solid var(--primary);
			outline-offset: 2px;
		}

		button:disabled {
			cursor: not-allowed;
			opacity: 0.55;
		}

		button.secondary {
			background: var(--primary-light);
			color: var(--primary-strong);
			border: none;
		}

		button.secondary:hover:not(:disabled) {
			background: var(--primary-mid);
		}

		button.ghost {
			background: var(--surface);
			color: var(--text-secondary);
			border: 1px solid var(--border);
		}

		button.ghost:hover:not(:disabled) {
			background: var(--primary-light);
			color: var(--primary-strong);
			border-color: var(--primary-light);
		}

		button.danger {
			background: var(--negative-bg);
			color: var(--negative);
			border: 1px solid var(--negative-border);
		}

		button.danger:hover:not(:disabled) {
			background: #ffd0ce;
		}

		.app {
			min-height: 100vh;
			padding: 16px;
		}

		.topbar {
			display: flex;
			align-items: flex-start;
			justify-content: space-between;
			gap: 16px;
			margin-bottom: 14px;
		}

		.surface-label {
			display: block;
			font-size: 10px;
			font-weight: 700;
			letter-spacing: 0.1em;
			text-transform: uppercase;
			color: var(--primary);
			margin-bottom: 3px;
		}

		h1 {
			font-size: 15px;
			font-weight: 700;
			color: var(--text);
		}

		.status {
			display: inline-flex;
			align-items: center;
			gap: 5px;
			padding: 3px 10px 3px 8px;
			border-radius: var(--radius-pill);
			font-size: 11px;
			font-weight: 600;
			white-space: nowrap;
			flex-shrink: 0;
			background: var(--warning-bg);
			color: var(--warning);
			border: 1px solid var(--warning-bg);
		}

		.status::before {
			content: '';
			display: inline-block;
			width: 6px;
			height: 6px;
			border-radius: 50%;
			background: currentColor;
			flex-shrink: 0;
		}

		.status--ready {
			background: var(--positive-bg);
			color: var(--positive);
			border-color: var(--positive-border);
		}

		.summary-grid {
			display: grid;
			grid-template-columns: repeat(4, minmax(0, 1fr));
			gap: 6px;
			margin-bottom: 14px;
		}

		.stat {
			background: var(--surface);
			border: 1px solid var(--border);
			border-radius: var(--radius);
			padding: 8px 10px;
		}

		.stat span {
			display: block;
			font-size: 10px;
			font-weight: 600;
			color: var(--text-muted);
			text-transform: uppercase;
			letter-spacing: 0.05em;
			margin-bottom: 3px;
		}

		.stat strong {
			display: block;
			font-size: 12px;
			font-weight: 600;
			color: var(--text);
			overflow-wrap: anywhere;
		}

		.toolbar {
			display: flex;
			flex-wrap: wrap;
			gap: 6px;
			margin-bottom: 14px;
		}

		.content-grid {
			display: grid;
			grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
			gap: 8px;
		}

		.panel {
			background: var(--surface);
			border: 1px solid var(--border);
			border-radius: var(--radius);
			padding: 12px;
		}

		h2 {
			font-size: 10px;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.07em;
			color: var(--text-muted);
			margin-bottom: 10px;
			padding-bottom: 8px;
			border-bottom: 1px solid var(--border);
		}

		.key-values {
			display: flex;
			flex-direction: column;
		}

		.key-values div {
			display: flex;
			gap: 8px;
			padding: 5px 0;
			border-bottom: 1px solid var(--bg);
			font-size: 12px;
			align-items: baseline;
		}

		.key-values div:last-child {
			border-bottom: none;
		}

		dt {
			color: var(--text-muted);
			min-width: 80px;
			flex-shrink: 0;
			font-size: 11px;
		}

		dd {
			margin: 0;
			color: var(--text);
			font-weight: 500;
			overflow-wrap: anywhere;
		}

		.empty {
			color: var(--text-muted);
			font-size: 12px;
			font-style: italic;
			text-align: center;
			padding: 14px 0;
		}

		@media (max-width: 620px) {
			.summary-grid,
			.content-grid {
				grid-template-columns: 1fr;
			}
		}
	`;
}
