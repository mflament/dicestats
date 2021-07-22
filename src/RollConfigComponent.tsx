import React, {Component, FormEvent} from "react";
import {parseRollsConfig, ROLLS_CONFIG_PATTERN, RollsConfig} from "./DiceRolls";

interface RollsConfigProps {
  declaration: string;

  roll(config: RollsConfig): void
}

export class RollConfigComponent extends Component<RollsConfigProps, { declaration: string, config: RollsConfig }> {
  constructor(props: RollsConfigProps) {
    super(props);
    this.state = {
      declaration: props.declaration,
      config: parseRollsConfig(props.declaration),
    }
    props.roll(this.state.config);
  }

  render(): JSX.Element {
    const config = this.state.config;
    const label = `Will roll ${config.rolls.toLocaleString()} times ${config.dices.count}D${this.state.config.dices.faces}`;
    return <form onSubmit={e => this.roll(e)}>
      <label>Rolls
        <input type="string" pattern={ROLLS_CONFIG_PATTERN} value={this.state.declaration}
               onChange={e => this.parseConfig(e.target.value)}/>
      </label>
      <label>{label} <input type="submit" value="Let's roll"/></label>
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