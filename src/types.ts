export interface LogMessage {
  id?: number;
  from: string;
  payload: string;
  level: string;
  timestamp: string;
  caller: any;
  save?: boolean;
  [key: string]: any;
}
