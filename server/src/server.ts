import app from './app.js';
import process from 'node:process';

const port = Number(process.env.PORT || 3001);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
