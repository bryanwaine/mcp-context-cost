import { countTokens as countO200kTokens } from "gpt-tokenizer/encoding/o200k_base";
import type { TokenizerInfo } from "./types.js";

export const TOKENIZER: TokenizerInfo = { id: "o200k_base", approximate: true };

export function countTokens(value: unknown): number {
  const json = JSON.stringify(value);
  if (json === undefined) return 0;
  return countO200kTokens(json);
}