import { Attachment, ClippingType, QuotedTweet, Tweet } from "contract";

export function twitterClippingToMarkdown(clipping: ClippingType): string {
	const tweets = clipping.data as Tweet[];
	const tweet = tweets[0];
	return `
---
author: ${tweet.author.name}
username: ${tweet.author.username}
source: ${`https://twitter.com/${tweet.author.username}/status/${tweet.id}`}
posted: ${clipping.created_at}
saved: ${clipping.saved_at}
---

${clipping.data.map(tweetToMarkdown).join("\n\n---\n\n")}
`.trim();
}

function tweetToMarkdown(tweet: Tweet): string {
	const avatar = tweet.author.avatar
		? `![${tweet.author.username}|20](${tweet.author.avatar})  `
		: "";

	const attachment = tweet.attachment
		? "\n" + attachmentToMarkdown(tweet.attachment)
		: null;

	return [
		`${avatar}${tweet.author.name} · @${tweet.author.username} · ${tweet.createdAt}`,
		tweet.text,
		tweet.quotedTweet
			? "\n" + quotedTweetToMarkdown(tweet.quotedTweet)
			: null,
		attachment,
	]
		.filter((line) => line)
		.join("\n");
}

function quotedTweetToMarkdown(tweet: QuotedTweet): string {
	const avatar = tweet.author.avatar
		? `![${tweet.author.username}|20](${tweet.author.avatar})  `
		: "";
	const open = tweet.source ? `[Open](${tweet.source})` : null;
	return quoteBlock(
		[
			`${avatar}${tweet.author.name} · @${tweet.author.username}`,
			tweet.text,
			open,
		]
			.filter((line) => line)
			.join("\n")
	);
}

function attachmentToMarkdown(attachment: Attachment): string {
	switch (attachment.type) {
		case "image":
			return `![image|300](${attachment.src})`;
	}
}

function quoteBlock(text: string) {
	return text
		.split("\n")
		.map((line) => `> ${line}`)
		.join("\n");
}
