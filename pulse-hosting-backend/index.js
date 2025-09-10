const express = require('express');
const { createDroplet } = require('./src/provision');
const app = express();
app.use(express.json());

app.post('/launch', async (req, res) => {
  const { clientName } = req.body;
  await createDroplet(clientName);
  res.send(`🚀 Hosting launched for ${clientName}`);
});

app.listen(3000, () => {
  console.log('🌐 Pulse Connect Hosting API running on port 3000');
});