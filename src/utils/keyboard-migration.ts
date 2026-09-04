type KeySetting = {
  url?: string;
}

const KEYBOARD_CONFIG_VERSION = 2

const legacyKeyMaps = [
  {
    G: 'https://github.com',
    J: 'https://juejin.cn'
  },
  {
    Q: 'https://chatgpt.com',
    W: 'https://gemini.google.com',
    '=': 'https://github.com'
  }
]

const multipleAffixMarkers = ['掘金', '微博', 'Github Trending']

const normalizeUrl = (url = '') => url.replace(/\/+$/, '').toLowerCase()

const isLegacyKeyMap = (keyMap: Record<string, KeySetting>) => {
  const keys = Object.keys(keyMap)
  return legacyKeyMaps.some(legacyMap => {
    const legacyKeys = Object.keys(legacyMap)
    return keys.length === legacyKeys.length && legacyKeys.every(key => normalizeUrl(keyMap[key]?.url) === legacyMap[key as keyof typeof legacyMap])
  })
}

export const migrateLegacyKeyboardMap = <T extends Record<string, any>>(
  components: T[],
  defaultKeyMap: Record<string, KeySetting>
) => {
  let changed = false
  const migratedComponents = components.map(component => {
    if (component.material !== 'Collection') return component

    const setting = component.componentSetting
    const keyMap = setting?.userSettingKeyMap as Record<string, KeySetting> | undefined
    if (setting?.keyboardConfigVersion === KEYBOARD_CONFIG_VERSION || !keyMap || !isLegacyKeyMap(keyMap)) {
      return component
    }

    changed = true
    return {
      ...component,
      componentSetting: {
        ...setting,
        keyboardConfigVersion: KEYBOARD_CONFIG_VERSION,
        userSettingKeyMap: JSON.parse(JSON.stringify(defaultKeyMap))
      }
    }
  })

  return { components: migratedComponents, changed }
}

export const restoreMissingMultipleList = <T extends Record<string, any>>(
  list: T[],
  affix: T[],
  defaultList: T[]
) => {
  if (list.length || !defaultList.length) return { list, changed: false }

  const markerSet = new Set(
    affix
      .filter(component => component.material === 'Empty')
      .map(component => component.componentSetting?.customText)
  )
  if (!multipleAffixMarkers.every(marker => markerSet.has(marker))) {
    return { list, changed: false }
  }

  return {
    list: JSON.parse(JSON.stringify(defaultList)) as T[],
    changed: true
  }
}
