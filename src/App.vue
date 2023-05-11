<script setup lang="ts">
// import newTest from './newTest.vue'
import * as Cesium from "cesium";
import { onMounted, ref, watch } from "vue";
import axios from "axios";
import Iss from "./assets/ISS_stationary.glb";
import { Cartesian3 } from "cesium";
const backupAltitude = ref();
const altitudee = ref();
const position = ref();
const vector3D = ref<Cartesian3 | undefined>();
const ISSEntity = ref();
let viewer: Cesium.Viewer | undefined = undefined;

const getISSPosition = () =>
  axios
    .get("https://api.wheretheiss.at/v1/satellites/25544")
    .then(({ data }) => {
      const { longitude, latitude, altitude } = data;
      altitudee.value = altitude * 1000;
      backupAltitude.value = altitude * 1000;
      position.value = { longitude, latitude };
    });

onMounted(() => {
  viewer = new Cesium.Viewer("cesium", {
    shouldAnimate: true,
    // 필요없는 툴 들 다 false처리
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

  getISSPosition()
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
    .then(() => {
      get3DVector();
    });

  const get3DVector = () => {
    const start = Cesium.Cartesian3.fromDegrees(
      position.value.longitude,
      position.value.latitude,
      altitudee.value
    );

    setTimeout(() => {
      getISSPosition().then(() => {
        const end = Cesium.Cartesian3.fromDegrees(
          position.value.longitude,
          position.value.latitude,
          altitudee.value
        );
        const substraction = Cesium.Cartesian3.subtract(
          end,
          start,
          new Cesium.Cartesian3()
        );

        vector3D.value = Cesium.Cartesian3.divideByScalar(
          substraction,
          60,
          new Cesium.Cartesian3()
        );
      });
    }, 1000);
  };
});

setInterval(() => {
  get3DVector();
}, 10000);

watch([altitudee, position, vector3D], () => {
  if (!viewer || !altitudee || !viewer?.entities?.getById("iss")) {
    return;
  }
  const ISSEntity = viewer.entities.getById("iss");

  if (ISSEntity === undefined) {
    return;
  }

  if (vector3D.value !== undefined) {
    const startPosition = Cesium.Cartesian3.fromDegrees(
      position.value.longitude,
      position.value.latitude,
      altitudee.value
    );

    const newPosition = Cesium.Cartesian3.add(
      startPosition,
      vector3D.value,
      new Cesium.Cartesian3()
    );

    // 최초 포지션 바꾸기
    const cartographic = Cesium.Cartographic.fromCartesian(newPosition);
    const longitude = Cesium.Math.toDegrees(cartographic.longitude);
    const latitude = Cesium.Math.toDegrees(cartographic.latitude);

    ISSEntity.position = newPosition;

    setTimeout(() => {
      position.value = { longitude, latitude };
    }, 16);

    return;
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
  <!-- <newTest></newTest> -->
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
