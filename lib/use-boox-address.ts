"use client";

import { useSyncExternalStore } from "react";

const BOOX_ADDRESS_KEY = "boox-reader-address";
const addressChanged = "boox-reader-address-changed";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(addressChanged, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(addressChanged, onChange);
  };
}

function getSnapshot() {
  return window.localStorage.getItem(BOOX_ADDRESS_KEY) || "";
}

function getServerSnapshot() {
  return "";
}

export function useBooxAddress() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function saveBooxAddress(address: string) {
  if (address) window.localStorage.setItem(BOOX_ADDRESS_KEY, address);
  else window.localStorage.removeItem(BOOX_ADDRESS_KEY);
  window.dispatchEvent(new Event(addressChanged));
}
