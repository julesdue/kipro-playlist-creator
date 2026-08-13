import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { AddClipForm } from "./AddClipForm";
import { ClipList } from "./ClipList";
import { sanitizeClipName } from "./clipName";
import { parsePlaylistFile, serializePlaylistFile, type Playlist } from "./playlistFile";
import { useTheme } from "./useTheme";
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
  const { theme, toggleTheme } = useTheme();

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

  const handleFix = useCallback((index: number) => {
    setPlaylist((p) => ({
      ...p,
      cliplist: p.cliplist.map((c, i) => (i === index ? sanitizeClipName(c) : c)),
    }));
    setIsDirty(true);
  }, []);

  const handleDuplicate = useCallback((index: number) => {
    setPlaylist((p) => ({
      ...p,
      cliplist: [...p.cliplist.slice(0, index + 1), p.cliplist[index], ...p.cliplist.slice(index + 1)],
    }));
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
        <ClipList
          clips={playlist.cliplist}
          onReorder={handleReorder}
          onRemove={handleRemove}
          onFix={handleFix}
          onDuplicate={handleDuplicate}
        />
        <AddClipForm onAdd={(name) => addClips([name])} />
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

      <button
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      >
        {theme === "dark" ? (
          <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM8 0a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V.75A.75.75 0 0 1 8 0ZM8 13a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 13ZM16 8a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 16 8ZM3.25 8a.75.75 0 0 1-.75.75H1a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75ZM13.66 2.34a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 1 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0ZM4.46 11.54a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 1 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0ZM13.66 13.66a.75.75 0 0 1-1.06 0l-1.06-1.06a.75.75 0 1 1 1.06-1.06l1.06 1.06a.75.75 0 0 1 0 1.06ZM4.46 4.46a.75.75 0 0 1-1.06 0L2.34 3.4a.75.75 0 1 1 1.06-1.06l1.06 1.06a.75.75 0 0 1 0 1.06Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M9.598 1.591a.75.75 0 0 1 .785-.175 7 7 0 1 1-8.967 8.967.75.75 0 0 1 .961-.96 5.5 5.5 0 0 0 7.046-7.046.75.75 0 0 1 .175-.786Zm1.616 1.945a7 7 0 0 1-7.678 7.678 5.5 5.5 0 1 0 7.678-7.678Z" />
          </svg>
        )}
      </button>
    </div>
  );
}

export default App;
