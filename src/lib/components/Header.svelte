<script lang="ts">
	import Icon from '@iconify/svelte';
	import Dialog from './Dialog.svelte';
	import BlockForm from './blocks/BlockForm.svelte';
	import type { Block } from '$lib/types';
	import {
		exportProjectData,
		importProjectData,
		saveProjectToFile,
		loadProjectFromFile,
		exportBlockTemplate,
		saveTemplateToFile,
		loadTemplateFromFile,
		applyTemplateToPalette
	} from '$lib/utils/projectUtils';
	import logoTitle from '$lib/assets/logoTitle.svg';

	let showDialog = $state(false);
	let currentProjectName = $state('Untitled Project');

	const handleBlockSave = (blockList: Block) => {
		console.log('新しいブロックが追加されました:', blockList);
		showDialog = false;
	};

	const handleCancel = () => {
		showDialog = false;
	};

	const handleSaveProject = async () => {
		try {
			const projectData = exportProjectData(currentProjectName);
			const savedPath = await saveProjectToFile(projectData);
			if (savedPath) {
				console.log('プロジェクトが保存されました:', savedPath);
				// プロジェクト名を更新（ファイル名から拡張子を除いた部分）
				const fileName = savedPath.split(/[/\\]/).pop() || '';
				currentProjectName = fileName.replace(/\.fb$/, '');
			}
		} catch (error) {
			console.error('プロジェクトの保存に失敗しました:', error);
			alert('プロジェクトの保存に失敗しました');
		}
	};

	const handleLoadProject = async () => {
		try {
			const projectData = await loadProjectFromFile();
			if (projectData) {
				importProjectData(projectData);
				currentProjectName = projectData.name;
				console.log('プロジェクトがロードされました:', projectData.name);
			}
		} catch (error) {
			console.error('プロジェクトのロードに失敗しました:', error);
			alert('プロジェクトのロードに失敗しました');
		}
	};

	// テンプレート保存
	const handleSaveTemplate = async () => {
		try {
			const template = exportBlockTemplate(currentProjectName + '_template');
			await saveTemplateToFile(template);
		} catch (e) {
			console.error('テンプレート保存失敗', e);
			alert('テンプレートの保存に失敗しました');
		}
	};

	// テンプレート読込（既存 palette に追加/上書き）
	const handleLoadTemplate = async () => {
		try {
			const tpl = await loadTemplateFromFile();
			if (tpl) {
				applyTemplateToPalette(tpl);
				console.log('テンプレートを読み込みました:', tpl.name);
			}
		} catch (e) {
			console.error('テンプレートロード失敗', e);
			alert('テンプレートの読み込みに失敗しました');
		}
	};

	// アップデート確認
	const checkForUpdate = async () => {
		try {
			const { check } = await import('@tauri-apps/plugin-updater');
			const update = await check();
			if (update?.available) {
				const doInstall = confirm(`新しいバージョン ${update.version} が利用可能です。今すぐ更新しますか?`);
				if (doInstall) {
					await update.downloadAndInstall();
					alert('更新が完了しました。再起動してください。');
					// 再起動: 現在はユーザーに手動で案内
				}
			} else {
				alert('最新バージョンです。');
			}
		} catch (e) {
			console.error('アップデート確認失敗', e);
			alert('アップデートの確認に失敗しました');
		}
	};
</script>

<!--ブロックリストへの追加処理-->
<Dialog bind:isOpen={showDialog}>
	<h2>ブロックを追加</h2>
	<BlockForm onSave={handleBlockSave} onCancel={handleCancel} />
</Dialog>

<header>
	<div class="logo">
		<img src={logoTitle} alt="Logo" />
		<span class="project-name">{currentProjectName}</span>
	</div>
	<div class="actions">
		<button onclick={() => (showDialog = true)} title="ブロックを追加">
			<Icon icon="material-symbols:variable-add-rounded" width="25" height="25" />
		</button>
		<button onclick={handleLoadProject} title="プロジェクトを開く">
			<Icon icon="material-symbols:folder-open-rounded" width="25" height="25" />
		</button>
		<button onclick={handleSaveProject} title="プロジェクトを保存">
			<Icon icon="material-symbols:save-rounded" width="25" height="25" />
		</button>
		<button onclick={handleLoadTemplate} title="テンプレートを開く (.fbtpl)">
			<Icon icon="material-symbols:layers-rounded" width="25" height="25" />
		</button>
		<button onclick={handleSaveTemplate} title="テンプレートを保存 (.fbtpl)">
			<Icon icon="material-symbols:save-as-rounded" width="25" height="25" />
		</button>
	</div>
</header>

<style>
	header {
		width: 100%;
		height: 60px;
		background-color: #575f75;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 20px;
		box-sizing: border-box;
	}

	header .logo {
		display: flex;
		align-items: center;
		gap: 15px;
	}

	header img {
		height: 20px;
	}

	.project-name {
		color: white;
		font-size: 16px;
		font-weight: 500;
		max-width: 200px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	header .actions {
		height: 100%;
		display: flex;
		gap: 10px;
	}

	header .actions button {
		width: 40px;
		height: 60px;
		background: none;
		border: none;
		color: white;
		cursor: pointer;
		padding: 10px;
		border-radius: 5px;
		transition: background-color 0.3s ease;
	}

	header .actions button:hover {
		background-color: rgba(255, 255, 255, 0.1);
	}
</style>
