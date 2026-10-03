/** Types for the WORKLOG.md step-table parser (used by the tracker tests). */
export interface WorklogStep {
  id: string;
  step: string;
  state: string;
}

export function parseWorklog(text: string): {
  updated: string;
  stepLines: WorklogStep[];
  nextSteps: WorklogStep[];
};
