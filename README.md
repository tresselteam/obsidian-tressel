# Tressel Sync for Obsidian

![](https://tressel.xyz/open-graph-image.png)

Official Tressel plugin to save & export content/highlights from **Twitter, Reddit, Kindle, Pocket, Instapaper, Raindrop, Hypothes.is, Hacker News and more** in [Tressel](https://tressel.xyz) into Obsidian

## Instructions

1. Install the plugin
2. Copy your personal token from the Access Token/Obsidian settings section in the [Tressel app](https://app.tressel.xyz) into the Tressel plugin settings in Obsidian
3. **You're done!** Your saved content will automatically be synced every time you open Obsidian
4. *Optional - you can click the Sync Tressel button in the side ribbon to manually sync from Tressel*
5. *Optional - you can click Clear Sync Memory in the [Tressel app](https://app.tressel.xyz) settings to resync all your content from scratch*

## Notes

For feature requests, to report bugs or request help using the plugin, please email hello@tressel.xyz, create an issue or use the Help & Support form in the [Tressel app](https://app.tressel.xyz)

## Changelog
- 0.2.8
  - Updated some broken links
- 0.2.7
  - Support for Raindrops (i.e. links/bookmarks)
- 0.2.6
  - Added Subfolder organization preference
  - Added Remove main title heading from highlights preference
- 0.2.5
  - Support for Hypothes.is annotations/highlights
- 0.2.4
  - Support for Raindrop highlights
- 0.2.3
  - Support for Instapaper highlights
- 0.2.2
  - Support for Hacker News highlights
- 0.2.1
  - Only create subfolders if the content exists for those folders
- 0.2.0
  - Fix issues syncing large numbers of highlights to Obsidian
  - Fix Tressel folders not being created before sync
  - Add Help & Support links and resync button to plugin settings
  - Internal improvements
    - Modularize code (by function)
- 0.1.9
  - Support for Pocket highlights
- 0.1.8
  - Support for generic highlights
  - Change folder name from Settings
  - Clear Sync Memory from Settings
  - Add folders to organize highlights (e.g. tweets go into /Twitter/Tweets subdirectory)
- 0.1.7
  - Fix random "Invalid token provided" errors
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
