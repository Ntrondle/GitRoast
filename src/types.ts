export interface PrMetadata {
  number: number;
  title: string;
  body: string;
  labels: string[];
  changedFiles: number;
  additions: number;
  deletions: number;
  commitMessages: string[];
  createdAt: string; // ISO 8601
  author: string;
}

export interface Signals {
  linesChanged: number;
  wipCommits: number;
  isHuge: boolean;
  isTiny: boolean;
  titleUndersells: boolean;
  isRevert: boolean;
  isRefactor: boolean;
  isFridayEvening: boolean;
  isLateNight: boolean;
  hasWipCommits: boolean;
  deletesMoreThanAdds: boolean;
  noDescription: boolean;
  manyCommits: boolean;
}

export type BooleanSignal = {
  [K in keyof Signals]: Signals[K] extends boolean ? K : never;
}[keyof Signals];

export interface Template {
  id: string; // memegen.link template id
  name: string;
  lines: number; // number of text boxes the memegen template has
  description: string; // read by Jev / Von as the choice criterion
  rule: { all: BooleanSignal[]; priority: number }; // empty `all` = generic fallback
  captions: string[][]; // each caption has exactly `lines` strings; may contain {slots}
}

export interface PickResult {
  templateId: string;
  confidence: number;
  source: string; // picker name: "jev" | "von" | "rules"
}

export interface Picker {
  readonly name: string;
  pick(meta: PrMetadata, signals: Signals, templates: Template[]): Promise<PickResult | null>;
}
