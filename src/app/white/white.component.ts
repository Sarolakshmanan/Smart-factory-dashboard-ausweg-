import { Component, OnInit, OnDestroy } from '@angular/core';
import { WebsocketService } from '../websocket.service';
import { Slot, Station, Product, AMR, StationKey, PathKey, Position, ProductionMetrics } from '../modelswhite';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-white',
  templateUrl: './white.component.html',
  styleUrls: ['./white.component.css']
})
export class WhiteComponent {
  isCollapsed = false;
  
  // Factory Dashboard properties
  cncTurning: any = { station: 'CNC Turning', status: 'Running' };
  milling: any = { station: 'Milling', status: 'Idle' };
  visualInspection: any = { station: 'Visual Inspection', status: 'Running' };
  assembly: any = { station: 'Assembly', status: 'Stop' };
  manualQC: any = { station: 'Manual QC', status: 'Done' };
  
  amr: any = {
    action_type: 'Moving',
    serial_no: 'MAT-003',
    from_location: 'ASRS',
    to_location: 'CNC',
    status: 'In Progress'
  };
  
  isAnimating = false;
  amrPosition = { x: 50, y: 50 };
  amrRotation = 0;
  
  currentProducts: any = {
    'CNC Turning': { serial_no: 'MAT-001', status: 'Processing' },
    'Milling': { serial_no: 'MAT-002', status: 'Queued' }
  };
  
  productionMetrics: any = {
    total_units: 110,
    good_units: 152,
    bad_units: 281
  };
  
  // ASRS slots data
  slots = Array(15).fill(0).map((_, i) => {
    const status = Math.random() > 0.7 ? 'Filled' : 
                  Math.random() > 0.5 ? 'Empty' : 
                  Math.random() > 0.3 ? 'Processing' : 
                  Math.random() > 0.15 ? 'Returned-Good' : 'Rejected';
    
    return {
      slot_number: (i + 1).toString().padStart(2, '0'),
      status: status,
      serial_no: status !== 'Empty' ? `MAT-${(i + 100).toString()}` : null,
      final_status: status === 'Filled' ? (Math.random() > 0.8 ? 'Rejected' : 'Good') : null
    };
  });

  constructor() {}

  ngOnInit() {
    // Any initialization logic
  }
}
