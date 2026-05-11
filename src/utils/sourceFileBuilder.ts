interface ImportEntry {
	from: string;
	defaultName?: string;
	names: string[];
}

export class SourceFileBuilder {
	private imports: Map<string, ImportEntry> = new Map();
	private blocks: string[] = [];
	private defaultExport?: string;

	import(from: string, names: string[]): this {
		const existing = this.imports.get(from);
		if (existing) {
			existing.names = [...new Set([...existing.names, ...names])];
		} else {
			this.imports.set(from, { from, names });
		}
		return this;
	}

	importDefault(from: string, name: string): this {
		const existing = this.imports.get(from);
		if (existing) {
			existing.defaultName = name;
		} else {
			this.imports.set(from, { from, defaultName: name, names: [] });
		}
		return this;
	}

	importIf(condition: boolean, from: string, names: string[]): this {
		if (condition) this.import(from, names);
		return this;
	}

	importDefaultIf(condition: boolean, from: string, name: string): this {
		if (condition) this.importDefault(from, name);
		return this;
	}

	addBlock(code: string): this {
		this.blocks.push(code);
		return this;
	}

	addBlockIf(condition: boolean, code: string): this {
		if (condition) this.addBlock(code);
		return this;
	}

	exportDefault(name: string): this {
		if (this.defaultExport !== undefined) {
			throw new Error('exportDefault called more than once');
		}
		this.defaultExport = name;
		return this;
	}

	build(): string {
		const importLines = Array.from(this.imports.values()).map((entry) => {
			const parts: string[] = [];
			if (entry.defaultName) parts.push(entry.defaultName);
			if (entry.names.length > 0) parts.push(`{ ${entry.names.join(', ')} }`);
			return `import ${parts.join(', ')} from '${entry.from}';`;
		});

		const sections: string[] = [];
		if (importLines.length > 0) sections.push(importLines.join('\n'));
		sections.push(...this.blocks);
		if (this.defaultExport !== undefined) {
			sections.push(`export default ${this.defaultExport};`);
		}

		return sections.join('\n\n');
	}
}
