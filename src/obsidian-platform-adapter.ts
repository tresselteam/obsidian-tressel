import { Platform, Plugin, Vault, normalizePath } from "obsidian";
import path from "path";
import { SaveFileOpts } from "./sync-engine.d";

export async function saveFile(
	vault: Vault,
	{ filepath, contents, onConflict }: SaveFileOpts
) {
	await createDirectory(vault, path.dirname(filepath));
	const fileExists = await vault.adapter.exists(filepath);

	if (fileExists) {
		// there's a conflict
		if (onConflict == "skip") {
			return;
		} else if (onConflict == "replace") {
			await vault.adapter.remove(filepath);
		}
	}

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

const ACTIVITY_EVENT_NAMES = [
	"layout-change",
	"editor-change",
	"resize",
	"active-leaf-change",
	"codemirror",
	"file-open",
	"file-menu",
];

export function onAppBecameActive(
	plugin: Plugin,
	afterMs: number,
	cb: () => void
) {
	let lastActive = new Date();

	const updateLastActive = (...args: any[]) => {
		const currentTime = new Date();
		const msInactivity = currentTime.getTime() - lastActive.getTime();

		if (msInactivity > afterMs) {
			console.log(`App became active again after ${msInactivity}ms`);
			cb();
		}

		lastActive = currentTime;
	};

	for (const eventName of ACTIVITY_EVENT_NAMES) {
		const eventRef = plugin.app.workspace.on(eventName as any, () => {
			return updateLastActive();
		});
		plugin.registerEvent(eventRef);
	}
}
