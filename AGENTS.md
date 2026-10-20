# Blog image publishing rules

These rules apply to all image work in this repository.

- Treat source images outside this repository as private originals. Never upload, move, rename, modify, commit, or publish them.
- Process and upload only images that are explicitly referenced by a blog Markdown file.
- Do not resize, crop, rotate unnecessarily, sharpen, denoise, recolor, or use lossy compression.
- Preserve the original pixel dimensions and decoded pixel values exactly. A smaller file is acceptable only when lossless encoding is used.
- Preserve color information required for identical appearance. Remove private EXIF, GPS, XMP, IPTC, author, device, and location metadata. If privacy removal and identical appearance cannot both be guaranteed, stop and ask the user.
- Prefer lossless WebP for the public derivative when a decoded-pixel comparison confirms exact equality with the source.
- Before replacing a Markdown reference, compare the source and derivative after decoding. Require identical width, height, channel count, and pixel bytes.
- Use opaque content-derived filenames that disclose no original filename or local path.
- Upload only the verified derivative to the configured `blog-images-public` R2 bucket. Never upload the original.
- Replace only the local image reference in Markdown. Do not rewrite article prose or unrelated formatting.
- Verify that generated site output contains no local `/Users/...` paths and that the site build succeeds.
- Do not commit or push unless the user explicitly requests it.

