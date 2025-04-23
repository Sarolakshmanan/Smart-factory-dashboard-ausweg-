export interface Slot {
  slot_number: string;
  status: 'Empty' | 'Filled' | 'Processing' | 'Returned-Good';
  serial_no?: string;
  material_id?: string;
  final_status?: string;
}

export interface Station {
  station: string;
  status: 'Idle' | 'Running' | 'Stop' | 'Done';
  serial_number?: string | null;
  material_id?: string | null;
  production_count?: number;
}

export interface Product {
  serial_no: string;
  material_id: string;
  current_station: string;
  status: 'In Progress' | 'Done';
  final_status?: 'Good' | 'Rejected';
  timestamp: string;
}

export interface AMR {
  action_type: 'Pickup' | 'Delivery';
  from_location: string;
  to_location: string;
  status: 'Moving' | 'Delivered';
  serial_no?: string;
  material_id?: string;
}

export type StationKey = 'ASRS' | 'CNC Turning' | 'Milling' | 'Manual QC' | 'Assembly' | 'Visual Inspection';

export type PathKey = 'ASRS-CNC Turning' | 'ASRS-Milling' | 'ASRS-Manual QC' | 'ASRS-Assembly' | 
                   'ASRS-Visual Inspection' | 'CNC Turning-Milling' | 'Milling-Manual QC' | 
                   'Manual QC-Assembly' | 'Assembly-Visual Inspection' | 'Visual Inspection-ASRS';

export interface Position {
  x: number;
  y: number;
}

export interface ProductionMetrics {
  total_units: number;
  good_units: number;
  bad_units: number;

}