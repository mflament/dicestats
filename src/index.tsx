import React, {Component, FormEvent} from 'react';
import ReactDOM from 'react-dom';
import {parseRollsConfig, roll, RollResults, ROLLS_CONFIG_PATTERN, RollsConfig, RollStats} from "./DiceRolls";

class DiceRollsStats extends Component<any, { results?: RollResults }> {
  constructor(props: any) {
    super(props);
    this.state = {};
  }

  render(): JSX.Element {
    return <div className="rolls">
      <RollConfigComponent declaration='1000000*3D6' roll={cfg => this.roll(cfg)}/>
      {this.state.results ? <RollResultsComponent results={this.state.results}/> : undefined}
    </div>;
  }

  private roll(config: RollsConfig): void {
    this.setState({results: roll(config)});
  }
}

interface RollsConfigProps {
  declaration: string;

  roll(config: RollsConfig): void
}

class RollConfigComponent extends Component<RollsConfigProps, { declaration: string, config: RollsConfig }> {
  constructor(props: RollsConfigProps) {
    super(props);
    this.state = {
      declaration: props.declaration,
      config: parseRollsConfig(props.declaration),
    }
    props.roll(this.state.config);
  }

  render(): JSX.Element {
    return <form onSubmit={e => this.roll(e)}>
      <label>Rolls
        <input type="string" pattern={ROLLS_CONFIG_PATTERN} value={this.state.declaration}
               onChange={e => this.parseConfig(e.target.value)}/>
      </label>
      <label>Will roll {this.state.config.rolls.toLocaleString()} times {this.state.config.dices.count}D{this.state.config.dices.faces}
        <input type="submit" value="Let's roll"/>
      </label>
    </form>
  }

  private roll(e: FormEvent): boolean {
    this.props.roll(this.state.config);
    e.preventDefault();
    return false;
  }

  private parseConfig(decl: string): void {
    this.setState({declaration: decl, config: parseRollsConfig(decl)});
  }
}

function StatsTable(props: { stats: RollStats[] }): JSX.Element {
  const headers = [<th>&nbsp;</th>];
  headers.push(...props.stats
    .map((_v, index) => index < props.stats.length - 1 ? "Dice " + (index + 1) : "Total")
    .map(s => <th>{s}</th>));

  return <table className="roll-stats">
    <tr className="header">{headers}</tr>
    <StatsRow stats={props.stats} label="Min" get={s => s.min}/>
    <StatsRow stats={props.stats} label="Max" get={s => s.max}/>
    <StatsRow stats={props.stats} label="Average" get={s => s.average.toFixed(1)}/>
  </table>;
}

function StatsRow(props: { stats: RollStats[], label: string, get: (stat: RollStats) => number | string }): JSX.Element {
  return <tr>
    <th className="row">{props.label}</th>
    {props.stats.map(stat => <td>{props.get(stat)}</td>)}
  </tr>;
}

class RollResultsComponent extends Component<{ results: RollResults }> {
  constructor(props: { results: RollResults }) {
    super(props);
  }

  render(): JSX.Element {
    return <div className="roll-results">
      {this.renderResults()}
      {this.renderFaces()}
      {this.renderTuples()}
    </div>
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
    const config = results.config;
    const faces = results.sumFacesCount;
    const headers: JSX.Element[] = [];
    const values: JSX.Element[] = [];
    for (let face = 1; face <= config.dices.faces; face++) {
      headers.push(<th>{face}</th>);
      const pct = faces[face - 1] / (config.rolls * config.dices.count) * 100;
      values.push(<td>{pct.toFixed(1) + "%"}</td>);
    }
    return <table className="faces">
      <tr className="header">{headers}</tr>
      <tr>{values}</tr>
    </table>;
  }

  private renderTuples(): JSX.Element {
    const results = this.props.results;
    const config = results.config;
    const headers: JSX.Element[] = [];
    const values: JSX.Element[] = [];
    const tuples = results.tuples;
    for (let tuple = 2; tuple < tuples.length; tuple++) {
      headers.push(<th>{tuple}</th>);
      const pct = tuples[tuple] / config.rolls * 100;
      values.push(<td>{pct.toFixed(3) + "%"}</td>);
    }
    return <table className="tuples">
      <tr className="header">{headers}</tr>
      <tr>{values}</tr>
    </table>;
  }

}


ReactDOM.render(<DiceRollsStats/>, document.body);

