<script setup lang="ts">
import * as Cesium from "cesium";
import { onMounted, ref, watch } from "vue";
import axios from "axios";
import Iss from "./assets/ISS_stationary.glb";
import { Cartesian3 } from "cesium";

interface GeoDataType {
  longitude: number;
  latitude: number;
  altitude: number;
}

// server Sent
const backupAltitude = ref();
const position = ref();
const altitudee = ref();

// client Make
const vector3D = ref<Cartesian3 | undefined>();
const ISSEntity = ref();
const diff = ref<Omit<GeoDataType, "altitude"> | undefined>();

let viewer: Cesium.Viewer | undefined = undefined;

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
const setIssPosition = (geoData: GeoDataType) => {
  const { longitude, latitude } = geoData;
  position.value = { longitude, latitude };
  altitudee.value = geoData.altitude;
};

/** 1초간격으로 위치를 받아와 단위백터를 구하는 함수 */
const get3DVector = () => {
  getISSPosition()
    .then((res) => {
      // start위치 구하기
      const start = { longitude: res.longitude, latitude: res.latitude };

      return start;
    })
    .then((start) => {
      setTimeout(() => {
        getISSPosition().then((res) => {
          // end위치 구하기
          const end = { longitude: res.longitude, latitude: res.latitude };

          diff.value = {
            longitude: (end.longitude - start.longitude) / 1000,
            latitude: (end.latitude - start.latitude) / 1000,
          };
        });
      }, 1000);
    });
};

/** 최초렌더 */
onMounted(() => {
  viewer = new Cesium.Viewer("cesium", {
    shouldAnimate: true,
    shadows: true,
    // 필요없는 툴 다 false처리
    navigationHelpButton: false,
    navigationInstructionsInitiallyVisible: false,
    timeline: true,
    infoBox: false,
    animation: false,
    geocoder: false,
    vrButton: false,
    homeButton: false,
    sceneModePicker: false,
    baseLayerPicker: false,
  });
  /** 실제 현재시간 */
  const currentTime = Cesium.JulianDate.now();

  // Set up the clock
  /**뷰어의 현재시간을 2초전으로 */
  viewer.clock.startTime = Cesium.JulianDate.addSeconds(
    currentTime.clone(),
    2,
    new Cesium.JulianDate()
  );
  viewer.clock.currentTime = currentTime.clone();
  // viewer.clock.stopTime = currentTime.clone();
  viewer.clock.clockRange = Cesium.ClockRange.UNBOUNDED;
  viewer.clock.multiplier = 1;
  /**샘플 포지션을 담을 곳 */
  const positionProperty = new Cesium.SampledPositionProperty();

  // get3DVector();
  getISSPosition().then((res) => {
    if (!viewer) {
      return;
    }
    const cartesianPosition = Cesium.Cartesian3.fromDegrees(
      res.longitude,
      res.latitude,
      res.altitude
    );

    positionProperty.addSample(viewer.clock.startTime, cartesianPosition);

    viewer.entities.add({
      id: "iss",
      availability: new Cesium.TimeIntervalCollection([
        new Cesium.TimeInterval({ start: viewer.clock.startTime }),
      ]),
      position: positionProperty,
      model: {
        uri: Iss,
        minimumPixelSize: 128,
        maximumScale: 20000,
      },
    });

    viewer.trackedEntity = viewer.entities.getById("iss");
  });

  ISSEntity.value = viewer.entities.getById("iss");

  setInterval(function () {
    getISSPosition().then((res) => {
      setIssPosition(res);
      positionProperty.addSample(
        Cesium.JulianDate.now(),
        Cesium.Cartesian3.fromDegrees(res.longitude, res.latitude, res.altitude)
      );
    });
  }, 2000);
});

// watch([altitudee, position, vector3D, diff], () => {
//   if (!viewer || !altitudee || !viewer?.entities?.getById("iss")) {
//     return;
//   }
//   const ISSEntity = viewer.entities.getById("iss");

//   if (ISSEntity === undefined) {
//     return;
//   }

//   if (diff.value !== undefined) {
//     const startPosition = position.value;
//     // 최초 포지션 바꾸기

//     let newPosition = {
//       longitude: startPosition.longitude - diff.value.longitude,
//       latitude: startPosition.latitude - diff.value.latitude,
//       altitude: altitudee.value,
//     };

//     if (newPosition.longitude >= 180) {
//       newPosition.longitude =
//         startPosition.longitude - diff.value.longitude - 360;
//     }
//     if (newPosition.longitude <= -180) {
//       newPosition.longitude =
//         startPosition.longitude - diff.value.longitude + 360;
//     }
//     if (newPosition.latitude >= -180) {
//       newPosition.latitude = startPosition.latitude - diff.value.latitude + 360;
//     }
//     if (newPosition.latitude <= -180) {
//       newPosition.latitude = startPosition.latitude - diff.value.latitude + 360;
//     }

//     // 엔티티에 적용
//     ISSEntity.position = Cesium.Cartesian3.fromDegrees(
//       newPosition.longitude,
//       newPosition.latitude,
//       newPosition.altitude
//     );

//     setTimeout(() => {
//       position.value = {
//         longitude: newPosition.longitude,
//         latitude: newPosition.latitude,
//       };
//     }, 1);
//   }
// });
</script>

<template>
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
