/**
 * Types for the annotation layer system
 */

export interface AnnotationLayerOptions {
  renderIntervalMs: number;
  maxAnnotationsPerLayer: number;
  maxLayers: number;
  canvasWidth?: number;
  canvasHeight?: number;
  onAnnotationCreated?: (annotation: Annotation) => void;
  onAnnotationUpdated?: (annotation: Annotation) => void;
  onAnnotationDeleted?: (annotationId: string) => void;
  onLayerVisibilityChanged?: (layerId: string, visible: boolean) => void;
}

export interface Annotation {
  id: string;
  userId: string;
  videoTimestamp: number;
  type: AnnotationType;
  layerId: string;
  data: AnnotationData;
  visible: boolean;
  createdAt: number;
  updatedAt: number;
}

export type AnnotationType =
  'pen' | 'rectangle' | 'circle' | 'arrow' | 'text' | 'eraser' | 'highlighter' | 'line';

export interface AnnotationData {
  // Common properties
  color: string;
  strokeWidth: number;
  opacity: number;
  userName?: string;

  // Pen-specific
  points?: Point[];

  // Shape-specific
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;

  // Arrow/line-specific
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;

  // Text-specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;

  // Extended (Milestone 4)
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  fillColor?: string;
  fontWeight?: 'normal' | 'bold';
  isEphemeral?: boolean;
}

export interface Point {
  x: number;
  y: number;
  pressure?: number;
  timestamp?: number;
}

export interface AnnotationLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  annotations: Map<string, Annotation>;
  zIndex: number;
}

export interface DrawingTool {
  type: AnnotationType;
  color: string;
  strokeWidth: number;
  opacity: number;
  fontSize?: number;
  fontFamily?: string;
}

export interface AnnotationState {
  isActive: boolean;
  currentTool: DrawingTool;
  currentLayer: string;
  layers: Map<string, AnnotationLayer>;
  isDrawing: boolean;
  currentAnnotation: Annotation | null;
  undoStack: AnnotationAction[];
  redoStack: AnnotationAction[];
  maxUndoSteps: number;
}

export interface AnnotationAction {
  type:
    | 'create'
    | 'update'
    | 'delete'
    | 'layer_visibility'
    | 'layer_create'
    | 'layer_delete'
    | 'layer_opacity'
    | 'layer_reorder'
    | 'layer_rename';
  annotationId?: string;
  layerId?: string;
  previousState?: unknown;
  newState?: unknown;
  timestamp: number;
}

export interface AnnotationMessage {
  type:
    | 'annotation_created'
    | 'annotation_updated'
    | 'annotation_deleted'
    | 'layer_visibility_changed'
    | 'layer_opacity_changed'
    | 'layer_reordered'
    | 'layer_renamed'
    | 'annotation_state_snapshot';
  protocolVersion: 1;
  sequence: number;
  userId: string;
  roomId: string;
  annotation?: Annotation;
  annotationId?: string;
  layerId?: string;
  updates?: AnnotationData;
  visible?: boolean;
  opacity?: number;
  zIndex?: number;
  name?: string;
  annotations?: Annotation[];
  timestamp: number;
}

export interface CanvasEventHandlers {
  onMouseDown: (event: MouseEvent) => void;
  onMouseMove: (event: MouseEvent) => void;
  onMouseUp: (event: MouseEvent) => void;
  onTouchStart: (event: TouchEvent) => void;
  onTouchMove: (event: TouchEvent) => void;
  onTouchEnd: (event: TouchEvent) => void;
  onKeyDown: (event: KeyboardEvent) => void;
}
