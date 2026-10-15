# Signing the release bundles (do this on your own computer; never paste keys or passwords into chat)

Use **Play App Signing** (the default when you create the app in Play Console): Google holds the real app-signing key and you sign uploads with an *upload key*. If the upload key is ever lost, Google can reset it.

## 1. Make one upload key per app (Git Bash; needs Java installed)
```
keytool -genkeypair -v -keystore aureum-pos-upload.jks -alias aureum-pos -keyalg RSA -keysize 2048 -validity 10000
keytool -genkeypair -v -keystore aureum-backoffice-upload.jks -alias aureum-backoffice -keyalg RSA -keysize 2048 -validity 10000
```
Choose strong passwords and write them in a password manager. **Back up both .jks files somewhere safe (not in the repo).**

## 2. Store them as GitHub secrets (repo → Settings → Secrets and variables → Actions)
Convert each file: `base64 -w0 aureum-pos-upload.jks` and paste the output as the secret value.
| Secret | Value |
|---|---|
| `POS_KEYSTORE_B64` | base64 of aureum-pos-upload.jks |
| `POS_KEYSTORE_PASSWORD`, `POS_KEY_ALIAS` (`aureum-pos`), `POS_KEY_PASSWORD` | what you chose |
| `BACKOFFICE_KEYSTORE_B64`, `BACKOFFICE_KEYSTORE_PASSWORD`, `BACKOFFICE_KEY_ALIAS` (`aureum-backoffice`), `BACKOFFICE_KEY_PASSWORD` | likewise |

## 3. Build
Actions → Android build → Run workflow. Download the `.aab` from the run's Artifacts and upload it in Play Console. Each upload needs a higher `version_code` than the last.
