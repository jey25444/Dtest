var APP_ID = '69271';
let token = localStorage.getItem('authToken');
let CURRENCY;

let ws1; //ddd
if (ws1) {
    ws1.close();
    ws1 = undefined;
}
var isrunning = false;
const tbody = document.getElementById("bot-table-body");
const dots = document.querySelectorAll(".dot");

var total_stake = 0; 
var total_lost = 0;
var total_won = 0;
var total_profit = 0;
var stake = 1;
var duration = 5;

let contract_type = 'CALL';
let symbol = 'R_100';

try {
  async function runWeb() {
        token = localStorage.getItem('authToken');
        dots.forEach((dot, index) => {
          dot.style.backgroundColor = "#666";
          dot.classList.remove("glow");
        });
    
       //settings
       let initial_stake = Number(document.getElementById("init-stake").value);
       let tp = Number(document.getElementById("tp").value);
       let sl = Number(document.getElementById("sl").value);
       let martingale = Number(document.getElementById("plier").value);
       let max_stake = Number(document.getElementById("maxstake").value);
       let max_runs = Number(document.getElementById("maxruns").value);
       //sets
       stake = initial_stake;
       if (!stake) {stake = 1;}
       if (!duration) {duration = 1;}
       if (!martingale) {martingale = 1.20}
    
       ws1 = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=' + APP_ID)
        
        ws1.addEventListener("open", () => {
            authorize();
        });
    
        ws1.addEventListener("close", (eve) => {
            //console.dir(eve);
        });
    
        ws1.addEventListener("error", (err) => {
            //console.dir(err);
        });
    
        ws1.addEventListener('message', function(data) { 
            let ms = JSON.parse(data.data);
    
            let req = ms.echo_req;
            var req_id = req.req_id;
            const error = ms.error;
            if (error) {
              console.log(ms)
              const mss = error.message;
              isrunning = false;
              updateRunbtn() 
              alert(mss);
            }
            else {
              if (req_id === 2111) {
                  console.log('authorized');
                  getBalance();
              }

              if (req_id === 2112) {
                  CURRENCY = ms.balance.currency;
                  if (CURRENCY) {
                    openContract();
                  }
                  else {
                    console.log('currency not found')
                  }
              }
    
              if (req_id === 2000) {
                  var open = ms.proposal_open_contract;
                  var buy = ms.buy;
                  if (open) {
                    var status = open.status;
                    var longcode = open.longcode;
                    
                    setProgress(50);
                    dots.forEach((dot, index) => {
                      dot.style.backgroundColor = "#666";
                      dot.classList.remove("glow");
                    });
                    document.getElementById('dot1').style.backgroundColor = "orange";
                    document.getElementById('dot2').style.backgroundColor = "orange";
                    document.getElementById('dot2').classList.add("glow");
    
                    if (status !== 'open') {
                      total_stake += Number(open.buy_price);
    
                      if (status === 'won') {
                        total_won ++;
                        stake /= martingale;
                        if (stake < Number(initial_stake)) {stake = initial_stake;}
                      }
                      else {
                        total_lost ++;
                        stake *= martingale;
                      }
                      total_profit += Number(open.profit);
                      updateSummaries(total_stake, total_lost, total_won, total_profit);
                      //table
                      const date = new Date(open.date_start * 1000); // Convert seconds to milliseconds
                      const hours = date.getHours().toString().padStart(2, '0');
                      const minutes = date.getMinutes().toString().padStart(2, '0');
                      const seconds = date.getSeconds().toString().padStart(2, '0');
                      const newRow = {
                        time: hours + ":" + minutes,
                        asset: open.display_name,
                        stake: open.buy_price,
                        payout: open.profit
                      };
                      const tr = createRow(newRow);
                      tbody.insertBefore(tr, tbody.firstChild);
    
                      document.getElementById('dot1').style.backgroundColor = "orange";
                      document.getElementById('dot2').style.backgroundColor = "orange";
                      document.getElementById('dot3').style.backgroundColor = "orange";
                      document.getElementById('dot2').classList.remove("glow");
                      setProgress(100);
                      document.getElementById('dot3').classList.add("glow");
                      //check stops
                      if (total_profit >= tp) {
                        isrunning = false;
                        updateRunbtn() 
                        alert('Take profit was hit');
                      }
                      if (total_profit <= -sl) {
                        isrunning = false;
                        updateRunbtn() 
                        alert('Stoploss was hit');
                      }
                      if ((total_won + total_lost) >= max_runs) {
                        isrunning = false;
                        updateRunbtn() 
                        alert('Maximum trades was hit');
                      }
                      //reenter
                      if (isrunning) {
                        setTimeout(() => {
                          openContract();
                        }, 2000);
                      }
                      else {
                        updateRunbtn();
                      }
                    }
                  }
              }
            }
        });
    
        function authorize() {
            const msg = JSON.stringify({
                authorize: token,
                req_id: 2111
            });
            if (ws1.readyState !== WebSocket.CLOSED) {
                ws1.send(msg);
            }
        }
        function getBalance() {
            const msg = JSON.stringify({
                balance: 1,
                req_id: 2112
            });
            if (ws1.readyState !== WebSocket.CLOSED) {
                ws1.send(msg);
            }
        }
    }
    
    function openContract() {
        dots.forEach((dot, index) => {
          dot.style.backgroundColor = "#666";
          dot.classList.remove("glow");
        });
        document.getElementById('dot1').style.backgroundColor = "orange";
        document.getElementById('dot1').classList.add("glow");
        setProgress(0);
        stake = Number(Number(stake).toFixed(2));
        const msg = JSON.stringify({
          "buy": 1,
          "parameters": {
            "amount": stake,
            "basis": "stake",
            "contract_type": contract_type,
            "duration": duration,
            "duration_unit": 't',
            "symbol": symbol,
            "currency": CURRENCY,
          },
          "price": stake,
          "subscribe": 1,
          "req_id": 2000
        });
        ws1.send(msg);
    }
    
    document.getElementById('run-btn').addEventListener('click', () => {
        if (!isrunning) {
          isrunning = true;
          runWeb();
        }
        else {
          isrunning = false;
        }
        updateRunbtn();
    });
    
    function updateRunbtn() {
        var txt = 'Stop';
        var color = 'red';
        if (!isrunning) {
          txt = 'Run';
          color = 'orange';
        }
        document.getElementById("run-btn").style.backgroundColor = color;
        document.getElementById("run-btn").textContent = txt;
    }
    
    function updateSummaries(total_stake, total_lost, total_won, total_profit) {
       document.getElementById("total-stake").textContent = total_stake.toFixed(2) + " " + CURRENCY;
       document.getElementById("total-lost").textContent = total_lost;
       document.getElementById("total-won").textContent = total_won;
       document.getElementById("profit-loss").textContent = total_profit.toFixed(2) + " " + CURRENCY;
    }
    
    function createRow(row) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row.time}</td>
        <td>${row.asset}</td>
        <td>${row.stake + ' ' + CURRENCY}</td>
        <td>${row.payout  + ' ' + CURRENCY}</td>
      `;
      return tr;
    }
    
    function setProgress(percent) {
      const minRight = 16.66; // 0% progress
      const maxRight = 83.33; // 100% progress
    
      const totalRange = maxRight - minRight;
      const currentRight = maxRight - (percent / 100) * totalRange;
    
      const container = document.querySelector('.dots-container');
      container.style.setProperty('--progress-right', `calc(${currentRight}% + 5px)`);
    }
} catch (err) {
    isrunning = false;
  console.error('❌ Caught error:', err);
}

const select = document.getElementById('market-select');
select.addEventListener('change', function () {
    symbol = this.value;
});


//future errors
window.onerror = function(message, source, lineno, colno, error) {
    console.error("Error caught globally:");
    console.error(`Message: ${message}`);
    console.error(`Source: ${source}`);
    console.error(`Line: ${lineno}`);
    console.error(`Column: ${colno}`);
    console.error(`Error object:`, error);
    
    isrunning = false;
    return true;
};



