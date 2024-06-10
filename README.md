# Takumi

live link - 

> ## Table of Contents

-   [Problem Statement](#Problem-statement)
-   [Solution](#Solution)
-   [Model Building](#Model-Building)
    -   [Training Data Collection](#Training-Data-Collection)
    -   [Data Analysis](#Data-Analysis)
    -   [Data Preparation](#Data-Preparation)
    -   [Model training](#Model-Training)
    -   [Model Testing](#Model-Testing)
-   [Giza](#Giza)
    -   [Setup](#Setup)
    -   [Transpiling The Model](#Transpiling-The-Model)
    -   [Endpoint Deployment](#Endpoint-Deployment)
    -   [Agent Creation](#Agent-Creation)
-   [Agent Architecture](#Agent-Architecture)
-   [Agent Business Case](#Agent-Business-Case)
-   [Agent Functionality](#Agent-Functionality)
-   [Possible Improvements](#Possible-Improvements)

#

> ## Problem-statement

Problem Statement: Liquidity providers in decentralized finance struggle to identify high-yield pools due to market volatility, data complexity, and the risk of low activity pools generating minimal returns. Additionally, rapid market changes require real-time decision-making and adaptability to optimize yields effectively. Advanced analytical tools and dynamic yield optimization strategies are needed to address these challenges.

> ## Solution

Solution: An AI agent utilizes real-time data analysis and reinforcement learning to identify and invest in liquidity pools with the highest yield potential. By continuously monitoring market conditions and learning from past performance, the agent optimizes liquidity allocation, ensuring maximum returns for users. This dynamic approach mitigates the risk of inactive pools and enhances overall yield efficiency.

> ## Model Building

-   ### **Training Data Collection**

    In order to train the model data is needed and the data selceted for the training needs to be in line(corelated) with the fees that can be earned in a pool. The selected parameters that were used are as follows.
    1. date
    2. volumeUSDChange(24hr)
    3. volumeToken0Change(24hr)
    4. volumeToken1Change(24hr)
    5. tvlUSDChange(24hr)
    6. txCount(24hr)
    7. feesUSD(24hr)

    To get the data we had to query the Uniswap V3 subgraph for poolDayData, the code below shows a function to run a sample query:
    ```javascript
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
    return response.data.data.poolDayDatas[0];
    };
    ```

    The queried data still had to go through some processing to get the values we need to do that we wrote this function:
    ```javascript
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
    ```

    We then queried 100 days of the top 10 pools on uniswap based on trading volume and wrote them all to a csv file which can be found [here](https://github.com/NatX223/Liquidity-Manager/blob/main/Indexer/Data/queries/PoolData.csv).
    The complete code to the data collection script can be found [here](https://github.com/NatX223/Liquidity-Manager/blob/main/Indexer/Data/queries/UniswapV3query.mjs)

    To run the above script locally, clone the repo, cd into the Indexer/Data folder then run the following command
    ```bash
    npm install
    # or
    yarn add
    ```
    then simply run this command
    ```bash
    node UniswapV3query.mjs
    ```

-   ### **Data Analysis**

    The first step in the training process was to read and analyze the data which was scraped from on chain events and put into a csv format. The data is read using the popular pandas framework. Below are some general information about the data.

    <class 'pandas.core.frame.DataFrame'>
    RangeIndex: 990 entries, 0 to 989
    Data columns (total 7 columns):
    | Column              | Non-Null Count | Dtype   |
    |---------------------|----------------|---------|
    | date                | 990            | int64   |
    | volumeUSDChange     | 990            | float64 |
    | volumeToken0Change  | 990            | float64 |
    | volumeToken1Change  | 990            | float64 |
    | tvlUSDChange        | 990            | float64 |
    | txCount             | 990            | int64   |
    | feesUSD             | 990            | float64 |
    dtypes: float64(5), int64(2)
    memory usage: 54.3 KB

    we can that there are seven columns in total  with about 990 columns. All the columns are quantitative variables as such we can use a scatter plot to visualize their relationship ( correlation ) with each other.

    Using seaborns pairplot function we can see the correlation between pairs of different column combinations.

    ![alt text](image-6.png)

    We also use a heat map to get a more detailed look between
    the correlation of columns

    ![alt text](image.png)

    From the heat map we can see that date has the worst correlation with the other columns than any other column as such we drop it from the data frame.

    The data analysis notebook can be found [here](https://github.com/NatX223/Liquidity-Manager/blob/main/ai_training/pool_data_analysis.ipynb)

-   ### **Data Preparation**
    ⦁	The data is scaled using a min max scaler
    Transform features by scaling each feature to a given range.
    This estimator scales and translates each feature individually such that it is in the given range on the training set, e.g. between zero and one.
    ⦁	We then create prediction sequences where all the columns in row N would be used to predict ( txCount , feesUSD) in row N+1.
    ⦁	The data is the split into 90% training and 10% validation.

-   ### **Data Training**
    The model is a multilayer perceptron linear model and has the following specs
    ⦁	it has 6 input units matching the number of columns in our data
    ⦁	it has 6 hidden units
    ⦁	the output has 2 units to represent the two columns the model would be predicting in the next row of data

-   ### **Model Testing**
    After training the model on the training data we test its performance on the validation data ( data it has not been trained on).
    The model got a loss of 0.0012 ( MEAN SQUARED ERROR ) 
    We also visualize how well the model predicts the data using a graph

    ![alt text](image-1.png)

    ![alt text](image-2.png)

    From the graphs we can see the  prediction of txCount and feesUSD by the model labelled in green vs the actual ones in orange sampled from the dataset and the model seems to perform quite well.

> ## Giza

-   ### **Setup**
    The first step taken was creating a python virtual environment then the Giza SDK was installed using the following command
    ```bash
    pip install giza-sdk
    ```
    next we installed the Giza CLI with
    ```bash
    pip install giza-cli
    ```
    we also installed the agents sdk using
    ```bash
    pip install giza-agents
    ```
    We then created a user account with the
    ```bash
    giza users create
    ```
    the next step was to login in to the account with the command
    ```bash
    giza users login
    ```
    We also created an API key with the command below
    ```bash
    giza users create-api-key
    ```

-   ### **Transpiling The Model**

    Since the model had already been built and trained, what we did next was to convert it to an ONNX model so that it will be accepted by Giza when transpiling, this was done with the following command:
    ```bash
    giza transpile models/linear_pool_model.onnx --output-path models
    ```
    A snapshot of the command and the output is given below:

    ![alt text](image-3.png)

    The model has the following details
    model id - 705
    version id - 1

-   ### **Endpoint Deployment**

    We next deployed the model and got back an endpoint that will be later used in the backend for getting inferences.
    This was accomplished using the following command:
    ```bash
    giza endpoints deploy --model-id 705 --version-id 1
    ```
    A snapshot of the command and the output is given below:

    ![alt text](image-4.png)

    The endpoint has the following details
    endpoint id - 275

-   ### **Agent Creation**

    In order to use the Giza agent an Ape account is needed and we created one using the following command
    ```bash
    ape accounts generate <account name>
    ```
    and provided the necessary details

    The next thing we did was to create the agent using the command:
    ```bash
    giza agents create --model-id <model_id> --version-id <version_id> --name <agent_name> --description <agent_description>
    ```
    A snapshot of the command and the output is given below:

    ![alt text](image-5.png)

    The agent has the following details
    agent id - 77

    To get inferences using the agent we need to write a script for that.
    But before that we need to call some functions in order to fetch the data that will be used as inputs and prepare(scale) the data as well.
    a local endpoint was created to call a subgraph and it returns the needed data for a specific pool, the code to that function can be found [here](https://github.com/NatX223/Liquidity-Manager/blob/main/backend/index.js)

    The next step was to scale the data inorder for it to be accepted by the model
    
    We next got the result of the prediction and just as we did with the input data we also had to rescale the output(inference of the model)

    The best pool to provide liquidity to is choosen by comparing the values of the inferences of various pools.

    If the current pool that liquidity is placed in is still the best suited pool based on the inferences of the model, then no action is taken but if it is another pool, the liquidity in the current pool is removed and the tokens converted to that of the best pool and a liquidity position is open for the best suited pool.

    The code for the above description can be found [here](https://github.com/NatX223/Liquidity-Manager/blob/main/liquidity_manager_agent/agent/action_agent.py)

    In order to run the above code locally, you need to clone the repo and install the needed packages
    to run the backend, cd into backend folder and run the following command
    ```bash
    npm run start
    ```

> ## Agent Architecture
    
The agent has been explained in the section above, The architecture of the agent and it's design is given below:

![alt text](Agent_Design.drawio.png.png)

> ## Agent Business Case

Purpose of the AI Agent:
The AI agent is designed to optimize yield farming by periodically evaluating and selecting the most profitable liquidity pools. By leveraging advanced algorithms and real-time data analysis, the agent can identify pools with the highest potential returns. This allows users to maximize their earnings without the need for constant monitoring and manual adjustments.

Problem it Solves:
1. Complexity and Time-Consumption:
Yield farming involves complex strategies and requires continuous monitoring of multiple liquidity pools to ensure optimal returns. This process can be time-consuming and difficult for individual investors to manage effectively.

2. Market Volatility:
Cryptocurrency markets are highly volatile, with liquidity pool performance fluctuating rapidly. Without the ability to quickly adapt to these changes, investors may miss out on high-yield opportunities or incur losses.

How the AI Agent Addresses These Issues:
1. Automated Optimization:
The AI agent automates the process of identifying and investing in the most profitable liquidity pools, saving users time and reducing the complexity involved in yield farming.

2. Real-Time Data Analysis:
By continuously analyzing market data and pool performance, the AI agent can quickly respond to changes and adjust investments to ensure maximum returns.

Overall, the AI agent simplifies yield farming, making it accessible and profitable for a wider range of users, from individual investors to large-scale stakeholders.

> ## Agent Functionality

Automated Pool Selection
The AI agent continuously scans various liquidity pools to identify those with the highest potential returns.
It evaluates multiple factors such as historical performance, current market trends, and volatility to make informed decisions.

Yield Optimization
The agent automatically reallocates assets to the most profitable pools based on real-time data analysis.
It ensures optimal yield farming strategies without requiring user intervention.

Performance Tracking:
The AI agent tracks the performance of each investment, providing detailed reports on returns and pool dynamics.
Users can view historical data and performance metrics to assess the effectiveness of the agent's strategies.

> ## Possible Improvements

Multi-Chain Support: Enabling the agent to operate across multiple blockchains to diversify opportunities
and mitigate risks associated with a single network.

Model retraining: Using a larger dataset to further train the model, the new dataset would be cleaner and also less noisy. Other variables can also be taken into account (increasing dimensions)

