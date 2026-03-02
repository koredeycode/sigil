import express from 'express';
const app = express();
const extRouter = express.Router();
extRouter.post('/connect', (req, res) => res.json({ msg: 'extension' }));
app.use('/api/extension', extRouter);
app.use('/api', (req, res) => res.status(401).json({ msg: 'auth' }));
app.post('/api/extension/connect', (req, res) => res.json({ msg: 'post?' }));
import http from 'http';
http.createServer(app).listen(8888, () => {
  console.log('Listening');
});
