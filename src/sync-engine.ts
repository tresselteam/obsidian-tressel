import { ApiClient } from "api";
import { ClippingType } from "contract";
import { twitterClippingToMarkdown } from "formatters";
import { App, Platform, Vault, normalizePath } from "obsidian";
import path from "path";
import sanitize from "sanitize-filename";

type SyncOpts = {
	basePath: string;
	api: ApiClient;
	app: App;
};
export async function syncClippings(opts: SyncOpts) {
	const vault = opts.app.vault;

	const syncData = await opts.api.sync();
	console.log("syncData", syncData);

	const clippings = syncData.body as ClippingType[];
	for (const clipping of clippings) {
		switch (clipping.type) {
			case "twitter":
				const data = clipping.data;
				const markdown = twitterClippingToMarkdown(clipping);
				const dirPath = path.join(
					opts.basePath,
					"Twitter",
					clipping.data[0].username
				);
				const filename = sanitize(data[0].id) + `.md`;

				await createFileAt(vault, {
					filepath: path.join(dirPath, filename),
					contents: markdown,
				});

				break;
		}
	}
}

type CreateFileOpts = {
	filepath: string;
	contents: string;
};
async function createFileAt(
	vault: Vault,
	{ filepath, contents }: CreateFileOpts
) {
	await createDirectory(vault, path.dirname(filepath));
	const fileExists = await vault.adapter.exists(filepath);
	if (fileExists) return;
	await vault.create(filepath, contents);
}

async function createDirectory(vault: Vault, dir: string): Promise<void> {
	const { adapter } = vault;
	const root = vault.getRoot().path;
	const directoryExists = await adapter.exists(dir);

	// ===============================================================
	// -> Desktop App
	// ===============================================================
	if (!Platform.isIosApp && !directoryExists) {
		return adapter.mkdir(normalizePath(dir));
	}
	// ===============================================================
	// -> Mobile App (IOS)
	// ===============================================================
	// This is a workaround for a bug in the mobile app:
	// To get the file explorer view to update correctly, we have to create
	// each directory in the path one at time.

	// Split the path into an array of sub paths
	// Note: `normalizePath` converts path separators to '/' on all platforms
	// @example '/one/two/three/' ==> ['one', 'one/two', 'one/two/three']
	// @example 'one\two\three' ==> ['one', 'one/two', 'one/two/three']
	const subPaths: string[] = normalizePath(dir)
		.split("/")
		.filter((part) => part.trim() !== "")
		.map((_, index, arr) => arr.slice(0, index + 1).join("/"));

	// Create each directory if it does not exist
	for (const subPath of subPaths) {
		const directoryExists = await adapter.exists(path.join(root, subPath));
		if (!directoryExists) {
			await adapter.mkdir(path.join(root, subPath));
		}
	}
}
