# Tressel Sync for Obsidian

Official Tressel plugin to save & export content from Twitter and Reddit in [Tressel](https://tressel.xyz) into Obsidian

## Instructions

1. Install the plugin
2. Copy your personal token from the Obsidian settings section in the [Tressel app](https://app.tressel.xyz) into the Tressel plugin settings in Obsidian
3. **You're done!** Your Reddit & Twitter content will automatically be synced every time you open Obsidian
4. *Optional - you can click the Sync Tressel button in the side ribbon to manually sync from Tressel*
5. *Optional - you can click Clear Sync Memory in the [Tressel app](https://app.tressel.xyz) settings to resync all your content from scratch*

## Notes

*The plugin is in the **alpha** stage of development and has currently only been tested on desktop*

For feature requests, to report bugs or request help using the plugin, please create an issue or use the Help & Support form in the [Tressel app](https://app.tressel.xyz)

## Changelog

- 0.1.6
  - Support for syncing Kindle highlights from Tressel
- 0.1.5
  - Support for syncing Reddit posts and comments from Tressel
- 0.1.4
  - Update API URL
- 0.1.3
  - Clear Sync Memory now in Tressel dashboard settings (vs previously in plugin settings)
  - Performance improvements in fetching new tweets/tweet collections from Tressel
  - Internal improvements:
    - Additional error message logging (for help with support enquiries)
    - Fetch data from Node.js server with token authentication (previously Firebase serverless)
- 0.1.2
  - Export conversations to Obsidian (new feature)
- 0.1.1
  - Fix Markdown template spacing, metadata and title issues
- 0.1.0
  - Adds images to synced tweets and threads from Tressel
  - Internal improvements:
    - Use Obsidian Vault API instead of Adapter API
    - Use Obsidian request API instead of axios (for greater mobile compatibility and smaller bundle size)
    - Use async/await instead of .then (for better code readability)
- 0.0.2
  - Restricts the plugin for desktop use only (due to lack of testing on mobile)
- 0.0.1
  - Initial release
  - Sync your tweets and threads from Tressel to Obsidian (text-only)
