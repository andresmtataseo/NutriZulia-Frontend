import { Component, Input, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartOptions } from 'chart.js/auto';
import { ChartResponseDto } from '../../../models/chart.models';

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <canvas #canvas></canvas>
  `,
  styles: [`
    :host { display: block; }
    /* El canvas define su altura fija; el contenedor card se ajusta automáticamente */
    canvas { width: 100% !important; height: 320px !important; display: block; }
  `]
})
export class BarChartComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() data!: ChartResponseDto | null;
  @Input() stacked = false;
  @Input() horizontal = false;

  private chart?: Chart;

  ngAfterViewInit(): void {
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['data'] || changes['stacked'] || changes['horizontal']) && this.chart) {
      this.update();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private render(): void {
    if (!this.canvasRef || !this.data) return;

    const type = this.horizontal ? 'bar' : 'bar';

    const config: ChartConfiguration<'bar'> = {
      type,
      data: {
        labels: this.data.labels.map(l => this.mapLabel(l)),
        datasets: this.data.series.map(s => ({
          label: s.label,
          data: s.data,
          backgroundColor: s.color
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: this.horizontal ? 'y' : 'x',
        plugins: {
          legend: { position: 'top' }
        },
        scales: {
          x: { stacked: this.stacked },
          y: { stacked: this.stacked }
        }
      }
    };

    this.chart = new Chart(this.canvasRef.nativeElement, config);
  }

  private update(): void {
    if (!this.chart || !this.data) return;

    this.chart.data.labels = this.data.labels.map(l => this.mapLabel(l));
    this.chart.data.datasets = this.data.series.map(s => ({
      label: s.label,
      data: s.data,
      backgroundColor: s.color
    }));

    this.chart.options.indexAxis = this.horizontal ? 'y' : 'x';
    if (this.chart.options.scales) {
      const scales = this.chart.options.scales as ChartOptions<'bar'>['scales'];
      const xScale = scales && 'x' in scales ? scales['x'] : undefined;
      const yScale = scales && 'y' in scales ? scales['y'] : undefined;
      if (xScale && yScale) {
        (xScale as any).stacked = this.stacked;
        (yScale as any).stacked = this.stacked;
      }
    }

    this.chart.update();
  }

  private mapLabel(bucket: string): string {
    switch (bucket) {
      case 'LT2': return '<2 años';
      case 'A2_6': return '2–6 años';
      case 'A7_12': return '7–12 años';
      case 'A13_18': return '13–18 años';
      case 'A19_59': return '19–59 años';
      case 'GTE60': return '≥60 años';
      default: return bucket;
    }
  }
}
