const axios = require('axios');
const fs = require('fs');

// Constants
const INPUT_COIN = 'BTC'; // Starting currency
const OUTPUT_COIN = 'NEO'; // End currency to trade back for starting currency
const ARBITRAGE_COIN = 'DBC'; // Currency bought with start and traded for end currency
const TRADING_FEE_PCT = 0.1; // Kucoin trading fee = 0.1%
const INPUT_VOLUME = 1; // Test volume, number of input coins to start
const REQUEST_RATE = 1000; //ms
const RATIO_TYPES = ['arbitrageInput', 'arbitrageOutput', 'outputInput'];

// URIs
const uris = {
  'arbitrageInputURI': `https://api.kucoin.com/v1/open/tick?symbol=${ARBITRAGE_COIN}-${INPUT_COIN}`,
  'arbitrageOutputURI': `https://api.kucoin.com/v1/open/tick?symbol=${ARBITRAGE_COIN}-${OUTPUT_COIN}`,
  'outputInputURI': `https://api.kucoin.com/v1/open/tick?symbol=${OUTPUT_COIN}-${INPUT_COIN}`
};

// Currying function for running asynchronous API requests
// Runs calculation function after all responses have been received
function ajaxCurry() {
  const ratios = {};

  function _curriedFn(response) {
    // if (!RATIO_TYPES.includes(ratioType)) return console.log("Error: ratioType not found");    
    ratios[response['ratioType']] = response['ratio'];

    // Run calculate after all 3 responses come back
    if (Object.keys(ratios).length === 3) {
      const data = calculateArbitrage(ratios);
      runLogger(data);
    }
    else { 
      return _curriedFn;
    }
  }

  return _curriedFn;
}

function calculateArbitrage(ratios){  
  // Constants
  const arbitrageInputRatio = ratios['arbitrageInput'];
  const arbitrageOutputRatio = ratios['arbitrageOutput'];
  const outputInputRatio = ratios['outputInput'];
  const netAfterFeeFactor = 1 - (TRADING_FEE_PCT / 100);

  // Calculations
  const arbitrageVolume = INPUT_VOLUME / arbitrageInputRatio * netAfterFeeFactor;
  const outputVolume = arbitrageVolume * arbitrageOutputRatio * netAfterFeeFactor;
  const newInputVolume = outputVolume * outputInputRatio * netAfterFeeFactor;
  const netChange = newInputVolume - INPUT_VOLUME;
  const netPctChange = netChange / INPUT_VOLUME * 100;
  const tradeStatus = newInputVolume > 1 ? 'PROFIT' : 'LOSS';

  return {
    arbitrageInputRatio,
    arbitrageOutputRatio,
    outputInputRatio,
    arbitrageVolume,
    outputVolume,
    newInputVolume,
    netChange,
    netPctChange,
    tradeStatus
  };
}

function runLogger(data){
  // Print results
  console.log('-------------------------------------------------------------------');
  console.log(`Starting Currency: ${INPUT_VOLUME}${INPUT_COIN} || Ratio: ${data.arbitrageInputRatio} ${ARBITRAGE_COIN}-${INPUT_COIN}`);
  console.log(`Traded To ${ARBITRAGE_COIN}: ${data.arbitrageVolume}${ARBITRAGE_COIN} || Ratio: ${data.arbitrageOutputRatio} ${ARBITRAGE_COIN}-${OUTPUT_COIN}`);
  console.log(`Traded To ${OUTPUT_COIN}: ${data.outputVolume}${OUTPUT_COIN} || Ratio: ${data.outputInputRatio} ${OUTPUT_COIN}-${INPUT_COIN}`);
  console.log(`End Result ${INPUT_COIN}: ${data.newInputVolume}${INPUT_COIN}`);
  console.log(`${data.tradeStatus}!! Net Change: ${data.netChange}${INPUT_COIN} || %Change: ${data.netPctChange.toFixed(2)}%`);
  console.log('-------------------------------------------------------------------');

  
  const writeOutput = `${currentDate()} => ${data.netPctChange.toFixed(2)}%\n`;
  fs.appendFile('historical_data.txt', writeOutput, err => {
    if (err) console.log("Error writing to file...");
  });
}

function processInput(text) {
  fs.open('H://log.txt', 'a', 666, function (e, id) {
    fs.write(id, text + os.EOL, null, 'utf8', function () {
      fs.close(id, function () {
        console.log('file is updated');
      });
    });
  });
}




// On an interval at given delay, run API requests through currying function
function monitor(msDelay){
  setInterval(() => {
    let runCurry = ajaxCurry();
    const arbitrageInputURI = uris['arbitrageInputURI'];
    const arbitrageOutputURI = uris['arbitrageOutputURI'];
    const outputInputURI = uris['outputInputURI'];

    // First trade: Trade input coin and buy arbitrage coin, EX: BTC to DBC
    axios.get(arbitrageInputURI).then(response => {
      // For instant transaction, buy at ask price = lowest seller price
      const ratio = response['data']['data']['sell'];
      runCurry({ 'ratioType': 'arbitrageInput', ratio });
    });

    // Second trade: Trade arbitrage coin for output coin, EX: DBC to NEO
    axios.get(arbitrageOutputURI).then(response => {
      // For instant transaction, sell at bid price = highest buyer price
      const ratio = response['data']['data']['buy'];
      runCurry({ 'ratioType': 'arbitrageOutput', ratio });
    });

    // Last trade: Trade output coin back to input coin, EX: NEO back to BTC
    axios.get(outputInputURI).then(response => {
      // For instant transaction, sell at bid price = highest buyer price
      const ratio = response['data']['data']['buy'];
      runCurry({ 'ratioType': 'outputInput', ratio });
    });
  }, msDelay);
}

// Uses last trade price for ratios
function monitorLastPrice(msDelay) {
  setInterval(() => {
    let runCurry = ajaxCurry();

    for (let i = 0; i < RATIO_TYPES.length; i++) {
      const ratioType = RATIO_TYPES[i];
      const uri = uris[`${ratioType}URI`];
      axios.get(uri).then(response => {
        const ratio = response['data']['data']['lastDealPrice'];
        const data = {
          ratioType,
          ratio
        };

        runCurry(data);
      });
    }
  }, msDelay);
}

function currentDate(){
  const dateTime = new Date();
  const day = dateTime.getDate();
  const month = dateTime.getMonth();
  const year = dateTime.getFullYear();
  const hour = dateTime.getHours();
  const minutes = dateTime.getMinutes();
  const seconds = dateTime.getSeconds();

  return `${month}/${day}/${year} ${hour}:${minutes}:${seconds}`;
}

monitor(REQUEST_RATE);
// monitorLastPrice(REQUEST_RATE);