import {RollStats} from "./DiceRolls";
import React from "react";

export function StatsTable(props: { stats: RollStats[] }): JSX.Element {
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
