import React, {Component, FormEvent, useState} from "react";
import {ChartComponent, ChartConfiguration} from "./ChartComponent";
import {ClassifiedRolls, groupsClassifier, RollClassifier, sumClassifier, twistedSumClassifier} from "./RollClassifier";
import {RollResults} from "./RollResults";
import {ChartDataset, TooltipItem} from "chart.js";

export class RollResultsComponent extends Component<{ results: RollResults }, { ranges: number[][] }> {
  constructor(props: { results: RollResults }) {
    super(props);
    this.state = {ranges: [[7, 9], [10, 18]]};
  }

  render(): JSX.Element {
    const results = this.props.results;
    const config = results.config;
    const range = [config.dices.count, config.dices.count * config.dices.faces];

    const dists = [
      {name: 'Sum', color: 'rgb(255, 132, 99)', cr: results.classify(sumClassifier())},
      {name: 'Twisted Sum', color: 'rgb(99, 132, 255)', cr: results.classify(twistedSumClassifier())}
    ];
    return <>
      <div className="chart">
        <ChartComponent configuration={this.distributions(range, dists)}/>
      </div>
      <RangesInput ranges={this.state.ranges} onChange={ranges => this.setState({ranges: ranges})}/>
      {this.renderClassifiedRanges(this.state.ranges, dists)}
      <h1>Group prob</h1>
      {this.renderGroups()}
    </>
  }

  private distributions(range: number[], configs: Distribution[]): ChartConfiguration {
    const labels: string[] = [];
    for (let i = range[0]; i <= range[1]; i++) {
      labels.push(i.toString());
    }

    const datasets = configs.map(c => this.distribution(range, c));
    return {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        scales: {
          y: {
            ticks: {
              callback: (value) => value + '%'
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              afterLabel(tooltipItem: TooltipItem<any>): string | string[] {
                const dataset = datasets[tooltipItem.datasetIndex];
                return dataset.details[tooltipItem.dataIndex];
              }
            }
          }
        }
      }
    }
  }

  private distribution(range: number[], config: Distribution): DistributionDataSet {
    const data: number[] = [];
    const details: string[][] = [];
    let prob: number;
    let detail: string[];
    for (let i = range[0]; i <= range[1]; i++) {
      const occurrences = config.cr.getOccurrences(i);
      if (occurrences > 0) {
        prob = config.cr.getProbability(i) * 100;
        detail = this.props.results.pick(rr => config.cr.classifier(rr).indexOf(i) >= 0, Math.min(10, occurrences))
          .map(rr => rr.values.join(" - "));
      } else {
        prob = 0;
        detail = [];
      }
      data.push(prob);
      details.push(detail);
    }
    return {
      label: config.name,
      backgroundColor: config.color,
      borderColor: config.color,
      data: data,
      tension: 0.2,
      details: details,
      classifiedRolls: config.cr
    };
  }

  private renderClassifiedRanges(ranges: number[][], distributions: Distribution[]): JSX.Element {
    return <table>
      <tr className={"header"}>
        <th>&nbsp;</th>
        {ranges.map(range => <th>{range[0] + '-' + range[1]}</th>)}
      </tr>
      {distributions.map(d => <tr>
        <th>{d.name}</th>
        {ranges.map(range => sumProbabilities(d.cr, range) * 100).map(s => <td>{s.toFixed(2) + '%'}</td>)}
      </tr>)}
    </table>;
  }

  private renderGroups(): JSX.Element {
    return <ClassifiedTable results={this.props.results} classifier={groupsClassifier(this.props.results.config)}/>
  }
}

function ClassifiedTable(props: { results: RollResults, classifier: RollClassifier<any>, total?: number }): JSX.Element {
  const results = props.results;
  const cr = results.classify(props.classifier);
  const headers = cr.groups.map(group => <th>{group}</th>);
  const values = cr.groups.map(group => <td>{(cr.getProbability(group, props.total) * 100).toFixed(1) + "%"}</td>);
  return <table>
    <tr className="header">{headers}</tr>
    <tr>{values}</tr>
  </table>;
}

interface DistributionDataSet extends ChartDataset<'line'> {
  details: string[][];
  classifiedRolls: ClassifiedRolls<number>
}

function RangesInput(props: { ranges: number[][], onChange: (ranges: number[][]) => any }): JSX.Element {
  const formattedRanges = props.ranges.map(range => range[0] + '-' + range[1]).join(', ');
  const [value, setValue] = useState(formattedRanges);

  function submit(e: FormEvent): boolean {
    props.onChange(parseRanges(value));
    e.preventDefault();
    return false;
  }

  return <form className="ranges" onSubmit={submit}>
    <label>Ranges</label>
    <input type="text" onChange={evt => setValue(evt.target.value)} value={value}/>
  </form>
}

// min1-max1,min2-max2,...
function parseRanges(str: string): number[][] {
  return str.split(',').map(s => parseRange(s)).filter(s => s !== undefined) as number[][];
}

function parseRange(str: string): number[] | undefined {
  const match = str.match(/(\d+)\s*-\s*(\d+)/);
  return match ? [parseInt(match[1]), parseInt(match[2])] : undefined;
}

interface Distribution {
  name: string;
  color: string;
  cr: ClassifiedRolls<number>;
}

function sumProbabilities(cr: ClassifiedRolls<number>, range: number[]): number {
  let res = 0;
  for (let i = range[0]; i <= range[1]; i++) {
    res += cr.getProbability(i);
  }
  return res;
}
