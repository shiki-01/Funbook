# Tauri + SvelteKit + TypeScript

This template should help get you started developing with Tauri, SvelteKit and TypeScript in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer).

## Release / Auto Update Flow

1. Bump versions:
	 - `package.json` version
	 - `src-tauri/Cargo.toml` version
2. Tag commit: `git tag vX.Y.Z && git push --tags`
3. GitHub Actions builds installers (dmg, msi, deb, appimage, rpm) and generates `latest.json`.
4. App checks for updates via `@tauri-apps/plugin-updater` and offers in-app install.

### Signing Keys (Tauri v2)

Generate key pair (only once, keep private key secret):
```
tauri signer generate
```
Set GitHub Secrets:
- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (optional)

### macOS Notarization (Optional)

You need Apple Developer ID Certificate.
Add environment variables (in GitHub Actions or local):
```
APPLE_ID
APPLE_PASSWORD   # app-specific password
APPLE_TEAM_ID
```
Integrate notarization step (not yet added in workflow).

### Windows Code Signing (Optional)

Obtain a code signing certificate (EV or standard). Convert to `.pfx` and provide via secure secret. Use `signtool` in a custom workflow step.

### Update Metadata (latest.json)

Current workflow creates a minimal `latest.json`. For richer notes you can template a changelog or parse conventional commits.

Structure example:
```json
{
	"version": "1.2.3",
	"notes": "Changes...",
	"pub_date": "2025-08-29T00:00:00Z"
}
```

### Manual Update Trigger (in app)

Header bar has an "アップデートを確認" button using dynamic import of `@tauri-apps/plugin-updater`.

### Troubleshooting

| Issue | Fix |
|-------|-----|
| `Cannot find module '@tauri-apps/plugin-updater'` | Ensure dependency installed and `types/**/*.d.ts` is included in `tsconfig.json`. |
| Update shows as not available | Confirm tag version matches Cargo + package versions and `latest.json` version. |
| Signature errors | Verify secrets, regenerate key pair, re-run workflow. |

