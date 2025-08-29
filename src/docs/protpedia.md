# プロトペディア投稿用ドラフト

以下は U22 コンテスト投稿向けの原稿ドラフトです。各「done」項目は提出フォーム想定の見出しで整理しています。必要に応じて画像パスや動画 URL を差し替えてください。

## done 作品ステータス

開発継続中 (MVP 動作済 / コア機能: ブロック生成・接続・ドラッグ・サイズ自動計算・エラー処理基盤)。今後: 言語別スニペット配布 UI と公式テンプレ追加、協調編集、ランタイム実行サンドボックス強化を予定。

## done 作品タイトル

Scrpression (スクレッション) — 拡張型ユニバーサル ビジュアルプログラミング環境

## done 作品のURL

リポジトリ: https://github.com/shiki-01/scrpression-
（配布用バイナリ / Web 体験ページは今後 GitHub Releases / Pages 予定）

## done 概要

Scrpression は「誰でも・どのドメインでも・どの言語でも」コード思考を共有できることを目指した OSS のビジュアルプログラミング環境です。Tauri + SvelteKit + TypeScript + Rust で実装し、軽量ネイティブ/クロスプラットフォームかつ拡張容易な構造を採用。ユーザー／教育者／クリエイターが独自のブロックスニペット（＝言語やライブラリへの薄い抽象化）を追加し、デザイン・映像系（After Effects Expression, Blender 等）から一般的なプログラミング学習、プロトタイピングまで幅広く利用できます。

---

## ▼ 詳細設定項目

### done 画像

```
docs/img/overview.png          (エディタ全体キャプチャ)
docs/img/block-anatomy.png     (ブロック構造: path, content, connectors)
docs/img/system-architecture.png (後述の構成図と一致させる)
```

※ 実際の提出時に PNG を配置しパス調整してください。

### done 動画

プレイ動画 (例): https://youtu.be/XXXXXXXXXXX  
内容: 起動 → ブロック作成 → ループ/値ブロック編集 → 接続 → 擬似コード出力 (今後導入予定)  
※ 収録予定。GUI 操作 60～90 秒。

### done システム構成画像

想定図 (Mermaid):

```mermaid
flowchart LR
	User(UI) -->|操作| SvelteKit_Front[Front: SvelteKit + TS + Svelte 5]
	SvelteKit_Front --> Stores[(Reactive Stores)]
	Stores --> Services[Domain Services]
	Services -->|FS API| Tauri_FS[@tauri-apps/plugin-fs]
	Services -->|Dialog/Open| Tauri_Plugins[@tauri dialogs / opener]
	SvelteKit_Front --> Canvas[SVG/Canvas Rendering]
	Services --> Validation[Validation Layer]
	Services --> ErrorHandler[Central Error Handling]
	Tauri_FS --> RustCore[Rust Core]
	RustCore --> OS[OS APIs]
	subgraph Extensibility
		SnippetRepo[(User Snippet JSON / BlockType)] --> Loader
		Loader --> Services
	end
```

### done システム解説文

#### 全体レイヤ構造

1. Presentation (Svelte コンポーネント): 入力イベントと描画のみ。`Block.svelte` などは Services から取得した純粋データを SVG/HTML へ投影。
2. State / Store: Svelte 5 の `$state`, `$derived` を活用した型付きストア。`block.store.svelte.ts` などがソース・オブ・トゥルース。
3. Domain Services: `BlockService`, `CanvasService`, `DragService` 等。ビジネスルール・整合性検証 (接続制約 / 位置検証 / ネスト制御) を一元化。
4. Utility & Validation: 幾何計算 (`blockShapes.ts`), ドラッグ補正 (`dragUtils.ts`), 定数 (`constants.ts`), 入力検証。
5. Error Handling: `AppError` + `ERROR_CODES` + `ErrorHandler`。重大度/カテゴリー/追加コンテキストを付与し、UI へは後で統合予定のトースト or パネルで提示。
6. Platform Bridge (Tauri + Rust): ファイル保存/読み込み・ダイアログ・外部リンクオープン。重い処理（将来: 静的解析やコード生成最適化）は Rust へオフロード予定。

#### データモデルとフロー

ユーザー操作(ドラッグ/クリック/編集) → コンポーネントが Service を呼び出し → Service が Store を更新 → `$derived` が再計算 → SVG Path/レイアウト再描画。  
`Block` は (位置, サイズ, 階層リンク parentId / childId, ループ内部参照 loopFirstChildId / loopLastChildId, 値参照 valueTargetId) を持つグラフ的構造。現在はシーケンシャルチェーン + 単純ループをサポートし、将来条件分岐/イベント系ノードを追加予定。

#### ブロックライフサイクル

Create → (Validation: 位置/重複/ID 一意性) → Store 登録 → レイアウト計算 (派生) → 画面反映。  
Update → (変更差分計算 / 冪等) → Validation → Store 更新 → 依存する派生ノード再計算。  
Delete → 接続再配線 (親→子, ループ境界調整) → 参照クリア → Store から除外。  
この流れを `BlockService` が統制し、UI は副作用を直接起こさない設計。

#### レイアウト & 描画

`generatePathString` が `BlockPathType` (Flag / Loop / Value / Standard など) に応じた SVG Path を合成。サイズは: (文字列幅推定, 入力値, ネスト子高さ合計, 最小幅/高さ定数) の最大値。ループ内部は再帰で子供全体の縦寸法を計測しブロック本体パスを延伸。ドラッグ中は Z-Index をチェーン全体へ一括加算し視認性向上。

#### エラーとロギング

共通フォーマット: { code, severity, message, blockId?, context }。UI 通知と開発中デバッグログを統合し、将来的には匿名テレメトリ（利用許諾 opt-in）で品質向上。Recoverable な例はフェールソフト (デフォルト寸法など) にフォールバック。

#### 拡張メカニズム (計画詳細)

BlockType メタ: { id, name, category, inputs, outputs, codeTemplates[言語キー], uiSchema } を JSON/TS で記述。Loader がスキーマバージョン互換チェック → Service 登録 → Palette 更新。競合 (同じ id) は semantic version 比較 + ユーザー選択。信頼性: 署名付き manifest + ハッシュ照合。Sandbox 実行 (WASM / Web Worker) でユーザー提供テンプレを安全にコード生成へ。

#### パフォーマンス最適化方針

- 微細再レンダリング削減: 派生計算をブロック単位に分離し O(影響範囲) で再計算。
- Δ更新: ドラッグ移動中は座標のみ変更し重量級再レイアウトを遅延。
- 将来: Web Worker で大規模 (>1k ブロック) レイアウト計算並列化。
- Rust 連携: 複雑なコード生成 / 解析をネイティブで。

#### テストレイヤ

Unit: Services / Utils。Integration: Store + Service + 代表コンポーネント。Visual Regr (将来): 生成 SVG Path スナップショット。E2E (計画): Playwright でドラッグ & 接続操作。

#### セキュリティ / 安全性

ローカル優先設計で外部送信なし。外部ブロック導入時は署名検証 / MIME 検査予定。テンプレ内コード実行はサンドボックス (eval 不使用 / WASM 制限) で分離。ユーザーデータは OS のユーザーディレクトリ配下に保存予定で暗号化オプションを検討。

#### ファイル / 永続化 (予定)

Project JSON: { blocks:[], version, metadata }。バージョン差分マイグレーション (migration service) を実装して後方互換性保障。Undo/Redo 追加時はコマンドパターン or 双方向差分を蓄積。

#### デプロイ / クロスプラットフォーム

Tauri により Windows / macOS / Linux ネイティブ。UI は同一コードベース; OS 特性 (ファイルパス, 権限) は Rust 側で正規化。Web 版 (read-only プレビュー) は adapter-static でビルドし共有容易化。

#### 今後の高度機能

- リアルタイム共同編集 (CRDT)
- Semantic Diff / 教材モード (講師が差分フィードバック)
- AI 支援 (ブロック列→自然言語説明 / 逆変換)
- Code Round Trip (既存コード→ブロック再構成)

---

上記を踏まえ、シンプル UI と内部拡張性の両立を図り、教育・創作・プロトタイピングの共通基盤化を狙う。

### done 開発素材

- 言語 / ランタイム: TypeScript, Svelte 5, Vite, Rust (Tauri)
- テスト: Vitest + @testing-library/svelte + jsdom
- Lint/Format: ESLint (flat config) + Prettier
- ビルド/配布: Tauri CLI, Vite
- UI アイコン: Iconify
- OS 連携: @tauri-apps/api + dialog / fs / opener plugins
- アーキテクチャ要素: Service / Store / Component の三層 + Utility + Error ドメイン + 型セーフなブロック定義

### done タグ

`#ビジュアルプログラミング` `#教育` `#OSS` `#Tauri` `#Svelte` `#TypeScript` `#Rust` `#拡張性` `#NoCodeとCodeの橋渡し` `#クリエイティブコーディング`

### done ストーリー

#### 課題背景

学習者は「言語ごとに UI / 教材 / 心理的障壁が再発生する」ため再学習コストが高い。デザイン/映像クリエイターは After Effects Expressions や Blender Python の断片を検索コピペし、ロジック全体像を俯瞰できない。教育現場では授業ごとに資料フォーマットが分裂し再利用性が低い。NoCode 系ツールは拡張が閉じがちで、逆にフルコード IDE は初学者にはオーバースペック。

#### ビジョン

「抽象化されたミニマルな構文ユニット＝ブロック」を普遍化し、任意言語のスニペット層と GUI 思考層を分離。これにより 1) 初学者は複雑な言語仕様を後回しにしながらアルゴリズム思考を獲得 2) 中級者はブロック→コード展開を読み替えながら段階的脱却 3) 上級者/講師はスニペットをドメイン特化 (数値処理 / 画像 / 物理 / 3D) に設計し共有できる世界を目指す。

#### ペルソナと価値

1. 高校～専門学校の学習者: 視覚構造でループ/条件/値の流れを理解。→ 挫折率低下。
2. 講師/塾: 既存教材を Block セット化→ 配布→ 進捗可視化。
3. デザイナー/モーショングラファー: 時間変化や数式をブロックで組み、最終的に AE/Blender スクリプトへエクスポート。
4. OSS コントリビュータ: 新しい言語テンプレや解析プラグインを追加しエコシステム拡大。
5. プロトタイパー: 早期に構造を試し、必要箇所のみコードへ落とし込む。

#### 既存手法との差異

Scratch 系: 子供向け最適化で言語拡張柔軟性/コード往復が弱い。  
Low/NoCode SaaS: クローズド & ドメイン固定。  
通常 IDE: 初期概念理解までに記法エラー等で躓く。  
Scrpression: OSS / 汎用 / 双方向(ブロック⇄コード予定) / スニペット注入 / デザイン寄りドメインも包含。

#### ユーザージャーニー（一例）

1. 初回起動: 最小チュートリアル (Flag → ループ → 値ブロック) で「反復」と「参照」の概念取得。
2. プリセット適用: 目的(アニメ式タイム制御 / 配列操作 / ランダム) を選択するとブロックテンプレがキャンバスへ。
3. 途中段階: 値ブロック内で他ブロック参照 → ネストループ追加 → 一連が「処理列」として保存。
4. エクスポート(将来): 対象言語 (JS / Python / AE Expression) を選びコード生成確認。
5. 共有: 自作ブロックを JSON としてチームへ配布。
6. 学習深化: 生成コードを読んでブロック→構文マッピングを理解、最終的にコードへの移行を加速。

#### インパクト指標（予定計測）

- 学習セッション継続率 / 初週離脱率
- 同一概念 (ループ, 条件) 習得時間 vs 伝統的教材
- スニペット再利用回数 / コミュニティ投稿数
- ブロック→コード変換後の編集率（段階的脱却の可視化）

#### 将来ストーリー

国際化（UI i18n / 多言語教材リポジトリ） → クラウド同期 & コラボ → AI による「自然言語→ブロック列」の初期生成 → 教材生成自動化 → 分野横断 (ロボティクス / IoT / VFX / 教育) のハブ化。

#### ゴール

学習と創作の「開始コスト」を極小化し、知識の再利用性と共有速度を最大化する共通インターフェースの確立。

---

このストーリーは提出枠に合わせて短縮可能です。必要があれば要約版も作成できます。

### done 関連リンク

- GitHub (ソース): https://github.com/shiki-01/scrpression-
- Tauri: https://tauri.app/
- Svelte: https://svelte.dev/
- Iconify: https://iconify.design/
- After Effects Expressions (背景文脈): https://ae-expressions.docsforadobe.dev/
- Blender API (背景文脈): https://docs.blender.org/api/current/

---

## 技術的ハイライト

1. 型安全なブロックモデル: `Block`, `BlockType` を中心に親子 / ループ / 値参照（valueTargetId / loopFirstChildId 等）を明示。循環検出・位置検証フックをサービス層に集約し UI ロジックと分離。
2. 動的レイアウト計算: ブロック内部コンテンツとネスト深度に基づき幅/高さをリアクティブ決定 (文字数 \* 推定幅 + ネスト子高さ合計)。SVG Path は `BlockPathType` に応じ分岐。
3. エラー整流化: `ErrorHandler` + `AppError` + `ERROR_CODES` によりログ統一。重要度 (low/medium/high) と追加メタデータで将来のテレメトリ拡張を想定。
4. 拡張メカニズム: 将来 BlockType JSON スキーマを公開し、ユーザースニペット (関数の入出力シグネチャ、UI 要素) をホットロード。競合やバージョン差異は semantic version + capability negotiation (計画) で解決。
5. Tauri プラグイン活用: ファイルシステム保存（学習用プロジェクト/ブロックセット）、ダイアログ入出力、オープナーによる関連ドキュメント遷移。WebView 軽量性 + Rust バックエンドで低メモリ。
6. テスト戦略: Service / Store は Vitest + DOM モックで単体/統合テスト (`*.test.ts`, `*.integration.test.ts`) を用意し、リグレッション防止。

## 今後のロードマップ (抜粋)

- ブロック→各言語コード自動生成 (テンプレ + テンプレートエンジン)
- AE / Blender / Python / JavaScript など複数ターゲット同時エクスポート
- スニペット共有レジストリ + 署名付き配布
- 協調リアルタイム編集 (CRDT / Yjs 検討)
- 視覚シミュレーション (ブロック実行ステップ再生)
- アクセシビリティ強化 (キーボード操作 / スクリーンリーダ対応)

## 提出前チェックメモ

- 画像差し替え & 動画 URL 実ファイル更新
- 生成コード機能が未完部分は「開発中」表記維持
- ライセンス (MIT) 明記済

---

本ドラフトは提出フォームに合わせて再編集可能です。追加で必要な統計 (LOC, テストカバレッジ) やパフォーマンス数値が求められる場合は別途取得してください。
