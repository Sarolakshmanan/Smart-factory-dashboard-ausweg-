import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { WebsocketService } from './websocket.service';
import { Slot, Station, Product, AMR, StationKey, PathKey, Position, ProductHistory } from './models';
import { Subscription } from 'rxjs';
import * as Highcharts from 'highcharts';

// Add this to enable animations in Highcharts
Highcharts.setOptions({
  chart: {
    animation: true
  },
  plotOptions: {
    series: {
      animation: {
        duration: 1000
      }
    }
  }
});

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  // ASRS
  slots: Slot[] = [];

  // Stations
  cncTurning: Station = { station: 'CNC Turning', status: 'Idle' };
  milling: Station = { station: 'Milling', status: 'Idle' };
  manualQC: Station = { station: 'Manual QC', status: 'Idle' };
  assembly: Station = { station: 'Assembly', status: 'Idle' };
  visualInspection: Station = { station: 'Visual Inspection', status: 'Idle' };

  // Products
  currentProducts: { [key: string]: Product | undefined } = {
    'CNC Turning': undefined,
    'Milling': undefined,
    'Manual QC': undefined,
    'Assembly': undefined,
    'Visual Inspection': undefined
  };

  // AMR
  amr: AMR | undefined;

  // Production statistics
  totalProduction: number = 0;
  goodProducts: number = 0;
  rejections: number = 0;
  oeePercentage: number = 0;
  amrTrips: number = 0;

  // AMR Animation properties
  amrPosition: Position = { x: 50, y: 50 };
  isAnimating = false;
  amrRotation = 0;

  // Station positions
  stationPositions: Record<StationKey, Position> = {
    'ASRS': { x: 50, y: 50 },
    'CNC Turning': { x: 25, y: 25 },
    'Milling': { x: 75, y: 25 },
    'Manual QC': { x: 75, y: 50 },
    'Assembly': { x: 75, y: 75 },
    'Visual Inspection': { x: 25, y: 75 }
  };

  // Paths between stations
  stationPaths: Record<PathKey, Position[]> = {
    'ASRS-CNC Turning': [
      { x: 50, y: 50 },
      { x: 37, y: 37 },
      { x: 25, y: 25 }
    ],
    'ASRS-Milling': [
      { x: 50, y: 50 },
      { x: 62, y: 37 },
      { x: 75, y: 25 }
    ],
    'ASRS-Manual QC': [
      { x: 50, y: 50 },
      { x: 62, y: 50 },
      { x: 75, y: 50 }
    ],
    'ASRS-Assembly': [
      { x: 50, y: 50 },
      { x: 62, y: 62 },
      { x: 75, y: 75 }
    ],
    'ASRS-Visual Inspection': [
      { x: 50, y: 50 },
      { x: 37, y: 62 },
      { x: 25, y: 75 }
    ],
    'CNC Turning-Milling': [
      { x: 25, y: 25 },
      { x: 50, y: 25 },
      { x: 75, y: 25 }
    ],
    'Milling-Manual QC': [
      { x: 75, y: 25 },
      { x: 75, y: 37 },
      { x: 75, y: 50 }
    ],
    'Manual QC-Assembly': [
      { x: 75, y: 50 },
      { x: 75, y: 62 },
      { x: 75, y: 75 }
    ],
    'Assembly-Visual Inspection': [
      { x: 75, y: 75 },
      { x: 50, y: 75 },
      { x: 25, y: 75 }
    ],
    'Visual Inspection-ASRS': [
      { x: 25, y: 75 },
      { x: 37, y: 62 },
      { x: 50, y: 50 }
    ]
  };

  Highcharts: typeof Highcharts = Highcharts;
  chartRef: Highcharts.Chart | null = null;
  
  pieChartOptions: Highcharts.Options = {
    chart: {
      type: 'pie',
      backgroundColor: 'transparent',
      height: 200,
      animation: true
    },
    title: {
      text: 'Station Status',
      style: {
        color: '#ffffff'
      }
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        animation: {
          duration: 800
        },
        dataLabels: {
          enabled: true,
          format: '<b>{point.name}</b>: {point.y}',
          style: {
            color: 'white'
          }
        },
        colors: [
          '#00c897', // Running - Green
          '#ffc107', // Idle - Yellow
          '#ff4b5c'  // Stopped - Red
        ]
      }
    },
    series: [{
      type: 'pie',
      name: 'Status',
      data: [
        { name: 'Running', y: 0 },
        { name: 'Idle', y: 5 },
        { name: 'Stopped', y: 0 }
      ]
    }],
    credits: {
      enabled: false
    },
    legend: {
      itemStyle: {
        color: 'white'
      }
    }
  };

  chartCallback: Highcharts.ChartCallbackFunction = (chart) => {
    this.chartRef = chart;
  };

  productHistoryData: ProductHistory[] = [];
  private wsSubscription?: Subscription;

  constructor(
    private wsService: WebsocketService, 
    private changeDetectorRef: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.initializeEmptySlots();
    this.wsSubscription = this.wsService.messages$.subscribe(
      (msg) => {
        if (!msg) return;
        
        this.zone.run(() => {
          if (msg.type === 'product_history_update') {
            this.updateProductHistory(msg);
          } 
          else if (msg.type === 'station_status_counts') {
            this.updatePieChart(msg);
          }
          else if (msg.type) {
            switch (msg.type) {
              case 'slot_update':
                this.updateSlot(msg);
                break;
              case 'station_update':
                this.updateStation(msg);
                break;
              case 'product_update':
                this.updateProduct(msg);
                break;
              case 'amr_update':
                this.updateAMR(msg);
                break;
              case 'metrics_update':
                this.updateMetrics(msg.metrics);
                break;
              case 'stats_update':
                this.updateStats(msg);
                break;
            }
          }
          
          // Force change detection
          this.changeDetectorRef.detectChanges();
        });
      },
      (error) => console.error('Dashboard Component Error:', error)
    );
    
    this.requestInitialState();
    this.requestProductHistory();
    this.requestStationStats();
  }

  ngOnDestroy(): void {
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }
    this.wsService.disconnect();
  }

  initializeEmptySlots(): void {
    this.slots = Array.from({ length: 15 }, (_, i) => ({
      slot_number: `S${i + 1}`,
      status: 'Empty',
      serial_no: undefined,
      material_id: undefined,
      final_status: undefined
    }));
  }

  requestInitialState(): void {
    try {
      this.wsService.sendMessage({
        action: 'get_initial_state'
      });
    } catch (err) {
      console.error('Failed to request initial state:', err);
    }
  }

  requestProductHistory(): void {
    try {
      this.wsService.sendHistoryMessage({
        action: 'get_product_history'
      });
    } catch (err) {
      console.error('Failed to request product history:', err);
    }
  }

  requestStationStats(): void {
    try {
      this.wsService.sendStationStatsMessage({
        action: 'get_station_stats'
      });
    } catch (err) {
      console.error('Failed to request station stats:', err);
    }
  }

  updateSlot(msg: any): void {
    const slotIndex = this.slots.findIndex(s => s.slot_number === msg.slot_number);
    if (slotIndex !== -1) {
      this.slots[slotIndex] = {
        slot_number: msg.slot_number,
        status: msg.status,
        serial_no: msg.serial_no,
        material_id: msg.material_id,
        final_status: msg.final_status
      };
      this.slots = [...this.slots]; // Create new array reference to trigger change detection
    }
  }

  updateStation(msg: any): void {
    let validStatus: 'Idle' | 'Running' | 'Stop' | 'Done' | 'Stopped' = 'Idle';
    
    if (msg.status === 'Running') {
      validStatus = 'Running';
    } else if (msg.status === 'Idle') {
      validStatus = 'Idle';
    } else if (msg.status === 'Stopped') {
      validStatus = 'Stop';
    } else if (msg.status === 'Done') {
      validStatus = 'Done';
    }

    const updatedStation = { ...msg, status: validStatus };

    switch (msg.station) {
      case 'CNC Turning':
        this.cncTurning = updatedStation;
        break;
      case 'Milling':
        this.milling = updatedStation;
        break;
      case 'Manual QC':
        this.manualQC = updatedStation;
        break;
      case 'Assembly':
        this.assembly = updatedStation;
        break;
      case 'Visual Inspection':
        this.visualInspection = updatedStation;
        break;
    }
    
    // Request updated station stats after a station update
    this.requestStationStats();
  }

  updateProduct(msg: any): void {
    if (!msg.current_station) return;
    
    if (msg.status === 'In Progress') {
      this.currentProducts[msg.current_station] = { ...msg };
    } else if (msg.status === 'Done') {
      this.currentProducts[msg.current_station] = undefined;
    }
  }

  updateAMR(msg: any): void {
    this.amr = msg;
    
    if (msg.status === 'Moving' && msg.from_location && msg.to_location) {
      this.animateAMRWithPath(msg.from_location, msg.to_location);
    } else {
      this.isAnimating = false;
      if (msg.status === 'Idle' || msg.status === 'Delivered') {
        this.amrPosition = this.stationPositions['ASRS'];
      }
    }
  }

  updateMetrics(metrics: any): void {
    if (!metrics) return;
    
    if (metrics.total_units !== undefined) {
      this.totalProduction = metrics.total_units;
    }
    
    if (metrics.good_units !== undefined) {
      this.goodProducts = metrics.good_units;
    }
    
    if (metrics.bad_units !== undefined) {
      this.rejections = metrics.bad_units;
    }
    
    if (metrics.amr_trips !== undefined) {
      this.amrTrips = metrics.amr_trips;
    }
  }

  updateStats(msg: any): void {
    if (msg.total_production !== undefined) {
      this.totalProduction = msg.total_production;
    }
    
    if (msg.good_products !== undefined) {
      this.goodProducts = msg.good_products;
    }
    
    if (msg.rejections !== undefined) {
      this.rejections = msg.rejections;
    }
    
    if (msg.oee_percentage !== undefined) {
      this.oeePercentage = msg.oee_percentage;
    }
  }

  updateProductHistory(data: any): void {
    if (data.history && Array.isArray(data.history)) {
      this.productHistoryData = data.history.map((item: any) => {
        let status = 'In Progress';
        if (item.status === 'Done') {
          status = item.final_status || 'Good';
        }

        return {
          serial_no: item.serial_no,
          material_id: item.material_id,
          cnc_time: item.cnc_completed ? this.formatTime(item.cnc_completed) : '--:--:--',
          milling_time: item.milling_completed ? this.formatTime(item.milling_completed) : '--:--:--',
          assembly_time: item.assembly_completed ? this.formatTime(item.assembly_completed) : '--:--:--',
          manual_qc_time: item.qc_completed ? this.formatTime(item.qc_completed) : '--:--:--',
          visual_inspection_time: item.inspection_completed ? this.formatTime(item.inspection_completed) : '--:--:--',
          status: status
        };
      });
    }
  }

  updatePieChart(data: any): void {
    if (!data || !data.current_counts) return;
    
    const newData = [
      { name: 'Running', y: data.current_counts.Running || 0 },
      { name: 'Idle', y: data.current_counts.Idle || 0 },
      { name: 'Stopped', y: data.current_counts.Stopped || 0 }
    ];
    
    if (this.chartRef) {
      // Update chart data with animation
      const series = this.chartRef.series[0];
      if (series) {
        newData.forEach((point, i) => {
          if (i < series.data.length) {
            series.data[i].update(point, false);
          } else {
            series.addPoint(point, false);
          }
        });
        
        this.chartRef.redraw(true); // Force redraw with animation
      }
    } else {
      // Create a new options object with updated data
      this.pieChartOptions = {
        ...this.pieChartOptions,
        series: [{
          type: 'pie',
          name: 'Status',
          data: newData
        }]
      };
    }
  }

  formatTime(timestamp: string): string {
    if (!timestamp) return '--:--:--';
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    } catch (e) {
      return '--:--:--';
    }
  }

  animateAMRWithPath(from: string, to: string): void {
    const path = this.getPath(from, to);
    this.amrPosition = { ...path[0] };
    this.isAnimating = true;
    
    const duration = 2000;
    const startTime = Date.now();
    let currentPathIndex = 0;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const totalSegments = path.length - 1;
      const timePerSegment = duration / totalSegments;
      
      currentPathIndex = Math.min(
        Math.floor(elapsed / timePerSegment),
        totalSegments - 1
      );
      
      const segmentProgress = (elapsed % timePerSegment) / timePerSegment;
      const easeProgress = this.easeInOutQuad(segmentProgress);
      
      const startPoint = path[currentPathIndex];
      const endPoint = path[currentPathIndex + 1];
      
      this.amrPosition = {
        x: startPoint.x + (endPoint.x - startPoint.x) * easeProgress,
        y: startPoint.y + (endPoint.y - startPoint.y) * easeProgress
      };
      
      const dx = endPoint.x - startPoint.x;
      const dy = endPoint.y - startPoint.y;
      this.amrRotation = Math.atan2(dy, dx) * (180 / Math.PI);
      
      this.zone.run(() => {
        this.changeDetectorRef.detectChanges();
      });
      
      if (currentPathIndex < totalSegments - 1 || segmentProgress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation completed
        this.zone.run(() => {
          if (to === 'ASRS') {
            this.isAnimating = false;
          }
          this.changeDetectorRef.detectChanges();
        });
      }
    };
    
    animate();
  }

  getPath(from: string, to: string): Position[] {
    const directPathKey = `${from}-${to}`;
    const reversePathKey = `${to}-${from}`;
    
    if (Object.keys(this.stationPaths).includes(directPathKey)) {
      return this.stationPaths[directPathKey as PathKey];
    }
    
    if (Object.keys(this.stationPaths).includes(reversePathKey)) {
      return [...this.stationPaths[reversePathKey as PathKey]].reverse();
    }
    
    const fromPos = this.stationPositions[from as StationKey] || this.stationPositions['ASRS'];
    const toPos = this.stationPositions[to as StationKey] || this.stationPositions['ASRS'];
    
    return [
      fromPos,
      { x: (fromPos.x + toPos.x) / 2, y: (fromPos.y + toPos.y) / 2 },
      toPos
    ];
  }

  easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
}