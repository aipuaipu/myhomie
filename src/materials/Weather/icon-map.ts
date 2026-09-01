/** 将 Open-Meteo WMO 天气代码转换为中文描述 */
export function wmoToChinese(code: number): string {
  const map: Record<number, string> = {
    0: '晴', 1: '晴', 2: '多云', 3: '阴',
    45: '雾', 48: '雾',
    51: '小雨', 53: '小雨', 55: '小雨',
    56: '小雨', 57: '小雨',
    61: '小雨', 63: '大雨', 65: '大雨',
    66: '雨夹雪', 67: '雨夹雪',
    71: '雪', 73: '雪', 75: '雪', 77: '雪',
    80: '小雨', 81: '大雨', 82: '大雨',
    85: '雪', 86: '雪',
    95: '雷阵雨', 96: '雷阵雨', 99: '雷阵雨',
  }
  return map[code] ?? '未知'
}

export function weatherFormatter(name: string) {
  if (name.includes('风')) {
    if (['龙卷风', '狂爆风', '飓风', '热带风暴'].includes(name)) {
      return '龙卷风'
    } else {
      return '风'
    }
  }
  if (name.includes('霾') || name.includes('雾')) {
    if (['重', '大', '浓', '沙', '尘'].some(i => name.includes(i))) {
      return '大雾'
    } else {
      return '小雾'
    }
  }
  if (name.includes('雨')) {
    if (name.includes('雷')) {
      return '雷阵雨'
    } else if (name.includes('雪')) {
      return '雨夹雪'
    } else if (name.includes('大') || name.includes('暴')) {
      return '大雨'
    } else {
      return '小雨'
    }
  }
  if (name.includes('雪')) {
    return '雪'
  }
  return name
}

export const weatherMap: Record<string, any> = {
  晴: 'clear-day',
  少云: 'cloudy',
  晴间多云: 'overcast-day',
  多云: 'overcast',
  阴: 'overcast',
  平静: 'overcast',
  风: 'wind',
  龙卷风: 'hurricane',
  大雾: 'fog',
  小雾: 'mist',
  雷阵雨: 'thunderstorms-rain',
  大雨: 'rain',
  小雨: 'drizzle',
  雨夹雪: 'sleet',
  雪: 'snow',
  热: 'thermometer-warmer',
  冷: 'thermometer-colder',
  未知: 'not-available'
}

function getAnimationIcon(name: string) {
  return new URL(`../../assets/imgs/weather-animation-icon/${name}.svg`, import.meta.url).href
}

function getStaticIcon(name: string) {
  return new URL(`../../assets/imgs/weather-static-icon/${name}.svg`, import.meta.url).href
}

export function getWeatherIconURL(name: string, isAnimationIcon = true) {
  const _name = weatherFormatter(name) || '未知'
  const word = weatherMap[_name] || 'not-available'
  return isAnimationIcon === false ? getStaticIcon(word) : getAnimationIcon(word)
  // return `https://cdn.jsdelivr.net/gh/leon-kfd/weather-icons/production/line/all/${word}.svg`
}
