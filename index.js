const express = require('express');
const axios = require('axios');
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = 3000;

const BASE_URL = 'https://api.getflow.com/v2/';
const HEADERS = {
    Authorization: `Bearer ${process.env.GETFLOW_TOKEN}`,
    Accept: 'application/json'
};

app.get('/', (req, res) => {
    res.send('Welcome to the GetFlow API wrapper. Use endpoints like /tasks or /teams/:teamId/projects.');
});

// GET all tasks
app.get('/tasks', async (req, res) => {
    const orgId = req.query.organization_id;
    const downloadFiles = req.query.download_files === 'true';

    if (!orgId) {
        return res.status(400).send('Missing organization_id query parameter');
    }

    try {
        const response = await axios.get(`${BASE_URL}/tasks`, {
            headers: HEADERS,
            params: {
                organization_id: orgId,
                include: ['files', 'file_associations']
            }
        });

        const tasks = response.data.tasks;

        if (downloadFiles) {
            const downloadDir = path.join(__dirname, 'downloads');
            if (!fs.existsSync(downloadDir)) {
                fs.mkdirSync(downloadDir);
            }

            for (const task of tasks) {
                console.log(`Checking task: ${task.id} (${task.name || 'Unnamed'})`);

                if (task.files && task.files.length > 0) {
                    console.log(`Found ${task.files.length} file(s) attached to this task.`);

                    for (const file of task.files) {
                        console.log(`Preparing to download file: ${file.id} (${file.name || 'no name'})`);

                        const fileName = file.name || `${file.id}.bin`;
                        const filePath = path.join(downloadDir, fileName);

                        try {
                            // Fetch file metadata to get download_url
                            const fileResponse = await axios.get(`${BASE_URL}/files/${file.id}`, { headers: HEADERS });
                            const downloadUrl = fileResponse.data.download_url;

                            if (downloadUrl) {
                                const fileStream = fs.createWriteStream(filePath);
                                const downloadStream = await axios.get(downloadUrl, {
                                    responseType: 'stream',
                                    headers: HEADERS
                                });

                                await new Promise((resolve, reject) => {
                                    downloadStream.data.pipe(fileStream);
                                    fileStream.on('finish', resolve);
                                    fileStream.on('error', reject);
                                });

                                console.log(`Downloaded: ${fileName}`);
                            } else {
                                console.warn(`No download_url for file ${file.id}`);
                            }
                        } catch (fileErr) {
                            console.error(`Error downloading file ${file.id}:`, fileErr.message);
                        }
                    }
                }
            }
        }

        if (req.query.format === 'csv') {
            const parser = new Parser();
            const csv = parser.parse(tasks);
            res.header('Content-Type', 'text/csv');
            res.attachment('tasks.csv');
            return res.send(csv);
        }

        res.json(tasks);
    } catch (error) {
        console.error('Error fetching tasks or files:', error?.response?.data || error.message);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

