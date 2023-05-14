<script setup lang="ts">
// import newTest from './newTest.vue'
import * as Cesium from "cesium";
import { onMounted, ref, watch } from "vue";
import axios from "axios";
import Iss from "./assets/ISS_stationary.glb";
import { Cartesian3 } from "cesium";

type Vector3D = {
  longitude: number;
  latitude: number;
  altitude: number;
};


const altitudee = ref();
const position = ref();

const ISSEntity = ref();

const 첫째위치 = ref<Vector3D | undefined>();
const 보간배열 = ref<Vector3D[] | undefined>();
const 둘째위치 = ref<Vector3D | undefined>();

let viewer: Cesium.Viewer | undefined = undefined;

const getISSPosition = (): Promise<Vector3D> =>
  axios
    .get("https://api.wheretheiss.at/v1/satellites/25544")
    .then(({ data }) => {
      const { longitude, latitude, altitude } = data;
      return { longitude, latitude, altitude };
    });

const setIssPosition = ({ longitude, latitude, altitude }: Vector3D) => {
  altitudee.value = altitude * 1000;

  position.value = { longitude, latitude };
};

const 위치차구하기 = () => {
  getISSPosition()
    .then((res) => {
      첫째위치.value = res;
    })
    .then(() => {
      setTimeout(() => {
        getISSPosition().then((res) => {
          둘째위치.value = res;
        });
      }, 2000);
    });
};
const 보간구하기 = (first: Vector3D, second: Vector3D) => {
  const 총프레임 = 120;

  const 프레임차 = {
    longitude: (first.longitude - second.longitude) / 총프레임,
    latitude: (first.latitude - second.latitude) / 총프레임,
    altitude: (first.altitude - second.altitude) / 총프레임,
  };

  const 보간배열 = Array.from({ length: 120 }, () => {});

  const 변환배열 = 보간배열.map((e, i) => ({
    longitude: first.longitude + 프레임차.longitude * i + 1,
    latitude: first.latitude + 프레임차.latitude * i + 1,
    altitude: first.altitude + 프레임차.altitude * i + 1,
  }));
  return 변환배열 as Vector3D[];
};
watch([첫째위치], () => {
  if (!첫째위치.value || !둘째위치.value) {
    return;
  }
  보간배열.value = 보간구하기(첫째위치.value, 둘째위치.value);
});

watch(보간배열, () => {
  async function processArray() {
    if (보간배열.value === undefined) {
      return;
    }
    for (const e of 보간배열.value) {
      await new Promise((resolve) => {
        setTimeout(() => {
          position.value = { longitude: e.longitude, latitude: e.latitude };
          resolve();
        }, 2000 / 120);
      });
    }
  }
  processArray();
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

  getISSPosition().then((res) => {
    setIssPosition(res);
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
  });
  setInterval(() => {
    위치차구하기();
  }, 2000);
});

/**첫랜더 */
watch([altitudee, position], () => {
  if (!viewer || !altitudee || !viewer?.entities?.getById("iss")) {
    return;
  }
  const ISSEntity = viewer.entities.getById("iss");

  if (ISSEntity === undefined) {
    return;
  }

  ISSEntity.position = Cartesian3.fromDegrees(
    position.value.longitude,
    position.value.latitude,
    altitudee.value
  );
});
</script>

<template>
  <!-- <button
    @click="
      () => {
        추락시키기 = !추락시키기;
      }
    "
  >
    {{ 추락시키기 ? "다시 올리기" : "추락시키기" }}
  </button> -->
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
