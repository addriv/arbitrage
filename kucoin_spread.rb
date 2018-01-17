require "net/http"
require "uri"
require "json"
require "pry"

base_coin = "RPX"
quote_coin = "BTC"

uri = URI.parse("https://api.kucoin.com/v1/open/tick?symbol=#{base_coin}-#{quote_coin}")

while true
  response = Net::HTTP.get_response(uri)
  data = JSON.parse(response.body)["data"] 

  bid = data["buy"]
  ask = data["sell"]

  pct_gain = ((ask - bid) / bid * 100).round(2)
  puts pct_gain
  sleep(1)
end