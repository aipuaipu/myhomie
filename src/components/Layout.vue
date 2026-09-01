<template>
  <div v-if="windowWidth > 0" class="grid-wrapper" :style="gridWrapperStyle">
    <grid-layout
      v-model:layout="list"
      :col-num="12"
      :row-height="rowHeight"
      :margin="[global.gutter, global.gutter]"
      :is-draggable="!isLock && !isMobileView"
      :is-resizable="!isLock && !isMobileView"
      :use-css-transforms="false"
      @layout-updated="handleLayoutListUpdated"
    >
      <grid-item
        v-for="item in list"
        :id="item.customId || undefined"
        :key="item.i"
        :class="[`grid-item-${item.material}`]"
        :x="gridItemCoords(item).x"
        :y="gridItemCoords(item).y"
        :w="gridItemCoords(item).w"
        :h="item.h"
        :i="item.i"
        :style="{ 'z-index': item.zIndex || 1 }"
      >
        <div
          v-if="!item.refresh"
          v-mouse-menu="{ disabled: () => isLock, params: item, menuList, iconType: 'vnode-icon' }"
          class="item-content"
          :class="!isLock && 'show-outline-1'"
          :style="{
            boxShadow: item.boxShadow,
            borderRadius: item.borderRadius + 'px',
            userSelect: item.actionSetting && item.actionSetting.actionType === 1 ? 'none' : 'auto',
            cursor:
              item.actionSetting && item.actionSetting.actionType === 1 ? 'pointer' : 'default'
          }"
        >
          <div
            class="bg"
            :style="{
              background: item.background,
              borderRadius: item.borderRadius + 'px',
              filter: item.background.includes('url') && item.backgroundFilter,
              backdropFilter: !item.background.includes('url') && item.backdropFilter
            }"
          />
          <component
            :is="item.material"
            :element="item"
            :component-setting="item.componentSetting"
            @click="handleComponentClick(item, $event)"
          />
        </div>
      </grid-item>
    </grid-layout>
  </div>
  <div class="affix-wrapper">
    <div
      v-for="element in affix"
      :id="element.customId || undefined"
      :key="element.i"
      v-to-control="{
        positionMode: element.affixInfo ? element.affixInfo.mode : 1,
        moveCursor: false,
        disabled: () => isLock || isMobileView,
        arrowOptions: {
          lineColor: '#9a98c3',
          size: 12,
          padding: 8
        }
      }"
      class="affix-item"
      :class="[!isLock && 'show-outline-2', isToControlFinishedInit && 'finished-init']"
      :style="{
        width: `${element.w}px`,
        height: `${element.h}px`,
        zIndex: element.zIndex || 2,
        transform: computedAffixTransform(element),
        transformOrigin: computedAffixOrigin(element),
        ...(element.affixInfo ? computedPosition(element, element.affixInfo) : {})
      }"
      @todragend="handleAffixDragend($event, element)"
      @tocontrolend="handleAffixDragend($event, element)"
      @todraginit="handleToControlInit"
    >
      <div
        v-if="!element.refresh"
        v-mouse-menu="{ disabled: () => isLock, params: element, menuList, iconType: 'vnode-icon' }"
        class="affix-item-content"
        :style="{
          boxShadow: element.boxShadow,
          borderRadius: element.borderRadius + 'px',
          userSelect:
            element.actionSetting && element.actionSetting.actionType === 1 ? 'none' : 'auto',
          cursor:
            element.actionSetting && element.actionSetting.actionType === 1 ? 'pointer' : 'default'
        }"
      >
        <div
          class="bg"
          :style="{
            background: element.background,
            borderRadius: element.borderRadius + 'px',
            filter: element.background.includes('url') ? element.backgroundFilter : '',
            backdropFilter: !element.background.includes('url') ? element.backdropFilter : ''
          }"
        />
        <component
          :is="element.material"
          :element="element"
          :component-setting="element.componentSetting"
          @click="handleComponentClick(element, $event)"
        />
      </div>
    </div>
  </div>
  <ActionConfig ref="actionConfig" />
  <ActionPopover
    ref="actionPopover"
    :close-on-click-outside="!(actionSetting?.actionType === 1 && actionSetting?.actionClickType === 1 && actionSetting?.actionClickValue?.direction === 0)"
  >
    <div
      v-if="actionElement && actionSetting && actionSetting?.actionType === 1 && actionSetting?.actionClickType === 1"
      class="action-popover-wrapper"
      :style="{
        borderRadius: actionSetting.actionClickValue.borderRadius + 'px',
        boxShadow: actionSetting.actionClickValue.boxShadow
      }"
    >
      <div
        class="bg"
        :style="{
          background: actionSetting.actionClickValue.background,
          filter: actionSetting.actionClickValue.background.includes('url') ? actionSetting.actionClickValue.backgroundFilter : 'none',
          backdropFilter: !actionSetting.actionClickValue.background.includes('url') ? actionSetting.actionClickValue.backdropFilter : ''
        }"
      />
      <component
        :is="actionSetting.actionClickValue.material"
        :element="actionElement"
        :component-setting="actionSetting.actionClickValue.componentSetting"
        is-action
      />
    </div>
  </ActionPopover>
  <Confirm ref="confirmRef" />
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  computed,
  defineAsyncComponent,
  nextTick,
  onMounted,
  watchEffect,
  h
} from 'vue'
import { GridLayout, GridItem } from 'grid-layout-plus'
import { useStore } from '@/store'
import { ToControlDirective } from '@howdyjs/to-control'
import MouseMenuDirective from '@/plugins/mouse-menu'
import useScreenMode from '@/hooks/useScreenMode'
import Loading from '@/components/Tools/Loading.vue'
import Icon from '@/components/Tools/Icon.vue'
import { useI18n } from 'vue-i18n'
import { ElNotification } from 'element-plus'
import { uid } from '@/utils'
export default defineComponent({
  name: 'Layout',
  components: {
    GridLayout,
    GridItem,
    ActionConfig: defineAsyncComponent(() => import('@/components/ActionConfig.vue')),
    ActionPopover: defineAsyncComponent(() => import('@/components/Action/ActionPopover.vue')),
    Confirm: defineAsyncComponent(() => import('@/components/Tools/Confirm.vue')),
    Empty: defineAsyncComponent(() => import('@/materials/Empty/index.vue')),
    Clock: defineAsyncComponent(() => import('@/materials/Clock/index.vue')),
    Verse: defineAsyncComponent(() => import('@/materials/Verse/index.vue')),
    Search: defineAsyncComponent(() => import('@/materials/Search/index.vue')),
    Collection: defineAsyncComponent(() => import('@/materials/Collection/index.vue')),
    Iframe: defineAsyncComponent(() => import('@/materials/Iframe/index.vue')),
    Weather: defineAsyncComponent(() => import('@/materials/Weather/index.vue')),
    CountDown: defineAsyncComponent(() => import('@/materials/CountDown/index.vue')),
    JuejinList: defineAsyncComponent(() => import('@/materials/JuejinList/index.vue')),
    WeiboList: defineAsyncComponent(() => import('@/materials/WeiboList/index.vue')),
    GithubTrending: defineAsyncComponent(() => import('@/materials/GithubTrending/index.vue')),
    Day: defineAsyncComponent(() => import('@/materials/Day/index.vue')),
    ZhihuList: defineAsyncComponent(() => import('@/materials/ZhihuList/index.vue')),
    TodoList: defineAsyncComponent({
      loader: () => import('@/materials/TodoList/index.vue'),
      loadingComponent: Loading
    }),
    Editor: defineAsyncComponent({
      loader: () => import('@/materials/Editor/index.vue'),
      loadingComponent: Loading
    }),
    MovieLines: defineAsyncComponent(() => import('@/materials/MovieLines/index.vue')),
    Bookmark: defineAsyncComponent(() => import('@/materials/Bookmark/index.vue')),
    DailyHot: defineAsyncComponent(() => import('@/materials/DailyHot/index.vue')),
  },
  directives: {
    MouseMenu: {
      ...MouseMenuDirective,
      updated: MouseMenuDirective.mounted
    },
    ToControl: ToControlDirective
  },
  emits: ['edit'],
  setup(props, { emit }) {
    const { windowWidth, windowHeight, screenMode } = useScreenMode()
    const { t } = useI18n()

    const actionConfig = ref()
    const actionPopover = ref()
    const confirmRef = ref()

    const store = useStore()
    const isLock = computed(() => store.isLock)
    const global = computed(() => store.global)

    // 小屏视口(≤721px)切换为移动端布局：组件坐标按单列流式换算，仅保留查看与交互能力，
    // 编辑(拖拽/缩放/移动Fixed组件)仍在桌面端进行，避免破坏为桌面排版的坐标数据。
    // grid-layout的layout数组保持store原引用(桌面端可直接写回)，换算只发生在GridItem坐标props上
    const isMobileView = computed(() => screenMode.value === 0)

    const list = ref<any[]>([])
    watchEffect(() => {
      list.value = store.list
    })

    // 移动端按桌面排版(x,y)的阅读顺序纵向堆叠：i -> 换算后的y行号
    const mobileFlowYMap = computed(() => {
      const map: Record<string, number> = {}
      if (!isMobileView.value) return map
      let cursor = 0
      const sorted = [...store.list].sort((a, b) => (a.y - b.y) || (a.x - b.x))
      for (const it of sorted) {
        map[it.i] = cursor
        cursor += it.h || 1
      }
      return map
    })
    const gridItemCoords = (item: ComponentOptions) => {
      if (!isMobileView.value) return item
      return {
        x: 0,
        y: mobileFlowYMap.value[item.i] ?? item.y,
        w: 12
      }
    }
    // 移动端单列堆叠的总高度大于grid-layout按原始坐标计算的容器高度，用wrapper撑起
    const gridWrapperStyle = computed(() => {
      if (!isMobileView.value) return `width: ${windowWidth.value}px;`
      let bottom = 0
      if (store.list.length) {
        bottom = Math.max(...store.list.map(it => (mobileFlowYMap.value[it.i] ?? it.y) + (it.h || 1)))
      }
      return `width: ${windowWidth.value}px; height: ${bottom * (rowHeight.value + global.value.gutter) + global.value.gutter}px;`
    })

    const actionElement = computed(() => store.actionElement)
    const actionSetting = computed(() => actionElement.value?.actionSetting)

    const rowHeight = computed(() => {
      const h = windowHeight.value / 27
      return h > 40 ? 40 : h < 20 ? 20 : h
    })

    const menuList = ref([
      {
        label: (params: ComponentOptions) => `# ${params.material}`,
        customClass: 'title'
      },
      {
        label: () => t('组件编辑'),
        fn: (params: ComponentOptions) => {
          emit('edit', params.i)
        },
        icon: h(Icon, { name: 'edit-box', size: 18 })
      },
      {
        label: () => t('交互配置') as string,
        hidden: (params: ComponentOptions) =>
          !['Empty', 'Clock', 'Verse', 'CountDown', 'Weather'].includes(params.material),
        fn: (params: ComponentOptions) => {
          actionConfig.value.open(params)
        },
        icon: h(Icon, { name: 'equalizer', size: 18 })
      },
      {
        label: () => t('刷新组件'),
        fn: async (params: ComponentOptions & { refresh?: boolean }) => {
          params.refresh = true
          await nextTick()
          params.refresh = false
        },
        icon: h(Icon, { name: 'refresh', size: 18 })
      },
      {
        label: () => t('锁定'),
        fn: () => {
          store.updateIsLock(true)
        },
        icon: h(Icon, { name: 'lock', size: 18 })
      },
      {
        line: true
      },
      {
        label: () => t('复制'),
        fn: async (params: ComponentOptions) => {
          try {
            await navigator.clipboard.writeText(JSON.stringify(params, null, 2))
          } catch (e) {
            ElNotification({ title: t('复制异常'), type: 'error', message: t('请检查权限授权')})
            console.error(e)
          }
        },
        icon: h(Icon, { name: 'copy', size: 18 })
      },
      {
        label: () => t('粘贴'),
        fn: async () => {
          try {
            const res = await navigator.clipboard.readText()
            const componentData = JSON.parse(res)
            if (componentData.material && componentData.componentSetting) {
              // Fixed模式的组件粘贴时更改下位置防止重叠看不出来
              if (componentData.position === 2) {
                componentData.affixInfo.x = componentData.affixInfo?.x + 20
                componentData.affixInfo.y = componentData.affixInfo?.y + 20
              }
              store.addComponent({ ...componentData, i: uid() })
            } else {
              throw new Error('Not Howdz component data')
            }
          } catch (e) {
            ElNotification({ title: t('粘贴异常'), type: 'error', message: t('请检查权限授权或复制的数据是否正确')})
            console.error(e)
          }
        },
        icon: h(Icon, { name: 'clipboard', size: 18 })
      },
      {
        line: true
      },
      {
        label: () => t('删除'),
        fn: async (params: ComponentOptions) => {
          try {
            await confirmRef.value.confirm(`❗ ${t('确定删除吗')}?`, { height: 150 })
            store.deleteComponent(params)
          } catch {
            //
          }
        },
        icon: h(Icon, { name: 'delete', size: 18 }),
        customClass: 'delete'
      }
    ])

    const affix = computed(() => store.affix)
    // Fixed组件在移动端整体等比缩放并钳制到视口内，桌面端保持原坐标不变；
    // 视口宽度未测量完成时不做缩放，避免除以0产生负缩放
    const affixScale = (element: ComponentOptions) => {
      if (!isMobileView.value || windowWidth.value <= 0) return 1
      return Math.min(1, (windowWidth.value - 16) / (element.w || 1))
    }
    const computedAffixTransform = (element: ComponentOptions) => {
      const scale = affixScale(element)
      return scale >= 1 ? 'none' : `scale(${scale})`
    }
    const computedAffixOrigin = (element: ComponentOptions) => {
      if (!element.affixInfo) return 'center'
      const mode = element.affixInfo.mode || 1
      // 从锚定角向内缩放，保证钳制后的边缘不会再次出屏
      const originX = [1, 3].includes(mode) ? 'left' : 'right'
      const originY = [1, 2].includes(mode) ? 'top' : 'bottom'
      return `${originX} ${originY}`
    }
    const computedPosition = (element: ComponentOptions, { mode, x, y }: AffixInfo) => {
      const result = {
        top: 'auto',
        left: 'auto',
        bottom: 'auto',
        right: 'auto'
      }
      if ([1, 2].includes(mode)) {
        result.top = y + 'px'
      } else {
        result.bottom = y + 'px'
      }
      if ([1, 3].includes(mode)) {
        result.left = clampAffixX(x, element) + 'px'
      } else {
        result.right = clampAffixX(x, element) + 'px'
      }
      return result
    }
    // 移动端把超出视口的横向坐标钳回屏内，避免PC上摆在右侧的Fixed组件出屏
    const clampAffixX = (x: number, element: ComponentOptions) => {
      if (!isMobileView.value) return x
      const max = windowWidth.value - (element.w || 0) * affixScale(element) - 8
      return Math.max(Math.min(x, Math.max(8, max)), 8)
    }

    const handleAffixDragend = ($event: any, element: ComponentOptions) => {
      const mode = element.affixInfo?.mode || 1
      const { left, top, bottom, right, width, height } = $event
      const rectInfo = {
        i: element.i,
        x: [1, 3].includes(mode) ? left : right,
        y: [1, 2].includes(mode) ? top : bottom,
        w: width,
        h: height
      }
      store.editAffixRectInfo(rectInfo)
    }

    const handleComponentClick = (component: ComponentOptions, $event: MouseEvent) => {
      if (isLock.value && component.actionSetting && component.actionSetting.actionType === 1) {
        if (component.actionSetting.actionClickType === 1) {
          store.updateActionElement(component)
          actionPopover.value.toggle(component, $event.target)
        } else if (component.actionSetting.actionClickType === 2) {
          const url = component.actionSetting.actionClickValue.url
          window.open(url)
        }
      }
    }

    onMounted(() => {
      try {
        const layoutReady = new CustomEvent('layoutReady')
        window.dispatchEvent(layoutReady)
      } catch {
        //
      }
    })

    const handleLayoutListUpdated = (e: any) => {
      // 移动端单列重排是派生布局，不回写store，避免污染桌面端排版数据
      if (isMobileView.value) return
      store.updateList(e)
    }

    const isToControlFinishedInit = ref(false)
    const handleToControlInit = () => {
      if (!isToControlFinishedInit.value) isToControlFinishedInit.value = true
    }

    return {
      windowWidth,
      rowHeight,
      list,
      gridItemCoords,
      gridWrapperStyle,
      isLock,
      isMobileView,
      global,
      menuList,
      actionConfig,
      actionPopover,
      actionElement,
      actionSetting,
      confirmRef,
      affix,
      isToControlFinishedInit,
      computedPosition,
      computedAffixTransform,
      computedAffixOrigin,
      handleAffixDragend,
      handleComponentClick,
      handleLayoutListUpdated,
      handleToControlInit
    }
  }
})
</script>
<style lang="scss" scoped>
.grid-wrapper {
  zoom: 1;
  &:after {
    content: '';
    clear: both;
    display: table;
    height: 0;
  }
  .item-content {
    width: 100%;
    height: 100%;
    position: relative;
    .bg {
      position: absolute;
      width: 100%;
      height: 100%;
      left: 0;
      top: 0;
      background-size: cover;
    }
  }
}
.flip-list-move {
  transition: transform 0.4s;
}
.affix-wrapper {
  .affix-item {
    position: fixed;
    transition: none !important;
    opacity: 0;
    .affix-item-content {
      width: 100%;
      height: 100%;
      position: relative;
      .bg {
        position: absolute;
        width: 100%;
        height: 100%;
        left: 0;
        top: 0;
        background-size: cover;
      }
    }
    &.finished-init {
      opacity: 1;
    }
  }
}
.action-popover-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  .bg {
    position: absolute;
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
    background-size: cover;
  }
}
.show-outline-1 {
  outline: 2px dashed $color-primary;
  user-select: none;
}
.show-outline-2 {
  outline: 2px dashed $color-warning;
  user-select: none;
  cursor: move;
}
</style>
<style>
/* grid-layout-plus 的缩放手柄：沿用原尺寸与图标样式 */
.vgl-item__resizer {
  width: 24px !important;
  height: 24px !important;
  background: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnLzIwMDAvU1ZHIj48c3ZnIHQ9IjE2MzE2MDgxNjIzMTAiIGNsYXNzPSJpY29uIiB2aWV3Qm94PSIwIDAgMTAyNCAxMDI0IiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgcC1pZD0iMzM2MTEiIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PGRlZnM+PHN0eWxlIHR5cGU9InRleHQvY3NzIj48L3N0eWxlPjwvZGVmcz48cGF0aCBkPSJNMjg2LjE2NTMzMyA2NzAuMTY1MzMzYTQyLjY2NjY2NyA0Mi42NjY2NjcgMCAxIDEtNjAuMzMwNjY2LTYwLjMzMDY2NmwyNTYtMjU2YTQyLjY2NjY2NyA0Mi42NjY2NjcgMCAwIDEgNTkuMDA4LTEuMjhsMjU2IDIzNC42NjY2NjZhNDIuNjY2NjY3IDQyLjY2NjY2NyAwIDEgMS01Ny42ODUzMzQgNjIuODkwNjY3bC0yMjUuODc3MzMzLTIwNy4wNjEzMzMtMjI3LjExNDY2NyAyMjcuMTE0NjY2eiIgZmlsbD0iIzlhOThjMyIgcC1pZD0iMzM2MTIiPjwvcGF0aD48L3N2Zz4=')
    0 0/24px 24px !important;
  padding: 0 !important;
  transform: rotate(135deg) !important;
}
</style>
