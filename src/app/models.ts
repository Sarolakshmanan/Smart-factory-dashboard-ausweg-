export interface Slot {
  slot_number: string;
  status: string;
  serial_no?: string;
  material_id?: string;
  final_status?: string;
}

export interface Station {
  station: string;
  status: 'Idle' | 'Running' | 'Stop' | 'Done' | 'Stopped';
}

export interface Product {
  serial_no: string;
  material_id: string;
  status: string;
  current_station: string;
  next_station?: string;
}

export interface AMR {
  status: string;
  action_type?: string;
  serial_no?: string;
  from_location?: string;
  to_location?: string;
}

export interface Position {
  x: number;
  y: number;
}

export type StationKey = 'ASRS' | 'CNC Turning' | 'Milling' | 'Manual QC' | 'Assembly' | 'Visual Inspection';
export type PathKey = 'ASRS-CNC Turning' | 'ASRS-Milling' | 'ASRS-Manual QC' | 'ASRS-Assembly' | 'ASRS-Visual Inspection' | 
                     'CNC Turning-Milling' | 'Milling-Manual QC' | 'Manual QC-Assembly' | 'Assembly-Visual Inspection' | 'Visual Inspection-ASRS';

export interface ProductHistory {
  serial_no: string;
  material_id: string;
  cnc_time: string;
  milling_time: string;
  assembly_time: string;
  manual_qc_time: string;
  visual_inspection_time: string;
  status: string;
}