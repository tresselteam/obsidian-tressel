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

export const contract = c.router({
	ping: {
		method: "GET",
		path: "/ping",
		responses: {
			200: z.string(),
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
