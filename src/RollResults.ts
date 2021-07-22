import {ClassifiedRolls, GroupId, RollClassifier} from "./RollClassifier";
import {RollsConfig, RollStats} from "./DiceRolls";

export interface RollResult {
  /**
   * All results source if this roll
   */
  readonly results: RollResults;
  /**
   * The roll index
   */
  roll: number;
  /**
   * @return each dice value for this roll : [config.dices.count]
   */
  readonly values: number[];
  /**
   * values sum
   */
  readonly sum: number;
  /**
   * values twisted sum
   */
  readonly twistedSum: number;
  /**
   * @return number of occurrence for each face : [config.dices.faces]
   */
  readonly facesOccurrences: number[];
}

class DefaultRollResult implements RollResult {
  readonly results: RollResults;
  private readonly _values: number[];
  private readonly _faces: number[];
  public roll;

  constructor(param: RollResults | RollResult) {
    if (param instanceof RollResults) {
      this.results = param;
      this.roll = 0;
    } else {
      this.results = param.results;
      this.roll = param.roll;
    }
    this._values = new Array(this.results.dicesCount);
    this._faces = new Array(this.results.facesCount);
  }

  get values(): number[] {
    return this.results.getResults(this.roll, this._values);
  }

  get sum(): number {
    return this.results.getSum(this.roll);
  }

  get twistedSum(): number {
    return this.results.getTwistedSum(this.roll, this.results.config.dices.count - 1);
  }

  get facesOccurrences(): number[] {
    return this.results.getFacesOccurrences(this.roll, this._faces);
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

  visit<T = any>(visitor: (result: RollResult) => T | undefined): T | undefined {
    const param = new DefaultRollResult(this);
    for (param.roll = 0; param.roll < this.rollsCount; param.roll++) {
      const res = visitor(param);
      if (res !== undefined) return res;
    }
    return undefined;
  }

  pick(predicate: (result: RollResult) => boolean, limit: number): RollResult[] {
    const res: RollResult[] = [];
    this.visit(rr => {
      if (predicate(rr)) {
        res.push(new DefaultRollResult(rr));
        return res.length < limit ? undefined : true;
      }
      return undefined;
    });
    return res;
  }

  classify<R extends GroupId = string>(classifier: RollClassifier<R>): ClassifiedRolls<R> {
    const param = new DefaultRollResult(this);
    const res = new ClassifiedRolls<R>(classifier, this.config);
    if (classifier.groups) {
      classifier.groups.forEach(group => res.set(group, 0));
    }
    for (param.roll = 0; param.roll < this.rollsCount; param.roll++) {
      const rollGroups = classifier(param);
      rollGroups.forEach(group => res.inc(group));
    }
    return res;
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
   * ibilité de lancer 3D6 additionnés au lieu de 2 (le perso se "dépasse"), avec un twist, en cas d'obtention
   * de double, les scores identiques ne sont pas ajoutés, seul 1D est compté, (donc forcément un échec parce que plus
   * de 6 avec 1D6, c'est pas simple).
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