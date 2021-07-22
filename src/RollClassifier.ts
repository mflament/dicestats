import {RollsConfig} from "./DiceRolls";
import {RollResult} from "./RollResults";

export type GroupId = string | number;

type Classifier<V, R extends GroupId = string> = (value: V) => R[];

export type ValueClassifier<R extends GroupId = string> = Classifier<number, R> & { groups?: R[] };

export function rangeClassifier(param?: number[][]): ValueClassifier {
  if (!param)
    return v => [v.toString()];
  const groupNames = param.map(range => range[0] + '-' + range[1]);
  const res: ValueClassifier = v => {
    const res: string[] = [];
    param.forEach((range, index) => {
      if (v >= range[0] && v <= range[1])
        res.push(groupNames[index]);
    });
    return res;
  };
  (res as { groups: string[] }).groups = groupNames;
  return res;
}

/**
 * strategy used to group roll results per category, allowing to get probabilities per category.
 * returned group key will be used for display and correlation
 */
export type RollClassifier<R extends GroupId = string> = Classifier<RollResult, R> & { groups?: R[] };

export function sumClassifier(param: number[][]): RollClassifier;
export function sumClassifier(): RollClassifier<number>;
export function sumClassifier(param?: number[][]): RollClassifier<any> {
  if (!param) return rp => [rp.sum];
  const rc = rangeClassifier(param);
  const res: RollClassifier<any> = rp => rc(rp.sum);
  res.groups = rc.groups;
  return res;
}

export function twistedSumClassifier(param: number[][]): RollClassifier;
export function twistedSumClassifier(): RollClassifier<number>;
export function twistedSumClassifier(param?: number[][]): RollClassifier<number | string> {
  if (!param)
    return rp => [rp.twistedSum];
  const rc = rangeClassifier(param);
  const res: RollClassifier<any> = rp => rc(rp.twistedSum);
  res.groups = rc.groups;
  return res;
}

export function faceClassifier(): RollClassifier<number> {
  return param => param.values.map(v => v);
}

export function groupsClassifier(config: RollsConfig): RollClassifier<number> {
  const groups: number[] = [];
  for (let group = 2; group <= config.dices.count; group++) {
    groups[group - 2] = group;
  }

  const res: RollClassifier<number> = param => {
    const fo = param.facesOccurrences;
    const res: number[] = [];
    for (let i = 0; i < fo.length; i++) {
      const count = fo[i];
      if (count > 1) {
        res.push(groups[count - 2]);
      }
    }
    return res;
  }
  res.groups = groups;
  return res;
}

/**
 * Result of roll classification, for each group, the number of rolls in this group, and so, the probability of this group.
 */
export class ClassifiedRolls<R extends GroupId = string> {
  private readonly _groups: { groupId: R, occurrences: number }[] = [];

  constructor(readonly classifier: RollClassifier<R>, readonly config: RollsConfig) {
  }

  inc(groupId: R): void {
    const index = this._groups.findIndex(g => g.groupId === groupId);
    if (index < 0) this._groups.push({groupId: groupId, occurrences: 1});
    else this._groups[index].occurrences += 1;
  }

  set(groupId: R, occurrences: number): void {
    const index = this._groups.findIndex(g => g.groupId === groupId);
    if (index < 0) this._groups.push({groupId: groupId, occurrences: occurrences});
    else this._groups[index].occurrences = occurrences;
  }

  get groups(): R[] {
    return this._groups.map(g => g.groupId);
  }

  getOccurrences(groupId: R): number {
    const index = this._groups.findIndex(g => g.groupId === groupId);
    if (index < 0) return 0;
    return this._groups[index].occurrences;
  }

  /**
   * @param groupId the group name
   * @param total number of rolls, or total groups occurrence
   * @return number the probability of this group, in normalized % (0..1)
   */
  getProbability(groupId: R, total = this.config.rolls): number {
    return this.getOccurrences(groupId) / total;
  }
}
