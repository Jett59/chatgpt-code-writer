import express from 'express';
import cors from 'cors';

let app = express();

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(3001, () => {
    console.log('Server is listening on port 3001');
});
