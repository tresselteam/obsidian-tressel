export type SaveFileOpts = {
	filepath: string;
	contents: string;
	onConflict: "skip" | "replace";
};

type Callback = () => void;

export interface PlatformAdapter {
	setInterval: (cb: Callback, interval: number) => number;
	clearInterval: (id: number) => void;
	saveFile: (opts: SaveFileOpts) => void;
	onAppBecameActive: (cb: Callback) => void;
}
