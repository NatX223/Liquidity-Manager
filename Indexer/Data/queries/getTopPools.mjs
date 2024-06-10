import axios from 'axios';
import fs from 'fs';

const SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';

// Fetch the top 10 pools based on volumeUSD
const fetchTopPools = async () => {
  const query = `
    {
      pools(first: 5, orderBy: volumeUSD, orderDirection: desc) {
        id
        volumeUSD
      }
    }
  `;
  const response = await axios.post(SUBGRAPH_URL, { query });
  return response.data.data.pools;
};

// Main function to fetch, process, and save data for the top 10 pools
const main = async () => {
  const topPools = await fetchTopPools();
  console.log(topPools);

};

main().catch(error => {
  console.error('Error:', error);
});
