<script setup>
import * as Cesium from "cesium";
import { onMounted, ref, watch } from "vue";
import axios from "axios";
import Iss from "./assets/ISS_stationary.glb";
import { Cartesian3 } from "cesium";


// server Sent
const backupAltitude = ref();
const position = ref();
const altitudee = ref();

// client Make
const vector3D = ref();
const computedPosition = ref();
const ISSEntity = ref();
const speed = ref();

let viewer= undefined;

/** longtitude, latitude, altitude 를 리턴함 */
const getISSPosition = async () => {
  const data = axios
    .get("https://api.wheretheiss.at/v1/satellites/25544")
    .then(({ data }) => {
      const { longitude, latitude, altitude } = data;
      return { longitude, latitude, altitude: altitude * 1000 };
    });
  return data;
};

/** geoData를 받아 Position에 업데이트함 */
const setIssPosition = (geoData) => {
  const { longitude, latitude } = geoData;
  position.value = { longitude, latitude };
  altitudee.value = geoData.altitude;
};

/** 1초간격으로 위치를 받아와 단위백터를 구하는 함수 */
const get3DVector = () => {
  let startTime;
  let endTime;
  getISSPosition()
    .then((res) => {
      // start위치 구하기
      const start = Cesium.Cartesian3.fromDegrees(
        res.longitude,
        res.latitude,
        altitudee.value
      );
      startTime = Number(
        new Date().getSeconds() + "." + new Date().getMilliseconds()
      );
      return start;
    })
    .then((start) => {
      setTimeout(() => {
        getISSPosition().then(() => {
          endTime = Number(
            new Date().getSeconds() + "." + new Date().getMilliseconds()
          );
          // end위치 구하기
          const end = Cesium.Cartesian3.fromDegrees(
            position.value.longitude,
            position.value.latitude,
            altitudee.value
          );

          const 단위백터 = new Cesium.Cartesian3();
          Cesium.Cartesian3.subtract(end, start, 단위백터);
          Cesium.Cartesian3.divideByScalar(단위백터, 60, 단위백터);
          Cesium.Cartesian3.normalize(단위백터, 단위백터);

          vector3D.value = 단위백터;
          speed.value =
            Cesium.Cartesian3.distance(start, end) / (endTime - startTime);
        });
      }, 1000);
    });
};

/** 최초렌더 */
onMounted(() => {
  viewer = new Cesium.Viewer("cesium", {
    shouldAnimate: true,
    // 필요없는 툴 다 false처리
    navigationHelpButton: false,
    navigationInstructionsInitiallyVisible: false,
    timeline: false,
    infoBox: false,
    animation: false,
    geocoder: false,
    vrButton: false,
    homeButton: false,
    sceneModePicker: false,
    baseLayerPicker: false,
  });

  ISSEntity.value = viewer.entities.getById("iss");
  get3DVector();
  getISSPosition()
    .then((res) => setIssPosition(res))
    .then(() => {
      if (!viewer) {
        return;
      }
      viewer.entities.add({
        id: "iss",
        position: Cesium.Cartesian3.fromDegrees(
          position.value.longitude,
          position.value.latitude,
          altitudee.value
        ),
        model: {
          uri: Iss,
          minimumPixelSize: 128,
          maximumScale: 20000,
        },
      });
      viewer.trackedEntity = viewer.entities.getById("iss");
    })
    .then(() => {});
});

watch([altitudee, position, vector3D, speed], () => {
  if (!viewer || !altitudee || !viewer?.entities?.getById("iss")) {
    return;
  }
  const ISSEntity = viewer.entities.getById("iss");

  if (ISSEntity === undefined) {
    return;
  }

  if (vector3D.value !== undefined) {
    const startPosition = ISSEntity.position

    // console.log(vector3D.value,speed.value)
    const endposition = Cesium.Cartesian3.multiplyByScalar(
      vector3D.value,
      speed.value,
      new Cesium.Cartesian3()
    );
    const newPosition = Cesium.Cartesian3.add(
      startPosition,
      endposition,
      new Cesium.Cartesian3()
    );

    // 엔티티에 적용
    ISSEntity.position = newPosition;
    // console.log(newPosition);

    // 최초 포지션 바꾸기
    const cartographic = Cesium.Cartographic.fromCartesian(newPosition);

    const longitude = Cesium.Math.toDegrees(cartographic.longitude);
    const latitude = Cesium.Math.toDegrees(cartographic.latitude);
    const altitude = Cesium.Math.toDegrees(cartographic.height);

    setTimeout(() => {
      position.value = { longitude, latitude };
      altitudee.value = altitude;
    }, 16);
  }
});

const 추락시키기 = ref(false);

watch([추락시키기, altitudee], () => {
  if (추락시키기.value) {
    setTimeout(() => {
      if (altitudee.value > 1000) {
        altitudee.value = altitudee.value - 1000;
      }
    }, 16);
  }
  if (!추락시키기.value) {
    setTimeout(() => {
      if (altitudee.value <= backupAltitude.value) {
        altitudee.value = altitudee.value + 10000;
      }
    }, 16);
  }
});
</script>

<template>
  <button
    @click="
      () => {
        추락시키기 = !추락시키기;
      }
    "
  >
    {{ 추락시키기 ? "다시 올리기" : "추락시키기" }}
  </button>
  <div id="cesium" :style="{ width: '100vw', height: '100vh' }"></div>
</template>

<style scoped>
button {
  position: absolute;
  z-index: 999;
  width: 240px;
  font-size: 24px;
  padding: 16px;
  bottom: 48px;
  left: calc(50% - 120px);
}
</style>
