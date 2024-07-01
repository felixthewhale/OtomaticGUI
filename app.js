const express = require('express');
const { SerialPort } = require('serialport');
const { DelimiterParser, ReadlineParser } = require('serialport/lib/parsers-readline');  // update this line
const app = express();
const port = 3000;

const serialPort = new SerialPort({ path: 'COM3', baudRate: 9600 });
const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));  // or use DelimiterParser

app.use(express.static('public'));
app.use(express.json());

parser.on('data', (data) => {
  console.log(`Received: ${data}`);
});

app.post('/send-command', (req, res) => {
  const command = req.body.command;
  serialPort.write(command + '\n');
  res.status(200).send('Command Sent');
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
