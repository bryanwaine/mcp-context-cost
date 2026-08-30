import type { Rule } from "../types.js";
import { missingDescription } from "./missing-description.js";
import { largeEnum } from "./large-enum.js";
import { toolOverlap } from "./tool-overlap.js";

// Rules are added here one at a time: write the synthetic fixture pair and
// the failing test first (CLAUDE.md hard rule 3), then the rule file, then
// one entry in this array. Nothing else needs to change.
export const rules: Rule[] = [missingDescription, largeEnum, toolOverlap];
