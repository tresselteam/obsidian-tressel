import { ApiClient } from "api";
import { ClippingType, Tweet } from "contract";
import { twitterClippingToMarkdown } from "formatters";
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
				switch (clipping.type) {
					case "twitter":
						const data = clipping.data as Tweet[];
						const username = data[0].author.username;
						const markdown = twitterClippingToMarkdown(clipping);

						if (!username) {
							console.log("Invalid Twitter clipping", clipping);
							continue;
						}

						const dirPath = path.join(
							this.opts.basePath,
							"Twitter",
							username
						);

						const filename = sanitize(data[0].id) + `.md`;

						this.opts.saveFile({
							filepath: path.join(dirPath, filename),
							contents: markdown,
							onConflict: "skip",
						});

						break;
				}
			}
		} catch (e) {
			throw e;
		} finally {
			this.syncInProgress = false;
		}
	};
}
