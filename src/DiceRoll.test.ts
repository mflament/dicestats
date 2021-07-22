import {roll} from "./DiceRolls";
import {groupsClassifier, sumClassifier} from "./RollClassifier";
import {RollResults} from "./RollResults";

test('Test roll configuration', () => {
  const results = roll({rolls: 1000, dices: {count: 3, faces: 6}});
  expect(results.rollsCount).toBe(1000);
  for (let roll = 0; roll < results.rollsCount; roll++) {
    for (let dice = 0; dice < results.dicesCount; dice++) {
      const value = results.getResult(roll, dice);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
    }
    const sum = results.getSum(roll);
    expect(sum).toBeGreaterThanOrEqual(3);
    expect(sum).toBeLessThanOrEqual(18);
  }
});

test('Test twisted sum with threshold 2', () => {
  let results = new RollResults({rolls: 1, dices: {count: 3, faces: 6}});

  results.setRollResults(0, [1, 2, 3]);
  let twistedSum = results.getTwistedSum(0, 2);
  expect(twistedSum).toBe(6);

  results.setRollResults(0, [3, 2, 2]);
  twistedSum = results.getTwistedSum(0, 2);
  expect(twistedSum).toBe(3);

  results.setRollResults(0, [2, 2, 3]);
  twistedSum = results.getTwistedSum(0, 2);
  expect(twistedSum).toBe(3);

  results.setRollResults(0, [3, 3, 3]);
  twistedSum = results.getTwistedSum(0, 2);
  expect(twistedSum).toBe(3);

  results = new RollResults({rolls: 1, dices: {count: 2, faces: 6}});
  results.setRollResults(0, [3, 3]);
  twistedSum = results.getTwistedSum(0, 2);
  expect(twistedSum).toBe(0);

  results = new RollResults({rolls: 1, dices: {count: 4, faces: 6}});
  results.setRollResults(0, [3, 3, 3, 4]);
  twistedSum = results.getTwistedSum(0, 2);
  expect(twistedSum).toBe(7);

  results.setRollResults(0, [3, 3, 3, 3]);
  twistedSum = results.getTwistedSum(0, 2);
  expect(twistedSum).toBe(0);

  results = new RollResults({rolls: 1, dices: {count: 5, faces: 6}});
  results.setRollResults(0, [3, 3, 3, 3, 3]);
  twistedSum = results.getTwistedSum(0, 2);
  expect(twistedSum).toBe(3);


  results = new RollResults({rolls: 1, dices: {count: 3, faces: 6}});
  results.setRollResults(0, [6, 1, 6]);
  twistedSum = results.getTwistedSum(0, 2);
  expect(twistedSum).toBe(1);
});

test('Test twisted sum with threshold 3', () => {
  let results = new RollResults({rolls: 1, dices: {count: 3, faces: 6}});

  results.setRollResults(0, [3, 2, 2]);
  let twistedSum = results.getTwistedSum(0, 3);
  expect(twistedSum).toBe(7);

  results.setRollResults(0, [3, 3, 3]);
  twistedSum = results.getTwistedSum(0, 3);
  expect(twistedSum).toBe(0);

  results = new RollResults({rolls: 1, dices: {count: 4, faces: 6}});
  results.setRollResults(0, [3, 3, 3, 4]);
  twistedSum = results.getTwistedSum(0, 3);
  expect(twistedSum).toBe(4);

  results = new RollResults({rolls: 1, dices: {count: 5, faces: 6}});
  results.setRollResults(0, [3, 3, 3, 3, 4]);
  twistedSum = results.getTwistedSum(0, 3);
  expect(twistedSum).toBe(7);

  results.setRollResults(0, [3, 3, 3, 3, 3]);
  twistedSum = results.getTwistedSum(0, 3);
  expect(twistedSum).toBe(6);
});

test('Test classify', () => {
  const results = testResults();

  const classifier = sumClassifier([[3, 6], [7, 12], [13, 18]]);
  const cr = results.classify(classifier);
  expect(cr.groups).toEqual(['3-6', '7-12', '13-18']);
  expect(cr.getOccurrences('3-6')).toBe(2);
  expect(cr.getOccurrences('7-12')).toBe(2);
  expect(cr.getOccurrences('13-18')).toBe(1);

  expect(cr.getProbability('3-6')).toBe(2 / 5);
  expect(cr.getProbability('7-12')).toBe(2 / 5);
  expect(cr.getProbability('13-18')).toBe(1 / 5);
});


test('Test classify groups', () => {
  const results = new RollResults({rolls: 6, dices: {count: 3, faces: 6}});
  results.setRollResults(0, [1, 1, 1]); // group 3
  results.setRollResults(1, [1, 2, 3]); // no group
  results.setRollResults(2, [3, 3, 2]); // group 2
  results.setRollResults(3, [3, 2, 2]); // group 2
  results.setRollResults(4, [3, 3, 2]); // group 2
  results.setRollResults(5, [6, 6, 6]); // group 3
  const classifier = groupsClassifier(results.config);
  const cr = results.classify(classifier);
  expect(cr.groups).toEqual([3, 2]);
  expect(cr.getOccurrences(2)).toBe(3);
  expect(cr.getOccurrences(3)).toBe(2);

  expect(cr.getProbability(2)).toBe(3 / 6);
  expect(cr.getProbability(3)).toBe(2 / 6);
});

test('Test pick', () => {
  const results = testResults();
  let rolls = results.pick(rr => rr.sum <= 6, 10);
  expect(rolls).toHaveLength(2);
  expect(rolls[0].roll).toBe(0);
  expect(rolls[0].values).toEqual([1, 1, 1]);
  expect(rolls[1].roll).toBe(1);
  expect(rolls[1].values).toEqual([1, 2, 3]);

  rolls = results.pick(rr => rr.sum >= 6, 3);
  expect(rolls).toHaveLength(3);
  expect(rolls[0].roll).toBe(1);
  expect(rolls[1].roll).toBe(2);
  expect(rolls[2].roll).toBe(3);
});

function testResults() {
  const results = new RollResults({rolls: 5, dices: {count: 3, faces: 6}});
  results.setRollResults(0, [1, 1, 1]); // 3
  results.setRollResults(1, [1, 2, 3]); // 6
  results.setRollResults(2, [3, 3, 3]); // 9
  results.setRollResults(3, [3, 4, 5]); // 12
  results.setRollResults(4, [6, 6, 6]); // 18
  return results;
}