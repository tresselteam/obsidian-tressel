import { App, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";

// Remember to rename these classes and interfaces!

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

		// Create a Tressel sync button in the left ribbon.
		this.addRibbonIcon("sync", "Sync Tressel", (evt: MouseEvent) => {
			// Called when the user clicks the button.
			new Notice("Clicked Sync Tressel");
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new TresselSettingTab(this.app, this));
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
