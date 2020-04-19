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
    console.log('[sys] mqtt 연결됨');
});

client.subscribe('req/hue/property');
client.subscribe('req/hue/status');
client.subscribe('req/hue/changeStatus/+');

const property = require('./property.json');
console.log('[sys] Property 설정 완료');
const hueNumber = property.number.split(',');

client.on('message', async function (topic, message) {
    console.log('topic : ', topic);
    if(topic === 'req/hue/property'){
        client.publish('res/hue/property', JSON.stringify(property));
    }else if (topic === 'req/hue/status'){
        if(currentHueState.length === 0){
            const initialData = await getAllHueData(hueNumber);
            console.log(initialData);
            currentHueState = [...initialData];
            client.publish('res/hue/status', JSON.stringify(initialData));
        }else{
            const removeEmptyElementArray = currentHueState.filter(el => el !== undefined && el !== {});
            client.publish('res/hue/status', JSON.stringify(removeEmptyElementArray));
        }
    }else if (topic.includes('req/hue/changeStatus')){
        const id = topic.split('/')[3];
        console.log(JSON.parse(message));
        axios.put(`${hueUrl}/${id}/state`, JSON.parse(message));
    }
});


let prevHueState = [];
let currentHueState = [];

showProperty();

// 2초 마다 상태 점검
setInterval(()=>{
    
})

async function getHueData(hue){
    return new Promise(async function(resolve, reject){
       const result = await axios.get(`${hueUrl}/${hue}`);
        result.data.state.number = Number(hue);
        resolve(result.data);
    });
}

async function getAllHueData(arr) {
    // RIGHT :: Array.map using async-await and Promise.all
    const result = await Promise.all(
      arr.map(hue => {
        return getHueData(hue);
      })
    );
    return result;
  }

function showProperty(){
    console.log('[sys] 현재 hue 목록 : ', hueNumber);
    console.log('[sys] hue 속성 : ', property)
}

