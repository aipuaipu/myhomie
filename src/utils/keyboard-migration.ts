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
