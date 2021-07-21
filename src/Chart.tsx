import React, {Component, RefObject} from "react";
import {Chart as ChartJS, ChartConfiguration, ChartDataset, registerables} from 'chart.js/auto';

ChartJS.register(...registerables);

interface ChartProps {
  configuration: ChartConfiguration
}

export class Chart extends Component<ChartProps> {
  private readonly canvasRef: RefObject<HTMLCanvasElement>;
  private chart?: ChartJS;

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
    this.chart = new ChartJS(canvas, this.props.configuration);
  }

  componentWillUnmount(): void {
    if (this.chart) this.chart.destroy();
  }

}

export {ChartJS, ChartConfiguration, ChartDataset};
