import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { ClipList } from "./ClipList";
import { parsePlaylistFile, serializePlaylistFile, type Playlist } from "./playlistFile";
import {
  isFileSystemAccessSupported,
  openPlaylistFile,
  readDroppedFile,
  saveAsPlaylistFile,
  saveToHandle,
  type OpenedFile,
} from "./fileAccess";

const EMPTY_PLAYLIST: Playlist = { name: "untitled", cliplist: [] };

function App() {
  const [playlist, setPlaylist] = useState<Playlist>(EMPTY_PLAYLIST);
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [fileName, setFileName] = useState("untitled.playlist");
  const [isDirty, setIsDirty] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [status, setStatus] = useState<string>("");
  const dragCounter = useRef(0);

  const canSaveInPlace = isFileSystemAccessSupported();

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(""), 3000);
    return () => clearTimeout(t);
  }, [status]);

  const loadOpenedFile = useCallback((opened: OpenedFile) => {
    try {
      const parsed = parsePlaylistFile(opened.text);
      setPlaylist(parsed);
      setFileHandle(opened.handle);
      setFileName(opened.fileName);
      setIsDirty(false);
      setStatus(`Loaded ${opened.fileName}`);
    } catch {
      setStatus(`Could not parse ${opened.fileName} as a playlist`);
    }
  }, []);

  const addClips = useCallback((names: string[]) => {
    if (names.length === 0) return;
    setPlaylist((p) => ({ ...p, cliplist: [...p.cliplist, ...names] }));
    setIsDirty(true);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      dragCounter.current = 0;

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      const playlistFile = files.find((f) => f.name.toLowerCase().endsWith(".playlist"));
      if (playlistFile && files.length === 1) {
        const opened = await readDroppedFile(playlistFile);
        loadOpenedFile(opened);
        return;
      }

      addClips(files.map((f) => f.name));
    },
    [addClips, loadOpenedFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current += 1;
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragOver(false);
    }
  }, []);

  const handleReorder = useCallback((clips: string[]) => {
    setPlaylist((p) => ({ ...p, cliplist: clips }));
    setIsDirty(true);
  }, []);

  const handleRemove = useCallback((index: number) => {
    setPlaylist((p) => ({ ...p, cliplist: p.cliplist.filter((_, i) => i !== index) }));
    setIsDirty(true);
  }, []);

  const handleNameChange = useCallback((name: string) => {
    setPlaylist((p) => ({ ...p, name }));
    setIsDirty(true);
  }, []);

  const handleOpen = useCallback(async () => {
    const opened = await openPlaylistFile();
    if (opened) loadOpenedFile(opened);
  }, [loadOpenedFile]);

  const handleSave = useCallback(async () => {
    const contents = serializePlaylistFile(playlist);
    if (fileHandle) {
      await saveToHandle(fileHandle, contents);
      setIsDirty(false);
      setStatus(`Saved ${fileName}`);
    } else {
      const handle = await saveAsPlaylistFile(contents, fileName);
      if (handle) {
        setFileHandle(handle);
        setIsDirty(false);
        setStatus(`Saved ${fileName}`);
      } else if (!canSaveInPlace) {
        setIsDirty(false);
        setStatus(`Downloaded ${fileName}`);
      }
    }
  }, [playlist, fileHandle, fileName, canSaveInPlace]);

  const handleSaveAs = useCallback(async () => {
    const suggested = fileName.endsWith(".playlist") ? fileName : `${playlist.name || "untitled"}.playlist`;
    const contents = serializePlaylistFile(playlist);
    const handle = await saveAsPlaylistFile(contents, suggested);
    if (handle) {
      setFileHandle(handle);
      setFileName(handle.name);
      setIsDirty(false);
      setStatus(`Saved ${handle.name}`);
    } else if (!canSaveInPlace) {
      setIsDirty(false);
      setStatus(`Downloaded ${suggested}`);
    }
  }, [playlist, fileName, canSaveInPlace]);

  return (
    <div
      className={`app ${isDragOver ? "drag-over" : ""}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      <header className="toolbar">
        <h1>KiPro Playlist Creator</h1>
        <div className="toolbar-actions">
          <button onClick={handleOpen}>Open…</button>
          <button onClick={handleSave} disabled={!isDirty && !!fileHandle}>
            Save
          </button>
          <button onClick={handleSaveAs}>Save As…</button>
        </div>
      </header>

      <div className="playlist-meta">
        <label htmlFor="playlist-name">Name</label>
        <input
          id="playlist-name"
          type="text"
          value={playlist.name}
          onChange={(e) => handleNameChange(e.target.value)}
        />
        <span className="file-info">
          {fileName}
          {isDirty ? " •" : ""}
        </span>
      </div>

      <main className="drop-zone">
        <ClipList clips={playlist.cliplist} onReorder={handleReorder} onRemove={handleRemove} />
      </main>

      {isDragOver && (
        <div className="drag-overlay">
          <p>Drop files to add them to the playlist</p>
        </div>
      )}

      <footer className="status-bar">
        <span>{status}</span>
        {!canSaveInPlace && (
          <span className="hint">Save downloads a new file in this browser (in-place save needs Chrome/Edge)</span>
        )}
      </footer>
    </div>
  );
}

export default App;
