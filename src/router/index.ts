import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import ScannerView from '../views/ScannerView.vue'
import HostsView from '../views/HostsView.vue'
import MQTTClientView from '../views/MQTTClientView.vue'
import DashboardView from '../views/DashboardView.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Scanner',
    component: ScannerView
  },
  {
    path: '/hosts',
    name: 'Hosts',
    component: HostsView
  },
  {
    path: '/mqtt-client',
    name: 'MQTTClient',
    component: MQTTClientView,
    props: true
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: DashboardView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
