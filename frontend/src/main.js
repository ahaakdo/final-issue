import { createApp } from "vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";
import App from "./App.vue";
import { createPinia } from "pinia";
import router from "./router";
import "./style/reset.scss";
import "./style/variables.scss";
import "./style/background.scss";

const app = createApp(App);
const pinia = createPinia();

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.use(pinia).use(router).use(ElementPlus).mount("#app");
