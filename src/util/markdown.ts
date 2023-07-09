export type Markdown = {
	metadata: Metadata;
	body: string;
};

export type Metadata = {
	[key: string]: string | string[];
};

const BASE_PATTERN = /^---[\s]+([\s\S]*?)[\s]+---([\s\S]*?)$/;
const FM_PATTERN = /(.*?)\s*:\s*(?:(?:\[\s*(.*?)(?=\s*\]))|(.*))/g;
const ARRAY_PATTERN = /\s?,\s?/g;

export function parseMarkdown(data: string): Markdown {
	const results: RegExpExecArray | [any, any, string] = BASE_PATTERN.exec(
		data
	) || [null, null, data];

	const markdown: Markdown = {
		metadata: {},
		body: results[2].trim(),
	};

	let tecurp: RegExpExecArray | null;
	while ((tecurp = FM_PATTERN.exec(results[1] ?? "")) !== null) {
		markdown.metadata[tecurp[1]] = tecurp[2]
			? tecurp[2].split(ARRAY_PATTERN)
			: tecurp[3];
	}

	return markdown;
}

export function renderMarkdown(md: Markdown): string {
	const attributes = Object.entries(md.metadata)
		.map(([key, value]) => {
			if (Array.isArray(value)) {
				return `${key}: [${value.join(", ")}]`;
			}
			return `${key}: ${value}`;
		})
		.join("\n");

	return `---\n${attributes}\n---\n\n${md.body.trim()}`;
}

export function addMetadata(md: Markdown, metadata: Metadata): Markdown {
	return { ...md, metadata: { ...md.metadata, ...metadata } };
}
