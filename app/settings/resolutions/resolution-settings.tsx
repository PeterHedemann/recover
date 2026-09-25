"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Resolution = { id: string; name: string; width: number; height: number };

export function ResolutionSettings({ initial }: { initial: Resolution[] }) {
  const [items, setItems] = useState(initial);
  const [name, setName] = useState("");
  const [width, setWidth] = useState(1200);
  const [height, setHeight] = useState(1600);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/resolutions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, width, height }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save this resolution.");
      setItems((current) => current.some((item) => item.id === data.id)
        ? current.map((item) => item.id === data.id ? data : item)
        : [...current, data].sort((a, b) => a.width - b.width || a.height - b.height));
      setName("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save this resolution."); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/resolutions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not remove this resolution.");
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not remove this resolution."); }
    finally { setBusy(false); }
  }

  return <div className="mt-8 space-y-8">
    <section className="space-y-3" aria-label="Saved resolutions">
      {items.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4">
        <div><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.width} × {item.height} pixels</p></div>
        <Button variant="outline" size="sm" disabled={busy || items.length <= 1} onClick={() => void remove(item.id)}>Remove</Button>
      </div>)}
    </section>
    <form onSubmit={add} className="space-y-4 rounded-xl border p-5">
      <h2 className="font-semibold">Add a resolution</h2>
      <label className="block space-y-1 text-sm">Name<input className="h-10 w-full rounded-md border bg-background px-3" type="text" maxLength={80} required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Boox Go 6" /></label>
      <div className="grid grid-cols-2 gap-4">
        <label className="space-y-1 text-sm">Width (px)<input className="h-10 w-full rounded-md border bg-background px-3" type="number" min={256} max={4096} step={1} value={width} onChange={(e) => setWidth(Number(e.target.value))} /></label>
        <label className="space-y-1 text-sm">Height (px)<input className="h-10 w-full rounded-md border bg-background px-3" type="number" min={256} max={4096} step={1} value={height} onChange={(e) => setHeight(Number(e.target.value))} /></label>
      </div>
      <p className="text-xs text-muted-foreground">Each side can be any whole number from 256 to 4096 pixels.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button disabled={busy} type="submit">Add resolution</Button>
    </form>
  </div>;
}
