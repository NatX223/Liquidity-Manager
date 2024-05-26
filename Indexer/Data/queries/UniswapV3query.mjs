import axios from 'axios';
import fs from 'fs';

const SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';

// Fetch the top 10 pools based on volumeUSD
const fetchTopPools = async () => {
  const query = `
    {
      pools(first: 10, orderBy: volumeUSD, orderDirection: desc) {
        id
        volumeUSD
      }
    }
  `;
  const response = await axios.post(SUBGRAPH_URL, { query });
  return response.data.data.pools;
};

// Fetch the pool day data for a specific pool and date
const fetchPoolDayData = async (poolId, date) => {
  const query = `
    {
      poolDayDatas(where: { pool: "${poolId}", date: ${date} }) {
        date
        volumeUSD
        volumeToken0
        volumeToken1
        tvlUSD
        txCount
        feesUSD
      }
    }
  `;
  const response = await axios.post(SUBGRAPH_URL, { query });
  console.log(response.data);
  return response.data.data.poolDayDatas[0]; // Return the first (and only) result
};

// Process the pool day data to calculate daily changes
const processPoolData = (poolData) => {
  const processedData = [];

  for (let i = 1; i < poolData.length; i++) {
    const prevDay = poolData[i - 1];
    const currDay = poolData[i];

    processedData.push({
      date: currDay.date,
      volumeUSDChange: currDay.volumeUSD - prevDay.volumeUSD,
      volumeToken0Change: currDay.volumeToken0 - prevDay.volumeToken0,
      volumeToken1Change: currDay.volumeToken1 - prevDay.volumeToken1,
      tvlUSDChange: currDay.tvlUSD - prevDay.tvlUSD,
      txCount: currDay.txCount,
      feesUSD: currDay.feesUSD,
    });
  }

  return processedData;
};

// Write the processed data to a CSV file
const writeCSV = (data, filename) => {
  const header = 'date,volumeUSDChange,volumeToken0Change,volumeToken1Change,tvlUSDChange,txCount,feesUSD\n';
  const rows = data.map(row => `${row.date},${row.volumeUSDChange},${row.volumeToken0Change},${row.volumeToken1Change},${row.tvlUSDChange},${row.txCount},${row.feesUSD}`).join('\n');

  fs.writeFileSync(filename, header + rows);
};

// Main function to fetch, process, and save data for the top 10 pools
const main = async () => {
  const topPools = await fetchTopPools();
  console.log(topPools);

  const endDate = 1716681600;
  const startDate = endDate - (101 * 86400); // 101 days ago

  const allData = [];

  for (const pool of topPools) {
    const poolData = [];

    for (let i = 0; i < 100; i++) {
      const date = startDate + (i * 86400);
      console.log(date);
      const dayData = await fetchPoolDayData(pool.id, date);
      console.log(dayData);
      if (dayData) {
        poolData.push(dayData);
      }
    }

    console.log(`Pool ${pool.id} - fetched data: `, poolData);

    if (poolData.length > 0) {
      const sortedPoolData = poolData.sort((a, b) => a.date - b.date);
      const processedData = processPoolData(sortedPoolData);
      allData.push(...processedData);
    }
  }

  console.log('All processed data: ', allData);

  const filename = `all_pools_data.csv`;
  writeCSV(allData, filename);
  console.log(`Data for all pools written to ${filename}`);
};

main().catch(error => {
  console.error('Error:', error);
});
