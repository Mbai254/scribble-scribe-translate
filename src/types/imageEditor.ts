
export interface DetectedElement {
  id: string;
  text: string;
  type: 'text' | 'logo' | 'object';
  bbox: { x: number; y: number; width: number; height: number };
  confidence: number;
  isDragging?: boolean;
}
