const express = require('express');
const axios = require('axios');
const { Client } = require('pg');
const cors=require('cors');
const dotenv=require('dotenv');
dotenv.config();
// PostgreSQL database configuration
const dbConfig = {
  user: 'postgres',
  password: process.env.PASSWORD,
  host: 'localhost',
  port: 5432,
  database: 'hodinfo'
};

const app = express();
app.use(cors());

// Connect to PostgreSQL database
const client = new Client(dbConfig);
client.connect();

// Create a table for storing API data if it doesn't exist
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS tickers (
    name TEXT,
    last FLOAT,
    buy FLOAT,
    sell FLOAT,
    volume FLOAT,
    base_unit TEXT
  );
`;
client.query(createTableQuery, (err) => {
  if (err) {
    console.error('Error creating table:', err);
  }
});

app.get('/fetch-data', async (req, res) => {
  try {
    // Fetch data from the API
    const response = await axios.get('https://api.wazirx.com/api/v2/tickers');
    const tickers = response.data;

    // Extract the top 10 results
    const top10Tickers = Object.values(tickers).slice(0, 10);

    // Prepare the data for insertion into the database
    const insertData = top10Tickers.map((ticker) => [
      ticker.name,
      ticker.last,
      ticker.buy,
      ticker.sell,
      ticker.volume,
      ticker.base_unit
    ]);

    // Insert the data into the database
    const insertQuery = `
      INSERT INTO tickers (name, last, buy, sell, volume, base_unit)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    await client.query('BEGIN');
    await Promise.all(
      insertData.map((data) => client.query(insertQuery, data))
    );
    await client.query('COMMIT');

    res.status(200).json({ message: 'Data stored successfully.' });
  } catch (error) {
    console.error('Error fetching and storing data:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


app.get('/data', async (req, res) => {
    try {
      // Fetch data from the database
      const query = 'SELECT name, last, buy, sell, volume, base_unit FROM tickers';
      const result = await client.query(query);
  
      // Send the fetched data to the frontend
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error fetching data:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  });


app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
