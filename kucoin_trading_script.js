const axios = require('axios');

// Constants
const INPUT_COIN = 'BTC';
const OUTPUT_COIN = 'NEO';
const ARBITRAGE_COIN = 'DBC';
const TRADING_FEE_PCT = 0.1;
const INPUT_VOLUME = 1;
const requestRate = 1000; //ms

// URIs
const arbitrageInputURI = `https://api.kucoin.com/v1/open/tick?symbol=${arbitrageCoin}-${inputCoin}`;
const arbitrageOutputURI = `https://api.kucoin.com/v1/open/tick?symbol=${arbitrageCoin}-${outputCoin}`;
const outputInputURI = `https://api.kucoin.com/v1/open/tick?symbol=${outputCoin}-${inputCoin}`;

// Ex: ETH/BTC, ETH = base, BTC = quote
function getRatio(baseCoin, quoteCoin) {
  const uri = `https://api.kucoin.com/v1/open/tick?symbol=${baseCoin}-${quoteCoin}`;
  axios.get(uri).then((response) => {
    const ratio = response['data']['data']['lastDealPrice'];
  });
}

// Run all 3 HTTP requests asynchronously
// Wait until all 3 responses come back before running calculation function
function ajaxCurry() {
  const ratios = {};

  function _curriedFn(ratioType, baseCoin, quoteCoin) {
    const types = ['arbitrageInput', 'arbitrageOutput', 'outputInput'];
    if (!types.includes(ratioType)) return console.log("Error: ratioType not found");

    const uri = `https://api.kucoin.com/v1/open/tick?symbol=${baseCoin}-${quoteCoin}`;
    axios.get(uri).then((response) => {
      const ratio = response['data']['data']['lastDealPrice'];
      const tradingPair = `${baseCoin}-${quoteCoin}`;
      const data = {
        tradingPair,
        ratio
      };

      ratios[ratioType] = data; 
    });
  }

  // Run calculate after all 3 responses come back
  if (Object.keys(ratios).length === 3) {
    calculateArbitrage(ratios);
  }
  else { 
    return _curriedFn;
  }
}

function calculateArbitrage(ratios){
  // constants
  const arbitrageInputRatio = ratios['arbitrageInput']['ratio'];
  const arbitrageOutputRatio = ratios['arbitrageOutput']['ratio'];
  const outputInputRatio = ratios['outputInput']['ratio'];
  const netAfterFeeFactor = 1 - (tradingFeePct / 100);

  // calculations
  const arbitrageVolume = INPUT_VOLUME / arbitrageInputRatio * netAfterFeeFactor;
  const outputVolume = arbitrageVolume * arbitrageOutputRatio * netAfterFeeFactor;
  const newInputVolume = outputVolume * outputInputRatio * netAfterFeeFactor;
  const netChange = newInputVolume - INPUT_VOLUME;
  const netPctChange = netChange / INPUT_VOLUME * 100;
  const tradeStatus = newInputVolume > 1 ? 'PROFIT' : 'LOSS';

  // print results
  console.log(`${tradeStatus}!! Start: ${INPUT_VOLUME}${INPUT_COIN} => New Total: ${newInputVolume}${INPUT_COIN} => Net Change: ${netChange} => %Change: ${netPctChange}`);
}

function monitorArbitrage(msDelay){
  setInterval(() => {
    let runCurry = ajaxCurry();
    runCurry = runCurry('arbitrageInput', ARBITRAGE_COIN, INPUT_COIN);
    runCurry = runCurry('arbitrageOutput', ARBITRAGE_COIN, OUTPUT_COIN);
    runCurry = runCurry('outputInput', OUTPUT_COIN, INPUT_COIN);
  }, msDelay);
}

monitorArbitrage(1000);
