const axios = require('axios');

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
      calculateArbitrage(ratios);
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

  // Print results
  console.log('-------------------------------------------------------------------');
  console.log(`Starting Currency: ${INPUT_VOLUME}${INPUT_COIN} || Ratio: ${arbitrageInputRatio} ${ARBITRAGE_COIN}-${INPUT_COIN})`);
  console.log(`Traded To: ${arbitrageVolume}${ARBITRAGE_COIN} || Ratio: ${arbitrageOutputRatio} ${ARBITRAGE_COIN}-${OUTPUT_COIN}`);
  console.log(`Traded To: ${outputVolume}${OUTPUT_COIN} || Ratio: ${outputInputRatio} ${OUTPUT_COIN}-${INPUT_COIN}`);
  console.log(`End Result: ${newInputVolume}${INPUT_COIN}`);
  console.log(`${tradeStatus}!! Net Change: ${netChange}${INPUT_COIN} || %Change: ${netPctChange}%`);
  console.log('-------------------------------------------------------------------');
}

// On an interval at given delay, run API requests through currying function
function runMonitor(msDelay){
  setInterval(() => {
    let runCurry = ajaxCurry();

    for (let i = 0; i < RATIO_TYPES.length; i++){
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

runMonitor(1000);
