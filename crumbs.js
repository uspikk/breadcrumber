let account = "nrg";
let wif = "";

let shortpercent = 5
let precentageoftokensperinterval = 0.1
let interval = 1

////////////////////////////////EDIT ABOVE

let request = require("graphql-request").request
const steem = require("steem")
let fs = require("fs")
interval = interval * 1000*60
function start(){
 let query = `{tokenBalance(symbol:"HBBC" account:"${account}"){account, symbol, balance}}`
 request('https://graphql.steem.services/', query).then(data =>{
 	console.log(data)
 	getbook(data.tokenBalance);
 });
};

function getbook(tokenBalance){
 let query = `{buyBook(symbol:"HBBC"){txId, quantity, price, expiration, account}}`
 request('https://graphql.steem.services/', query).then(data =>{
  let arr1 = Array.from(data.buyBook);
  arr1 = arr1.sort(function(a,b){return b.price - a.price});
  checkexpired(tokenBalance, arr1);
 });
};

function checkexpired(tokenBalance, book){
selltokens(tokenBalance, book)
}

function selltokens(tokenBalance, book){
 let quantity = tokenBalance[1].balance * precentageoftokensperinterval / 100
 quantity = quantity.toFixed(3).toString();
 let txload = {
  	"contractName" : "market",
  	"contractAction" : "sell",
  	"contractPayload" : {
       "symbol": "HBBC",
       "quantity": quantity,
       "price": book[0].price
       }
    }
 buyback(txload, book)
}

function buyback(json, book){
 txarray = []
 txarray.push(json)
 json.contractPayload.quantity = JSON.parse(json.contractPayload.quantity);
 json.contractPayload.price = JSON.parse(json.contractPayload.price);
 let steemquantity = json.contractPayload.quantity * json.contractPayload.price;
 steemquantity = steemquantity.toFixed(8)
 let newprice = json.contractPayload.price - (json.contractPayload.price * shortpercent / 100);
 newprice = newprice.toFixed(8)
 let crumbquantity = steemquantity / newprice
 crumbquantity = crumbquantity.toFixed(3).toString();
 newprice = newprice.toString();
 json.contractPayload.quantity = JSON.stringify(json.contractPayload.quantity);
 json.contractPayload.price = JSON.stringify(json.contractPayload.price);
 let txload = {
  	"contractName" : "market",
  	"contractAction" : "buy",
  	"contractPayload" : {
       "symbol": "HBBC",
       "quantity": crumbquantity,
       "price": newprice
       }
    }
 txarray.push(txload)
 savestate(txarray)
 txarray[0].contractPayload.quantity = JSON.stringify(txarray[0].contractPayload.quantity)
 txarray[1].contractPayload.quantity = JSON.stringify(txarray[1].contractPayload.quantity)
 let transactionarray = []
 for(var i=0;i<book.length;i++){
  if(book[i].account === account){
  	transactionarray.push(book[i])
  }
 }
 let priceobj = {}
 for(var i=0;i<transactionarray.length;i++){
 	if(priceobj.hasOwnProperty(transactionarray[i].price)){
 		priceobj[transactionarray[i].price].push(transactionarray[i])
 	}
 	else{
 		priceobj[transactionarray[i].price] = [transactionarray[i]]
 	}
 }
 let neworder = {
  	"contractName" : "market",
  	"contractAction" : "buy",
  	"contractPayload" : {
       "symbol": "HBBC",
       "quantity": 0,
       "price": 0
       }
    }
 for(prop in priceobj){
  if(Object.prototype.hasOwnProperty.call(priceobj, prop)){
   if(priceobj[prop].length > 1){
    for(var i=0;i<priceobj[prop].length;i++){
    	let cancelobj = {
    		"contractName" : "market",
  	        "contractAction" : "cancel",
  	        "contractPayload": {
  	        	"type":"buy",
  	        	"id":priceobj[prop][i].txId
  	        }
    	}
    	priceobj[prop][i].quantity = JSON.parse(priceobj[prop][i].quantity)
    	priceobj[prop][i].price = JSON.parse(priceobj[prop][i].price)
    	neworder.contractPayload.quantity = neworder.contractPayload.quantity + priceobj[prop][i].quantity
    	neworder.contractPayload.price = priceobj[prop][i].price
    	txarray.push(cancelobj)
    	if(txarray.length === 9 || i===priceobj[prop].length - 1){
    	  neworder.contractPayload.quantity = (neworder.contractPayload.quantity).toFixed(3)*1
    	  neworder.contractPayload.price = (neworder.contractPayload.price).toFixed(8)*1
    	  neworder.contractPayload.quantity = JSON.stringify(neworder.contractPayload.quantity)
    	  neworder.contractPayload.price = JSON.stringify(neworder.contractPayload.price)
    	  txarray.push(neworder)
        if(txarray[1].contractPayload.price === txarray[txarray.length - 1].contractPayload.price){
          console.log("istrue")
          txarray[1].contractPayload.quantity = JSON.parse(txarray[1].contractPayload.quantity);
          txarray[txarray.length - 1].contractPayload.quantity = JSON.parse(txarray[txarray.length - 1].contractPayload.quantity);
          txarray[txarray.length - 1].contractPayload.quantity = txarray[1].contractPayload.quantity + txarray[txarray.length-1].contractPayload.quantity
          txarray[txarray.length - 1].contractPayload.quantity = JSON.stringify(txarray[txarray.length - 1].contractPayload.quantity)
          txarray.splice(1, 1)
        }

          breadcast(txarray);
          return;
    	}
    }
   }
  }
 }
 breadcast(txarray);
}

function breadcast(txarray){
 txarray = JSON.stringify(txarray)
 wholetx = [
  "custom_json",
  {
    "required_auths": [account],
    "required_posting_auths": [],
    "id": "ssc-mainnet1",
    "json": txarray
  }
  ]
 steem.broadcast.send({
  extensions: [],
  operations: [wholetx]}, [wif], (err, result) => {
  	if(err){console.log(err)}
  	if(result){console.log(result.operations[0][1]);}
 });
}

function savestate(arr){
let newarr = arr
newarr[0].contractPayload.quantity = JSON.parse(arr[0].contractPayload.quantity)
newarr[1].contractPayload.quantity = JSON.parse(arr[1].contractPayload.quantity)
let profit = arr[1].contractPayload.quantity - arr[0].contractPayload.quantity
fs.readFile(__dirname + '/log.json', "utf8", (err, data) => {
  if (err) throw err;
  if (data){
  	data = JSON.parse(data)
  	data.trades++
  	data.breadcrumbs = data.breadcrumbs+profit
  	data.breadcrumbs = (data.breadcrumbs).toFixed(3)*1
  	fs.writeFile(__dirname + '/log.json', JSON.stringify(data), function (err) {
     if (err) throw err;
    })
  }
})
}
start();
setInterval(start, interval);