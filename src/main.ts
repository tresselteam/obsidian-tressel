import { shell } from "electron";
import Api from "helpers/api";
import {
	App,
	debounce,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	TFolder,
} from "obsidian";
import sanitize from "sanitize-filename";
import { FolderSuggest } from "settings/suggesters/FolderSuggester";

interface TresselPluginSettings {
	tresselAccessToken: string;
	syncFolder: string;
}

const DEFAULT_SETTINGS: TresselPluginSettings = {
	tresselAccessToken: "",
	syncFolder: "🗃️ Tressel",
};

export default class TresselPlugin extends Plugin {
	settings: TresselPluginSettings;
	tokenValid: boolean;
	userSubscribed: boolean;
	apiClient: Api;

	async onload() {
		console.info("Loading Tressel Sync for Obsidian plugin");
		await this.loadSettings();

		// Create a Tressel sync button in the left ribbon.
		this.addRibbonIcon("sync", "Sync Tressel", async (evt: MouseEvent) => {
			// Called when the user clicks the button.
			await this.syncTressel();
			await this.saveSettings();
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		const settingsTab = new TresselSettingTab(this.app, this);
		this.addSettingTab(settingsTab);

		this.apiClient = new Api(this.settings.tresselAccessToken);
		await this.saveSettings();

		this.app.workspace.onLayoutReady(() =>
			this.initializeTressel(settingsTab)
		);
	}

	async initializeTressel(settingsTab: TresselSettingTab) {
		try {
			// Verify token
			await this.verifyToken(settingsTab);
			if (this.tokenValid) {
				await this.syncTressel(true);
			} else {
				new Notice(
					"Unable to sync from Tressel - Invalid Token provided"
				);
			}
		} catch {}
	}

	async syncTressel(onload?: boolean) {
		if (!onload) {
			new Notice("Starting Tressel Sync");
		}
		if (this.settings.tresselAccessToken !== "") {
			// Get the user's imported data by their token
			try {
				this.apiClient.updateClient(this.settings.tresselAccessToken);
				const userData = await (
					await this.apiClient.syncObsidianUserData()
				).data;

				if (
					userData.hasOwnProperty("message") &&
					(userData.message as string).includes("Error")
				) {
					new Notice(
						"Unable to sync from Tressel - Invalid Token provided"
					);
					return;
				}

				// Create the Tressel folder if it doesn't already exist
				const tresselFolder = this.app.vault.getAbstractFileByPath(
					this.settings.syncFolder
				);
				const tresselFolderExists = tresselFolder instanceof TFolder;

				if (!tresselFolderExists) {
					try {
						await this.app.vault.createFolder(
							this.settings.syncFolder
						);
					} catch (error) {
						console.error(
							"Error while creating Tressel folder -",
							error
						);
					}
				}

				if (
					userData.hasOwnProperty("tweets") &&
					userData.tweets.length !== 0
				) {
					for (let tweet of userData.tweets) {
						try {
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
									templateArray.push(
										`![](${mediaEntity.url})\n`
									);
								}
							}

							let template = templateArray.join("\n");

							await this.app.vault.create(
								this.settings.syncFolder +
									"/" +
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

				if (
					userData.hasOwnProperty("tweetCollections") &&
					userData.tweetCollections.length !== 0
				) {
					for (let tweetCollection of userData.tweetCollections) {
						if (tweetCollection.type === 1) {
							try {
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

								await this.app.vault.create(
									this.settings.syncFolder +
										"/" +
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
							try {
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

								await this.app.vault.create(
									this.settings.syncFolder +
										"/" +
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

				if (
					userData.hasOwnProperty("redditComments") &&
					userData.redditComments.length !== 0
				) {
					for (let redditComment of userData.redditComments) {
						try {
							// Create new page for redditComment in Tressel directory
							let templateArray = [
								`# ${redditComment.text
									.replace(/(\r\n|\n|\r)/gm, " ")
									.slice(0, 50)}...`,
								`## Metadata`,
								`- Subreddit: [r/${redditComment.subreddit}](https://reddit.com/r/${redditComment.subreddit})`,
								`- Author: [u/${redditComment.author.username}](https://reddit.com/user/${redditComment.author.username})`,
								`- Type: 👾 Reddit Comment #reddit-comment`,
								`- URL: ${redditComment.url}\n`,
								`## Comment`,
								`${redditComment.text}\n`,
							];

							let template = templateArray.join("\n");

							await this.app.vault.create(
								this.settings.syncFolder +
									"/" +
									sanitize(
										redditComment.text
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
								`Error syncing redditComment ${redditComment.url} -`,
								error
							);
						}
					}
				}

				if (
					userData.hasOwnProperty("redditPosts") &&
					userData.redditPosts.length !== 0
				) {
					for (let redditPost of userData.redditPosts) {
						try {
							// Create new page for redditPost in Tressel directory
							let templateArray = [
								`# ${redditPost.title.replace(
									/(\r\n|\n|\r)/gm,
									" "
								)}`,
								`## Metadata`,
								`- Subreddit: [r/${redditPost.subreddit}](https://reddit.com/r/${redditPost.subreddit})`,
								`- Author: [u/${redditPost.author.username}](https://reddit.com/user/${redditPost.author.username})`,
								`- Type: 👾 Reddit Post #reddit-post`,
								`- URL: ${redditPost.url}\n`,
								`## Post`,
								`${
									redditPost.text
										? redditPost.text + "\n"
										: ""
								}`,
							];

							if (redditPost.media) {
								for (let mediaEntity of redditPost.media) {
									if (mediaEntity.type === 1) {
										// It's an image
										templateArray.push(
											`![](${mediaEntity.url})\n`
										);
									} else if (mediaEntity.type === 2) {
										// It's a video
										templateArray.push(
											`[Video](${mediaEntity.url})\n`
										);
									}
								}
							}

							let template = templateArray.join("\n");

							await this.app.vault.create(
								this.settings.syncFolder +
									"/" +
									sanitize(
										redditPost.title
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
								`Error syncing redditPost ${redditPost.url} -`,
								error
							);
						}
					}
				}

				if (
					userData.hasOwnProperty("kindleHighlights") &&
					userData.kindleHighlights.length !== 0
				) {
					for (let kindleHighlight of userData.kindleHighlights) {
						try {
							// Find if there's an existing page for the kindle highlight already in Tressel
							const bookPage =
								await this.app.vault.getAbstractFileByPath(
									this.settings.syncFolder +
										"/" +
										sanitize(
											kindleHighlight.book.title
												.replace(/(\r\n|\n|\r)/gm, " ")
												.replace("\n\n", " ")
												.replace("\n\n\n", " ")
												.slice(0, 50)
										) +
										".md"
								);

							let updatedBookPage: TFile;
							if (bookPage instanceof TFile) {
								updatedBookPage = bookPage;
							} else {
								// Create new page for Book in Tressel directory
								let templateArray = [
									`# ${kindleHighlight.book.title.replace(
										/(\r\n|\n|\r)/gm,
										" "
									)}`,
									`## Metadata`,
									`- Author: ${kindleHighlight.book.author}`,
									`- Type: 📕 Kindle Highlight #kindle-highlight`,
									`- URL: ${kindleHighlight.book.url}\n`,
									`## Highlights`,
								];

								let template = templateArray.join("\n");

								try {
									updatedBookPage =
										await this.app.vault.create(
											this.settings.syncFolder +
												"/" +
												sanitize(
													kindleHighlight.book.title
														.replace(
															/(\r\n|\n|\r)/gm,
															" "
														)
														.replace("\n\n", " ")
														.replace("\n\n\n", " ")
														.slice(0, 50)
												) +
												".md",
											template
										);
								} catch (error) {
									console.error(
										`Error syncing kindleHighlight ${kindleHighlight.url} -`,
										error
									);
								}
							}

							if (updatedBookPage) {
								let updatedBookContents =
									await this.app.vault.read(updatedBookPage);

								updatedBookContents += `\n${kindleHighlight.text} - *Location: ${kindleHighlight.location}*\n`;
								await this.app.vault.modify(
									updatedBookPage,
									updatedBookContents
								);
							}
						} catch (error) {
							console.error(
								`Error syncing kindleHighlight ${kindleHighlight.url} -`,
								error
							);
						}
					}
				}

				if (
					userData.hasOwnProperty("genericHighlights") &&
					userData.genericHighlights.length !== 0
				) {
					for (let genericHighlight of userData.genericHighlights) {
						try {
							// Create new page for redditPost in Tressel directory
							let templateArray = [
								`# ${genericHighlight.title.replace(
									/(\r\n|\n|\r)/gm,
									" "
								)}`,
								`## Metadata`,
								`- Type: 💬 Highlight #highlight`,
								`- URL: ${genericHighlight.url}\n`,
								`## Highlight`,
								`${
									genericHighlight.text
										? genericHighlight.text + "\n"
										: ""
								}`,
							];

							let template = templateArray.join("\n");

							await this.app.vault.create(
								this.settings.syncFolder +
									"/" +
									sanitize(
										genericHighlight.title
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
								`Error syncing genericHighlight ${genericHighlight.url} -`,
								error
							);
						}
					}
				}
			} catch (error) {
				console.error("Error while syncing from Tressel -", error);
				new Notice(
					"Error while syncing from Tressel - check the console for logs"
				);
			}
		} else {
			new Notice(
				"Unable to sync from Tressel - please fill out your Tressel user token before syncing"
			);
		}

		if (!onload) {
			new Notice("Finished Tressel Sync");
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

	verifyToken = async (settingsTab: TresselSettingTab): Promise<void> => {
		try {
			this.apiClient = this.apiClient.updateClient(
				this.settings.tresselAccessToken
			);
			const verifiedResult = await this.apiClient.verifyAccessToken();
			this.tokenValid = verifiedResult.data.valid;
			try {
				this.userSubscribed = verifiedResult.data.subscribed;
			} catch (error) {
				this.userSubscribed = false;
			}
		} catch (error) {
			this.tokenValid = false;
			this.userSubscribed = false;
		}

		await this.saveSettings();
		if (settingsTab.containerEl.querySelector("#settingsContainer")) {
			settingsTab.displaySettings();
		}
	};

	debouncedVerifyToken = debounce(this.verifyToken, 500);
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
				"Get your unique token from the Obsidian/Access Token page in Tressel's integration settings"
			)
			.addText((text) =>
				text
					.setPlaceholder("XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX")
					.setValue(this.plugin.settings.tresselAccessToken)
					.onChange(async (value) => {
						this.plugin.settings.tresselAccessToken = value;
						this.plugin.debouncedVerifyToken(this);
						await this.plugin.saveSettings();
					})
			);

		containerEl.createDiv({
			attr: {
				id: "settingsContainer",
			},
		});

		this.displaySettings();
	}

	async displaySettings(): Promise<void> {
		const { containerEl } = this;
		const settingsContainer = containerEl.querySelector(
			"#settingsContainer"
		) as HTMLElement;
		settingsContainer.empty();

		if (this.plugin.tokenValid) {
			settingsContainer.createEl("h3", { text: "Preferences" });
			settingsContainer.createDiv({
				attr: {
					id: "preferencesContainer",
				},
			});

			this.loadPreferences();
		} else {
			settingsContainer.createEl("p", {
				text: "Invalid token - please enter the right token to sync your highlights from Tressel",
				cls: "tressel-invalid-token-error",
			});

			settingsContainer.createEl("p", {
				text: "You can find your Tressel access token in the Tressel integration settings page",
				cls: "tressel-invalid-token-error",
			});

			settingsContainer.createEl(
				"button",
				{ text: "Go to integration settings" },
				(button) => {
					button.onClickEvent((e) => {
						shell.openExternal(
							"https://app.tressel.xyz/settings/integrations/access-token"
						);
					});
				}
			);
		}
	}

	async loadPreferences(): Promise<void> {
		const { containerEl } = this;

		const preferencesContainer = containerEl.querySelector(
			"#preferencesContainer"
		) as HTMLElement;
		preferencesContainer.empty();

		new Setting(preferencesContainer)
			.setName("Clear Sync Memory")
			.setDesc(
				"Press this if you want to re-sync all your highlights from scratch (including ones already synced)"
			)
			.addButton((button) => {
				button.setButtonText("Clear Sync Memory").onClick(() => {
					new Notice("Clearing Obsidian sync memory...");
					this.plugin.apiClient.updateClient(
						this.plugin.settings.tresselAccessToken
					);
					this.plugin.apiClient
						.clearObsidianSyncMemory()
						.then(() => {
							new Notice(
								"Successfully cleared Obsidian sync memory"
							);
						})
						.catch((error) => {
							console.error(
								"Error clearing Obsidian sync memory - ",
								error
							);
							new Notice(
								"Error clearing Obsidian sync memory - check console for errors"
							);
						});
				});
			});

		new Setting(preferencesContainer)
			.setName("Folder Name")
			.setDesc(
				"Choose the folder you'd like your Tressel highlights to be stored in. If it doesn't exist, Tressel will automatically create it"
			)
			.addSearch((search) => {
				new FolderSuggest(this.app, search.inputEl);
				search
					.setPlaceholder("Example: folder1/folder2")
					.setValue(this.plugin.settings.syncFolder)
					.onChange((newFolder) => {
						this.plugin.settings.syncFolder = newFolder;
						this.plugin.saveSettings();
						// this.checkIfFolderNameValid();
					});
			});
	}
}
