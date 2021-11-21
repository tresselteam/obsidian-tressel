import axios from "axios";
import {
	App,
	DataAdapter,
	normalizePath,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
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
	fs: DataAdapter;

	async onload() {
		await this.loadSettings();

		// Create a Tressel sync button in the left ribbon.
		this.addRibbonIcon("sync", "Sync Tressel", (evt: MouseEvent) => {
			// Called when the user clicks the button.
			new Notice("Clicked Sync Tressel");
			this.syncTressel().then(() => {
				this.saveSettings();
			});
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new TresselSettingTab(this.app, this));
	}

	async syncTressel() {
		if (
			this.settings.tresselUserToken !==
			"XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
		) {
			this.fs = this.app.vault.adapter;
			// Get the user's tweets and threads by their token
			const userData = await axios.get(
				`https://us-central1-tressel-646e8.cloudfunctions.net/getUserDataByObsidianToken?token=${this.settings.tresselUserToken}`
			);

			// Create the Tressel folder if it doesn't already exist
			const tresselFolderExists = await this.fs.exists(
				normalizePath("/🗃️ Tressel")
			);

			if (!tresselFolderExists) {
				await this.app.vault.createFolder("/🗃️ Tressel");
			}

			if (userData.data.tweets.length !== 0) {
				for (let tweet of userData.data.tweets) {
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

						this.fs
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

			if (userData.data.threads.length !== 0) {
				for (let thread of userData.data.threads) {
					// Check if threads have been added in already
					if (!this.settings.threadsToIgnore.includes(thread.id)) {
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

						this.fs
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
								this.settings.threadsToIgnore.push(thread.id);
							});
					}
				}
			}
		}
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
						console.log("Tressel user token: " + value);
						this.plugin.settings.tresselUserToken = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
