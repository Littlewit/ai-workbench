<template>
  <div class="workspace">
    <header class="header">AI 前端工作台</header>

    <div class="tabs">
      <button v-for="t in tabs" :key="t.key" :class="{ active: tab === t.key }" @click="tab = t.key">
        {{ t.label }}
      </button>
    </div>

    <div class="panel">
      <!-- 智能聊天 -->
      <ChatPanel v-if="tab === 'chat'" />

      <!-- 文档问答（RAG） -->
      <RagPanel v-if="tab === 'rag'" />

      <!-- 文案生成 -->
      <CopyPanel v-if="tab === 'copy'" />

      <!-- 代码助手 -->
      <CodePanel v-if="tab === 'code'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ChatPanel from '../components/ChatPanel.vue';
import RagPanel from '../components/RagPanel.vue';
import CopyPanel from '../components/CopyPanel.vue';
import CodePanel from '../components/CodePanel.vue';

const tab = ref('chat');
const tabs = [
  { key: 'chat', label: '💬 智能聊天' },
  { key: 'rag', label: '📄 文档问答' },
  { key: 'copy', label: '✍️ 文案生成' },
  { key: 'code', label: '💻 代码助手' },
];
</script>

<style scoped>
.workspace { 
  max-width: 960px;
  margin: 0 auto;
	padding: 20px;
	font-family: system-ui;
}
.header {
	font-size: 24px;
	font-weight: bold;
	margin-bottom: 16px;
}
.tabs {
	display: flex;
	gap: 8px;
	margin-bottom: 16px;
	flex-wrap: wrap;
}
.tabs button {
	padding: 8px 14px;
	border-radius: 6px;
	border: none;
	cursor: pointer;
	background: #f1f5f9;
}
.tabs button.active {
	background: #4f46e5;
	color: white;
}
.panel {
	border: 1px solid #e5e7eb;
	border-radius: 10px;
	overflow: hidden;
	min-height: 600px;
}
</style>