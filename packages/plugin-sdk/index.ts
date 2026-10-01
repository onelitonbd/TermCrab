/**
 * Plugin SDK: typed interface for channels, providers, and tools.
 * Allows community extensions to be published and loaded dynamically.
 */

import type { Provider, ChatRequest, ChatResult, ToolDef } from '../../src/providers/types.js';
import type { Config } from '../../src/core/config.js';

// --- Channel plugin ---

export interface ChannelPlugin {
  name: string;
  start(cfg: Record<string, unknown>): Promise<void> | void;
  stop(): void;
  send?(address: string, text: string): Promise<void>;
}

// --- Provider plugin ---

export interface ProviderPlugin {
  name: string;
  create(cfg: Record<string, unknown>): Provider;
}

// --- Tool plugin ---

export interface ToolPlugin {
  name: string;
  def: ToolDef;
  execute(args: Record<string, unknown>): Promise<string>;
}

// --- Plugin manifest ---

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  type: 'channel' | 'provider' | 'tool';
  main: string; // entry point file
  config?: Record<string, unknown>;
}

// --- Plugin registry ---

export interface PluginRegistry {
  channels: Map<string, ChannelPlugin>;
  providers: Map<string, ProviderPlugin>;
  tools: Map<string, ToolPlugin>;
}

export function createPluginRegistry(): PluginRegistry {
  return {
    channels: new Map(),
    providers: new Map(),
    tools: new Map(),
  };
}

export function registerChannel(registry: PluginRegistry, plugin: ChannelPlugin): void {
  registry.channels.set(plugin.name, plugin);
}

export function registerProvider(registry: PluginRegistry, plugin: ProviderPlugin): void {
  registry.providers.set(plugin.name, plugin);
}

export function registerTool(registry: PluginRegistry, plugin: ToolPlugin): void {
  registry.tools.set(plugin.name, plugin);
}

// --- Plugin loader ---

export async function loadPlugin(
  manifest: PluginManifest,
  registry: PluginRegistry,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const mod = await import(manifest.main);
    if (manifest.type === 'channel') {
      const plugin = mod.default as ChannelPlugin;
      registerChannel(registry, plugin);
    } else if (manifest.type === 'provider') {
      const plugin = mod.default as ProviderPlugin;
      registerProvider(registry, plugin);
    } else if (manifest.type === 'tool') {
      const plugin = mod.default as ToolPlugin;
      registerTool(registry, plugin);
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// --- Helpers for plugin authors ---

export function defineChannel(plugin: ChannelPlugin): ChannelPlugin {
  return plugin;
}

export function defineProvider(plugin: ProviderPlugin): ProviderPlugin {
  return plugin;
}

export function defineTool(plugin: ToolPlugin): ToolPlugin {
  return plugin;
}

export function defineManifest(manifest: PluginManifest): PluginManifest {
  return manifest;
}
