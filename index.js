const axios = require("axios");
const mqtt = require("mqtt");
const hueUrl =
  "http://210.107.205.200:8080/api/wkcBD-lTULsGrCJ2hqZZqgeQsfathjs6zc3Rul1O/lights";
const mqttOptions = {
  host: "13.125.207.178",
  port: 1883,
  protocol: "mqtt",
};
const client = mqtt.connect(mqttOptions);

client.subscribe("req/hue/property");
client.subscribe("req/hue/status2");
client.subscribe("req/hue/changeStatus/+");

client.on("connect", function () {
  console.log("[sys] mqtt 연결됨");
});

const property = require("./property.json");
console.log("[sys] Property 설정 완료");
const hueNumber = property.number; // 설정 파일에서 현재 제어 가능한 hue 번호가 담긴 배열
console.log(hueNumber);

client.on("message", async function (topic, message) {
  console.log("topic : ", topic);
  if (topic === "req/hue/property") {
    // 속성 전송
    client.publish("res/hue/property", JSON.stringify(property));
  } else if (topic === "req/hue/status2") {
    // 현재 상태 전송
    const result = await getAllHueData(hueNumber);
    const data = result.map((el) => el.state);
    client.publish("res/hue/status2", JSON.stringify(data));
  } else if (topic.includes("req/hue/changeStatus")) {
    // hue 상태를 조작하려는 경우
    const id = topic.split("/")[3];
    const { on, bri, sat, hue, ct } = JSON.parse(message);

    await axios.put(`${hueUrl}/${id}/state`, { on }); // 전원 변경
    await axios.put(`${hueUrl}/${id}/state`, { ct }); // 온도 변경
    await axios.put(`${hueUrl}/${id}/state`, { hue, bri, sat }); // 색 변경
  }
});

let prevHueState = []; // 이전 상태
let currentHueState = []; // 현재 상태

// 2초 마다 상태 점검
setInterval(async () => {
  const result = await getAllHueData(hueNumber); // 상태 정보 요청
  let arr = result.map((el) => el.state); // 상태값 추출
  currentHueState = [...arr]; // 추출한 상태값을 현재 상태로 저장
  for (let i = 0; i < currentHueState.length; i++) {
    // 만약 이전 상태와 현재 상태가 다르면
    if (!compare(prevHueState[i], currentHueState[i])) {
      // mqtt로 즉시 업데이트 내용 전송
      console.log("[sys] 상태가 업데이트 되어 전송");
      // console.log(JSON.stringify(currentHueState[i]));
      client.publish("res/hue/update", JSON.stringify(currentHueState[i]));
    }
  }
  // console.log("통과"); // 상태가 이전과 같다면 통과
  prevHueState = [...currentHueState]; // 현재 상태를 이전상태로 만듬
}, 2000); // 2초마다 반복

// 객체 내용 비교
function compare(prev, current) {
  if (prev === undefined || prev === null) return false;
  else if (prev.on !== current.on) return false;
  else if (prev.hue !== current.hue) return false;
  else if (prev.bri !== current.bri) return false;
  else if (prev.sat !== current.sat) return false;
  else if (prev.ct !== current.ct) return false;
  else return true;
}

// 모든 데이터 받아오는 함수
async function getHueData(hue) {
  return new Promise(async function (resolve, reject) {
    try {
      const result = await axios.get(`${hueUrl}/${hue}`);
      result.data.state.number = Number(hue);
      resolve(result.data);
    } catch (e) {
      // console.error(e);
      // reject(e);
    }
  });
}

// 모든 데이터 받아오는 함수. 비동기처리를 위해 만듬
async function getAllHueData(arr) {
  const result = await Promise.all(arr.map((hue) => getHueData(hue)));
  return result;
}

function showProperty() {
  console.log("[sys] 현재 hue 목록 : ", hueNumber);
  console.log("[sys] hue 속성 : ", property);
}
