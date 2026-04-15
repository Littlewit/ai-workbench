import { createRouter, createWebHistory } from "vue-router";
import AiWorkspace from "@/views/AiWorkspace.vue";

// define the routes
const routes = [
  {
    path: "/",
    name: "AiWorkspace",
    component: AiWorkspace,
  }
];

// create the router
const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
