import { initClient } from "@ts-rest/core";
import axios, { AxiosError, AxiosResponse, Method } from "axios";
import { apiContract } from "contract";
import { API_BASE_URL } from "env";

export function createApi(getAccessToken: () => string) {
	const client = initClient(apiContract, {
		baseUrl: API_BASE_URL,
		baseHeaders: {
			"Content-Type": "application/json",
		},
		api: async ({ path, method, headers, body }) => {
			try {
				const response = await axios.request({
					method: method as Method,
					url: path,
					headers: {
						...headers,
						Authorization: `Access ${getAccessToken()}`,
					} as Record<string, string>,
					data: body,
				});
				return {
					status: response.status,
					body: response.data,
					headers: new Headers(response.headers),
				};
			} catch (e: Error | AxiosError | any) {
				if (axios.isAxiosError(e)) {
					const error = e as AxiosError;
					const response = error.response as AxiosResponse;
					return {
						status: response.status,
						body: response.data,
						headers: new Headers(response.headers),
					};
				}
				throw e;
			}
		},
	});

	return client;
}

export type ApiClient = ReturnType<typeof createApi>;
