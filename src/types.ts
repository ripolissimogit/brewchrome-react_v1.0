export interface Color {
  r: number;
  g: number;
  b: number;
}

export interface PaletteResponse {
  success: boolean;
  palette?: Color[];
  social_image?: string;
  error?: string;
}

export interface ProcessedImage {
  id: string;
  filename: string;
  socialImage: string;
  palette: Color[];
  size: number;
  extension: string;
  tab: 'files' | 'urls' | 'archive';
}

export interface HealthResponse {
  status: string;
  version: string;
  service: string;
  features: string[];
}

export interface FetchUrlResponse {
  success: boolean;
  image?: string;
  content_type?: string;
  size_mb?: number;
  error?: string;
}
