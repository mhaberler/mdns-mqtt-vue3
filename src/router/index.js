import { createRouter, createWebHistory } from 'vue-router'
import ScannerView from '../views/ScannerView.vue'
import MQTTClientView from '../views/MQTTClientView.vue'

const routes = [
  {
    path: '/',
    name: 'Scanner',
    component: ScannerView
  },
  {
    path: '/mqtt-client',
    name: 'MQTTClient',
    component: MQTTClientView,
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
