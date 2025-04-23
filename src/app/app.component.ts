import { Component, OnInit, OnDestroy } from '@angular/core';
import { WebsocketService } from './websocket.service';
import { Slot, Station, Product, AMR, StationKey, PathKey, Position, ProductionMetrics } from './models';
import { Subscription } from 'rxjs';

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

  // Production metrics (directly from backend)
  productionMetrics: ProductionMetrics = {
    total_units: 0,
    good_units: 0,
    bad_units: 0
  };

  // Recent activities
  recentActivities: any[] = [];

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

  // Station paths
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

  private wsSubscription?: Subscription;
  private metricsSubscription?: Subscription;

  constructor(private wsService: WebsocketService) {}

  ngOnInit(): void {
    this.initializeEmptySlots();
    
    // Subscribe to main WebSocket for left section data
    this.wsSubscription = this.wsService.messages$.subscribe(
      (msg) => {
        if (!msg || !msg.type) return;
        
        switch (msg.type) {
          case 'slot_update': this.updateSlot(msg); break;
          case 'station_update': this.updateStation(msg); break;
          case 'product_update': this.updateProduct(msg); break;
          case 'amr_update': this.updateAMR(msg); break;
          case 'stats_update': this.updateStats(msg); break;
        }
      },
      (error) => console.error('Dashboard Component Error:', error)
    );
    
    // Subscribe to metrics WebSocket for right section data
    this.metricsSubscription = this.wsService.metrics$.subscribe(
      (metrics: any) => { // Changed to 'any' to handle potential backend differences
        this.productionMetrics = {
          total_units: metrics.total_units || 0,
          good_units: metrics.good_units || 0,
          bad_units: metrics.bad_units || 0
        };
      },
      (error) => console.error('Metrics subscription error:', error)
    );

    this.requestInitialState();
  }

  ngOnDestroy(): void {
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }
    if (this.metricsSubscription) {
      this.metricsSubscription.unsubscribe();
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
      this.slots = [...this.slots];
    }
  }

  updateStation(msg: any): void {
    switch (msg.station) {
      case 'CNC Turning':
        this.cncTurning = { 
          station: 'CNC Turning',
          status: msg.status,
          serial_number: msg.serial_number,
          material_id: msg.material_id,
          production_count: msg.production_count
        };
        break;
      case 'Milling':
        this.milling = { 
          station: 'Milling',
          status: msg.status,
          serial_number: msg.serial_number,
          material_id: msg.material_id,
          production_count: msg.production_count
        };
        break;
      case 'Manual QC':
        this.manualQC = { 
          station: 'Manual QC',
          status: msg.status,
          serial_number: msg.serial_number,
          material_id: msg.material_id,
          production_count: msg.production_count
        };
        break;
      case 'Assembly':
        this.assembly = { 
          station: 'Assembly',
          status: msg.status,
          serial_number: msg.serial_number,
          material_id: msg.material_id,
          production_count: msg.production_count
        };
        break;
      case 'Visual Inspection':
        this.visualInspection = { 
          station: 'Visual Inspection',
          status: msg.status,
          serial_number: msg.serial_number,
          material_id: msg.material_id,
          production_count: msg.production_count
        };
        break;
    }
  }

  updateProduct(msg: any): void {
    if (!msg.current_station) return;
    if (msg.status === 'In Progress') {
      this.currentProducts[msg.current_station] = { ...msg };
      this.updateRecentActivities(msg);
    } else if (msg.status === 'Done') {
      if (msg.current_station) {
        this.currentProducts[msg.current_station] = undefined;
      }
      this.updateRecentActivities(msg);
    }
  }

  updateAMR(msg: any): void {
    if (!msg.from_location || !msg.to_location) {
      this.amr = msg;
      this.isAnimating = false;
      return;
    }
    this.amr = msg;
    
    if (msg.status === 'Moving') {
      this.animateAMRWithPath(msg.from_location, msg.to_location);
    } else {
      this.isAnimating = false;
      if (msg.status === 'Idle' || msg.status === 'Delivered') {
        this.amrPosition = this.stationPositions['ASRS'];
      }
    }
  }

  updateStats(msg: any): void {
    this.productionMetrics = {
      total_units: msg.total_units || 0,
      good_units: msg.good_units || 0,
      bad_units: msg.bad_units || 0
    };
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
    
    const fromPos = Object.keys(this.stationPositions).includes(from) 
                  ? this.stationPositions[from as StationKey]
                  : this.stationPositions['ASRS'];
    const toPos = Object.keys(this.stationPositions).includes(to)
                ? this.stationPositions[to as StationKey]
                : this.stationPositions['ASRS'];
    
    return [
      fromPos,
      { x: (fromPos.x + toPos.x) / 2, y: (fromPos.y + toPos.y) / 2 },
      toPos
    ];
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
      
      if (currentPathIndex < totalSegments - 1 || segmentProgress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }

  easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  updateRecentActivities(product: Product): void {
    if (!product.serial_no) return;
    
    const serialParts = product.serial_no.split('-');
    const serialNumber = serialParts.length > 1 ? serialParts[1] : product.serial_no;
    
    const existingIndex = this.recentActivities.findIndex(
      activity => activity.serial === serialNumber
    );
    
    if (existingIndex >= 0) {
      const activity = this.recentActivities[existingIndex];
      
      if (product.current_station === 'CNC Turning') {
        activity.cncTime = this.getCurrentTime();
      } else if (product.current_station === 'Milling') {
        activity.millingTime = this.getCurrentTime();
      } else if (product.current_station === 'Assembly') {
        activity.assemblyTime = this.getCurrentTime();
      } else if (product.current_station === 'Manual QC') {
        activity.qcTime = this.getCurrentTime();
      } else if (product.current_station === 'Visual Inspection') {
        activity.inspectionTime = this.getCurrentTime();
      }
      
      if (product.status === 'Done' && product.final_status) {
        activity.status = product.final_status;
      }
    } else {
      const newActivity = {
        serial: serialNumber,
        materialId: product.material_id,
        station: { 
          name: product.current_station,
          icon: this.getIconForStation(product.current_station)
        },
        cncTime: product.current_station === 'CNC Turning' ? this.getCurrentTime() : '--:--:--',
        millingTime: product.current_station === 'Milling' ? this.getCurrentTime() : '--:--:--',
        assemblyTime: product.current_station === 'Assembly' ? this.getCurrentTime() : '--:--:--',
        qcTime: product.current_station === 'Manual QC' ? this.getCurrentTime() : '--:--:--',
        inspectionTime: product.current_station === 'Visual Inspection' ? this.getCurrentTime() : '--:--:--',
        status: product.final_status || 'In Progress'
      };
      
      this.recentActivities.unshift(newActivity);
      if (this.recentActivities.length > 5) {
        this.recentActivities.pop();
      }
    }
  }

  getCurrentTime(): string {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
  }

  getIconForStation(station: string): string {
    switch (station) {
      case 'CNC Turning': return 'tool';
      case 'Milling': return 'build';
      case 'Manual QC': return 'check-circle';
      case 'Assembly': return 'deployment-unit';
      case 'Visual Inspection': return 'eye';
      default: return 'dashboard';
    }
  }
}