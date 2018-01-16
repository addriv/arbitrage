require "net/http"
require "uri"
require "json"
require "pry"

input_coin = "BTC"
output_coin = "NEO"
arbitrage_coin = "DBC"

arbitrage_input_uri = URI.parse("https://api.kucoin.com/v1/open/tick?symbol=#{arbitrage_coin}-#{input_coin}")
arbitrage_output_uri = URI.parse("https://api.kucoin.com/v1/open/tick?symbol=#{arbitrage_coin}-#{output_coin}")
output_input_uri = URI.parse("https://api.kucoin.com/v1/open/tick?symbol=#{output_coin}-#{input_coin}")

while true
  arbitrage_input_response = Net::HTTP.get_response(arbitrage_input_uri)
  arbitrage_output_response = Net::HTTP.get_response(arbitrage_output_uri)
  output_input_response = Net::HTTP.get_response(output_input_uri)

  arbitrage_input_ratio = JSON.parse(arbitrage_input_response.body)["data"]["lastDealPrice"]
  arbitrage_output_ratio = JSON.parse(arbitrage_output_response.body)["data"]["lastDealPrice"]
  output_input_ratio = JSON.parse(output_input_response.body)["data"]["lastDealPrice"]

  # Testing, start with 1 BTC
  input_volume = 1
  trading_fee = 0.001
  net_after_fee_pct = 1 - trading_fee

  arbitrage_volume = input_volume / arbitrage_input_ratio * net_after_fee_pct
  output_volume = arbitrage_volume * arbitrage_output_ratio * net_after_fee_pct
  new_input_volume = output_volume * output_input_ratio * net_after_fee_pct
  net_change = new_input_volume - input_volume
  net_pct_change = (net_change / input_volume) * 100

  trade_status = new_input_volume > 1 ? "Profit" : "Loss"
  puts "#{trade_status.upcase}!! Start: #{input_volume}#{input_coin} => New Total: #{new_input_volume}#{input_coin} => Profit: #{net_change} => %Change: #{net_pct_change}"
  sleep(1)
end