## Release signing

This repo publishes release artifacts via GitHub Actions on tags like `v0.3.9`.

### Windows (.exe) Authenticode signing

The Windows installer is produced by electron-builder (NSIS). To Authenticode-sign it, provide a code-signing certificate to the release workflow.

Add the following GitHub Actions secrets:

- **`WIN_CSC_LINK_B64`**: base64 of your `.p12` code-signing certificate
- **`WIN_CSC_KEY_PASSWORD`**: password for the `.p12`

Notes:

- A standard code-signing cert (or EV) from a public CA is typical.
- This signs during packaging; users can verify in Windows file properties → **Digital Signatures**.

### Linux artifact signatures

Linux builds currently publish a `.tar.gz`. The workflow always creates:

- **`SHA256SUMS`**: SHA-256 checksums for the uploaded artifacts

Optionally, it can also GPG-sign the checksums file:

- **`SHA256SUMS.asc`**: detached signature (ASCII armor)

To enable GPG signing, add GitHub Actions secrets:

- **`RELEASE_GPG_PRIVATE_KEY`**: ASCII-armored private key block
- **`RELEASE_GPG_PASSPHRASE`**: passphrase for that key (empty if none)
- **`RELEASE_GPG_KEY_ID`** (optional): key id / fingerprint to set trust in CI

Users can verify checksums and signature with:

```sh
gpg --verify SHA256SUMS.asc SHA256SUMS
sha256sum -c SHA256SUMS
```

