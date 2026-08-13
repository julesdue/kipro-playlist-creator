import { useState } from "react";

const HAS_EXTENSION = /^.+\.[^.]+$/;

interface AddClipFormProps {
  onAdd: (name: string) => void;
}

export function AddClipForm({ onAdd }: AddClipFormProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = value.trim();

    if (!name) {
      setError("Enter a filename");
      return;
    }
    if (!HAS_EXTENSION.test(name)) {
      setError("Filename must include a file extension, e.g. clip1.mov");
      return;
    }

    onAdd(name);
    setValue("");
    setError("");
  }

  return (
    <form className="add-clip-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Add clip by filename…"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (error) setError("");
        }}
        aria-label="New clip filename"
        aria-invalid={!!error}
      />
      <button type="submit">Add</button>
      {error && (
        <span className="add-clip-error" role="alert">
          {error}
        </span>
      )}
    </form>
  );
}
