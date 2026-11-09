// Goong JS 1.0.9 ships Flow declarations; describe the SDK surface used by this feature.
declare module '@goongmaps/goong-js' {
  export type LngLat = { lng: number; lat: number }
  export type MapEvent = { lngLat?: LngLat }
  export type AreaData = {
    type: 'FeatureCollection'
    features: { type: 'Feature'; properties: { zone: string }; geometry: { type: 'Polygon'; coordinates: number[][][] } }[]
  }
  export class Map {
    constructor(options: { container: HTMLElement; style: string; center: [number, number]; zoom: number; attributionControl: boolean })
    on(event: 'load' | 'error' | 'click', listener: (event: MapEvent) => void): this
    addControl(control: NavigationControl, position: 'top-right'): this
    addSource(id: string, source: { type: 'geojson'; data: AreaData }): this
    getSource(id: string): { setData(data: AreaData): void } | undefined
    addLayer(layer: { id: string; type: 'fill' | 'line'; source: string; filter: [string, string, string]; paint: Record<string, number | string | number[]> }): this
    fitBounds(bounds: [[number, number], [number, number]], options: { padding: number; maxZoom: number; duration: number }): this
    resize(): this
    remove(): void
  }
  export class Marker {
    constructor(options: { color: string; draggable: boolean })
    setLngLat(position: [number, number]): this
    getLngLat(): LngLat
    setDraggable(draggable: boolean): this
    getElement(): HTMLElement
    addTo(map: Map): this
    on(event: 'dragend', listener: () => void): this
    remove(): void
  }
  export class NavigationControl { constructor(options: { showCompass: boolean }) }
  const goong: {
    accessToken: string
    supported(): boolean
    Map: typeof Map
    Marker: typeof Marker
    NavigationControl: typeof NavigationControl
  }
  export default goong
}
