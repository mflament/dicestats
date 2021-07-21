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

export interface ClassifierParam {
  /**
   * @return each dice value for this roll : [config.dices.count]
   */
  readonly values: number[];
  /**
   * values sum
   */
  readonly sum: number;
  /**
   * @return number of occurrence for each face : [config.dices.faces]
   */
  readonly facesOccurrences: number[];
  /**
   * All results source if this roll
   */
  readonly results: RollResults;
  /**
   * The roll index
   */
  readonly roll: number;
  /**
   *
   */
  readonly twistedSum: number;
}

/**
 * strategy used to group roll results per category, allowing to get probabilities per category.
 * returned group key will be used for display and correlation
 */
export type RollClassifier = (param: ClassifierParam) => string[];

export function sumClassifier(param?: number[][]): RollClassifier {
  if (!param)
    return rp => [rp.sum.toString()];
  const groupNames = param.map(range => range[0] + '-' + range[1]);
  return rp => {
    const sum = rp.sum;
    const res: string[] = [];
    param.forEach((range, index) => {
      if (sum >= range[0] && sum <= range[1])
        res.push(groupNames[index]);
    });
    return res;
  };
}

export function twistedSumClassifier(): RollClassifier {
  return rp => [rp.twistedSum.toString()];
}

export function faceClassifier(): RollClassifier {
  return param => param.values.map(v => v.toString());
}

export function groupsClassifier(config: RollsConfig): RollClassifier {
  const groups: string[] = [];
  for (let group = 2; group <= config.dices.count; group++) {
    groups[group - 2] = group.toString();
  }
  return param => {
    const fo = param.facesOccurrences;
    const res: string[] = [];
    for (let i = 0; i < fo.length; i++) {
      const count = fo[i];
      if (count > 1) {
        res.push(groups[count - 2]);
      }
    }
    return res;
  }
}

/**
 * Result of roll classification, for each group, the number of rolls in this group, and so, the probability of this group.
 */
export class ClassifiedRolls {
  constructor(private readonly config: RollsConfig, private readonly _groups: { [group: string]: number }) {
  }

  get groups(): string[] {
    return Object.keys(this._groups);
  }

  getOccurrence(group: string): number {
    const res = this._groups[group];
    return res || 0;
  }

  /**
   * @param group the group name
   * @param total number of rolls, or total groups occurrence
   * @return number the probability of this group, in normalized % (0..1)
   */
  getProbability(group: string, total = this.config.rolls): number {
    return this.getOccurrence(group) / total;
  }
}

class DefaultClassifierParam implements ClassifierParam {
  private readonly _values: number[];
  private readonly _faces: number[];
  public roll = 0;

  constructor(readonly results: RollResults) {
    this._values = new Array(results.dicesCount);
    this._faces = new Array(results.facesCount);
  }

  get values(): number[] {
    return this.results.getResults(this.roll, this._values);
  }

  get facesOccurrences(): number[] {
    return this.results.getFacesOccurrences(this.roll, this._faces);
  }

  get sum(): number {
    return this.results.getSum(this.roll);
  }

  get twistedSum(): number {
    return this.results.getTwistedSum(this.roll, this.results.config.dices.count - 1);
  }
}

export class RollResults {
  private readonly results: Uint8Array; // rolls * dices.count = dice roll value
  private _facesOccurrences?: Uint32Array; // rolls * face = face occurrence

  constructor(readonly config: RollsConfig) {
    this.results = new Uint8Array(config.rolls * config.dices.count);
  }

  getResult(roll: number, dice: number): number {
    return this.results[this.offset(roll, dice)];
  }

  getResults(roll: number, out?: number[]): number[] {
    if (out && out.length !== this.dicesCount)
      throw new Error("Invalid output size " + out.length + ", expecting " + this.dicesCount);
    out = out || new Array(this.dicesCount);
    let offset = this.offset(roll, 0);
    for (let dice = 0; dice < this.dicesCount; dice++) {
      out[dice] = this.results[offset++];
    }
    return out;
  }

  setResult(roll: number, dice: number, result: number): void {
    this.results[this.offset(roll, dice)] = result;
    this.reset();
  }

  setRollResults(roll: number, result: number[]): void {
    if (result.length !== this.dicesCount)
      throw Error("Invalid roll results length " + result.length + ", expecting " + this.dicesCount);
    this.results.set(result, this.offset(roll, 0));
    this.reset();
  }

  get rollsCount(): number {
    return this.config.rolls;
  }

  get dicesCount(): number {
    return this.config.dices.count;
  }

  get facesCount(): number {
    return this.config.dices.faces;
  }

  get facesOccurrences(): Uint32Array {
    if (!this._facesOccurrences) this._facesOccurrences = this.countFacesOccurrences();
    return this._facesOccurrences;
  }

  getFacesOccurrences(roll: number, out?: number[]): number[] {
    if (out && out.length !== this.facesCount)
      throw new Error("Invalid output size " + out.length + ", expecting " + this.facesCount);
    out = out || new Array(this.facesCount);
    let offset = roll * this.facesCount;
    const fos = this.facesOccurrences;
    for (let face = 0; face < this.facesCount; face++) {
      out[face] = fos[offset++];
    }
    return out;
  }

  classify(classifier: RollClassifier): ClassifiedRolls {
    const param = new DefaultClassifierParam(this);
    const groups: { [id: string]: number } = {};
    for (param.roll = 0; param.roll < this.rollsCount; param.roll++) {
      const rollGroups = classifier(param);
      rollGroups.forEach(group => {
        if (groups[group] === undefined) groups[group] = 0;
        groups[group] += 1;
      });
    }
    return new ClassifiedRolls(this.config, groups);
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

  private reset(): void {
    this._facesOccurrences = undefined;
  }

  // for each rolls, count the number of time each face occurs
  private countFacesOccurrences(): Uint32Array {
    const size = this.rollsCount * this.facesCount;
    const res = new Uint32Array(size);
    for (let roll = 0; roll < this.rollsCount; roll++) {
      const offset = roll * this.facesCount;
      for (let dice = 0; dice < this.dicesCount; dice++) {
        const face = this.getResult(roll, dice) - 1;
        res[offset + face] += 1;
      }
    }
    return res;
  }

  getSum(roll: number): number {
    let res = 0;
    for (let dice = 0; dice < this.dicesCount; dice++) {
      res += this.results[this.offset(roll, dice)];
    }
    return res;
  }

  /**
   * On réfléchit à ajouter la possibilité de lancer 3D6 additionnés au
   * lieu de 2 (le perso se "dépasse"), avec un twist, en cas d'obtention
   * de double, les scores identiques ne sont pas ajoutés, seul 1D est
   * compté, (donc forcément un échec parce que plus de 6 avec 1D6, c'est
   * pas simple).
   *
   * Implementation note :
   *  - remove all identical values appearing exactly threshold times
   *  - sum remaining values
   * Examples :
   * threshold = 2
   *   1 , 2 , 3 => 1 , 2 ,3 => 6
   *   3 , 2 , 2 => 3
   *   2 , 2 , 3 => 3
   *   3 , 3 , 3 => 3
   *   3 , 3 => 0
   *   3 , 3 , 3 , 4 => 3 , 4 => 7
   *   3 , 3 , 3 , 3 => 0
   *   3 , 3 , 3 , 3, 3 => 3
   *
   * threshold = 3
   *   3 , 2 , 2 => 3 , 2 , 2 => 7
   *   3 , 3 , 3 => 0
   *   3 , 3 , 3 , 4 => 4
   *   3 , 3 , 3 , 3, 4 => 3 , 4 => 7
   *   3 , 3 , 3 , 3, 3 => 3 , 3 => 6
   */
  getTwistedSum(roll: number, threshold: number): number {
    let res = 0;
    const fc = this.facesOccurrences;
    const faces = this.facesCount;
    const offset = roll * faces;
    for (let i = 0; i < faces; i++) {
      const face = i + 1;
      const count = fc[offset + i];
      const remaining = Math.min(count, count % threshold);
      res += face * remaining;
    }
    return res;
  }

  private offset(roll: number, dice: number): number {
    if (roll >= this.rollsCount) throw new Error("Invalid roll index " + roll + ", must be  < " + this.rollsCount);
    if (dice >= this.dicesCount) throw new Error("Invalid dice index " + dice + ", must be  < " + this.dicesCount);
    return roll * this.config.dices.count + dice;
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

