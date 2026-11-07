export type Mode = 'mul' | 'clock' | 'tab' | 'col';

export interface ChoiceOpt { val: string; label: string; h?: number; m?: number }

/** One exercise as shown to the child. Fields beyond the first block depend on the mode. */
export interface Question {
  kind: Mode;
  why: string;
  say: string;
  answer: number | string;
  html?: string;
  options?: (number | ChoiceOpt)[];
  explain?: () => string;
  done?: boolean;
  spec?: Spec;
  // multiplication / table
  a?: number; b?: number; k?: string; mk?: string;
  // clock
  L?: number; h?: number; m?: number; type?: string;
}

/** What a picker chose; enough to rebuild the same exercise for a retry. */
export interface Spec { retry?: boolean; [key: string]: unknown }

export interface Round {
  mode: Mode;
  opt: unknown;
  i: number;
  len: number;
  log: boolean[];
  recent: string[];
  retry: { at: number; spec: Spec }[];
  stars: number;
  seen: string[];
  /** Typed answers with the number pad (table + column modes). */
  pad: boolean;
  facts: [number, boolean][];
  extra: number;
  order?: number[];
  q?: Question;
  t0: number;
  typed: string;
}
