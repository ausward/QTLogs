import express from 'express';
import mqtt from 'mqtt';

import { Get_db, Put_log_in_db } from './dbtool.ts';

const app = express();
const port = 3000;

let DB = await Get_db()


const client = mqtt.connect('mqtt://localhost:1883');

interface LogMessage {
  from: string;
  payload: string;
  level: string;
  timestamp: string;
  caller: any;
  [key: string]: any;
}

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  client.subscribe('#', (err) => {
    if (err) {
      console.log(err.message);
    }
  });
});

client.on('message', async (topic, message) => {
    const identifierPattern = /^[a-zA-Z0-9_]+$/;
    if (!identifierPattern.test(topic)) {
        console.log(`Invalid table name: '${topic}'. Table names must only contain alphanumeric characters and underscores.`);
        return
    }
  try {
    const logMessage: LogMessage = JSON.parse(message.toString());
    console.log(`Received message on topic ${topic}:`, logMessage);
    await Put_log_in_db(topic, logMessage, DB)
  } catch (e) {
    console.log("error " + e)
    console.log(`Could not parse message: ${message.toString()}`);
  }
});

client.on('error', (err) => {
    console.error('MQTT Error:', err.name);
});

app.get('/', (req, res) => {
  res.send('Hello from TypeScript Express!');
});

app.listen(port, () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
});


export type { LogMessage }