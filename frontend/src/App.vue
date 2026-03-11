<template>
  <router-view />
</template>

<script setup>
import { onMounted } from "vue";
import { useAppStore } from "@/store/app";

onMounted(() => {
  document.body.setAttribute("layout", "vertical");
  useAppStore().applyTheme();
});
</script>

<style>
#app {
  min-height: 100vh;
}
</style>
