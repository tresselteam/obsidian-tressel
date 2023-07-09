import { Metadata, parseMarkdown } from "@util/markdown";
import { ApiClient } from "api";
import { ClippingType, Provider } from "contract";
import path from "path";
import sanitize from "sanitize-filename";
import { minutes } from "time";
import { PlatformAdapter } from "./sync-engine.d";

type SyncEngineOps = {
	basePath: string;
	api: ApiClient;
} & PlatformAdapter;

export class SyncEngine {
	private intervalId: number;

	private syncInProgress: boolean;

	constructor(private opts: SyncEngineOps) {
		console.log("Initialized Tressel Sync");

		this.intervalId = opts.setInterval(() => {
			this.sync();
		}, minutes(2));

		opts.onAppBecameActive(() => {
			console.log("App became active. Running sync.");
			this.sync();
		});
	}

	dispose = () => {
		this.opts.clearInterval(this.intervalId);
	};

	sync = async () => {
		if (this.syncInProgress) {
			console.warn("Sync is already in progress");
			return;
		}
		this.syncInProgress = true;
		try {
			const syncData = await this.opts.api.sync();

			const clippings = syncData.body as ClippingType[];
			for (const clipping of clippings) {
				const { metadata } = parseMarkdown(clipping.markdown);
				const subpath = getFilePath(clipping.type, metadata);
				if (!subpath) {
					console.error("Invalid clipping", clipping);
					continue;
				}

				const filepath = path.join(this.opts.basePath, subpath);

				this.opts.saveFile({
					filepath,
					contents: clipping.markdown,
					onConflict: "skip",
				});
			}
		} catch (e) {
			throw e;
		} finally {
			this.syncInProgress = false;
		}
	};
}

function getFilePath(type: Provider, metadata: Metadata): string | undefined {
	switch (type) {
		case "twitter":
			const username = metadata.username as string;
			const id = metadata.id as string;
			if (!username || !id) return;

			return path.join("Twitter", username, sanitize(id) + `.md`);
		case "webpage":
			const title = metadata.title as string;
			const source = metadata.source as string;
			return path.join(
				"Web Pages",
				new URL(source).hostname,
				sanitize(title) + `.md`
			);
	}
}
