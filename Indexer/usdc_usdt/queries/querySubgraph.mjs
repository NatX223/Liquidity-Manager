// File: querySubgraph.js

import fetch from 'node-fetch';
import fs from 'fs';

const SUBGRAPH_URL = 'https://api.studio.thegraph.com/query/75654/usdc_usdt/v0.0.2';

const query = `
query getVolumeAndReservesAtTimestamp($timestamp: BigInt!) {
  volumes(first: 1, orderBy: timestamp, orderDirection: desc, where: { timestamp_lte: $timestamp }) {
    id
    timestamp
    volumeToken0
    volumeToken1
  }
  reserves(first: 1, orderBy: timestamp, orderDirection: desc, where: { timestamp_lte: $timestamp }) {
    id
    timestamp
    reserve0
    reserve1
  }
}
`;

async function fetchData(timestamp) {
  try {
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        variables: { timestamp }
      })
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    const data = await response.json();
    const combinedData = combineData(data.data);
    return combinedData;
  } catch (error) {
    console.error('Error fetching data:', error);
    return null;
  }
}

function combineData(data) {
  const { volumes, reserves } = data;

  if (volumes.length === 0 || reserves.length === 0) {
    return [];
  }

  const volume = volumes[0];
  const reserve = reserves[0];

  return {
    timestamp: volume.timestamp,
    volumeToken0: volume.volumeToken0,
    volumeToken1: volume.volumeToken1,
    reserve0: reserve.reserve0,
    reserve1: reserve.reserve1
  };
}

async function runQueries(startTimestamp, interval, count) {
  let timestamp = startTimestamp;
  const results = [];

  for (let i = 0; i < count; i++) {
    const data = await fetchData(timestamp);
    if (data) {
      results.push(data);
    }
    timestamp += interval;
  }

  return results;
}

async function writeToCSV(data) {
  const headers = Object.keys(data[0]).join(',') + '\n';
  const rows = data.map(obj => Object.values(obj).join(',')).join('\n');
  const csv = headers + rows;
  
  fs.writeFileSync('data.csv', csv);
  console.log('CSV file created: data.csv');
}

// Example usage with a specific start timestamp
const startTimestamp = 1591808694; // Replace with your desired start timestamp
const interval = 6 * 60 * 60; // 6 hours in seconds
const count = 100;

runQueries(startTimestamp, interval, count)
  .then(data => writeToCSV(data))
  .catch(error => console.error('Error:', error));
