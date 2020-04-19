const axios = require("axios");
const mqtt = require("mqtt");
const hueUrl =
  "http://210.107.205.200:8080/api/wkcBD-lTULsGrCJ2hqZZqgeQsfathjs6zc3Rul1O/lights";
const mqttOptions = {
  host: "192.168.0.2",
  port: 1883,
  protocol: "mqtt",
};
const client = mqtt.connect(mqttOptions);

client.on("connect", function () {
  console.log("[sys] mqtt 연결됨");
});

client.subscribe("req/hue/property");
client.subscribe("req/hue/status");
client.subscribe("req/hue/changeStatus/+");

const property = require("./property.json");
console.log("[sys] Property 설정 완료");
const hueNumber = property.number.split(",");

client.on("message", async function (topic, message) {
  console.log("topic : ", topic);
  if (topic === "req/hue/property") {
    client.publish("res/hue/property", JSON.stringify(property));
  } else if (topic === "req/hue/status") {
    if (currentHueState.length === 0) {
      const initialData = await getAllHueData(hueNumber);
      // console.log(initialData);
      currentHueState = [...initialData];
      client.publish("res/hue/status", JSON.stringify(initialData));
    } else {
      const removeEmptyElementArray = currentHueState.filter(
        (el) => el !== undefined && el !== {}
      );
      client.publish("res/hue/status", JSON.stringify(removeEmptyElementArray));
    }
  } else if (topic.includes("req/hue/changeStatus")) {
    const id = topic.split("/")[3];
    // console.log(JSON.parse(message));
    axios.put(`${hueUrl}/${id}/state`, JSON.parse(message));
  }
});

let prevHueState = [];
let currentHueState = [];

// 2초 마다 상태 점검
setInterval(async () => {
  const result = await getAllHueData(hueNumber); // 상태 정보 요청
  let arr = result.map((el) => el.state);
  currentHueState = [...arr];
  for (let i = 0; i < currentHueState.length; i++) {
    // 만약 이전 상태와 현재 상태가 다르면
    if (!compare(prevHueState[i], currentHueState[i])) {
      // mqtt로 즉시 업데이트 내용 전송
      console.log("[sys] 상태가 업데이트 되어 전송");
      console.log(JSON.stringify(currentHueState[i]));
      client.publish("res/hue/update", JSON.stringify(currentHueState[i]));
    }
  }
  console.log("통과");
  prevHueState = [...currentHueState];
}, 2000);

// 내용 비교
function compare(prev, current) {
  if (prev === undefined || prev === null) return false;
  else if (prev.on !== current.on) return false;
  else if (prev.hue !== current.hue) return false;
  else if (prev.bri !== current.bri) return false;
  else if (prev.sat !== current.sat) return false;
  else if (prev.ct !== current.ct) return false;
  else return true;
}

async function getHueData(hue) {
  return new Promise(async function (resolve, reject) {
    const result = await axios.get(`${hueUrl}/${hue}`);
    result.data.state.number = Number(hue);
    resolve(result.data);
  });
}

async function getAllHueData(arr) {
  // RIGHT :: Array.map using async-await and Promise.all
  const result = await Promise.all(
    arr.map((hue) => {
      return getHueData(hue);
    })
  );
  return result;
}

function showProperty() {
  console.log("[sys] 현재 hue 목록 : ", hueNumber);
  console.log("[sys] hue 속성 : ", property);
}
