export type SourceTransform = {content: string; from: number; to: number; insert: string; cursor: number};
export function wrapLatexCommand(source: string, from: number, to: number, command: string): SourceTransform;
export function setLatexBlock(source: string, position: number, command: string): SourceTransform;
export function makeItemize(source: string, from: number, to: number): SourceTransform;
