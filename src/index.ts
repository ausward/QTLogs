import express from 'express';
import mqtt from 'mqtt';

import { Get_db, Get_single_log, Put_log_in_db, get_all_table_names, get_logs } from './dbtool.ts';

const app = express();
const port = 3000;

let DB = await Get_db()


const client = mqtt.connect('mqtt://localhost:1883');

import type { LogMessage } from './types.ts';
import { time } from 'console';

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  client.subscribe('#', (err) => {
    if (err) {
      console.log(err.message);
    }
  });
});

// An array to hold the SSE response objects
let clients: { id: number; res: express.Response }[] = [];

client.on('message', async (topic, message) => {
    const identifierPattern = /^[a-zA-Z0-9_]+$/;
    if (!identifierPattern.test(topic)) {
        console.log(`Invalid table name: '${topic}'. Table names must only contain alphanumeric characters and underscores.`);
        return 
    }
  try {
    const logMessage: LogMessage = JSON.parse(message.toString());
    // console.log(`Received message on topic ${topic}:`, logMessage);
    if (logMessage.timestamp && logMessage.timestamp.length < 20){logMessage.timestamp = logMessage.timestamp.padEnd(20, '_');}
    if (!logMessage.timestamp) {logMessage.timestamp = new Date().toISOString() }
    await Put_log_in_db(topic, logMessage, DB)

    // Send the message to all connected SSE clients
    clients.forEach((client) => {
      client.res.write(`data: ${JSON.stringify({ topic, message: logMessage })}\n\n`);
    });

  } catch (e) {
    console.log("error " + e)
    console.log(`Could not parse message: ${message.toString()}`);
  }
});

client.on('error', (err) => {
    console.error('MQTT Error:', err.name);
});

app.use(express.static('public'));

app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res,
  };
  clients.push(newClient);
  console.log(`${clientId} Connection opened`);


  req.on('close', () => {
    clients = clients.filter(client => client.id !== clientId);
    console.log(`${clientId} Connection closed`);
  });
});

app.get('/tables', (req, res) => {
    const tables = get_all_table_names(DB);
    res.json(tables);
});

app.get('/logs/:tableName', (req, res) => {
    const { tableName } = req.params;
    if (tableName === 'all') {
        const tables = get_all_table_names(DB);
        const allLogs:any= {};
        for (const table of tables) {
            allLogs[table] = get_logs(table, DB);
        }
        res.json(allLogs);
    } else {
        const logs = get_logs(tableName, DB);
        res.json(logs);
    }
});

app.get('/:tableName/:logID', (req, res) => {
  const { tableName, logID } = req.params;
  const id = Number(logID);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid logID' });
    return;
  }
  const result = Get_single_log(tableName, DB, id);
  res.json(result);
});

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

app.listen(port, () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
});


