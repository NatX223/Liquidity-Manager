import argparse
import logging
import os
import pprint
from logging import getLogger
import requests
import json

from dotenv import load_dotenv

load_dotenv()

import numpy as np
from giza.agents import AgentResult, GizaAgent

from addresses import ADDRESSES
from lp_tools import get_tick_range
from uni_helpers import (approve_token, check_allowance, close_position,
get_all_user_positions, get_mint_params)

TAKUMI_AGENT_PASSPHRASE = os.environ.get("TAKUMI_AGENT_PASSPHRASE")
sepolia_rpc_url = os.environ.get("SEPOLIA_RPC_URL")

logging.basicConfig(level=logging.INFO)


def process_data(volumeUSDChange: float, volumeToken0Change: float, volumeToken1Change: float, tvlUSDChange: float, txCount: int, feesUSD: float):
    """
    Getting the processed data.
    The data needs to be scalled properly due to the nature of model and the input data

    The function takes in the various parameters that will be needed and constructs and array with them

    Returns:
        scaled_data.
    """

    feature_min = 0
    feature_max = 1

    scaled_data = []
    data_array = [[volumeUSDChange, volumeToken0Change, volumeToken1Change, tvlUSDChange, txCount, feesUSD]]

    with open('in_data.json', 'r') as file:
        json_data = json.load(file)
        data_min = json_data['min_vals']
        data_max = json_data['max_vals']
    
    for row in data_array:
        scaled_row = [
            ((value - data_min[i]) / (data_max[i] - data_min[i])) * (feature_max - feature_min) + feature_min
            for i, value in enumerate(row)
        ]
        scaled_data.append(scaled_row)
    
    X = np.array(scaled_data)
    
    return X

def get_data(poolAddress):
    """
    This function takes in a poolAddress whose txCount and fees will be prdicted by the model

    and endpoint is called to return the data although it is run locally
    """

    try:
        url = f"http://192.168.80.1:3300/getPoolDayData?poolAddress={poolAddress}"
        response = requests.get(url)

        if response.status_code == 200:
            data = response.json()

            volumeUSDChange = data.get('volumeUSDChange', None)
            volumeToken0Change = data.get('volumeToken0Change', None)
            volumeToken1Change = data.get('volumeToken1Change', None)
            tvlUSDChange = data.get('tvlUSDChange', None)
            txCount = data.get('txCount', None)
            feesUSD = data.get('feesUSD', None)

            if volumeToken0Change is not None and volumeToken1Change is not None:
                print(txCount, feesUSD)
                return (volumeUSDChange, volumeToken0Change, volumeToken1Change, tvlUSDChange, txCount, feesUSD)
            else:
                raise ValueError("Required fields are missing in the response")
        else:
            response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"HTTP Request failed: {e}")
    except ValueError as e:
        print(f"Error processing data: {e}")

def create_agent(
    model_id: int, version_id: int, chain: str, contracts: dict, account: str
):
    """
    Create a Giza agent for the txCount prediction model
    """
    agent = GizaAgent(
        contracts=contracts,
        id=model_id,
        version_id=version_id,
        chain=chain,
        account=account,
    )
    return agent


def predict(agent: GizaAgent, X: np.ndarray):
    """
    Predict the next day volatility.

    Args:
        X (np.ndarray): Input to the model.

    Returns:
        int: Predicted value.
    """
    prediction = agent.predict(input_feed={"val": X}, verifiable=True, job_size="L")
    print(prediction)
    return prediction


def get_pred_val(prediction: AgentResult):
    """
    Get the value from the prediction.

    Args:
        prediction (dict): Prediction from the model.

    Returns:
        int: Predicted value.
    """
    # This will block the executon until the prediction has generated the proof
    # and the proof has been verified
    return prediction.value[0][0]


# def moveLiquidity(
#     tokenA_amount: int,
#     tokenB_amount: int,
#     pred_model_id: int,
#     pred_version_id: int,
#     account="Takumi_Agent",
#     chain=f"ethereum:sepolia:{sepolia_rpc_url}",
#     nft_id=None,
# ):
#     logger = logging.getLogger("agent_logger")
#     nft_manager_address = ADDRESSES["NonfungiblePositionManager"][11155111]
#     tokenA_address = ADDRESSES["UNI"][11155111]
#     tokenB_address = ADDRESSES["WETH"][11155111]
#     pool_address_0 = "0x287B0e934ed0439E2a7b1d5F0FC25eA2c24b64f7"
#     pool_address_1 = "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640"
#     user_address = "0xCBB090699E0664f0F6A4EFbC616f402233718152"
#     pool_fee = 3000
#     logger.info("Fetching input data")

#     # Call the function to return data
#     (volumeUSDChange0, volumeToken0Change0, volumeToken1Change0, tvlUSDChange0, txCount0, feesUSD0) = get_data(pool_address_0)
#     (volumeUSDChange1, volumeToken0Change1, volumeToken1Change1, tvlUSDChange1, txCount1, feesUSD1) = get_data(pool_address_1)
#     logger.info(f"Input data: {volumeUSDChange0}, {volumeToken1Change0}")
    
#     # Call the function and get scaled data
#     scaled_data_0 = process_data(volumeUSDChange0, volumeToken0Change0, volumeToken1Change0, tvlUSDChange0, txCount0, feesUSD0)
#     scaled_data_1 = process_data(volumeUSDChange1, volumeToken0Change1, volumeToken1Change1, tvlUSDChange1, txCount1, feesUSD1)

#     contracts = {
#         "nft_manager": nft_manager_address,
#         "tokenA": tokenA_address,
#         "tokenB": tokenB_address,
#         "pool": pool_address_0,
#     }
    
#     agent = create_agent(
#         model_id=pred_model_id,
#         version_id=pred_version_id,
#         chain=chain,
#         contracts=contracts,
#         account=account,
#     )
    
#     result0 = predict(agent, scaled_data_0)
#     result1 = predict(agent, scaled_data_1)
    
#     predicted_value0 = get_pred_val(result0)
#     predicted_value1 = get_pred_val(result1)

#     logger.info(f"Predicted values: {predicted_value0} and {predicted_value1}")

#     if predicted_value0 >= predicted_value1:
#         logger.info("Predicted value0 is greater than or equal to predicted value1. No action taken.")
#         return

#     logger.info("Predicted value0 is less than predicted value1. Proceeding with liquidity adjustment.")
    
#     with agent.execute() as contracts:
#         logger.info("Executing contract")
#         if nft_id is None:
#             positions = [
#                 max(get_all_user_positions(contracts.nft_manager, user_address))
#             ]
#         else:
#             positions = [nft_id]
#         logger.info(f"Closing the following positions {positions}")
#         for nft_id in positions:
#             close_position(user_address, contracts.nft_manager, nft_id)
#         logger.info("Calculating mint params...")
#         _, curr_tick, _, _, _, _, _ = contracts.pool.slot0()
#         if not check_allowance(
#             contracts.tokenA, nft_manager_address, account, tokenA_amount
#         ):
#             approve_token(contracts.tokenA, nft_manager_address, tokenA_amount)
#         if not check_allowance(
#             contracts.tokenB, nft_manager_address, account, tokenB_amount
#         ):
#             approve_token(contracts.tokenB, nft_manager_address, tokenB_amount)
#         tokenA_decimals = contracts.tokenA.decimals()
#         tokenB_decimals = contracts.tokenB.decimals()
#         lower_tick, upper_tick = get_tick_range(
#             curr_tick, predicted_value, tokenA_decimals, tokenB_decimals, pool_fee
#         )
#         mint_params = get_mint_params(
#             user_address,
#             contracts.tokenA.address,
#             contracts.tokenB.address,
#             tokenA_amount,
#             tokenB_amount,
#             pool_fee,
#             lower_tick,
#             upper_tick,
#         )
#         # step 5: mint new position
#         logger.info("Minting new position...")
#         contract_result = contracts.nft_manager.mint(mint_params)
#         logger.info("SUCCESSFULLY MINTED A POSITION")
#         logger.info("Contract executed")

#     logger.info(f"Contract result: {contract_result}")
#     pprint.pprint(contract_result.__dict__)
#     logger.info("Finished")


if __name__ == "__main__":
    # Create the parser
    parser = argparse.ArgumentParser()

    # # Add arguments
    parser.add_argument("--model-id", metavar="M", type=int, help="model-id")
    parser.add_argument("--version-id", metavar="V", type=int, help="version-id")
    # parser.add_argument("--tokenA-amount", metavar="A", type=int, help="tokenA-amount")
    # parser.add_argument("--tokenB-amount", metavar="B", type=int, help="tokenB-amount")

    # # Parse arguments
    args = parser.parse_args()

    MODEL_ID = args.model_id
    VERSION_ID = args.version_id
    # tokenA_amount = args.tokenA_amount
    # tokenB_amount = args.tokenB_amount

    # rebalance_lp(tokenA_amount, tokenB_amount, MODEL_ID, VERSION_ID)
    poolAddress = "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640"
    
    # Call the function to return data
    (volumeUSDChange, volumeToken0Change, volumeToken1Change, tvlUSDChange, txCount, feesUSD) = get_data(poolAddress)
    print(volumeToken0Change, volumeToken1Change)
    # Call the function and get scaled data
    scaled_data = process_data(volumeUSDChange, volumeToken0Change, volumeToken1Change, tvlUSDChange, txCount, feesUSD)
    
    nft_manager_address = ADDRESSES["NonfungiblePositionManager"][11155111]
    tokenA_address = ADDRESSES["UNI"][11155111]
    tokenB_address = ADDRESSES["WETH"][11155111]
    pool_address = "0x287B0e934ed0439E2a7b1d5F0FC25eA2c24b64f7"
    user_address = "0xCBB090699E0664f0F6A4EFbC616f402233718152"
    account="Takumi_Agent"
    chain=f"ethereum:sepolia:{sepolia_rpc_url}"
    contracts = {
        "nft_manager": nft_manager_address,
        "tokenA": tokenA_address,
        "tokenB": tokenB_address,
        "pool": pool_address,
    }
    agent = create_agent(
        model_id=MODEL_ID,
        version_id=VERSION_ID,
        chain=chain,
        contracts=contracts,
        account=account,
    )
    result = predict(agent, scaled_data)
    print
    predicted_value = get_pred_val(result)
    # print(predicted_value)