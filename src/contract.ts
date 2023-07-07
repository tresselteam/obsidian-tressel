import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

const Clipping = z.object({
	id: z.string(),
	user_id: z.string(),
	type: z.union([z.literal("twitter"), z.literal("webpage")]),
	content: z.string(),
	created_at: z.string(),
	saved_at: z.string(),
	data: z.any(),
});

export type ClippingType = z.infer<typeof Clipping>;

export const apiContract = c.router({
	ping: {
		method: "GET",
		path: "/ping",
		responses: {
			200: z.string(),
		},
	},
	getAccessToken: {
		method: "GET",
		path: "/auth/access-token",
		responses: {
			200: z.string(),
		},
	},
	verifyToken: {
		method: "GET",
		path: "/auth/verify-token",
		responses: {
			200: z.boolean(),
		},
	},
	capture: {
		method: "POST",
		path: "/capture",
		body: z.object({
			type: z.enum(["twitter", "webpage"]),
			content: z.string(),
		}),
		responses: {
			200: z.boolean(),
		},
	},
	sync: {
		method: "GET",
		path: `/sync`,
		query: z.object({
			after: z.string().optional(),
		}),
		responses: {
			200: z.array(Clipping),
		},
	},
});

export type Tweet = {
	id: string;
	text: string;
	createdAt: string;
	author: Author;
	quotedTweet?: QuotedTweet;
	attachment?: Attachment;
};

export type Attachment = ImageAttachment | LinkAttachment;

export type ImageAttachment = {
	type: "image";
	src: string;
};

export type LinkAttachment = {
	type: "link";
	src: string;
};

export type Author = {
	name: string;
	username: string;
	avatar?: string;
};

export type QuotedTweet = {
	id?: string;
	source?: string;
	text: string;
	author: Author;
};
