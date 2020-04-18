const axios = require('axios');
const mqtt = require('mqtt');
const hueUrl = 'http://210.107.205.200:8080/api/wkcBD-lTULsGrCJ2hqZZqgeQsfathjs6zc3Rul1O/lights';
const mqttOptions = {
    host: '192.168.0.14',
    port: 1883,
    protocol: 'mqtt'
};
const client  = mqtt.connect(mqttOptions);
 
client.on('connect', function () {
    console.log('mqtt 연결됨');
});

client.subscribe('req/hue/property');
client.subscribe('req/hue/status');
client.subscribe('req/hue/changeStatus/+');

const property = require('./property.json');

client.on('message', function (topic, message) {
    console.log('topic : ', topic);
    if(topic === 'req/hue/property'){
        client.publish('res/hue/property', JSON.stringify(property));
    }else if (topic === 'req/hue/status'){
        // console.log(currentHueState);
        const removeEmptyElementArray = currentHueState.filter(el => el !== undefined && el !== {});
        console.log(removeEmptyElementArray)
        client.publish('res/hue/status', JSON.stringify(removeEmptyElementArray));
    }else if (topic === 'req/hue/changeStatus/+'){
        const id = topic.split('/')[3];
        axios.put(`${hueUrl}/${id}`);
    }
});

const hueNumber = property.number.split(',');
console.log(hueNumber);
let prevHueState = [];
let currentHueState = [];


// 2초 마다 상태 점검
setInterval(()=>{
    hueNumber.forEach(async function(hue){
        const result = await axios.get(`${hueUrl}/${hue}`);
        
        currentHueState[hue] = result.data.state;
        currentHueState[hue].number = hue;
        
        if(!compareState(prevHueState[hue], currentHueState[hue])){
            // result.data.state['number'] = hue;
            client.publish(`res/hue/status`, JSON.stringify(result.data.state));
        }
        prevHueState[hue] = currentHueState[hue];
        
    })    
}, 2000);

function compareState(prev, current){
   if(prev === undefined ) return false;
   Object.keys(prev).forEach(function(){
       if(prev.key !== current.key) return false;
   })
   return true;
    // on: false,
    // bri: 254,
    // hue: 0,
    // sat: 254,
    // effect: 'none',
    // xy: [ 0.4573, 0.41 ],
    // ct: 366,
    // alert: 'select',
    // colormode: 'hs',
    // reachable: false,
    // number: '9'      
}

