import express from 'express';
import cors from 'cors';
import { checkAuthorization } from './authorization';
import { BeginImplementingRequest } from '../data/api';
import { beginImplementingFeature, getStatusUpdatesForFeature, subscribeToFeature, unsubscribeFromFeature } from './implementFeature';
import { createServer } from 'http';
import Ws from 'ws';
import { Status } from '../data/feature';

const app = express();
const httpServer = createServer(app);
const webSocketServer = new Ws.Server({ server: httpServer });

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

webSocketServer.on("connect_error", (err) => {
    console.log(`connect_error due to ${err.message}`);
});

webSocketServer.on('connection', (socket) => {
    console.log('Client connected to websocket');
    let featureId: string | null = null;

    const statusListener = (status: Status) => {
        socket.send(JSON.stringify(status));
    };
    const completionListener = () => {
        socket.send('complete');
        socket.close();
    };

    socket.on('disconnect', () => {
        console.log('Client disconnected on websocket');
        if (featureId) {
            try {
                unsubscribeFromFeature(featureId, statusListener, completionListener);
            } catch (e) { }
        }
    });
    socket.on('message', (message) => {
        console.log('Message received: ', message.toString());
        if (featureId) {
            try {
                unsubscribeFromFeature(featureId, statusListener, completionListener);
            } catch (e) { }
        }
        featureId = message.toString();
        try {
            subscribeToFeature(featureId!, statusListener, completionListener);
            socket.send(JSON.stringify(getStatusUpdatesForFeature(featureId!)));
        } catch (e) {
            socket.send(JSON.stringify(e));
        }
    });
});

httpServer.listen(3001, () => {
    console.log('Server listening on port 3001');
});
