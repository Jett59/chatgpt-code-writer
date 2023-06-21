import express from 'express';
import cors from 'cors';
import { checkAuthorization } from './authorization';
import { BeginImplementingRequest } from '../data/api';
import {beginImplementingFeature} from './implementFeature';

let app = express();

app.use(express.json());
app.use(cors());
app.use(checkAuthorization());

app.post('/api/implement', (request, response) => {
    const body: BeginImplementingRequest = request.body;

    response.send(beginImplementingFeature(body.title, body.description, body.project));
});


// 404 handlers
app.get('*', (req, res) => {
    res.status(404).send(`Unknown path: ${req.path}`);
});
app.post('*', (req, res) => {
    res.status(404).send(`Unknown path: ${req.path}`);
});

app.listen(3001, () => {
    console.log('Server is listening on port 3001');
});
