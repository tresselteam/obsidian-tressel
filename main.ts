import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	request,
	Setting,
	TFolder,
} from "obsidian";
import sanitize from "sanitize-filename";

interface TresselPluginSettings {
	tresselUserToken: string;
}

const DEFAULT_SETTINGS: TresselPluginSettings = {
	tresselUserToken: "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
};

export default class TresselPlugin extends Plugin {
	settings: TresselPluginSettings;

	async onload() {
		await this.loadSettings();
		await this.syncTressel(true);
		await this.saveSettings();

		// Create a Tressel sync button in the left ribbon.
		this.addRibbonIcon("sync", "Sync Tressel", async (evt: MouseEvent) => {
			// Called when the user clicks the button.
			await this.syncTressel();
			await this.saveSettings();
			new Notice("Finished Tressel sync");
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
						url: "https://api.tressel.xyz/obsidian/data",
						headers: {
							Authorization: `Obsidian ${this.settings.tresselUserToken}`,
						},
					})
				);

				// Create the Tressel folder if it doesn't already exist
				const tresselFolder =
					this.app.vault.getAbstractFileByPath("🗃️ Tressel");
				const tresselFolderExists = tresselFolder instanceof TFolder;

				if (!tresselFolderExists) {
					await this.app.vault.createFolder("🗃️ Tressel");
				}

				if (userData.tweets.length !== 0) {
					for (let tweet of userData.tweets) {
						// Create new page for tweet in Tressel directory
						let templateArray = [
							`# ${tweet.text
								.replace(/(\r\n|\n|\r)/gm, " ")
								.slice(0, 50)}...`,
							`## Metadata`,
							`- Author: [${tweet.author.name}](https://twitter.com/${tweet.author.username})`,
							`- Type: 🐤 Tweet #tweet`,
							`- URL: ${tweet.url}\n`,
							`## Tweet`,
							`${tweet.text}\n`,
						];

						if (tweet.media) {
							for (let mediaEntity of tweet.media) {
								templateArray.push(`![](${mediaEntity.url})\n`);
							}
						}

						let template = templateArray.join("\n");

						try {
							await this.app.vault.create(
								"🗃️ Tressel/" +
									sanitize(
										tweet.text
											.replace(/(\r\n|\n|\r)/gm, " ")
											.replace("\n\n", " ")
											.replace("\n\n\n", " ")
											.slice(0, 50)
									) +
									".md",
								template
							);
						} catch (error) {
							console.error(
								`Error syncing tweet ${tweet.url} -`,
								error
							);
						}
					}
				}

				if (userData.tweetCollections.length !== 0) {
					for (let tweetCollection of userData.tweetCollections) {
						if (tweetCollection.type === 1) {
							// It's a thread
							// Create new page for thread in Tressel directory
							let templateArray = [
								`# ${tweetCollection.tweets[0].text
									.replace(/(\r\n|\n|\r)/gm, " ")
									.slice(0, 50)}...`,
								`## Metadata`,
								`- Author: [${tweetCollection.author.name}](https://twitter.com/${tweetCollection.author.username})`,
								`- Type: 🧵 Thread #thread`,
								`- URL: ${tweetCollection.url}\n`,
								`## Thread`,
							];

							for (let tweet of tweetCollection.tweets) {
								templateArray.push(`${tweet.text}\n`);
								if (tweet.media) {
									for (let mediaEntity of tweet.media) {
										templateArray.push(
											`![](${mediaEntity.url})\n`
										);
									}
								}
							}

							let template = templateArray.join("\n");

							try {
								await this.app.vault.create(
									"🗃️ Tressel/" +
										sanitize(
											tweetCollection.tweets[0].text
												.replace(/(\r\n|\n|\r)/gm, " ")
												.replace("\n\n", " ")
												.replace("\n\n\n", " ")
												.slice(0, 50)
										) +
										".md",
									template
								);
							} catch (error) {
								console.error(
									`Error syncing thread ${tweetCollection.url} -`,
									error
								);
							}
						} else if (tweetCollection.type === 2) {
							// It's a conversation
							// Create new page for conversation in Tressel directory
							let templateArray = [
								`# ${tweetCollection.tweets[0].text
									.replace(/(\r\n|\n|\r)/gm, " ")
									.slice(0, 50)}...`,
								`## Metadata`,
								`- Author: [${tweetCollection.author.name}](https://twitter.com/${tweetCollection.author.username})`,
								`- Type: 💬 Conversation #conversation`,
								`- URL: ${tweetCollection.url}\n`,
								`## Conversation`,
							];

							for (let tweet of tweetCollection.tweets) {
								templateArray.push(
									`**[${tweet.author.name} (@${tweet.author.username})](${tweet.author.url})**\n`
								);
								templateArray.push(`${tweet.text}\n`);
								if (tweet.media) {
									for (let mediaEntity of tweet.media) {
										templateArray.push(
											`![](${mediaEntity.url})\n`
										);
									}
								}
								templateArray.push(`---\n`);
							}

							let template = templateArray.join("\n");

							try {
								await this.app.vault.create(
									"🗃️ Tressel/" +
										sanitize(
											tweetCollection.tweets[0].text
												.replace(/(\r\n|\n|\r)/gm, " ")
												.replace("\n\n", " ")
												.replace("\n\n\n", " ")
												.slice(0, 50)
										) +
										".md",
									template
								);
							} catch (error) {
								console.error(
									`Error syncing conversation ${tweetCollection.url} -`,
									error
								);
							}
						}
					}
				}
			} catch (error) {
				console.error("Error while syncing from Tressel -", error);
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
	}
}
