export interface ModelConfig {
  connectorName: string;
  models: string[];
  properties: Property[];
  settings: Setting[];
  iconBase64: string;
  description?: string;
  author?: string;
}

export interface Property {
  id: string;
  name: string;
  value: string | number | boolean | string[];
  type: 'string' | 'number' | 'boolean' | 'array';
}

export interface Setting {
  id: string;
  name: string;
  value: string;
  type: 'string';
}

export declare const config: ModelConfig;
