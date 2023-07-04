import { ClippingType } from "contract";

export function twitterClippingToMarkdown(clipping: ClippingType): string {
	const tweet = clipping.data[0];
	return `
---
username: ${tweet.username}
source: ${`https://twitter.com/${tweet.username}/status/${tweet.id}`}
saved: ${clipping.saved_at}
---

${clipping.data.map(tweetToMarkdown).join("\n\n")}
`.trim();
}

function tweetToMarkdown(tweet: any): string {
	return `
@${tweet.username}
${tweet.text}
`.trim();
}
