const express = require('express');
const axios = require('axios');
const { Parser } = require('json2csv');
require('dotenv').config();

const app = express();
const port = 3000;

const BASE_URL = 'https://api.getflow.com/v2/';
const HEADERS = {
    Authorization: `Bearer ${process.env.GETFLOW_TOKEN}`,
    Accept: 'application/json'
};  

// Middleware to parse JSON bodies
app.get('/', (req, res) => {
    res.send('Welcome to the GetFlow API wrapper. Use endpoints like /organizations or /projects/:id/tasks.');
});


// GET all lists
app.get('/lists', async (req, res) => {
    const orgId = req.query.organization_id;
    if (!orgId) {
        return res.status(400).send('Missing organization_id query parameter');
    }
    try {
        const response = await axios.get(`${BASE_URL}/lists?organization_id=${orgId}`, { headers: HEADERS });

        if (req.query.format == 'csv'){
            const parser = new Parser();
            const csv = parser.parse(response.data);
            res.header('Content-Type', 'text/csv');
            res.attachment('organizations.csv');
            return res.send(csv);
        }

        res.json(response.data);


    } catch (error) {
        console.error('Error fetching organizations:', error);
        res.status(500).send('Internal Server Error');
    }
});

// GET projects for a workspace
app.get('/teams/:teamId/projects', async (req, res) => {
    const { teamId } = req.params;
    try {
        const response = await axios.get(`${BASE_URL}/teams/${teamId}/projects`, { headers: HEADERS });

        if (req.query.format == 'csv'){
            const parser = new Parser();
            const csv = parser.parse(response.data);
            res.header('Content-Type', 'text/csv');
            res.attachment('projects.csv');
            return res.send(csv);
        }
        res.json(response.data);

    } catch (error) {
        console.error(`Error fetching projects for team ${teamId}:`, error);
        res.status(500).send('Internal Server Error');
    }
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
}); 
