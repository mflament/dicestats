import React, {Component} from "react";
import {
  faceClassifier,
  groupsClassifier,
  RollClassifier,
  RollResults,
  RollStats,
  sumClassifier,
  twistedSumClassifier
} from "./DiceRolls";
import {StatsTable} from "./StatsTable";
import {Chart, ChartConfiguration, ChartDataset} from "./Chart";

export class RollResultsComponent extends Component<{ results: RollResults }> {
  constructor(props: { results: RollResults }) {
    super(props);
  }

  render(): JSX.Element {
    return <div className="roll-results">
      <div className="chart">
        <Chart configuration={this.distributions()}/>
      </div>
      <h1>Group prob</h1>
      {this.renderGroups()}
      <h1>Faces prob</h1>
      {this.renderFaces()}
      <h1>Sum</h1>
      {this.renderResults()}
    </div>
  }

  private distributions(): ChartConfiguration {
    const config = this.props.results.config;
    const range = [config.dices.count, config.dices.count * config.dices.faces];
    const labels: string[] = [];
    for (let i = range[0]; i <= range[1]; i++) {
      labels.push(i.toString());
    }
    return {
      type: 'line',
      data: {
        labels: labels,
        datasets: [this.distributionDataset('Sum', sumClassifier(), range),
          this.distributionDataset('Twisted Sum', twistedSumClassifier(), range, 'rgb(99, 132, 255)')]
      }
    }
  }

  private distributionDataset(label: string, classifier: RollClassifier, range: number[], color = 'rgb(255, 99, 132)'): ChartDataset {
    const data: number[] = [];
    const cr = this.props.results.classify(classifier);
    for (let i = range[0]; i <= range[1]; i++) {
      data.push(cr.getProbability(i.toString()) * 100);
    }

    return {
      label: label,
      backgroundColor: color,
      borderColor: color,
      data: data,
      tension: 0
    };
  }

  private renderResults(): JSX.Element {
    const results = this.props.results;
    const config = results.config;
    const stats: RollStats[] = [];
    for (let dice = 0; dice < config.dices.count; dice++) {
      stats.push(results.getStats(dice))
    }
    stats.push(results.getStats());
    return <StatsTable stats={stats}/>
  }

  private renderFaces(): JSX.Element {
    const results = this.props.results;
    return <ClassifiedTable results={this.props.results} classifier={faceClassifier()}
                            total={results.rollsCount * results.dicesCount}/>

    // const results = this.props.results;
    // const cr = results.classify(groupsClassifier(results.config));
    // const headers = cr.groups.map(group => <th>{group}</th>);
    // const values = cr.groups.map(group => <td>{(cr.getProbability(group) * 100).toFixed(3) + "%"}</td>);
    // return <table>
    //   <tr className="header">{headers}</tr>
    //   <tr>{values}</tr>
    // </table>;
  }

  private renderGroups(): JSX.Element {
    return <ClassifiedTable results={this.props.results} classifier={groupsClassifier(this.props.results.config)}/>
  }
}

function ClassifiedTable(props: { results: RollResults, classifier: RollClassifier, total?: number }): JSX.Element {
  const results = props.results;
  const cr = results.classify(props.classifier);
  const headers = cr.groups.map(group => <th>{group}</th>);
  const values = cr.groups.map(group => <td>{(cr.getProbability(group, props.total) * 100).toFixed(1) + "%"}</td>);
  return <table>
    <tr className="header">{headers}</tr>
    <tr>{values}</tr>
  </table>;
}