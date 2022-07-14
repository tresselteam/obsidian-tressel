import { shell } from "electron";
import Api from "helpers/api";
import { createTresselSyncFolder, syncTresselUserData } from "helpers/sync";
import {
	App,
	debounce,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";
import { FolderSuggest } from "settings/suggesters/FolderSuggester";

export interface TresselPluginSettings {
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
				let userData = {} as any;

				do {
					userData = await (
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
					await createTresselSyncFolder(this.app, this.settings);

					await syncTresselUserData(
						userData,
						this.app,
						this.settings
					);
				} while (Object.keys(userData).length > 0);
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
			.setName("Tressel Access Token")
			.setDesc(
				"Get your unique access token from the Obsidian/Access Token page in Tressel's integration settings"
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

			await this.loadPreferences();

			settingsContainer.createEl("h3", { text: "Help & Support" });
			settingsContainer.createDiv({
				attr: {
					id: "supportContainer",
				},
			});

			await this.loadSupport();
		} else {
			settingsContainer.createEl("p", {
				text: "Invalid token - please enter the right token to sync your highlights from Tressel. You can find your Tressel access token in the Tressel integration settings page",
				cls: "tressel-invalid-token-error",
			});

			settingsContainer.createEl(
				"button",
				{ text: "⚙️ Go to integration settings" },
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
				button.setButtonText("☁️ Clear Sync Memory").onClick(() => {
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

		preferencesContainer.createEl(
			"button",
			{ text: "🔃 Resync" },
			(button) => {
				button.onClickEvent((e) => {
					this.plugin.syncTressel(false);
				});
			}
		);
	}

	async loadSupport(): Promise<void> {
		const { containerEl } = this;

		const supportContainer = containerEl.querySelector(
			"#supportContainer"
		) as HTMLElement;
		supportContainer.empty();

		supportContainer.createEl("p", {
			text: "Need help? Just email us at hello@tressel.xyz or go to the help center down below to submit a ticket or chat with us! Expect a response in 24-48hrs",
		});

		supportContainer.createEl(
			"button",
			{ text: "🔗 Go to Help Center" },
			(button) => {
				button.onClickEvent((e) => {
					shell.openExternal("https://tressel.tawk.help/");
				});
			}
		);
	}
}
