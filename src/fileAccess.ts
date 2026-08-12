// Wraps the File System Access API (Chromium) with a download-based fallback
// (Firefox/Safari) so Save/Save As work everywhere, with in-place saving where supported.

type FileSystemFileHandleLike = FileSystemFileHandle;

export interface OpenedFile {
  text: string;
  fileName: string;
  handle: FileSystemFileHandleLike | null;
}

const supportsFileSystemAccess =
  typeof window !== "undefined" && "showSaveFilePicker" in window && "showOpenFilePicker" in window;

function playlistPickerOptions(): { types: FilePickerAcceptType[] } {
  return {
    types: [
      {
        description: "KiPro Playlist",
        accept: { "application/json": [".playlist"] },
      },
    ],
  };
}

export function isFileSystemAccessSupported(): boolean {
  return supportsFileSystemAccess;
}

export async function openPlaylistFile(): Promise<OpenedFile | null> {
  if (supportsFileSystemAccess) {
    let handles: FileSystemFileHandleLike[];
    try {
      handles = await window.showOpenFilePicker(playlistPickerOptions());
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return null;
      throw err;
    }
    const handle = handles[0];
    const file = await handle.getFile();
    const text = await file.text();
    return { text, fileName: file.name, handle };
  }
  return openPlaylistFileViaInput();
}

function openPlaylistFileViaInput(): Promise<OpenedFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".playlist";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const text = await file.text();
      resolve({ text, fileName: file.name, handle: null });
    };
    input.click();
  });
}

export async function readDroppedFile(file: File): Promise<OpenedFile> {
  const text = await file.text();
  return { text, fileName: file.name, handle: null };
}

export async function saveToHandle(handle: FileSystemFileHandleLike, contents: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(contents);
  await writable.close();
}

export async function saveAsPlaylistFile(
  contents: string,
  suggestedName: string
): Promise<FileSystemFileHandleLike | null> {
  if (supportsFileSystemAccess) {
    let handle: FileSystemFileHandleLike;
    try {
      handle = await window.showSaveFilePicker({
        ...playlistPickerOptions(),
        suggestedName,
      });
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return null;
      throw err;
    }
    await saveToHandle(handle, contents);
    return handle;
  }
  downloadAsFile(contents, suggestedName);
  return null;
}

function downloadAsFile(contents: string, fileName: string): void {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
