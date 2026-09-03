<template>
  <div
    class="wrapper material-weibolist"
    :style="{
      fontSize: componentSetting.textFontSize + 'px',
      color: componentSetting.textColor,
      textShadow: componentSetting.textShadow,
      padding: componentSetting.padding + 'px',
      fontFamily: componentSetting.fontFamily,
      ...positionCSS
    }"
  >
    <div class="weibo">
      <div
        v-if="componentSetting.showTitle !== false"
        class="logo"
        :style="{ cursor: componentSetting.clickActionType ? 'pointer' : 'default' }"
        @click="handleClickAction"
      >
        <svg viewBox="0 0 24 24" :style="{ filter: `drop-shadow(${componentSetting.iconShadow})` }">
          <path
            :fill="componentSetting.textColor"
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
          />
        </svg>
        <div class="logo-text">
          AI快讯
        </div>
      </div>
      <div v-if="loading" class="loading">
        Loading...
      </div>
      <div v-else-if="error" class="error">
        Something error!
      </div>
      <div v-else class="list">
        <div v-for="item in list" :key="item.id" class="list-item">
          <div class="num" style="width: 24px; height: 24px">
            <span v-if="item.rank" class="rank" :class="{ hot: item.rank <= 3 }">{{ item.rank }}</span>
          </div>
          <div class="title">
            <a
              :href="item.link"
              :target="componentSetting.jumpType === 2 ? '_self': '_blank'"
              :style="!isLock ? 'pointer-events: none' : ''"
              :title="item.title"
            >{{ item.title }}</a>
          </div>
          <div v-if="item.source" class="source" :title="item.source">
            {{ item.source }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref, computed, onUnmounted, watch } from 'vue'
import { useStore } from '@/store'
import { mapPosition } from '@/plugins/position-selector'
import request from '@/utils/request'
const props = defineProps({
  componentSetting: {
    type: Object,
    required: true
  }
})
const store = useStore()
const isLock = computed(() => store.isLock)
const list = ref<any[]>([])
const loading = ref(false)
const error = ref(false)
const getList = async () => {
  try {
    loading.value = true
    error.value = false
    const limit = props.componentSetting.limit || 10
    const data = await request({
      url: `https://aihot.virxact.com/api/v1/hot-topics`,
      headers: {
        'User-Agent': 'aihot-api/1.0 aihot-actor/howdz-dashboard'
      },
      params: {
        limit: String(limit)
      }
    })
    if (data && data.items) {
      list.value = data.items.slice(0, limit).map((item: any) => {
        return {
          id: item.id,
          rank: item.rank,
          title: item.title,
          source: item.source?.name || '',
          link: item.links?.original || item.links?.aihot || '#',
          count: item.signalCount || item.sourceCount || 0
        }
      })
    } else {
      throw new Error('No data')
    }
  } catch (e) {
    error.value = true
    console.error(e)
  } finally {
    loading.value = false
  }
}

let timer: number
function init() {
  getList()
  if (timer) window.clearInterval(timer)
  timer = window.setInterval(() => {
    getList()
  }, props.componentSetting.duration * 60 * 1000)
}
onMounted(() => init())
onUnmounted(() => window.clearInterval(timer))
watch(
  () => [props.componentSetting.duration, props.componentSetting.limit],
  () => init()
)

const positionCSS = computed(() => mapPosition(props.componentSetting.position))

const handleClickAction = () => {
  if (props.componentSetting.clickActionType === 1) {
    init()
  } else if (props.componentSetting.clickActionType === 2) {
    window.open('https://aihot.virxact.com/')
  }
}
</script>
<style lang="scss" scoped>
.wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  .weibo {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    .logo {
      margin-bottom: 0.5em;
      display: flex;
      align-items: center;
      svg {
        width: 2em;
        height: auto;
      }
      .logo-text {
        font-size: 1.2em;
        font-weight: 500;
        margin-left: 0.4em;
      }
    }
    .list {
      flex: 1;
      overflow-y: auto;
      .list-item {
        display: flex;
        align-items: center;
        font-size: 1em;
        line-height: 1.5;
        .num {
          display: flex;
          align-items: center;
          justify-content: center;
          .rank {
            font-size: 0.85em;
            font-weight: 600;
            color: #99a;
            &.hot {
              color: #ff6b6b;
            }
          }
        }
        .title {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          a {
            color: inherit;
            text-decoration: none;
          }
        }
        .source {
          font-size: 0.75em;
          color: #99a;
          margin-left: 0.5em;
          text-shadow: none;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex-shrink: 0;
        }
      }
    }
  }
}
</style>
