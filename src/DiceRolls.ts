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

export class RollResults {
  private readonly results: Uint8Array; // rolls * dices.count = dice roll value
  private _facesCount?: Uint32Array; // rolls * face = face occurrence
  private _tuples?: Uint32Array; // rolls * face = face occurrence

  constructor(readonly config: RollsConfig) {
    this.results = new Uint8Array(config.rolls * config.dices.count);
  }

  getResult(roll: number, dice: number): number {
    return this.results[this.offset(roll, dice)];
  }

  setResult(roll: number, dice: number, result: number): void {
    this.results[this.offset(roll, dice)] = result;
  }

  get rollsCount(): number {
    return this.config.rolls;
  }

  get dicesCount(): number {
    return this.config.dices.count;
  }

  get facesCount(): Uint32Array {
    if (!this._facesCount) this._facesCount = this.countRollsFaces();
    return this._facesCount;
  }

  get sumFacesCount(): Uint32Array {
    const res = new Uint32Array(this.config.dices.faces);
    const facesCount = this.facesCount;
    const faces = this.config.dices.faces;
    for (let roll = 0; roll < this.rollsCount; roll++) {
      const offset = roll * faces;
      for (let face = 0; face < faces; face++) {
        res[face] += facesCount[offset + face];
      }
    }
    return res;
  }

  /**
   * [2..config.dices.count] = tuples (same value repeated key times) count (index 0 & 1 are always 0 and not used)
   */
  get tuples(): Uint32Array {
    if (!this._tuples) this._tuples = this.countTuples();
    return this._tuples;
  }

  getStats(dice?: number): RollStats {
    let min = Infinity;
    let max = -Infinity;
    let total = 0;
    for (let roll = 0; roll < this.rollsCount; roll++) {
      const sum = dice === undefined ? this.getSum(roll) : this.getResult(roll, dice);
      min = Math.min(min, sum);
      max = Math.max(max, sum);
      total += sum;
    }
    return {
      min: min,
      max: max,
      average: total / this.rollsCount,
      mean: min + (max - min) / 2
    }
  }

  // for each rolls, count the number of time each face occurs
  private countRollsFaces(): Uint32Array {
    const size = this.rollsCount * this.config.dices.faces;
    const res = new Uint32Array(size);
    for (let roll = 0; roll < this.rollsCount; roll++) {
      this.countRollFaces(roll, res);
    }
    return res;
  }

  private countRollFaces(roll: number, res: Uint32Array): void {
    const offset = roll * this.config.dices.faces;
    for (let dice = 0; dice < this.dicesCount; dice++) {
      const face = this.getResult(roll, dice) - 1;
      res[offset + face] += 1;
    }
  }

  getSum(roll: number): number {
    let res = 0;
    for (let dice = 0; dice < this.dicesCount; dice++) {
      res += this.results[this.offset(roll, dice)];
    }
    return res;
  }

  private offset(roll: number, dice: number): number {
    if (roll >= this.rollsCount) throw new Error("Invalid roll index " + roll + ", must be  < " + this.rollsCount);
    if (dice >= this.dicesCount) throw new Error("Invalid dice index " + dice + ", must be  < " + this.dicesCount);
    return roll * this.config.dices.count + dice;
  }

  private countTuples(): Uint32Array {
    const res = new Uint32Array(this.config.dices.count + 1);
    const facesCount = this.facesCount;
    const faces = this.config.dices.faces;
    for (let roll = 0; roll < this.rollsCount; roll++) {
      for (let face = 0; face < faces; face++) {
        const count = facesCount[roll * faces + face];
        if (count > 1) res[count] += 1;
      }
    }
    return res;
  }
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

