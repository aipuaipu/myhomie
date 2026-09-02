<template>
  <div
    class="wrapper material-daily-hot"
    :style="{
      fontSize: componentSetting.textFontSize + 'px',
      color: componentSetting.textColor,
      textShadow: componentSetting.textShadow,
      padding: componentSetting.padding + 'px',
      fontFamily: componentSetting.fontFamily,
      ...positionCSS
    }"
  >
    <div class="daily-hot">
      <div class="classify-header">
        <span class="classify-active-label">{{ activeClassifyLabel }}</span>
        <span
          class="classify-toggle"
          @click="showSwitcher = !showSwitcher"
        >切换</span>
      </div>
      <transition name="switcher-slide">
        <div v-show="showSwitcher" class="classify-switcher">
          <div
            v-for="item in classifyList"
            :key="item.value"
            :class="['classify-tag', activeClassify === item.value ? 'active' : '']"
            @click="onSwitchClassify(item)"
          >
            {{ item.label }}
          </div>
        </div>
      </transition>
      <div class="list-wrapper scrollbar1">
        <div v-if="listLoading" class="loading">Loading...</div>
        <div v-else-if="listError" class="error">Something Error.</div>
        <template v-else>
          <a
            v-for="item in list"
            :key="item.title"
            class="list-item"
            :href="item.url"
            :title="item.title"
            :style="!isLock ? 'pointer-events: none' : ''"
            target="_blank">
            <li>{{ item.title }}</li>
          </a>
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref, computed } from 'vue'
import { useStore } from '@/store'
import { mapPosition } from '@/plugins/position-selector'
import request from '@/utils/request'
import { DAILY_HOT_CLASSIFY } from '@/constanst'
const props = defineProps({
  componentSetting: {
    type: Object,
    required: true
  }
})
const store = useStore()
const isLock = computed(() => store.isLock)

type Classify = {
  label: string,
  value: string
}
type ListItem = {
  title: string,
  url: string
}

// 支持的平台 value 集合（用于运行时校验）
const validValues = new Set(DAILY_HOT_CLASSIFY.map(item => item.value))
// 默认启用列表（与 setting.tsx 保持一致）
const DEFAULT_ENABLE_LIST = ['weibo', 'zhihu', 'sspai', 'bilibili']

const classifyList = computed(() => {
  // 过滤掉已废弃/不存在的选项
  const valid = (props.componentSetting.enableList || []).filter((v: string) => validValues.has(v))
  // 如果过滤后为空，回退到默认值
  const effective = valid.length > 0 ? valid : DEFAULT_ENABLE_LIST
  return DAILY_HOT_CLASSIFY.filter(item => effective.includes(item.value))
})
const activeClassify = ref('')
const showSwitcher = ref(false)
const activeClassifyLabel = computed(() => {
  const found = classifyList.value.find(item => item.value === activeClassify.value)
  return found ? found.label : ''
})

onMounted(() => {
  activeClassify.value = classifyList.value[0].value
  getList()
})

const positionCSS = computed(() => mapPosition(props.componentSetting.position))

const onSwitchClassify = (item: Classify) => {
  activeClassify.value = item.value
  showSwitcher.value = false
  getList()
}

const listLoading = ref(false)
const listError = ref(false)
const list = ref<ListItem[]>([])
const UAPIS_BASE = 'https://uapis.cn/api/v1/hotboard'
const DEFAULT_API_KEY = 'uapi-aucaiixs31YDT02g6c0TV0gtFyhpADae7ZqPeA5f'
const getList = async (retry = false) => {
  listLoading.value = true
  listError.value = false
  list.value = []
  try {
    let _classify = activeClassify.value
    const url = `${UAPIS_BASE}/${activeClassify.value}`
    const apiKey = props.componentSetting.apiKey || DEFAULT_API_KEY
    const res = await request({ url, timeout: retry ? 5000 : 10000, headers: { 'X-API-Key': apiKey } })
    if (_classify === activeClassify.value) {
      const items = res.list || []
      list.value = items.slice(0, props.componentSetting.limit).map((item: any) => ({
        title: item.title,
        url: item.url
      }))
    }
  } catch {
    if (!retry) {
      // try fetch source again
      getList(true)
    } else {
      listError.value = true
    }
  } finally {
    listLoading.value = false
  }
}


</script>

<style lang="scss" scoped>
.wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  .daily-hot {
    display: flex;
    width: 100%;
    height: 100%;
    flex-direction: column;
    user-select: none;
    .classify-header {
      display: flex;
      align-items: center;
      gap: 0.5em;
      .classify-active-label {
        font-weight: bold;
        opacity: 0.9;
      }
      .classify-toggle {
        font-size: 0.85em;
        padding: 0.15em 0.5em;
        border-radius: 4px;
        cursor: pointer;
        opacity: 0.6;
        transition: opacity 0.2s;
        &:hover {
          opacity: 1;
          background: rgba(255,255,255,0.15);
        }
      }
    }
    .classify-switcher {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3em;
      padding: 0.4em 0;
      overflow-y: auto;
      max-height: 50%;
      .classify-tag {
        padding: 0.2em 0.5em;
        border-radius: 4px;
        cursor: pointer;
        opacity: 0.7;
        transition: all 0.2s;
        &:hover {
          opacity: 1;
          background: rgba(255,255,255,0.15);
        }
        &.active {
          background: rgba(255,255,255,0.2);
          opacity: 1;
        }
      }
    }
    .switcher-slide-enter-active,
    .switcher-slide-leave-active {
      transition: all 0.25s ease;
      overflow: hidden;
    }
    .switcher-slide-enter-from,
    .switcher-slide-leave-to {
      max-height: 0;
      opacity: 0;
      padding: 0;
    }
    .switcher-slide-enter-to,
    .switcher-slide-leave-from {
      max-height: 50%;
      opacity: 1;
    }
    .list-wrapper {
      flex: 1;
      height: 100%;
      overflow-y: auto;
      margin-top: 0.4em;
      .list-item,
      .loading,
      .error {
        display: block;
        color: inherit;
        text-decoration: none;
        padding: 0.3em 0.5em;
        border-radius: 4px;
        box-sizing: border-box;
        line-height: 1.4;
      }
      .list-item {
        cursor: pointer;
        li {
          list-style: circle;
          width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        &:hover {
          text-decoration: underline;
        }
      }
    }
  }
}
</style>