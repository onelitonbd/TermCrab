import { bus, BusEvent } from './events.js';

/**
 * Canvas / A2UI: agent-driven visual widgets served by the gateway.
 * The agent pushes HTML widgets to the Control UI via the `canvas` tool.
 * Widgets are broadcast over SSE and rendered in the UI.
 */

export interface CanvasWidget {
  id: string;
  html: string;
  title?: string;
  updatedAt: number;
}

const widgets = new Map<string, CanvasWidget>();

/** Register or update a widget. */
export function canvasUpdate(id: string, html: string, title?: string): CanvasWidget {
  const widget: CanvasWidget = { id, html, title, updatedAt: Date.now() };
  widgets.set(id, widget);
  // Broadcast to SSE subscribers
  bus.emit({ type: 'canvas:update', widget });
  return widget;
}

/** Remove a widget. */
export function canvasRemove(id: string): boolean {
  const existed = widgets.delete(id);
  if (existed) {
    bus.emit({ type: 'canvas:remove', id });
  }
  return existed;
}

/** Get a widget by id. */
export function canvasGet(id: string): CanvasWidget | null {
  return widgets.get(id) ?? null;
}

/** List all widgets. */
export function canvasList(): CanvasWidget[] {
  return [...widgets.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Clear all widgets. */
export function canvasClear(): void {
  widgets.clear();
}
