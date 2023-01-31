import { TresselPluginSettings } from "main";
import { App, TFile, TFolder } from "obsidian";
import sanitize from "sanitize-filename";
import TurndownService from "turndown";

export const createTresselSyncFolder = async (
	app: App,
	settings: TresselPluginSettings
) => {
	const tresselFolder = app.vault.getAbstractFileByPath(settings.syncFolder);
	const tresselFolderExists = tresselFolder instanceof TFolder;

	if (!tresselFolderExists) {
		try {
			await app.vault.createFolder(settings.syncFolder);
		} catch (error) {
			console.info("Error creating Tressel sync folder - ", error);
		}
	}
};

export const createSyncSubfolder = async (
	subfolderPath: string,
	app: App,
	settings: TresselPluginSettings
) => {
	try {
		await app.vault.createFolder(settings.syncFolder + subfolderPath);
	} catch (error) {
		console.info(
			`Error while creating Tressel ${subfolderPath} folder -`,
			error
		);
	}
};

export const syncTresselUserData = async (
	userData: any,
	app: App,
	settings: TresselPluginSettings
) => {
	if (userData.hasOwnProperty("tweets") && userData.tweets.length > 0) {
		await createSyncSubfolder("/Twitter", app, settings);
		await createSyncSubfolder("/Twitter/Tweets", app, settings);
		for (let tweet of userData.tweets) {
			await syncTweetToObsidian(tweet, app, settings);
		}
	}

	if (
		userData.hasOwnProperty("tweetCollections") &&
		userData.tweetCollections.length > 0
	) {
		await createSyncSubfolder("/Twitter", app, settings);
		await createSyncSubfolder("/Twitter/Tweet Collections", app, settings);
		for (let tweetCollection of userData.tweetCollections) {
			await syncTweetCollectionToObsidian(tweetCollection, app, settings);
		}
	}

	if (
		userData.hasOwnProperty("redditComments") &&
		userData.redditComments.length > 0
	) {
		await createSyncSubfolder("/Reddit", app, settings);
		await createSyncSubfolder("/Reddit/Comments", app, settings);
		for (let redditComment of userData.redditComments) {
			await syncRedditCommentToObsidian(redditComment, app, settings);
		}
	}

	if (
		userData.hasOwnProperty("redditPosts") &&
		userData.redditPosts.length > 0
	) {
		await createSyncSubfolder("/Reddit", app, settings);
		await createSyncSubfolder("/Reddit/Posts", app, settings);
		for (let redditPost of userData.redditPosts) {
			await syncRedditPostToObsidian(redditPost, app, settings);
		}
	}

	if (
		userData.hasOwnProperty("kindleHighlights") &&
		userData.kindleHighlights.length > 0
	) {
		await createSyncSubfolder("/Kindle Highlights", app, settings);
		for (let kindleHighlight of userData.kindleHighlights) {
			await syncKindleHighlightToObsidian(kindleHighlight, app, settings);
		}
	}

	if (
		userData.hasOwnProperty("genericHighlights") &&
		userData.genericHighlights.length > 0
	) {
		await createSyncSubfolder("/Highlights", app, settings);
		for (let genericHighlight of userData.genericHighlights) {
			await syncGenericHighlightToObsidian(
				genericHighlight,
				app,
				settings
			);
		}
	}

	if (
		userData.hasOwnProperty("pocketHighlights") &&
		userData.pocketHighlights.length > 0
	) {
		await createSyncSubfolder("/Pocket", app, settings);
		for (let pocketHighlight of userData.pocketHighlights) {
			await syncPocketHighlightToObsidian(pocketHighlight, app, settings);
		}
	}

	if (
		userData.hasOwnProperty("hackerNewsHighlights") &&
		userData.hackerNewsHighlights.length > 0
	) {
		await createSyncSubfolder("/Hacker News", app, settings);
		for (let hackerNewsHighlight of userData.hackerNewsHighlights) {
			await syncHackerNewsHighlightToObsidian(
				hackerNewsHighlight,
				app,
				settings
			);
		}
	}

	if (
		userData.hasOwnProperty("instapaperHighlights") &&
		userData.instapaperHighlights.length > 0
	) {
		await createSyncSubfolder("/Instapaper", app, settings);
		for (let instapaperHighlight of userData.instapaperHighlights) {
			await syncInstapaperHighlightToObsidian(
				instapaperHighlight,
				app,
				settings
			);
		}
	}
};

const syncTweetToObsidian = async (
	tweet: any,
	app: App,
	settings: TresselPluginSettings
) => {
	try {
		// Create new page for tweet in Tressel directory
		let templateArray = [
			`# ${tweet.text.replace(/(\r\n|\n|\r)/gm, " ").slice(0, 50)}...`,
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

		await app.vault.create(
			settings.syncFolder +
				"/Twitter/Tweets/" +
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
		console.error(`Error syncing tweet ${tweet.url} -`, error);
	}
};

const syncTweetCollectionToObsidian = async (
	tweetCollection: any,
	app: App,
	settings: TresselPluginSettings
) => {
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
						templateArray.push(`![](${mediaEntity.url})\n`);
					}
				}
			}

			let template = templateArray.join("\n");

			await app.vault.create(
				settings.syncFolder +
					"/Twitter/Tweet Collections/" +
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
						templateArray.push(`![](${mediaEntity.url})\n`);
					}
				}
				templateArray.push(`---\n`);
			}

			let template = templateArray.join("\n");

			await app.vault.create(
				settings.syncFolder +
					"/Twitter/Tweet Collections/" +
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
};

const syncRedditCommentToObsidian = async (
	redditComment: any,
	app: App,
	settings: TresselPluginSettings
) => {
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

		await app.vault.create(
			settings.syncFolder +
				"/Reddit/Comments/" +
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
};

const syncRedditPostToObsidian = async (
	redditPost: any,
	app: App,
	settings: TresselPluginSettings
) => {
	try {
		// Create new page for redditPost in Tressel directory
		let templateArray = [
			`# ${redditPost.title.replace(/(\r\n|\n|\r)/gm, " ")}`,
			`## Metadata`,
			`- Subreddit: [r/${redditPost.subreddit}](https://reddit.com/r/${redditPost.subreddit})`,
			`- Author: [u/${redditPost.author.username}](https://reddit.com/user/${redditPost.author.username})`,
			`- Type: 👾 Reddit Post #reddit-post`,
			`- URL: ${redditPost.url}\n`,
			`## Post`,
			`${redditPost.text ? redditPost.text + "\n" : ""}`,
		];

		if (redditPost.media) {
			for (let mediaEntity of redditPost.media) {
				if (mediaEntity.type === 1) {
					// It's an image
					templateArray.push(`![](${mediaEntity.url})\n`);
				} else if (mediaEntity.type === 2) {
					// It's a video
					templateArray.push(`[Video](${mediaEntity.url})\n`);
				}
			}
		}

		let template = templateArray.join("\n");

		await app.vault.create(
			settings.syncFolder +
				"/Reddit/Posts/" +
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
		console.error(`Error syncing redditPost ${redditPost.url} -`, error);
	}
};

const syncKindleHighlightToObsidian = async (
	kindleHighlight: any,
	app: App,
	settings: TresselPluginSettings
) => {
	try {
		// Find if there's an existing page for the kindle highlight already in Tressel
		const bookPage = await app.vault.getAbstractFileByPath(
			settings.syncFolder +
				"/Kindle Highlights/" +
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
				updatedBookPage = await app.vault.create(
					settings.syncFolder +
						"/Kindle Highlights/" +
						sanitize(
							kindleHighlight.book.title
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
					`Error syncing kindleHighlight ${kindleHighlight.url} -`,
					error
				);
			}
		}

		if (updatedBookPage) {
			let updatedBookContents = await app.vault.read(updatedBookPage);

			updatedBookContents += `\n${kindleHighlight.text} - *Location: ${kindleHighlight.location}*\n`;
			await app.vault.modify(updatedBookPage, updatedBookContents);
		}
	} catch (error) {
		console.error(
			`Error syncing kindleHighlight ${kindleHighlight.url} -`,
			error
		);
	}
};

const syncGenericHighlightToObsidian = async (
	genericHighlight: any,
	app: App,
	settings: TresselPluginSettings
) => {
	try {
		// Create new page for redditPost in Tressel directory
		let templateArray = [
			`# ${genericHighlight.title.replace(/(\r\n|\n|\r)/gm, " ")}`,
			`## Metadata`,
			`- Type: 💬 Highlight #highlight`,
			`- URL: ${genericHighlight.url}\n`,
			`## Highlight`,
			`${genericHighlight.text ? genericHighlight.text + "\n" : ""}`,
		];

		let template = templateArray.join("\n");

		await app.vault.create(
			settings.syncFolder +
				"/Highlights/" +
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
};

const syncPocketHighlightToObsidian = async (
	pocketHighlight: any,
	app: App,
	settings: TresselPluginSettings
) => {
	try {
		// Find if there's an existing page for the pocket article already in Tressel
		const articlePage = await app.vault.getAbstractFileByPath(
			settings.syncFolder +
				"/Pocket/" +
				sanitize(
					pocketHighlight.pocketArticle.title
						.replace(/(\r\n|\n|\r)/gm, " ")
						.replace("\n\n", " ")
						.replace("\n\n\n", " ")
						.slice(0, 50)
				) +
				".md"
		);

		let updatedArticlePage: TFile;
		if (articlePage instanceof TFile) {
			updatedArticlePage = articlePage;
		} else {
			// Create new page for article in Tressel directory
			let templateArray = [
				`# ${pocketHighlight.pocketArticle.title.replace(
					/(\r\n|\n|\r)/gm,
					" "
				)}`,
				`## Metadata`,
				`- Author: ${pocketHighlight.pocketArticle.author}`,
				`- Type: 📑 Pocket Highlights #pocket-highlights`,
				`- URL: ${pocketHighlight.pocketArticle.url}\n`,
				`## Highlights`,
			];

			let template = templateArray.join("\n");

			try {
				updatedArticlePage = await app.vault.create(
					settings.syncFolder +
						"/Pocket/" +
						sanitize(
							pocketHighlight.pocketArticle.title
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
					`Error syncing pocketHighlight ${pocketHighlight.pocketArticle.url} -`,
					error
				);
			}
		}

		if (updatedArticlePage) {
			let updatedArticleContents = await app.vault.read(
				updatedArticlePage
			);

			updatedArticleContents += `\n${pocketHighlight.text}*\n`;
			await app.vault.modify(updatedArticlePage, updatedArticleContents);
		}
	} catch (error) {
		console.error(
			`Error syncing pocketHighlight ${pocketHighlight.pocketArticle.url} -`,
			error
		);
	}
};

const syncInstapaperHighlightToObsidian = async (
	instapaperHighlight: any,
	app: App,
	settings: TresselPluginSettings
) => {
	try {
		// Find if there's an existing page for the instapaper bookmark already in Tressel
		const bookmarkPage = await app.vault.getAbstractFileByPath(
			settings.syncFolder +
				"/Instapaper/" +
				sanitize(
					instapaperHighlight.instapaperBookmark.title
						.replace(/(\r\n|\n|\r)/gm, " ")
						.replace("\n\n", " ")
						.replace("\n\n\n", " ")
						.slice(0, 50)
				) +
				".md"
		);

		let updatedArticlePage: TFile;
		if (bookmarkPage instanceof TFile) {
			updatedArticlePage = bookmarkPage;
		} else {
			// Create new page for bookmark in Tressel directory
			let templateArray = [
				`# ${instapaperHighlight.instapaperBookmark.title.replace(
					/(\r\n|\n|\r)/gm,
					" "
				)}`,
				`## Metadata`,
				`- Type: 📑 Instapaper Highlights #instapaper-highlights`,
				`- URL: ${instapaperHighlight.instapaperBookmark.url}\n`,
				`## Highlights/Notes`,
			];

			let template = templateArray.join("\n");

			try {
				updatedArticlePage = await app.vault.create(
					settings.syncFolder +
						"/Instapaper/" +
						sanitize(
							instapaperHighlight.instapaperBookmark.title
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
					`Error syncing instapaperHighlight ${instapaperHighlight.instapaperBookmark.url} -`,
					error
				);
			}
		}

		if (updatedArticlePage) {
			let updatedArticleContents = await app.vault.read(
				updatedArticlePage
			);

			if (instapaperHighlight.note) {
				updatedArticleContents += `\n***${instapaperHighlight.note}***\n`;
			}
			updatedArticleContents += `\n${instapaperHighlight.text}*\n`;
			await app.vault.modify(updatedArticlePage, updatedArticleContents);
		}
	} catch (error) {
		console.error(
			`Error syncing instapaperHighlight ${instapaperHighlight.instapaperBookmark.url} -`,
			error
		);
	}
};

const syncHackerNewsHighlightToObsidian = async (
	hackerNewsHighlight: any,
	app: App,
	settings: TresselPluginSettings
) => {
	try {
		const turndownService = new TurndownService();

		// Create new page for hackerNewsHighlight in Tressel directory
		let templateArray = [
			`# ${
				hackerNewsHighlight.title
					? hackerNewsHighlight.title.replace(/(\r\n|\n|\r)/gm, " ")
					: hackerNewsHighlight.text
							.substring(0, 80)
							.replace(/(\r\n|\n|\r)/gm, " ") + "..."
			}`,
			`## Metadata`,
			`- Author: [${hackerNewsHighlight.author}](https://news.ycombinator.com/user?id=${hackerNewsHighlight.author})`,
			`- Type: 👾 Hacker News Highlight #hacker-news-highlight`,
			`- URL: https://news.ycombinator.com/item?id=${hackerNewsHighlight.hackerNewsHighlightId}\n`,
			`## Highlight`,
			`${
				hackerNewsHighlight.text
					? turndownService.turndown(hackerNewsHighlight.text) + "\n"
					: ""
			}`,
		];

		if (hackerNewsHighlight.url) {
			templateArray.push(`[Link](${hackerNewsHighlight.url})\n`);
		}

		let template = templateArray.join("\n");

		await app.vault.create(
			settings.syncFolder +
				"/Hacker News/" +
				sanitize(
					hackerNewsHighlight.title
						? hackerNewsHighlight.title
								.replace(/(\r\n|\n|\r)/gm, " ")
								.replace("\n\n", " ")
								.replace("\n\n\n", " ")
								.slice(0, 50)
						: hackerNewsHighlight.text
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
			`Error syncing hackerNewsHighlight ${hackerNewsHighlight.url} -`,
			error
		);
	}
};
