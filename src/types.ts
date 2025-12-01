export interface LogMessage {
  id?: number;
  from: string;
  payload: string;
  level: string;
  timestamp: string;
  caller: any;
  [key: string]: any;
}
