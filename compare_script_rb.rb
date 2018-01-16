require "net/http"
require "uri"
require "json"
require "pry"

binance_uri = URI.parse("https://api.binance.com/api/v1/ticker/allPrices")
coinbase_uri = URI.parse("https://api.coinbase.com/v2/prices/USD/spot")

while true do 
  binance_response = Net::HTTP.get_response(binance_uri)
  coinbase_response = Net::HTTP.get_response(coinbase_uri)
  binance_data = JSON.parse(binance_response.body).map{|d| {d["symbol"] => d["price"].to_f}}.reduce({}, :merge)
  coinbase_data = JSON.parse(coinbase_response.body)['data'].map{|d| {d["base"] => d["amount"].to_f}}.reduce({}, :merge)
  puts "-----------------------------------------------"
  puts "Binance BTC: #{binance_data['BTCUSDT']} | Coinbase BTC: #{coinbase_data['BTC']} | Price difference: #{binance_data['BTCUSDT'] - coinbase_data['BTC']}"
  puts "Binance ETH: #{binance_data['ETHUSDT']} | Coinbase ETH: #{coinbase_data['ETH']} | Price difference: #{binance_data['ETHUSDT'] - coinbase_data['ETH']}"
  puts "Binance LTC: #{binance_data['LTCUSDT']} | Coinbase LTC: #{coinbase_data['LTC']} | Price difference: #{binance_data['LTCUSDT'] - coinbase_data['LTC']}"
  puts "-----------------------------------------------"
  sleep(1)
end
