// Servicio para gestionar la programación de lecciones a las 07:00 AM
class LeccionScheduler {
  constructor() {
    this.hasShownTodayNotification = false
    this.notificationCheckInterval = null
  }

  // Iniciar el scheduler
  start() {
    // Verificar cada minuto si es hora de mostrar la notificación
    this.notificationCheckInterval = setInterval(() => {
      this.checkAndNotify()
    }, 60000) // Verificar cada minuto

    // Verificar inmediatamente al iniciar
    this.checkAndNotify()
  }

  // Detener el scheduler
  stop() {
    if (this.notificationCheckInterval) {
      clearInterval(this.notificationCheckInterval)
      this.notificationCheckInterval = null
    }
  }

  // Verificar si es hora de mostrar la notificación
  checkAndNotify() {
    const ahora = new Date()
    const hora = ahora.getHours()
    const minuto = ahora.getMinutes()
    const diaSemana = ahora.getDay()

    // Verificar si es entre 07:00 y 07:59 (dentro de la hora 7)
    // Y que sea lunes (1) a viernes (5)
    if (hora === 7 && diaSemana >= 1 && diaSemana <= 5) {
      // Verificar que no haya mostrado la notificación hoy
      const ultimaNotificacion = localStorage.getItem('leccion-notificacion-fecha')
      const fechaHoy = this.obtenerFechaString(ahora)

      if (ultimaNotificacion !== fechaHoy) {
        this.mostrarNotificacion()
        localStorage.setItem('leccion-notificacion-fecha', fechaHoy)
      }
    }
  }

  // Mostrar notificación del navegador
  mostrarNotificacion() {
    const diasNombre = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const ahora = new Date()
    const diaSemana = diasNombre[ahora.getDay()]

    const lecciones = {
      'Lunes': 'Ley 6380: Decreto Reglamentario de Sociedades Mercantiles',
      'Martes': 'NIIF 1: Adopción por Primera Vez de las NIIF',
      'Miércoles': 'NIIF 8: Segmentos de Operación',
      'Jueves': 'Ley 6380: Derechos y Deberes de Accionistas',
      'Viernes': 'NIIF 15: Ingresos de Actividades Ordinarias'
    }

    const titulo = lecciones[diaSemana] || 'Nueva Lección del Día'

    // Usar la Notification API del navegador si está disponible
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('📚 Lección del Día', {
          body: titulo,
          icon: '📚',
          badge: '🎓',
          tag: 'leccion-diaria',
          requireInteraction: false
        })
      } else if (Notification.permission !== 'denied') {
        // Pedir permiso si no lo ha hecho aún
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('📚 Lección del Día', {
              body: titulo,
              icon: '📚',
              badge: '🎓',
              tag: 'leccion-diaria'
            })
          }
        })
      }
    }

    // Disparar evento personalizado para que otros componentes se enteren
    window.dispatchEvent(
      new CustomEvent('leccion-del-dia-notificacion', {
        detail: { titulo, dia: diaSemana }
      })
    )
  }

  // Obtener fecha como string (YYYY-MM-DD)
  obtenerFechaString(fecha) {
    return fecha.toISOString().split('T')[0]
  }
}

// Crear instancia global
const leccionScheduler = new LeccionScheduler()

export default leccionScheduler
