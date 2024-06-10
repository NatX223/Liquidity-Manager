const express = require("express");
const cors = require('cors');
const axios = require('axios');
const ethers = require('ethers');
require('dotenv').config();

// initializing firebase
const admin = require('firebase-admin');
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');

// const serviceAccount = JSON.parse(process.env.FIREBASE_CRED);

// initializeApp({
//     credential: cert(serviceAccount),
// });

// const db = getFirestore();

const app = express();
const port = process.env.PORT || 3300;

app.use(cors({
  origin: '*',
  credentials: true,
}));

app.use(express.json());

const startServer = async () => {
    app.listen(port, "0.0.0.0", () => {
        console.log(`Example app listening on port ${port}`);
    });
};

app.get("/", (req, res) => {
    res.send("Hello Takumi!");
});

app.get("/getPoolDayData", async(req, res) => {
    const poolAddress = req.query.poolAddress;

    const params = await getParams(poolAddress);

    res.status(200).json(params);
});

const getParams = async(contractAddress) => {
    const poolData = [];

    const currentDate = 1717804800; // static date in milliseconds
    const previousDate = 1717718400; // static date in milliseconds

    const dayData0 = await fetchPoolDayData(contractAddress, previousDate);
    const dayData1 = await fetchPoolDayData(contractAddress, currentDate);

    poolData.push(dayData0, dayData1);

    const sortedPoolData = poolData.sort((a, b) => a.date - b.date);
    const processedData = processPoolData(sortedPoolData);

    console.log(processedData);
    return(processedData);
}

// const getPredictions = async(contractAddress) => {
    
// }

// run endpoint
// compare result
// get the best pool

const processPoolData = (poolData) => {
  
    const prevDay = poolData[0];
    const currDay = poolData[1];

    const processedData = {
    volumeUSDChange: currDay.volumeUSD - prevDay.volumeUSD,
    volumeToken0Change: currDay.volumeToken0 - prevDay.volumeToken0,
    volumeToken1Change: currDay.volumeToken1 - prevDay.volumeToken1,
    tvlUSDChange: currDay.tvlUSD - prevDay.tvlUSD,
    txCount: Number(currDay.txCount),
    feesUSD: Number(currDay.feesUSD),
    };
  
    return processedData;
};

const fetchPoolDayData = async (poolId, date) => {
    const SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';
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
    return response.data.data.poolDayDatas[0]; // Return the first (and only) result
};

startServer();