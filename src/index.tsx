import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import {roll, RollsConfig} from "./DiceRolls";
import {RollResultsComponent} from "./RollResultsComponent";
import {RollConfigComponent} from "./RollConfigComponent";
import {RollResults} from "./RollResults";

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

ReactDOM.render(<DiceRollsStats/>, document.body);

