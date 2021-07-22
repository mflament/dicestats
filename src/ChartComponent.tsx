import React, {Component, RefObject} from "react";
import {Chart, ChartConfiguration, ChartDataset, registerables} from 'chart.js';

Chart.register(...registerables);

interface ChartProps {
  configuration: ChartConfiguration
}

class ChartComponent extends Component<ChartProps> {
  private readonly canvasRef: RefObject<HTMLCanvasElement>;
  private chart?: Chart;

  constructor(props: ChartProps) {
    super(props);
    this.canvasRef = React.createRef();
  }

  render(): JSX.Element {
    return <canvas ref={this.canvasRef}/>;
  }

  componentDidMount(): void {
    const canvas = this.canvasRef.current;
    if (!canvas)
      throw new Error("Canvas not created");
    this.props.configuration.plugins = this.props.configuration.plugins || [];
    this.chart = new Chart(canvas, this.props.configuration);
  }

  componentWillUnmount(): void {
    if (this.chart) this.chart.destroy();
  }

}

export {ChartComponent, Chart, ChartConfiguration, ChartDataset};
