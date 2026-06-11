import { invoke } from "@tauri-apps/api/core";
import type { PicoClawStatus } from "../stores/connection";

export async function discoverPicoclaw(): Promise<PicoClawStatus> {
  return invoke<PicoClawStatus>("discover_picoclaw");
}

export async function setPicoclawBinaryPath(
  path: string | null
): Promise<void> {
  return invoke("set_picoclaw_binary_path", { path });
}

export async function getPicoToken(): Promise<string | null> {
  return invoke<string | null>("get_pico_token", {});
}
