<template>
  <div class="webdav-config">
    <div class="config-row">
      <label>{{ $t('WebDAV地址') }}</label>
      <input
        :value="modelValue.url"
        type="url"
        class="config-input"
        :placeholder="$t('WebDAV地址')"
        @input="update('url', ($event.target as HTMLInputElement).value)"
      >
    </div>
    <div class="config-row">
      <label>{{ $t('用户名') }}</label>
      <input
        :value="modelValue.username"
        type="text"
        class="config-input"
        :placeholder="$t('用户名')"
        @input="update('username', ($event.target as HTMLInputElement).value)"
      >
    </div>
    <div class="config-row">
      <label>{{ $t('密码') }}</label>
      <input
        :value="modelValue.password"
        type="password"
        class="config-input"
        :placeholder="$t('密码')"
        @input="update('password', ($event.target as HTMLInputElement).value)"
      >
    </div>
    <div class="config-row">
      <label>{{ $t('文件路径') }}</label>
      <input
        :value="modelValue.filepath"
        type="text"
        class="config-input"
        placeholder="/howdz-dashboard.json"
        @input="update('filepath', ($event.target as HTMLInputElement).value)"
      >
    </div>
    <el-alert
      :title="$t('webdavTips')"
      type="info"
      :closable="false"
      show-icon
      style="margin-top: 8px"
    />
  </div>
</template>

<script lang="ts" setup>
import type { WebdavConfig } from '@/utils/webdav'

const props = defineProps<{
  modelValue: WebdavConfig
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: WebdavConfig): void
}>()

const update = (key: keyof WebdavConfig, value: string) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>

<style lang="scss" scoped>
.webdav-config {
  width: 100%;
  margin: 8px 0;
  padding: 12px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);

  .config-row {
    display: flex;
    align-items: center;
    margin-bottom: 8px;

    &:last-of-type {
      margin-bottom: 0;
    }

    label {
      flex-shrink: 0;
      width: 72px;
      font-size: 13px;
      color: #666;
      text-align: right;
      padding-right: 8px;
    }

    .config-input {
      flex: 1;
      height: 32px;
      padding: 0 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 13px;
      color: #333;
      outline: none;
      background: #fff;
      transition: border-color 0.2s;

      &:focus {
        border-color: $color-primary;
      }

      &::placeholder {
        color: #bbb;
      }
    }
  }
}
</style>
