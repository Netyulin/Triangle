import { layerList } from "@/lib/avatar-gen/config/refs"
import { GenderType, type LAYER_ID } from "@/lib/avatar-gen/interface/avatar.interface"
import type { LayerItemConfig, LayerListItem } from "@/lib/avatar-gen/interface/layer.interface"
import { getRandomValueInArr } from "@/lib/avatar-gen/utils/get-random-in-arr"

export type AvatarGender = "male" | "female" | "other"

type WorkingLayer = {
  id: LAYER_ID
  dir: string
  layer: LayerItemConfig & {
    color?: string[]
  }
}

type RandomAvatarOptions = {
  seed?: string | number
}

const assetCache = new Map<string, Promise<string>>()

function mapGender(gender: AvatarGender) {
  if (gender === "male") return GenderType.MALE
  if (gender === "female") return GenderType.FEMAL
  return GenderType.UNSET
}

function encodeSvgToDataUrl(svg: string) {
  const encoded = btoa(unescape(encodeURIComponent(svg)))
  return `data:image/svg+xml;base64,${encoded}`
}

function stableHash(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function createSeededRandom(seedValue?: string | number) {
  if (seedValue === undefined || seedValue === null || seedValue === "") {
    return Math.random
  }

  let seed = stableHash(String(seedValue))
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function normalizeLayerList() {
  return JSON.parse(JSON.stringify(layerList)) as LayerListItem[]
}

function pickRandomLayers(gender: AvatarGender, seed?: string | number) {
  const selectedGender = mapGender(gender)
  const random = createSeededRandom(seed)
  const layers = normalizeLayerList().sort((a, b) => a.zIndex - b.zIndex)

  let randomLayerList = layers
    .map((entry) => ({
      id: entry.id,
      dir: entry.dir,
      layer: getRandomValueInArr(
        entry.layers.filter(
          ({ genderType }) =>
            selectedGender === GenderType.UNSET ||
            genderType === selectedGender ||
            genderType === GenderType.UNSET,
        ),
        "weight",
        random,
      ) as WorkingLayer["layer"],
    }))
    .filter(({ layer }) => !layer.empty) as WorkingLayer[]

  const removeIdList = randomLayerList.reduce<LAYER_ID[]>((result, item) => {
    return result.concat(item.layer.removeLayers || [])
  }, [])

  randomLayerList = randomLayerList.filter(({ id }) => !removeIdList.includes(id))

  randomLayerList.forEach(({ layer }) => {
    if (!layer.avaiableColorGroups?.length) return
    layer.color = getRandomValueInArr(layer.avaiableColorGroups, "weight", random).value
  })

  randomLayerList.forEach(({ layer }) => {
    if (!layer.colorNotSameAs?.length || !layer.color?.length) return
    const currentColor = layer.color[0]

    layer.colorNotSameAs.forEach((targetId) => {
      const target = randomLayerList.find((item) => item.id === targetId)
      if (!target?.layer.avaiableColorGroups?.length) return

      let tried = 0
      while (target.layer.color?.[0] === currentColor && tried < 10) {
        target.layer.color = getRandomValueInArr(target.layer.avaiableColorGroups, "weight", random).value
        tried += 1
      }
    })
  })

  randomLayerList.forEach(({ layer }) => {
    if (!layer.colorSameAs) return
    const target = randomLayerList.find((item) => item.id === layer.colorSameAs)
    if (target?.layer.color?.length) {
      layer.color = [...target.layer.color]
    }
  })

  return randomLayerList
}

function replaceSvgColors(svgRaw: string, colors: string[] = []) {
  return svgRaw.replace(/{{color\[(\d+)\]}}/g, (_, indexValue) => {
    const index = Number.parseInt(indexValue, 10)
    return colors[index] ?? colors[0] ?? "#000000"
  })
}

function buildAssetPath(dir: string, filename: string) {
  return `/avatars/avatar-gen/${encodeURIComponent(dir)}/${encodeURIComponent(filename)}.svg`
}

async function loadAvatarAsset(path: string) {
  const cached = assetCache.get(path)
  if (cached) {
    return cached
  }

  const promise = fetch(path).then(async (response) => {
    if (!response.ok) {
      throw new Error("随机头像素材加载失败，请稍后再试。")
    }

    return response.text()
  })

  assetCache.set(path, promise)
  return promise
}

export async function createRandomAvatar(gender: AvatarGender = "other", options: RandomAvatarOptions = {}) {
  const randomLayerList = pickRandomLayers(gender, options.seed)

  const groups = await Promise.all(
    randomLayerList.map(async ({ dir, layer }) => {
      const svgRaw = await loadAvatarAsset(buildAssetPath(dir, layer.filename || ""))
      const innerSvg = replaceSvgColors(svgRaw, layer.color).replace(/<svg.*(?=>)>/, "").replace("</svg>", "")
      return `<g id="triangle-avatar-${dir}">${innerSvg}</g>`
    }),
  )

  const svg = `<svg width="280" height="280" viewBox="0 0 380 380" fill="none" xmlns="http://www.w3.org/2000/svg">${groups.join("")}</svg>`
  return encodeSvgToDataUrl(svg)
}
