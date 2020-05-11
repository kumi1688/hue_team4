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

client.subscribe("req/hue/property"); // hue 속성 
client.subscribe("req/hue/status"); // hue 현재 상태 
client.subscribe("req/hue/changeStatus/+"); // hue 1개 상태 변경 
client.subscribe("req/hue/changeAllStatus"); // 모든 hue 상태 변경 

client.on("connect", function () {
  console.log("[sys] mqtt 연결됨");
});

const property = require("./property.json"); // 서비스 로딩시 hue 속성 불러오기 
console.log("[sys] Property 설정 완료");
const hueNumber = property.number; // 설정 파일에서 현재 제어 가능한 hue 번호가 담긴 배열

client.on("message", async function (topic, message) {
  if (topic === "req/hue/property") {
    client.publish("res/hue/property", JSON.stringify(property)); // 속성 전송
  } else if (topic === "req/hue/status") {
    client.publish("res/hue/status", JSON.stringify(currentHueState)); // 현재 상태 전송
  } else if (topic.includes("req/hue/changeStatus")) {
    // hue 1개 상태를 조작하려는 경우
    const id = topic.split("/")[3];
    const { on, bri, sat, hue, ct } = JSON.parse(message);

    try {
      if (on && bri && sat && hue) await axios.put(`${hueUrl}/${id}/state`, { on, bri, sat, hue }); // 색 변경
      else if (on !== undefined && !ct && !bri && !sat) await axios.put(`${hueUrl}/${id}/state`, { on }); // 전원 변경
      else if (ct) await axios.put(`${hueUrl}/${id}/state`, { ct }); // 온도 변경 
      else if (bri) await axios.put(`${hueUrl}/${id}/state`, { bri }); // 밝기 변경
      else if (sat) await axios.put(`${hueUrl}/${id}/state`, { sat }); // 채도 변경 
    } catch (e) {
      console.error(e);
    }
  } else if (topic.includes("req/hue/changeAllStatus")) { // 모든 hue 일괄 변경
    const { on, bri, sat, hue, ct, numlist } = JSON.parse(message);

    try {
      if (on && bri && sat && hue) await Promise.all(numlist.map((num) => axios.put(`${hueUrl}/${num}/state`, { on, bri, sat, hue }))); // 색 일괄 변경
      else if (on !== undefined && !ct && !bri && !sat) await Promise.all(numlist.map((num) => axios.put(`${hueUrl}/${num}/state`, { on }))); // 전원 일괄 변경
      else if (ct) await Promise.all(numlist.map((num) => axios.put(`${hueUrl}/${num}/state`, { ct }))); // 온도 일괄 변경 
      else if (bri) await Promise.all(numlist.map((num) => axios.put(`${hueUrl}/${num}/state`, { bri }))); // 밝기 일괄 변경 
      else if (sat) await Promise.all(numlist.map((num) => axios.put(`${hueUrl}/${num}/state`, { sat }))); // 채도 일괄 변경
    } catch (e) {
      console.error(e);
    }
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

// Hue 상태 비교
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