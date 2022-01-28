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
	TFolder,
} from "obsidian";
import sanitize from "sanitize-filename";

interface TresselPluginSettings {
	tresselUserToken: string;
	tweetsToIgnore: Array<string>;
	threadsToIgnore: Array<string>;
	conversationsToIgnore: Array<string>;
}

const DEFAULT_SETTINGS: TresselPluginSettings = {
	tresselUserToken: "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
	tweetsToIgnore: [],
	threadsToIgnore: [],
	conversationsToIgnore: [],
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
						url: `https://us-central1-tressel-646e8.cloudfunctions.net/getUserDataByObsidianToken?token=${this.settings.tresselUserToken}`,
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
						// Check if tweets have been added in already
						if (!this.settings.tweetsToIgnore.includes(tweet.id)) {
							// Otherwise create new page for them in Tressel directory
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
								for (let mediaUrl of tweet.media) {
									templateArray.push(`![](${mediaUrl})\n`);
								}
							}

							let template = templateArray.join("\n");

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

							this.settings.tweetsToIgnore.push(tweet.id);
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
							let templateArray = [
								`# ${thread.fullThreadText[0]
									.replace(/(\r\n|\n|\r)/gm, " ")
									.slice(0, 50)}...`,
								`## Metadata`,
								`- Author: [${thread.author.name}](https://twitter.com/${thread.author.username})`,
								`- Type: 🧵 Thread #thread`,
								`- URL: ${thread.threadUrl}\n`,
								`## Thread`,
							];

							for (let tweetId in thread) {
								if (
									tweetId !== "author" &&
									tweetId !== "fullThreadText" &&
									tweetId !== "id" &&
									tweetId !== "threadUrl"
								) {
									let tweetInThread = thread[tweetId];
									templateArray.push(
										`${tweetInThread.text}\n`
									);
									if (tweetInThread.media) {
										for (let mediaUrl of tweetInThread.media) {
											templateArray.push(
												`![](${mediaUrl})\n`
											);
										}
									}
								}
							}

							let template = templateArray.join("\n");

							await this.app.vault.create(
								"🗃️ Tressel/" +
									sanitize(
										thread.fullThreadText[0]
											.replace(/(\r\n|\n|\r)/gm, " ")
											.replace("\n\n", " ")
											.replace("\n\n\n", " ")
											.slice(0, 50)
									) +
									".md",
								template
							);

							this.settings.threadsToIgnore.push(thread.id);
						}
					}
				}

				if (userData.conversations.length !== 0) {
					for (let conversation of userData.conversations) {
						// Check if conversations have been added in already
						if (
							!this.settings.conversationsToIgnore.includes(
								conversation.id
							)
						) {
							// Otherwise create new page for them in Tressel directory
							let templateArray = [
								`# ${conversation.fullConversationText[0]
									.replace(/(\r\n|\n|\r)/gm, " ")
									.slice(0, 50)}...`,
								`## Metadata`,
								`- Author: [${conversation.author.name}](https://twitter.com/${conversation.author.username})`,
								`- Type: 💬 Conversation #conversation`,
								`- URL: ${conversation.conversationUrl}\n`,
								`## Conversation`,
							];

							for (let tweetId in conversation) {
								if (
									tweetId !== "author" &&
									tweetId !== "fullConversationText" &&
									tweetId !== "id" &&
									tweetId !== "conversationUrl"
								) {
									let tweetInConversation =
										conversation[tweetId];
									templateArray.push(
										`**[${tweetInConversation.author.name} (@${tweetInConversation.author.username})](${tweetInConversation.author.url})**\n`
									);
									templateArray.push(
										`${tweetInConversation.text}\n`
									);
									if (tweetInConversation.media) {
										for (let mediaUrl of tweetInConversation.media) {
											templateArray.push(
												`![](${mediaUrl})\n`
											);
										}
									}
									templateArray.push(`---\n`);
								}
							}

							let template = templateArray.join("\n");

							await this.app.vault.create(
								"🗃️ Tressel/" +
									sanitize(
										conversation.fullConversationText[0]
											.replace(/(\r\n|\n|\r)/gm, " ")
											.replace("\n\n", " ")
											.replace("\n\n\n", " ")
											.slice(0, 50)
									) +
									".md",
								template
							);

							this.settings.conversationsToIgnore.push(
								conversation.id
							);
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

	async clearSyncMemory() {
		this.settings.threadsToIgnore = [];
		this.settings.tweetsToIgnore = [];
		this.settings.conversationsToIgnore = [];
		await this.saveSettings();
		new Notice("Cleared Tressel sync memory");
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
				button.setButtonText("Clear Sync Memory").onClick(async () => {
					await this.plugin.clearSyncMemory();
				});
			});
	}
}
