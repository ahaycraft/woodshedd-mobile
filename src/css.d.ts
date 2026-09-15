// Web-only CSS imports (Expo's web target bundles these; native builds never
// see them). Not type-checked by the bundler itself, but needed so `tsc
// --noEmit` doesn't fail on `import '@/global.css'` and CSS Modules imports.

declare module "*.css";

declare module "*.module.css" {
  const classes: { [className: string]: string };
  export default classes;
}
