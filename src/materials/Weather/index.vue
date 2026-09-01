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
const IP_GEO_API = 'https://ipinfo.io/json'

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
          // 自动模式：通过 IP 获取位置
          const res = await fetch(IP_GEO_API)
          const data = await res.json()
          if (data.latitude && data.longitude) {
            lat.value = data.latitude
            lon.value = data.longitude
            cityName.value = (data.city || '').replace(/[市城区]/g, '')
          } else {
            throw new Error('IP geolocation failed')
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
