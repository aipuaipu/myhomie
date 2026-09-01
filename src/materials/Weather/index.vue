<template>
  <div
    class="wrapper material-weather"
    :style="{
      fontSize: clampDisplayFontSize(componentSetting.baseFontSize, 14),
      color: componentSetting.textColor,
      textShadow: componentSetting.textShadow,
      padding: componentSetting.padding + 'px',
      fontFamily: componentSetting.fontFamily,
      ...positionCSS
    }"
  >
    <div class="weather-box">
      <div class="weather-icon-wrapper">
        <img
          :src="weatherIcon"
          :style="{
            filter: `drop-shadow(${componentSetting.iconShadow})`
          }"
          alt="weather icon"
        >
      </div>
      <div class="weather-text-wrapper">
        <div class="temperature">
          {{ temperature }}°
        </div>
        <div class="city">
          {{ cityName }} | {{ weatherText }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch, onUnmounted } from 'vue'
import { mapPosition } from '@/plugins/position-selector'
import { getWeatherIconURL, weatherFormatter, wmoToChinese } from './icon-map'
import { clampDisplayFontSize } from '@/utils'
import defaultIcon from '@/assets/imgs/weather-static-icon/not-available.svg'
import { ElNotification } from 'element-plus';
import { useI18n } from 'vue-i18n'

// --- 免费 API（无需 key，CORS 友好） ---
const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search'
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast'
// IP 备用：国内可达（ipinfo.io 在部分地区被墙）
const IP_GEO_API_CN = 'https://whois.pconline.com.cn/ipJson/json'

/** 通过浏览器 Geolocation 获取经纬度（需用户授权） */
function getBrowserGeo(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: 8000, maximumAge: 300000 }
    )
  })
}

/** 通过国内 IP 接口获取城市名，再用 geocoding 获取坐标 */
async function getGeoByIP(): Promise<{ latitude: number; longitude: number; city: string }> {
  // 尝试多个 IP 接口（应对 CORS / 被墙）
  const ipApis = [
    { url: 'https://ipwho.is/', parse: (d: any) => ({ city: d.city, lat: d.latitude, lon: d.longitude }) },
    { url: IP_GEO_API_CN, parse: (d: any) => ({ city: (d.city || d.province || '').replace(/[市城区]/g, ''), lat: 0, lon: 0 }) }
  ]
  for (const api of ipApis) {
    try {
      const res = await fetch(api.url)
      const data = await res.json()
      const info = api.parse(data)
      if (info.lat && info.lon) {
        return { latitude: info.lat, longitude: info.lon, city: info.city || '当前位置' }
      }
      if (info.city) {
        // 只有城市名，需要 geocoding 转坐标
        const searchUrl = `${GEOCODING_API}?name=${encodeURIComponent(info.city)}&count=1&language=zh`
        const searchRes = await fetch(searchUrl)
        const searchData = await searchRes.json()
        if (searchData.results && searchData.results.length > 0) {
          const { latitude, longitude, name } = searchData.results[0]
          return { latitude, longitude, city: (name || info.city).replace(/[市城区]/g, '') }
        }
      }
    } catch { /* try next API */ }
  }
  throw new Error('All IP geo APIs failed')
}

export default defineComponent({
  name: 'Weather',
  props: {
    componentSetting: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const positionCSS = computed(() => mapPosition(props.componentSetting.position))
    const cityName = ref('')
    const lat = ref(0)
    const lon = ref(0)

    const { t } = useI18n()

    const weatherIcon = ref(defaultIcon)
    const temperature = ref('24')
    const weatherText = ref('未知')

    const getWeather = async () => {
      try {
        const url = `${WEATHER_API}?latitude=${lat.value}&longitude=${lon.value}&current_weather=true`
        const res = await fetch(url)
        const data = await res.json()
        if (data.current_weather) {
          const { weathercode, temperature: _temperature } = data.current_weather
          const cnWeather = wmoToChinese(weathercode)
          weatherIcon.value = getWeatherIconURL(cnWeather, props.componentSetting.animationIcon)
          weatherText.value = weatherFormatter(cnWeather)
          temperature.value = String(Math.round(_temperature))
        } else {
          throw new Error('API error')
        }
      } catch {
        ElNotification({ title: t('提示'), type: 'error', message: t('获取天气失败，请检查配置!') })
      }
    }

    watch(() => [
      props.componentSetting.weatherMode,
      props.componentSetting.cityName,
      props.componentSetting.animationIcon
    ], async () => {
      try {
        if (props.componentSetting.weatherMode === 1) {
          // 自动模式：优先浏览器定位 → 备用 IP 接口
          try {
            const geo = await getBrowserGeo()
            lat.value = geo.latitude
            lon.value = geo.longitude
            cityName.value = '当前位置'
          } catch {
            // 浏览器定位失败（用户拒绝/超时），回退到国内 IP 接口
            try {
              const ipGeo = await getGeoByIP()
              lat.value = ipGeo.latitude
              lon.value = ipGeo.longitude
              cityName.value = ipGeo.city
            } catch {
              throw new Error('All geo methods failed')
            }
          }
        } else {
          // 手动模式：通过城市名搜索坐标
          if (!props.componentSetting.cityName) return
          const searchUrl = `${GEOCODING_API}?name=${encodeURIComponent(props.componentSetting.cityName)}&count=1&language=zh`
          const res = await fetch(searchUrl)
          const data = await res.json()
          if (data.results && data.results.length > 0) {
            const { latitude, longitude, name } = data.results[0]
            lat.value = latitude
            lon.value = longitude
            cityName.value = (name || props.componentSetting.cityName).replace(/[市城区]/g, '')
          } else {
            throw new Error('City not found')
          }
        }
      } catch {
        ElNotification({ title: t('提示'), type: 'error', message: t('无法识别出城市，请重新配置') })
      }
      getWeather()
    }, {
      immediate: true
    })

    // 定时刷新
    let timer: number | null
    const refreshTimer = () => {
      const refreshDuration = Math.max((props.componentSetting.duration || 120), 60) * 60 * 1000
      if (timer) {
        window.clearInterval(timer)
        timer = null
      }
      timer = window.setInterval(getWeather, refreshDuration)
    }
    watch(
      () => props.componentSetting.duration,
      () => refreshTimer(),
      { immediate: true }
    )
    onUnmounted(() => timer && window.clearInterval(timer))

    return {
      positionCSS,
      cityName,
      weatherIcon,
      weatherText,
      temperature
    }
  }
})
</script>
<style lang="scss" scoped>
.wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
}
.weather-box {
  display: flex;
  flex-wrap: wrap;
  max-width: 100%;
  .weather-icon-wrapper {
    display: flex;
    align-items: center;
    img {
      width: 4.4em;
      height: 4.4em;
    }
  }
  .weather-text-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.4em;
    justify-content: space-around;
    min-width: 0;
    max-width: 100%;
    .temperature {
      font-size: 2.8em;
    }
    .city {
      font-size: 0.8em;
      padding-right: 0.8em;
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}
</style>
