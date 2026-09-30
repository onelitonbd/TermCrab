import { bus } from '../gateway/events.js';

/** ask_user: the agent poses a question, the operator answers from the UI. */
interface PendingAsk {
  id: string;
  question: string;
  options?: string[];
  createdAt: number;
  resolve: (answer: string) => void;
}

const pending = new Map<string, PendingAsk>();

export function listAsks(): { id: string; question: string; options?: string[]; createdAt: number }[] {
  return [...pending.values()].map(({ id, question, options, createdAt }) => ({ id, question, options, createdAt }));
}

export function ask(question: string, options: string[] | undefined, timeoutMs: number): Promise<string> {
  const id = `a${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  return new Promise<string>((resolve) => {
    const entry: PendingAsk = {
      id,
      question: question.slice(0, 1000),
      options: options?.slice(0, 10).map((o) => String(o).slice(0, 100)),
      createdAt: Date.now(),
      resolve,
    };
    pending.set(id, entry);
    bus.emit({ type: 'ask', id, question: entry.question, options: entry.options });
    const timer = setTimeout(() => {
      if (pending.delete(id)) resolve('(no answer in time)');
    }, Math.max(1000, timeoutMs));
  });
}

export function answer(id: string, text: string): boolean {
  const entry = pending.get(id);
  if (!entry) return false;
  pending.delete(id);
  entry.resolve(text.slice(0, 4000));
  return true;
}
