import { ApiClient, createApi } from "api";
import { shell } from "electron";
import { LegacyApi } from "helpers/legacy-api";
import {
	createTresselSyncFolder,
	syncTresselUserData,
} from "helpers/legacy-sync";
import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	debounce,
} from "obsidian";
import { onAppBecameActive, saveFile } from "obsidian-platform-adapter";

import { FolderSuggest } from "settings/suggesters/FolderSuggester";
import { SyncEngine } from "sync-engine";
import { minutes } from "time";

export interface TresselPluginSettings {
	tresselAccessToken: string;
	syncFolder: string;
	subFolders: boolean;
	removeMainHeading: boolean;
}

const DEFAULT_SETTINGS: TresselPluginSettings = {
	tresselAccessToken: "",
	syncFolder: "🗃️ Tressel",
	subFolders: true,
	removeMainHeading: false,
};

export default class TresselPlugin extends Plugin {
	settings: TresselPluginSettings;
	tokenValid: boolean;
	userSubscribed: boolean;

	legacyApi: LegacyApi;
	api: ApiClient;
	syncEngine: SyncEngine;

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

		this.legacyApi = new LegacyApi(this.settings.tresselAccessToken);
		this.api = createApi(() => this.settings.tresselAccessToken);

		this.syncEngine = new SyncEngine({
			api: this.api,
			basePath: this.settings.syncFolder,
			setInterval: (cb, interval) => {
				const id = window.setInterval(cb, interval);
				this.registerInterval(id);
				return id;
			},
			clearInterval: (id) => clearInterval(id),
			saveFile: (opts) => saveFile(this.app.vault, opts),
			onAppBecameActive: (cb) =>
				onAppBecameActive(this, minutes(0.1), cb),
		});

		await this.saveSettings();

		this.app.workspace.onLayoutReady(() =>
			this.initializeTressel(settingsTab)
		);

		this.addCommand({
			id: "run-tressel-sync",
			name: "Sync Tressel",
			callback: () => {
				this.syncTressel(true);
			},
		});
	}

	async initializeTressel(settingsTab: TresselSettingTab) {
		try {
			// Verify token
			await this.verifyToken(settingsTab);
			if (this.tokenValid) {
				await this.syncTressel(false);
			} else {
				new Notice(
					"Unable to sync from Tressel - Invalid Token provided"
				);
			}
		} catch {}
	}

	async syncTressel(notify: boolean = false) {
		if (notify) {
			new Notice("Starting Tressel Sync");
		}

		if (this.settings.tresselAccessToken === "") {
			new Notice(
				"Unable to sync from Tressel - please fill out your Tressel user token before syncing"
			);
			return;
		}

		await this.syncEngine.sync();

		try {
			this.legacyApi.updateClient(this.settings.tresselAccessToken);
			let userData = {} as any;

			do {
				userData = await (
					await this.legacyApi.syncObsidianUserData()
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

				await createTresselSyncFolder(this.app, this.settings);
				await syncTresselUserData(userData, this.app, this.settings);
			} while (Object.keys(userData).length > 0);
		} catch (error) {
			console.error("Error while syncing from Tressel -", error);
			new Notice(
				"Error while syncing from Tressel - check the console for logs"
			);
			return;
		}

		if (!notify) {
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
			this.legacyApi = this.legacyApi.updateClient(
				this.settings.tresselAccessToken
			);
			const verifiedResult = await this.legacyApi.verifyAccessToken();
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
							"https://app.tressel.xyz/connect/obsidian"
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
					this.plugin.legacyApi.updateClient(
						this.plugin.settings.tresselAccessToken
					);
					this.plugin.legacyApi
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

		new Setting(preferencesContainer)
			.setName("Subfolder Organization")
			.setDesc(
				"Sync into separate folders based on type. For example, Twitter threads will be saved to /Twitter/Tweet Collections. Leave this off if you want a flat file structure."
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.subFolders)
					.onChange((newToggle) => {
						this.plugin.settings.subFolders = newToggle;
						this.plugin.saveSettings();
					});
			});

		new Setting(preferencesContainer)
			.setName("Remove Main Title Heading")
			.setDesc(
				"Remove the main title heading from synced highlight pages. This is so you don't view two titles when viewing in Obsidian."
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.removeMainHeading)
					.onChange((newToggle) => {
						this.plugin.settings.removeMainHeading = newToggle;
						this.plugin.saveSettings();
					});
			});

		preferencesContainer.createEl(
			"button",
			{ text: "🔃 Resync" },
			(button) => {
				button.onClickEvent((e) => {
					this.plugin.syncTressel(true);
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
			text: "Need help? Just send an email to hello@tressel.xyz. Expect a response in 24-48hrs",
		});
	}
}
