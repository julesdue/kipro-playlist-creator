export interface Playlist {
  name: string;
  cliplist: string[];
}

export function parsePlaylistFile(text: string): Playlist {
  const data = JSON.parse(text) as Partial<Playlist>;
  return {
    name: typeof data.name === "string" ? data.name : "",
    cliplist: Array.isArray(data.cliplist) ? data.cliplist.filter((c) => typeof c === "string") : [],
  };
}

export function serializePlaylistFile(playlist: Playlist): string {
  return JSON.stringify({ name: playlist.name, cliplist: playlist.cliplist });
}
