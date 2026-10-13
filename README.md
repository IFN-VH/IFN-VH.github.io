# 小怪物的 Blog

一个使用 [Astro](https://astro.build/) 构建、发布在 GitHub Pages 上的个人博客。

## 本地开发

```sh
pnpm install
pnpm dev
```

## 构建

```sh
pnpm build
```

文章放在 `src/content/blog/` 中。推送到 `master` 分支后，GitHub Actions 会自动构建并发布网站。
