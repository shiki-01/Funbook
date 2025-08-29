<!--
  フォーム用エラー通知コンポーネント
  フォーム検証エラーと警告を表示
-->
<script lang="ts">
	import type { ValidationError, ValidationWarning } from '$lib/types/services';

	interface Props {
		errors: ValidationError[];
		warnings: ValidationWarning[];
	}

	let { errors, warnings }: Props = $props();

	/**
	 * エラーメッセージをグループ化
	 * @param errors エラーの配列
	 * @returns フィールドごとにグループ化されたエラー
	 */
	const groupErrorsByField = (errors: ValidationError[]) => {
		const grouped = new Map<string, ValidationError[]>();

		errors.forEach((error) => {
			const field = error.field || 'general';
			if (!grouped.has(field)) {
				grouped.set(field, []);
			}
			grouped.get(field)!.push(error);
		});

		return grouped;
	};

	const groupedErrors = $derived(groupErrorsByField(errors));
	const hasErrors = $derived(errors.length > 0);
	const hasWarnings = $derived(warnings.length > 0);
</script>

{#if hasErrors || hasWarnings}
	<div class="form-errors" role="alert" aria-live="polite">
		{#if hasErrors}
			<div class="error-section">
				<h4 class="error-title">
					<span class="error-icon">❌</span>
					入力エラー
				</h4>
				<ul class="error-list">
					{#each errors as error}
						<li class="error-item">
							{error.message}
							{#if error.context}
								<small class="error-context">
									({JSON.stringify(error.context)})
								</small>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if hasWarnings}
			<div class="warning-section">
				<h4 class="warning-title">
					<span class="warning-icon">⚠️</span>
					警告
				</h4>
				<ul class="warning-list">
					{#each warnings as warning}
						<li class="warning-item">
							{warning.message}
							{#if warning.context}
								<small class="warning-context">
									({JSON.stringify(warning.context)})
								</small>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
{/if}

<style>
	.form-errors {
		margin-bottom: 1rem;
		padding: 1rem;
		border-radius: 8px;
		background-color: #fef2f2;
		border: 1px solid #fecaca;
	}

	.error-section {
		margin-bottom: 1rem;
	}

	.error-section:last-child {
		margin-bottom: 0;
	}

	.warning-section {
		margin-bottom: 1rem;
	}

	.warning-section:last-child {
		margin-bottom: 0;
	}

	.error-title,
	.warning-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 0.5rem 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.error-title {
		color: #dc2626;
	}

	.warning-title {
		color: #d97706;
	}

	.error-icon,
	.warning-icon {
		font-size: 1rem;
	}

	.error-list,
	.warning-list {
		margin: 0;
		padding-left: 1.5rem;
		list-style: none;
	}

	.error-item,
	.warning-item {
		margin-bottom: 0.25rem;
		line-height: 1.4;
	}

	.error-item {
		color: #7f1d1d;
	}

	.warning-item {
		color: #92400e;
	}

	.error-item::before {
		content: '•';
		color: #dc2626;
		margin-right: 0.5rem;
	}

	.warning-item::before {
		content: '•';
		color: #d97706;
		margin-right: 0.5rem;
	}

	.error-context,
	.warning-context {
		display: block;
		font-size: 0.75rem;
		opacity: 0.8;
		margin-top: 0.125rem;
	}
</style>
