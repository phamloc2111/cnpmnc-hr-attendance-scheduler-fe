export async function loadGoongSdk() {
  const [sdk] = await Promise.all([
    import('@goongmaps/goong-js'),
    import('@goongmaps/goong-js/dist/goong-js.css'),
  ])
  return sdk.default
}
