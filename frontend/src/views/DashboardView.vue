<template>
  <div class="animate-fadeIn space-y-6">
    <!-- Header con selector de período -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Dashboard</h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1 text-sm font-semibold">
          Resumen de actividad del sistema de soporte
        </p>
      </div>

      <!-- Selector de Período -->
      <div class="flex items-center gap-2.5 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl shadow-xs border border-slate-100 dark:border-slate-800 self-start md:self-auto">
        <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span class="text-xs font-semibold text-slate-600 dark:text-slate-350">Período:</span>
        <select
          v-model="selectedPeriod"
          @change="handlePeriodChange"
          class="bg-transparent text-sm font-bold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
        >
          <option value="hoy">Hoy</option>
          <option value="semana">Últimos 7 días</option>
          <option value="mes">Últimos 30 días</option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20">
      <svg class="animate-spin h-10 w-10 text-primary mb-3" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span class="text-sm font-semibold text-slate-400 dark:text-slate-300">Cargando estadísticas...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-red-100/80 dark:border-red-900/30 shadow-md">
      <svg class="w-12 h-12 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <p class="text-red-500 dark:text-red-300 text-xs mb-4 font-semibold">{{ error }}</p>
      <BaseButton variant="outline" @click="fetchStats">Intentar de nuevo</BaseButton>
    </div>

    <!-- Dashboard Content -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
      
      <!-- Columna Izquierda: Tarjetas de Resumen -->
      <div class="space-y-6 lg:col-span-1 flex flex-col">
        <div class="space-y-4">
          <!-- Tarjeta: Tickets Totales -->
          <BaseCard class="border-l-4 border-l-primary">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-primary/10 rounded-xl p-3">
                <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div class="ml-4 flex-1">
                <p class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Tickets Totales</p>
                <p class="text-3xl font-black text-slate-800 dark:text-white mt-1">{{ stats.totalTickets || 0 }}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                  {{ periodLabel }}
                </p>
              </div>
            </div>
          </BaseCard>

          <!-- Tarjeta: Tickets Abiertos -->
          <BaseCard class="border-l-4 border-l-amber-500">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-amber-500/10 rounded-xl p-3">
                <svg class="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="ml-4 flex-1">
                <p class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Tickets Abiertos</p>
                <p class="text-3xl font-black text-slate-800 dark:text-white mt-1">{{ stats.ticketsAbiertos || 0 }}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                  Nuevos + Asignados + Esperando
                </p>
              </div>
            </div>
          </BaseCard>

          <!-- Tarjeta: Tickets Cerrados -->
          <BaseCard class="border-l-4 border-l-green-500">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-green-500/10 rounded-xl p-3">
                <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="ml-4 flex-1">
                <p class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Tickets Cerrados</p>
                <p class="text-3xl font-black text-slate-800 dark:text-white mt-1">{{ stats.ticketsCerrados || 0 }}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                  Resueltos exitosamente
                </p>
              </div>
            </div>
          </BaseCard>

          <!-- Tarjeta: Tiempo Promedio de Respuesta -->
          <BaseCard class="border-l-4 border-l-purple-500">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-purple-500/10 rounded-xl p-3">
                <svg class="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div class="ml-4 flex-1">
                <p class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Tiempo Promedio</p>
                <p class="text-3xl font-black text-slate-800 dark:text-white mt-1">{{ stats.tiempoPromedioRespuesta ? stats.tiempoPromedioRespuesta + 'm' : '0h' }}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                  Primera respuesta
                </p>
              </div>
            </div>
          </BaseCard>
        </div>

        <!-- Gráfico de Distribución por Estado (Donut) -->
        <BaseCard class="flex-1 min-h-0 flex flex-col">
          <template #header>
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Distribución por Estado
            </h3>
          </template>
          <div class="flex-1 min-h-0 relative" style="min-height: 200px;">
            <DoughnutChart 
              :data="doughnutChartData" 
              :options="doughnutChartOptions"
              class="!h-full !w-full"
            />
          </div>
        </BaseCard>
      </div>

      <!-- Columna Derecha: Gráficos Grandes -->
      <div class="space-y-6 lg:col-span-2 flex flex-col">
        
        <!-- Gráfico de Evolución de Tickets (Línea) -->
        <BaseCard class="flex-1 min-h-0 flex flex-col">
          <template #header>
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Evolución de Tickets
            </h3>
          </template>
          <div class="flex-1 min-h-0 relative" style="min-height: 250px;">
            <LineChart 
              :data="lineChartData" 
              :options="lineChartOptions"
              class="!h-full !w-full"
            />
          </div>
        </BaseCard>

        <!-- Gráfico de Tickets por Técnico (Barras) -->
        <BaseCard class="flex-1 min-h-0 flex flex-col">
          <template #header>
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Tickets por Técnico
            </h3>
          </template>
          <div class="flex-1 min-h-0 relative" style="min-height: 250px;">
            <BarChart 
              :data="barChartData" 
              :options="barChartOptions"
              class="!h-full !w-full"
            />
          </div>
        </BaseCard>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line, Bar, Doughnut } from 'vue-chartjs'
import { getDashboardStats } from '@/services/statsService'

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const router = useRouter()
const authStore = useAuthStore()

const LineChart = Line
const BarChart = Bar
const DoughnutChart = Doughnut

// Estados
const loading = ref(false)
const error = ref('')
const selectedPeriod = ref('hoy')
const stats = ref({})
const evolutionData = ref([])
const byTechnicianData = ref([])
const byStatusData = ref({})

// Computed: Etiqueta del período seleccionado
const periodLabel = computed(() => {
  const labels = {
    'hoy': 'Hoy',
    'semana': 'Últimos 7 días',
    'mes': 'Últimos 30 días'
  }
  return labels[selectedPeriod.value] || 'Hoy'
})

// Computed: Datos para gráfico de línea (evolución)
const lineChartData = computed(() => ({
  labels: evolutionData.value.map(d => d.fecha),
  datasets: [
    {
      label: 'Nuevos',
      data: evolutionData.value.map(d => d.nuevos || 0),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 5
    },
    {
      label: 'Cerrados',
      data: evolutionData.value.map(d => d.cerrados || 0),
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 5
    }
  ]
}))

const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        usePointStyle: true,
        padding: 20,
        font: { size: 11, weight: 'bold' }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { font: { size: 10 } },
      grid: { color: 'rgba(148, 163, 184, 0.1)' }
    },
    x: {
      ticks: { font: { size: 10 } },
      grid: { display: false }
    }
  }
}

// Computed: Datos para gráfico de barras (por técnico)
const barChartData = computed(() => ({
  labels: byTechnicianData.value.map(d => d.nombre),
  datasets: [{
    label: 'Tickets Atendidos',
    data: byTechnicianData.value.map(d => d.total || 0),
    backgroundColor: [
      'rgba(59, 130, 246, 0.8)',
      'rgba(16, 185, 129, 0.8)',
      'rgba(245, 158, 11, 0.8)',
      'rgba(139, 92, 246, 0.8)',
      'rgba(236, 72, 153, 0.8)',
      'rgba(20, 184, 166, 0.8)'
    ],
    borderRadius: 8,
    borderSkipped: false
  }]
}))

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { font: { size: 10 }, stepSize: 1 },
      grid: { color: 'rgba(148, 163, 184, 0.1)' }
    },
    x: {
      ticks: { font: { size: 10 } },
      grid: { display: false }
    }
  }
}

// Computed: Datos para gráfico de dona (por estado)
const doughnutChartData = computed(() => {
  const labels = Object.keys(byStatusData.value)
  const data = Object.values(byStatusData.value)
  // Si no hay datos, mostrar un placeholder
  if (data.length === 0) {
    return {
      labels: ['Sin datos'],
      datasets: [{ data: [1], backgroundColor: ['#e2e8f0'] }]
    }
  }
  return {
    labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
    datasets: [{
      data: data,
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',   // nuevo - azul
        'rgba(245, 158, 11, 0.8)',   // asignado - ámbar
        'rgba(139, 92, 246, 0.8)',   // esperando - púrpura
        'rgba(16, 185, 129, 0.8)',   // resuelto - verde
        'rgba(100, 116, 139, 0.8)'   // cerrado - slate
      ],
      borderWidth: 0,
      hoverOffset: 10
    }]
  }
})

const doughnutChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        usePointStyle: true,
        padding: 15,
        font: { size: 10, weight: 'bold' }
      }
    }
  },
  cutout: '65%'
}

// Función para cargar estadísticas
const fetchStats = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await getDashboardStats(selectedPeriod.value)
    if (response.success) {
      stats.value = response.data.stats || {}
      evolutionData.value = response.data.evolucion || []
      byTechnicianData.value = response.data.porTecnico || []
      byStatusData.value = response.data.porEstado || {}
    } else {
      error.value = response.error || 'Error al cargar estadísticas'
    }
  } catch (err) {
    console.error('Error fetching stats:', err)
    error.value = err.response?.data?.error || 'Error de conexión con la API'
  } finally {
    loading.value = false
  }
}

const handlePeriodChange = () => {
  fetchStats()
}

// Al montar: verificar que sea supervisor y cargar datos
onMounted(() => {
  if (!authStore.isSupervisor) {
    router.push('/')
    return
  }
  fetchStats()
})
</script>