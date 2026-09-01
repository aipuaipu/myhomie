<template>
  <div class="wrapper">
    <div class="export">
      <div class="title">
        {{ $t('配置数据导出') }}
      </div>
      <el-form label-width="80px" label-position="top">
        <el-form-item :label="$t('导出方式')">
          <el-radio-group v-model="exportType">
            <el-radio :label="1">
              {{ $t('生成随机密钥') }}
            </el-radio>
            <el-radio :label="2">
              {{ $t('导出JSON文件') }}
            </el-radio>
            <el-radio :label="3">
              {{ $t('WebDAV同步') }}
            </el-radio>
          </el-radio-group>
          <div v-if="exportType === 1" class="gen-key-wrapper">
            <button
              type="button"
              class="btn btn-primary"
              style="margin: 0 0 4px"
              :loading="genExportKeyLoading"
              @click="genExportKey"
            >
              {{ $t('生成密钥') }}
            </button>
            <div v-if="exportKey" class="key-wrapper">
              <span class="export-key">{{ exportKey }}</span>
              <button
                type="button"
                class="btn btn-small btn-primary"
                style="margin: 0"
                @click="handleCopyExportKey"
              >
                {{ $t('复制') }}
              </button>
            </div>
            <el-alert
              v-if="exportKey"
              :title="$t('exportExpireTips')"
              type="warning"
              :closable="false"
              style="padding: 0 4px;margin-top: 8px"
            />
          </div>
          <div v-if="exportType === 2" class="json-wrapper">
            <button
              type="button"
              class="btn btn-primary"
              style="margin: 0 0 4px"
              @click="handleExportJson"
            >
              {{ $t('导出JSON') }}
            </button>
          </div>
          <div v-if="exportType === 3" class="webdav-wrapper">
            <WebdavConfigForm v-model="webdavConfig" />
            <button
              type="button"
              class="btn btn-primary"
              style="margin: 8px 0 0"
              :loading="webdavUploadLoading"
              @click="handleWebdavUpload"
            >
              {{ $t('上传到WebDAV') }}
            </button>
          </div>
        </el-form-item>
      </el-form>
    </div>
    <hr class="hr">
    <div class="import">
      <div class="title">
        {{ $t('配置数据导入') }}
      </div>
      <el-form label-width="80px" label-position="top">
        <el-form-item :label="$t('导入方式')">
          <el-radio-group v-model="importType">
            <el-radio :label="1">
              {{ $t('使用随机密钥') }}
            </el-radio>
            <el-radio :label="2">
              {{ $t('导入JSON文件') }}
            </el-radio>
            <el-radio :label="3">
              {{ $t('WebDAV同步') }}
            </el-radio>
          </el-radio-group>
          <div v-if="importType === 1" class="import-key-wrapper">
            <input
              v-model="importKey"
              type="text"
              class="import-control"
              maxlength="5"
              placeholder="KEY"
            >
            <button
              type="button"
              class="btn btn-primary"
              :disabled="importKey.length !== 5"
              :loading="importKeyLoading"
              @click="handleImport"
            >
              {{ $t('确定') }}
            </button>
          </div>
          <div v-if="importType === 2" class="json-wrapper">
            <button
              type="button"
              class="btn btn-primary"
              style="margin-left: 0"
              @click="handleUploadJSON"
            >
              {{ $t('上传JSON文件') }}
            </button>
            <input ref="jsonRef" type="file" accept=".json" style="display: none">
          </div>
          <div v-if="importType === 3" class="webdav-wrapper">
            <WebdavConfigForm v-model="webdavConfig" />
            <button
              type="button"
              class="btn btn-primary"
              style="margin: 8px 0 0"
              :loading="webdavDownloadLoading"
              @click="handleWebdavDownload"
            >
              {{ $t('从WebDAV下载') }}
            </button>
          </div>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useStore } from '@/store'
import md5 from 'js-md5'
import { saveAs } from 'file-saver'
import { apiURL } from '@/global'
import { ajaxPost, execCopy } from '@/utils'
import { ElNotification } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { zip, unzip } from '@/utils/gzip'
import {
  getSavedWebdavConfig,
  saveWebdavConfig,
  testConnection,
  uploadConfig,
  downloadConfig,
  type WebdavConfig
} from '@/utils/webdav'
import WebdavConfigForm from './WebdavConfigForm.vue'

const props = defineProps({
  visible: {
    type: Boolean
  }
})
const store = useStore()
const exportType = ref(1)
const exportKey = ref('')
const importType = ref(1)
const importKey = ref('')
const genExportKeyLoading = ref(false)
const importKeyLoading = ref(false)
const jsonRef = ref()

// WebDAV state
const webdavConfig = ref<WebdavConfig>(getSavedWebdavConfig())
const webdavUploadLoading = ref(false)
const webdavDownloadLoading = ref(false)

const { t } = useI18n()

watch(
  () => props.visible,
  (val) => {
    if (val) {
      exportKey.value = ''
    }
  }
)

watch(webdavConfig, (val) => {
  saveWebdavConfig(val)
}, { deep: true })

const getExportData = () => {
  const {
    list,
    affix,
    global,
    showBackgroundEffect,
    showRefreshBtn,
    tabList,
    showTabSwitchBtn,
    enableKeydownSwitchTab,
    backgroundEffectActive
  } = store
  return JSON.stringify({
    list,
    affix,
    global,
    showBackgroundEffect,
    showRefreshBtn,
    tabList,
    showTabSwitchBtn,
    enableKeydownSwitchTab,
    backgroundEffectActive
  })
}

const genExportKey = async () => {
  genExportKeyLoading.value = true
  try {
    const dataToString = getExportData()
    const zipData = zip(dataToString)
    const toMd5 = md5(zipData)
    const format = parseInt(`0x${toMd5}`, 16).toString(36).toUpperCase().slice(0, 5)

    const { errCode } = await ajaxPost(`${apiURL}/saveExport`, {
      exportKey: format,
      exportValue: zipData
    })
    if (errCode === 200) {
      exportKey.value = format
    } else {
      exportKey.value = ''
      throw new Error('上传配置失败')
    }
  } catch (e) {
    //
    console.error(e)
    window.alert(t('生成密钥失败'))
  } finally {
    genExportKeyLoading.value = false
  }
}

const handleCopyExportKey = () => {
  if (execCopy(exportKey.value)) {
    ElNotification({
      title: t('提示'),
      type: 'success',
      message: t('密钥复制成功，请在其他设备导入密钥进行配置同步')
    })
  }
}

const handleExportJson = () => {
  try {
    const dataToString = getExportData()
    saveAs(
      new Blob([dataToString], { type: 'application/json,charset=utf-8;' }),
      'Dashboard.json'
    )
  } catch (e) {
    console.error(e)
  }
}

const updateConfig = (data: any) => {
  const {
    list,
    affix,
    global,
    showBackgroundEffect,
    showRefreshBtn,
    tabList,
    showTabSwitchBtn,
    enableKeydownSwitchTab,
    backgroundEffectActive
  } = data
  store.updateStates([
    { key: 'tabList', value: tabList },
    { key: 'list', value: list },
    { key: 'affix', value: affix },
    { key: 'showBackgroundEffect', value: showBackgroundEffect },
    { key: 'showRefreshBtn', value: showRefreshBtn },
    { key: 'showTabSwitchBtn', value: showTabSwitchBtn },
    { key: 'enableKeydownSwitchTab', value: enableKeydownSwitchTab },
    { key: 'backgroundEffectActive', value: backgroundEffectActive }
  ])
  store.updateGlobal(global)
  ElNotification({
    title: t('提示'),
    type: 'success',
    message: t('导入配置成功')
  })
}

const handleImport = async () => {
  if (/^[0-9A-Z]{5}$/.test(importKey.value)) {
    importKeyLoading.value = true
    try {
      const { errCode, data, message } = await ajaxPost(`${apiURL}/getImport`, {
        importKey: importKey.value
      })
      if (errCode === 200) {
        const result = unzip(data)
        const importValue = JSON.parse(result)
        if (confirm(t('已找到相应同步配置，配置会覆盖本地浏览器历史数据，是否继续？'))) {
          updateConfig(importValue)
        }
      } else {
        throw new Error(message)
      }
    } catch (e) {
      ElNotification({
        title: t('异常'),
        type: 'error',
        message: (e as Error).toString()
      })
    } finally {
      importKeyLoading.value = false
    }
  }
}

const handleUploadJSON = () => {
  jsonRef.value.click()
  jsonRef.value.onchange = (e: InputEvent) => {
    const errorHandler = () => {
      ElNotification({
        title: t('异常'),
        type: 'error',
        message: t('识别文件错误，请检查文件')
      })
    }
    const el = e.currentTarget
    if (el) {
      const { files } = el as any
      const reader = new FileReader()
      reader.readAsText(files[0], 'UTF-8')
      reader.onload = (e1) => {
        const jsonFileData = e1.target?.result
        try {
          const json = JSON.parse(jsonFileData as any)
          if (confirm(t('设别文件成功，配置会覆盖本地浏览器历史数据，是否继续？'))) {
            updateConfig(json)
          }
        } catch {
          errorHandler()
        }
      }
      reader.onerror = () => errorHandler()
    }
  }
}

// WebDAV handlers
const validateWebdavConfig = (): boolean => {
  const c = webdavConfig.value
  if (!c.url || !c.username || !c.password) {
    ElNotification({
      title: t('提示'),
      type: 'warning',
      message: t('请填写完整的WebDAV配置')
    })
    return false
  }
  return true
}

const handleWebdavUpload = async () => {
  if (!validateWebdavConfig()) return
  webdavUploadLoading.value = true
  try {
    // Test connection first
    const test = await testConnection(webdavConfig.value)
    if (!test.success) {
      ElNotification({
        title: t('异常'),
        type: 'error',
        message: t('WebDAV连接失败') + ': ' + test.message
      })
      return
    }

    const data = getExportData()
    const result = await uploadConfig(webdavConfig.value, data)
    if (result.success) {
      ElNotification({
        title: t('提示'),
        type: 'success',
        message: t('配置已上传到WebDAV')
      })
    } else {
      ElNotification({
        title: t('异常'),
        type: 'error',
        message: result.message
      })
    }
  } catch (e) {
    ElNotification({
      title: t('异常'),
      type: 'error',
      message: (e as Error).message || t('出现未知异常')
    })
  } finally {
    webdavUploadLoading.value = false
  }
}

const handleWebdavDownload = async () => {
  if (!validateWebdavConfig()) return
  webdavDownloadLoading.value = true
  try {
    const result = await downloadConfig(webdavConfig.value)
    if (result.success && result.data) {
      try {
        const importValue = JSON.parse(result.data)
        if (confirm(t('已找到相应同步配置，配置会覆盖本地浏览器历史数据，是否继续？'))) {
          updateConfig(importValue)
        }
      } catch {
        ElNotification({
          title: t('异常'),
          type: 'error',
          message: t('识别文件错误，请检查文件')
        })
      }
    } else {
      ElNotification({
        title: t('异常'),
        type: 'error',
        message: result.message
      })
    }
  } catch (e) {
    ElNotification({
      title: t('异常'),
      type: 'error',
      message: (e as Error).message || t('出现未知异常')
    })
  } finally {
    webdavDownloadLoading.value = false
  }
}
</script>
<style lang="scss" scoped>
.wrapper {
  padding: 10px;
  .export,
  .import {
    .title {
      color: $color-grey1;
      margin-bottom: 8px;
      position: relative;
      font-weight: bold;
      display: inline-block;
      &:after {
        position: absolute;
        content: '';
        left: 0;
        width: 100%;
        bottom: 0;
        height: 8px;
        background: rgba(233, 174, 49, 0.2);
      }
    }
    .gen-key-wrapper,
    .json-wrapper,
    .import-key-wrapper,
    .webdav-wrapper {
      margin: 10px 0;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      .export-key {
        font-weight: bold;
        margin: 0 4px;
        font-size: 20px;
        color: $color-dark;
        padding: 0 4px;
      }
      .key-wrapper {
        display: flex;
        align-items: center;
        margin-bottom: 4px;
      }
    }
    .gen-key-wrapper,
    .json-wrapper,
    .webdav-wrapper {
      width: 100%;
    }
    .import-key-wrapper {
      .import-control {
        height: 30px;
        padding: 0 10px;
        border: 2px solid #bbb;
        border-radius: var(--el-border-radius-base);
        box-shadow: none;
        outline: none;
        display: inline-flex;
        align-items: center;
        box-sizing: border-box;
        font-size: 16px;
        font-weight: bold;
        color: $color-dark;
        width: 120px;
        &:focus {
          border: 2px solid $color-primary;
        }
      }
    }
  }
  :deep(.el-form-item__label) {
    padding-bottom: 0;
  }
}
.hr {
  margin: 20px 0;
  border: 1px solid #ccc;
}
::-webkit-input-placeholder {
  color: rgb(197, 194, 194);
}
</style>
