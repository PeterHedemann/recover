"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const BOOX_ADDRESS_KEY = "boox-reader-address";

export function BooxSettings() {
  const [address, setAddress] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setAddress(window.localStorage.getItem(BOOX_ADDRESS_KEY) || "");
  }, []);

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = address.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
    setAddress(normalized);
    if (normalized) window.localStorage.setItem(BOOX_ADDRESS_KEY, normalized);
    else window.localStorage.removeItem(BOOX_ADDRESS_KEY);
    setSaved(true);
  }

  return <form onSubmit={save} className="mt-5 space-y-3">
    <label htmlFor="boox-address" className="block text-sm font-medium">IP address</label>
    <Input id="boox-address" type="text" inputMode="url" autoComplete="url" placeholder="192.168.0.121:8085" value={address} onChange={(event) => { setAddress(event.target.value); setSaved(false); }} />
    <p className="text-xs text-muted-foreground">Include the port if your reader requires one. This address is saved in this browser.</p>
    <div className="flex items-center gap-3">
      <Button type="submit">Save reader</Button>
      {saved && <span role="status" className="text-sm text-muted-foreground">Saved on this device.</span>}
    </div>
  </form>;
}
