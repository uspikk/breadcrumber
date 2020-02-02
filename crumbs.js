let account = "nrg";
let wif = "";

let interval = 1//interval in between cycles
let renewallorderinterval = 1440//renew interval
let startwithrenew = false //starts the script by renewing orders

let shortpercent = 5
let precentageoftokensperinterval = 0.01


let longpercent = 5
let longprecentageoftokensperinterval = 0.01


let request = require("graphql-request").request
const steem = require("steem")
let fs = require("fs")
interval = interval * 1000*60

function shorcycle(){
function start(){
 let query = `{tokenBalance(symbol:"HBBC" account:"${account}"){account, symbol, balance}}`
 request('https://graphql.steem.services/', query).then(data =>{
  console.log(data)
  getbook(data.tokenBalance);
 });
};

function getbook(tokenBalance){
 let query = `{buyBook(symbol:"HBBC", limit:1000){txId, quantity, price, expiration, account}}`
 request('https://graphql.steem.services/', query).then(data =>{
  let arr1 = Array.from(data.buyBook);
  arr1 = arr1.sort(function(a,b){return b.price - a.price});
  console.log("selling to " + arr1[0].account)
  if(arr1[0].account===account){lobby(2);return;}
  checkexpired(tokenBalance, arr1);
 });
};

function checkexpired(tokenBalance, book){
selltokens(tokenBalance, book)
}

function selltokens(tokenBalance, book){
 let overfill = book[0].quantity
 let quantity = tokenBalance[1].balance * precentageoftokensperinterval / 100
 if(overfill < quantity) quantity = overfill*1
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
 savestate(txarray, 0)
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
 let wholetx = [
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
    if(result){console.log(result.operations[0][1]);lobby(1)}
 });
}
start();
}

function savestate(arr, iterator){
if(iterator === 0){
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
if(iterator === 1){
  let arr0steem = JSON.parse(arr[0].contractPayload.quantity)*JSON.parse(arr[0].contractPayload.price)
  let arr1steem = JSON.parse(arr[1].contractPayload.quantity)*JSON.parse(arr[1].contractPayload.price)
  let profit = arr1steem -  arr0steem
  console.log(arr0steem)
  console.log(arr1steem)
  fs.readFile(__dirname + '/log.json', "utf8", (err, data) => {
  if (err) throw err;
  if (data){
    data = JSON.parse(data)
    data.trades++
    data.steem = data.steem+profit
    data.steem = (data.breadcrumbs).toFixed(8)*1
    fs.writeFile(__dirname + '/log.json', JSON.stringify(data), function (err) {
     if (err) throw err;
    })
  }
})
}
}


function longcycle(){
function startlong(){
 let query = `{tokenBalance(symbol:"HBBC" account:"${account}"){account, symbol, balance}}`
 request('https://graphql.steem.services/', query).then(data =>{
  longgetbook(data.tokenBalance);
 })
}

function longgetbook(tokenBalance){
 let query = `{sellBook(symbol:"HBBC", limit:1000){txId, quantity, price, expiration, account}}`
 request('https://graphql.steem.services/', query).then(data =>{
  let arr1 = Array.from(data.sellBook);
  arr1 = arr1.sort(function(a,b){return a.price - b.price});
  console.log("Buying from " + arr1[0].account)
  if(arr1[0].account===account){lobby(4);return;}
  buytokens(tokenBalance, arr1);
 });
};

function buytokens(tokenBalance, book){
 let overfill = book[0].quantity
 let quantity = (tokenBalance[0].balance * longprecentageoftokensperinterval / 100)/(book[0].price*1)
 if(overfill < quantity) quantity = overfill*1
 quantity = quantity.toFixed(3).toString();
 let txload = {
    "contractName" : "market",
    "contractAction" : "buy",
    "contractPayload" : {
       "symbol": "HBBC",
       "quantity": quantity,
       "price": book[0].price
       }
    }
 sellback(txload, book);
}

function sellback(json, book){
  let txarray = [];
  txarray.push(json)
  let sellprice = JSON.parse(txarray[0].contractPayload.price)*longpercent/100
  sellprice = sellprice + JSON.parse(txarray[0].contractPayload.price)
  sellprice = sellprice.toFixed(8).toString();
  let txload = {
    "contractName" : "market",
    "contractAction" : "sell",
    "contractPayload" : {
       "symbol": "HBBC",
       "quantity": txarray[0].contractPayload.quantity,
       "price": sellprice
       }
    }
  txarray.push(txload)
   savestate(txarray, 1)
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
    "contractAction" : "sell",
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
              "type":"sell",
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

          longbread(txarray);
          return;
      }
    }
   }
  }
 }
 longbread(txarray);
}


function longbread(txjsons){
let txarray = JSON.stringify(txjsons)
let wholetx = [
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
    if(result){console.log(result.operations[0][1]);lobby(3)}
 });
}
startlong();
}


function renew(){

 function renewshort(){
  console.log("renewing short")
  let query = `{buyBook(symbol:"HBBC", limit:1000){txId, quantity, price, expiration, account}}`
  request('https://graphql.steem.services/', query).then(data =>{
   let arr1 = Array.from(data.buyBook);
   arr1 = arr1.sort(function(a,b){return b.price - a.price});
   let txarray = []
   for(var i=0;i<arr1.length;i++){
    let cancelobj = {
      "contractName" : "market",
      "contractAction" : "cancel",
      "contractPayload": {
      "type":"buy",
      "id":arr1[i].txId
      }
    }
    let buyobj = {
      "contractName" : "market",
      "contractAction" : "buy",
      "contractPayload" : {
      "symbol": "HBBC",
      "quantity": arr1[i].quantity,
      "price": arr1[i].price
      }
    }
    if(arr1[i].account === account){
     txarray.push(cancelobj)
     txarray.push(buyobj)
    }
    if(i === arr1.length - 1) txsorter(txarray)
   }
   function txsorter(alltxs){
    broadcast(alltxs.splice(0,10), alltxs)
   }
   function broadcast(txoperations, alltxs){
   if(txoperations.length === 0){
    renewoperator(1)
    return;
   }
   txoperations = JSON.stringify(txoperations);
    wholetx = [
     "custom_json",{
      "required_auths": [account],
      "required_posting_auths": [],
      "id": "ssc-mainnet1",
      "json": txoperations
     }
  ]
  steem.broadcast.send({
   extensions: [],
   operations: [wholetx]}, [wif], (err, result) => {
    if(err){console.log(err)}
    if(result){setTimeout(txsorter, 6000, alltxs);console.log(result.operations[0][1]);return;}
  });
   }
  })
 }

 function renewlong(){
  console.log("renewing long")
  let query = `{sellBook(symbol:"HBBC", limit:1000){txId, quantity, price, expiration, account}}`
  request('https://graphql.steem.services/', query).then(data =>{
   let arr1 = Array.from(data.sellBook);
   arr1 = arr1.sort(function(a,b){return a.price - b.price});
   let txarray = []
   for(var i=0;i<arr1.length;i++){
    let cancelobj = {
      "contractName" : "market",
      "contractAction" : "cancel",
      "contractPayload": {
      "type":"sell",
      "id":arr1[i].txId
      }
    }
    let buyobj = {
      "contractName" : "market",
      "contractAction" : "sell",
      "contractPayload" : {
      "symbol": "HBBC",
      "quantity": arr1[i].quantity,
      "price": arr1[i].price
      }
    }
    if(arr1[i].account === account){
     txarray.push(cancelobj)
     txarray.push(buyobj)
    }
    if(i === arr1.length - 1) txsorter(txarray)
   }
   function txsorter(alltxs){
    broadcast(alltxs.splice(0, 10), alltxs)
   }
   function broadcast(txoperations, alltxs){
   if(txoperations.length === 0){
    renewoperator(2);
    return;
   }
   txoperations = JSON.stringify(txoperations);
    wholetx = [
     "custom_json",{
      "required_auths": [account],
      "required_posting_auths": [],
      "id": "ssc-mainnet1",
      "json": txoperations
     }
  ]
  steem.broadcast.send({
   extensions: [],
   operations: [wholetx]}, [wif], (err, result) => {
    if(err){console.log(err)}
    if(result){setTimeout(txsorter, 6000, alltxs);console.log(result.operations[0][1]);return;}
  });
   }
  })
 }

 function renewoperator(cycle){
  if(cycle === 0){
    renewshort();
    return;
  }
  if(cycle === 1){
    renewlong();
    return;
  }
  if(cycle === 2){
    console.log("returning to lobby")
    lobby(5);
    return;
  }
 }
 renewoperator(0)
 return;
}

let renewcycle = 0;

function lobby(cycle){
 if(renewcycle === renewallorderinterval){
  renew();
  return;
 }
  renewcycle++
 if(startwithrenew === true){
  renew();
  startwithrenew=false;
  return;
 }
 if(cycle === 0){
  console.log("shorting")
  shorcycle();
  return;}
 if(cycle === 1 || cycle === 2){
  if(cycle === 2) console.log("can't sell, already top order")
  console.log("bullrun")
  longcycle();return;}
 if(cycle === 3 || cycle === 4){
  if(cycle === 4) console.log("can't buy, already top order")
  setTimeout(lobby, interval, 0)
  return;
 }
 if(cycle === 5){
  renewcycle = 0;
  lobby(0);
 }
}
lobby(0);
