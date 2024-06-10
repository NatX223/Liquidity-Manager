const axios = require('axios');
const input_processing_data = require('./in_processing.json');
const output_processing_data = require('./out_processing.json');

function minMaxScale(data, dataMin, dataMax, featureMin = 0, featureMax = 1) {
    return data.map((value, i) => 
        ((value - dataMin[i]) / (dataMax[i] - dataMin[i])) * (featureMax - featureMin) + featureMin
    );
}

async function makePostRequest() {
    const Data = [-119053683.00231639, -119052866.340173, -31384.291418553745, 633021.0262829065, 5644, 44045.124522626843660762062919622];
    const inputData = minMaxScale(Data, input_processing_data.min_vals, input_processing_data.max_vals);
    const jsonData = JSON.stringify([inputData]);
    // console.log(jsonData);
    const url = 'https://endpoint-natx-705-1-ba519d61-7i3yxzspbq-ew.a.run.app';
    const data = {
        args: jsonData
    };
    console.log(data);

  try {
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer XPkT42rODedx6Z0xlnXYEA'
      }
    });
    console.log(response.data);
  } catch (error) {
    if (error.response) {
      console.error('Error response:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('Error request:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
  }
}

makePostRequest();