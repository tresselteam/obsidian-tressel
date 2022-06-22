import axios, { AxiosInstance, AxiosRequestHeaders } from "axios";

class Api {
	tresselAccessToken: string | null;
	client: AxiosInstance;
	apiBaseUrl: string;

	constructor(tresselAccessToken: string) {
		this.apiBaseUrl = "https://api.tressel.xyz";
		this.tresselAccessToken = tresselAccessToken;

		const headers: AxiosRequestHeaders = {
			Accept: "application/json",
		};

		if (this.tresselAccessToken) {
			headers.Authorization = `Access ${this.tresselAccessToken}`;
		}

		this.client = axios.create({
			baseURL: this.apiBaseUrl,
			timeout: 60000,
			headers: headers,
		});
	}

	updateClient = (newToken: string) => {
		this.tresselAccessToken = newToken;

		const headers: AxiosRequestHeaders = {
			Accept: "application/json",
		};

		if (this.tresselAccessToken) {
			headers.Authorization = `Access ${this.tresselAccessToken}`;
		}

		this.client = axios.create({
			baseURL: this.apiBaseUrl,
			timeout: 60000,
			headers: headers,
		});

		return this;
	};

	// Endpoints
	verifyAccessToken = () => {
		return this.client.get("/token/verify");
	};

	syncObsidianUserData = () => {
		return this.client.get("/obsidian/data");
	};

	clearObsidianSyncMemory = () => {
		return this.client.get("/obsidian/clear-sync-memory");
	};
}

export default Api;
