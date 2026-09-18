export type Direction = "rtl" | "ltr";
export function firstStrongDirection(text: string): Direction;
export function readBalanced(content: string, openIndex: number): {from: number; to: number; end: number; value: string} | null;
export function plainLatex(value: string): string;
export function findProtectedEnvironments(content: string): Array<{from: number; to: number; environment: string; title: string; label: string | null}>;
export function findInlineCommands(content: string, from?: number, to?: number): Array<{command: string; from: number; to: number; contentFrom: number; contentTo: number; value: string}>;
export function findHeadings(content: string): Array<{command: string; from: number; to: number; contentFrom: number; contentTo: number; title: string}>;
