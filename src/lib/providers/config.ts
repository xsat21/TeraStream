import "server-only";
import { ProviderError } from "./errors";
import { mockProvider } from "./mock";
import { teraboxOfficialProvider } from "./terabox-official";

export function providerMode(): "mock" | "official" | "invalid" {
  const value = process.env.TERASTREAM_PROVIDER ?? "mock";
  return value === "mock" || value === "official" ? value : "invalid";
}

export function selectedProvider() {
  const mode = providerMode();
  if (mode === "invalid") throw new ProviderError("configuration");
  return mode === "official" ? teraboxOfficialProvider : mockProvider;
}
