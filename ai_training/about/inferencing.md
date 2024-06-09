## The inferencing procedure for the AI
1. Copy all the json files under the folder "processing" i.e in_processing.json and out_processing.json into you node project folder
2. Load all the json files 
   ```javascript
   // Used for processing the data that goes into the model
   const input_processing_data = require('in_processing.json')
   // Used for processing the data that comes out of the model
   const output_processing_data = require('out_processing.json')
   ```
3. Define the function to process the input and output
   ---
   **Note**
   the input should be put in the following order
   ```javascript
   // example data
   const input_data = 
   [
    // volumeUSDChange
    1.1 ,
    // volumeTokenChange
    7.8,
    // volumeToken1Change
    -40444,
    // tvlUSDChagne
    1.345,
    // txCount
    6112,
    // feesUSD
    71218
   ]
   ```
   ---

   The following function then scales the input_data appropriately
   ```javascript
   // the function to scale the input
    function minMaxScale(data, dataMin, dataMax, featureMin = 0, featureMax = 1) {
        return data.map(row => 
            row.map((value, i) => 
                ((value - dataMin[i]) / (dataMax[i] - dataMin[i])) * (featureMax - featureMin) + featureMin
            )
        );
    }

     // this function puts the output of the model back to the original format of the data
    function inverseMinMaxScale(scaledData, dataMin, dataMax, featureMin = 0, featureMax = 1) {
        return scaledData.map(row => 
            row.map((value, i) => 
                ((value - featureMin) / (featureMax - featureMin)) * (dataMax[i] - dataMin[i]) + dataMin[i]
            )
        );
    }

   ```

4. Everything put together
   ```javascript
    const scaledInputData = inMinMaxScale(input_data,input_processing_data.min_vals,input_processing_data.max_vals)
    // pass the scaled data to the model
    const modelOutput = runOnnxModelApi(scaledData)
    // run the inverse function to put the model output to the original form
    const output = inverseMinMaxScale(modelOutput,output_processing_data.min_vals,output_processing_data.max_vals)
    // Note: the model output would give the output in the following order
    // sample output
    [
        // txCount
        5947,
        // feesUSD
        7136
    ]
   ```
   