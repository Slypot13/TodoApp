const express = require('express');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors({ origin: '*' }));

app.get('/', (req, res) => {
  res.send('Serveur OK');
});

app.listen(port, () => {
  console.log(`Serveur lancé sur http://localhost:${port}`);
});