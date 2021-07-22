import {RollResults} from "./RollResults";

export interface Dices {
  count: number;
  faces: number;
}

export interface RollsConfig {
  dices: Dices;
  rolls: number;
}

const DEFAULT_DICES: Dices = {
  count: 3,
  faces: 6
}

export const ROLLS_CONFIG_PATTERN = "(\\d+)\\s?\\*\\s?(\\d+)D(\\d+)";

export const DEFAULT_CONFIG: RollsConfig = {
  dices: DEFAULT_DICES,
  rolls: 1000
}

export function parseRollsConfig(decl?: string): RollsConfig {
  if (!decl) return DEFAULT_CONFIG
  const matches = decl.match(ROLLS_CONFIG_PATTERN);
  if (!matches) return DEFAULT_CONFIG;
  return {
    rolls: parseInt(matches[1]),
    dices: {
      count: parseInt(matches[2]),
      faces: parseInt(matches[3])
    },
    toString: () => decl
  } as RollsConfig & { toString(): string };
}

export interface RollStats {
  min: number;
  max: number;
  average: number;
  mean: number;
}

/**
 * @param config the roll config
 * @return [config.rolls][config.dices] values
 */
export function roll(config: RollsConfig): RollResults {
  const results = new RollResults(config);
  for (let roll = 0; roll < config.rolls; roll++) {
    for (let dice = 0; dice < config.dices.count; dice++) {
      results.setResult(roll, dice, 1 + Math.random() * config.dices.faces);
    }
  }
  return results;
}

