import { describe, expect, it } from 'vitest';
import { SourceFileBuilder } from './sourceFileBuilder.js';

describe('SourceFileBuilder', () => {
	it('emits a named import', () => {
		const out = new SourceFileBuilder().import('express', ['Router']).build();
		expect(out).toContain("import { Router } from 'express';");
	});

	it('emits a default import', () => {
		const out = new SourceFileBuilder().importDefault('./app.js', 'app').build();
		expect(out).toContain("import app from './app.js';");
	});

	it('deduplicates named imports from the same source', () => {
		const out = new SourceFileBuilder()
			.import('express', ['Router'])
			.import('express', ['Router', 'Request'])
			.build();
		expect((out.match(/from 'express'/g) ?? []).length).toBe(1);
		expect(out).toContain('Router');
		expect(out).toContain('Request');
	});

	it('merges default and named imports from the same source into one line', () => {
		const out = new SourceFileBuilder().importDefault('express', 'express').import('express', ['Router']).build();
		expect((out.match(/from 'express'/g) ?? []).length).toBe(1);
		expect(out).toContain('express');
		expect(out).toContain('Router');
	});

	it('importIf skips when condition is false', () => {
		const out = new SourceFileBuilder().importIf(false, 'express', ['Router']).build();
		expect(out).not.toContain('express');
	});

	it('importIf adds import when condition is true', () => {
		const out = new SourceFileBuilder().importIf(true, 'express', ['Router']).build();
		expect(out).toContain("import { Router } from 'express';");
	});

	it('importDefaultIf skips when condition is false', () => {
		const out = new SourceFileBuilder().importDefaultIf(false, './webhooks.js', 'webhooksRouter').build();
		expect(out).not.toContain('webhooks');
	});

	it('importDefaultIf adds import when condition is true', () => {
		const out = new SourceFileBuilder().importDefaultIf(true, './app.js', 'app').build();
		expect(out).toContain("import app from './app.js';");
	});

	it('addBlock adds body content', () => {
		const out = new SourceFileBuilder().addBlock('const x = 1;').build();
		expect(out).toContain('const x = 1;');
	});

	it('addBlockIf skips when condition is false', () => {
		const out = new SourceFileBuilder().addBlockIf(false, 'const x = 1;').build();
		expect(out).not.toContain('const x');
	});

	it('addBlockIf adds block when condition is true', () => {
		const out = new SourceFileBuilder().addBlockIf(true, 'const x = 1;').build();
		expect(out).toContain('const x = 1;');
	});

	it('exportDefault appends export statement', () => {
		const out = new SourceFileBuilder().addBlock('const app = {};').exportDefault('app').build();
		expect(out).toContain('export default app;');
	});

	it('exportDefault throws if called twice', () => {
		expect(() => new SourceFileBuilder().exportDefault('a').exportDefault('b')).toThrow(
			'exportDefault called more than once',
		);
	});

	it('importDefault throws if called twice with different names for same source', () => {
		expect(() =>
			new SourceFileBuilder().importDefault('./app.js', 'app').importDefault('./app.js', 'app2'),
		).toThrow("importDefault called twice for './app.js'");
	});

	it('build output order: imports → body → export default', () => {
		const out = new SourceFileBuilder()
			.importDefault('express', 'express')
			.addBlock('const app = express();')
			.exportDefault('app')
			.build();
		const importPos = out.indexOf('import express');
		const bodyPos = out.indexOf('const app');
		const exportPos = out.indexOf('export default');
		expect(importPos).toBeLessThan(bodyPos);
		expect(bodyPos).toBeLessThan(exportPos);
	});
});
