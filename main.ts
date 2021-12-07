import axios from "axios";
import {
	App,
	DataAdapter,
	normalizePath,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	request,
} from "obsidian";
import sanitize from "sanitize-filename";

interface TresselPluginSettings {
	tresselUserToken: string;
	tweetsToIgnore: Array<string>;
	threadsToIgnore: Array<string>;
}

const DEFAULT_SETTINGS: TresselPluginSettings = {
	tresselUserToken: "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
	tweetsToIgnore: [],
	threadsToIgnore: [],
};

export default class TresselPlugin extends Plugin {
	settings: TresselPluginSettings;

	async onload() {
		await this.loadSettings();

		await this.syncTressel(true);
		await this.saveSettings();

		// Create a Tressel sync button in the left ribbon.
		this.addRibbonIcon("sync", "Sync Tressel", (evt: MouseEvent) => {
			// Called when the user clicks the button.
			this.syncTressel().then(() => {
				this.saveSettings();
				new Notice("Finished Tressel sync");
			});
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new TresselSettingTab(this.app, this));
	}

	async syncTressel(onload?: boolean) {
		if (!onload) {
			new Notice("Starting Tressel sync");
		}
		if (
			this.settings.tresselUserToken !==
			"XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
		) {
			// Get the user's tweets and threads by their token
			try {
				const userData = JSON.parse(
					await request({
						url: `https://us-central1-tressel-646e8.cloudfunctions.net/getUserDataByObsidianToken?token=${this.settings.tresselUserToken}`,
					})
				);

				// Create the Tressel folder if it doesn't already exist
				const tresselFolderExists = await this.app.vault.adapter.exists(
					normalizePath("/🗃️ Tressel")
				);

				if (!tresselFolderExists) {
					await this.app.vault.createFolder("/🗃️ Tressel");
				}

				if (userData.tweets.length !== 0) {
					for (let tweet of userData.tweets) {
						// Check if tweets have been added in already
						if (!this.settings.tweetsToIgnore.includes(tweet.id)) {
							// Otherwise create new page for them in Tressel directory
							let template = [
								`# ${tweet.text.slice(0, 50)}\n`,
								`## Metadata\n`,
								`- Author: [${tweet.author.name}](${tweet.author.url})`,
								`- Type: Thread`,
								`- URL: ${tweet.url}\n`,
								`## Thread\n`,
								`${tweet.text}`,
							].join("\n");

							this.app.vault.adapter
								.write(
									`${normalizePath(
										"/🗃️ Tressel/" +
											sanitize(tweet.text.slice(0, 50)) +
											".md"
									)}`,
									template
								)
								.then(async () => {
									this.settings.tweetsToIgnore.push(tweet.id);
								});
						}
					}
				}

				if (userData.threads.length !== 0) {
					for (let thread of userData.threads) {
						// Check if threads have been added in already
						if (
							!this.settings.threadsToIgnore.includes(thread.id)
						) {
							// Otherwise create new page for them in Tressel directory
							let template = [
								`# ${thread.fullThreadText[0].slice(0, 50)}\n`,
								`## Metadata\n`,
								`- Author: [${thread.author.name}](${thread.author.url})`,
								`- Type: Thread`,
								`- URL: ${thread.threadUrl}\n`,
								`## Thread\n`,
								`${thread.fullThreadText.join("\n\n")}`,
							].join("\n");

							this.app.vault.adapter
								.write(
									`${normalizePath(
										"/🗃️ Tressel/" +
											sanitize(
												thread.fullThreadText[0].slice(
													0,
													50
												)
											) +
											".md"
									)}`,
									template
								)
								.then(() => {
									this.settings.threadsToIgnore.push(
										thread.id
									);
								});
						}
					}
				}
			} catch {
				new Notice(
					"Unable to sync from Tressel - invalid token provided"
				);
			}
		} else {
			new Notice(
				"Unable to sync from Tressel - please fill out your Tressel user token before syncing"
			);
		}
	}

	clearSyncMemory() {
		this.settings.threadsToIgnore = [];
		this.settings.tweetsToIgnore = [];
		this.saveSettings().then(() => {
			new Notice("Cleared Tressel sync memory");
		});
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class TresselSettingTab extends PluginSettingTab {
	plugin: TresselPlugin;

	constructor(app: App, plugin: TresselPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Tressel Settings" });

		new Setting(containerEl)
			.setName("Tressel User Token")
			.setDesc(
				"Get your unique token from the Obsidian settings page in Tressel"
			)
			.addText((text) =>
				text
					.setPlaceholder("Enter your token")
					.setValue(this.plugin.settings.tresselUserToken)
					.onChange(async (value) => {
						this.plugin.settings.tresselUserToken = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Clear Sync Memory")
			.setDesc(
				"Forget what you've already synced from your Tressel library and start from scratch"
			)
			.addButton((button) => {
				button.setButtonText("Clear Sync Memory").onClick(() => {
					this.plugin.clearSyncMemory();
				});
			});
	}
}
