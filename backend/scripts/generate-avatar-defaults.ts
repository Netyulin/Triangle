import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import refsModule from '../../Frontend/lib/avatar-gen/config/refs.ts';
import type { LayerItemConfig, LayerListItem } from '../../Frontend/lib/avatar-gen/interface/layer.interface.ts';

type AvatarGender = 'male' | 'female' | 'other';
type LayerId = string;

type WorkingLayer = {
  id: LayerId;
  dir: string;
  layer: LayerItemConfig & {
    color?: string[];
  };
};

const GenderType = {
  UNSET: '0',
  MALE: '1',
  FEMAL: '2',
} as const;
const { layerList } = refsModule as { layerList: LayerListItem[] };

function getRandomValueInArr(arr: Array<Record<string, any>>, weightKey = 'weight', random: () => number = Math.random) {
  const tmpArr: Array<number> = [];
  arr.forEach((el, index) => {
    const weight = el[weightKey];
    for (let i = 0; i < weight; i += 1) tmpArr.push(index);
  });
  tmpArr.sort(() => 0.5 - random());
  const len = tmpArr.length;
  const randomIndex = parseInt((random() * 10000).toFixed(0), 10) % len;
  return arr[tmpArr[randomIndex]];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicRoot = path.resolve(__dirname, '../../Frontend/public');
const assetRoot = path.join(publicRoot, 'avatars', 'avatar-gen');
const outputRoot = path.join(publicRoot, 'avatars', 'avatar-gen-defaults');

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seedValue: string | number) {
  let seed = stableHash(String(seedValue));
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function mapGender(gender: AvatarGender) {
  if (gender === 'male') return GenderType.MALE;
  if (gender === 'female') return GenderType.FEMAL;
  return GenderType.UNSET;
}

function normalizeLayerList() {
  return JSON.parse(JSON.stringify(layerList)) as LayerListItem[];
}

function pickRandomLayers(gender: AvatarGender, seed: string) {
  const selectedGender = mapGender(gender);
  const random = createSeededRandom(seed);
  const layers = normalizeLayerList().sort((a, b) => a.zIndex - b.zIndex);

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
        'weight',
        random,
      ) as WorkingLayer['layer'],
    }))
    .filter(({ layer }) => !layer.empty) as WorkingLayer[];

  const removeIdList = randomLayerList.reduce<LayerId[]>((result, item) => result.concat(item.layer.removeLayers || []), []);
  randomLayerList = randomLayerList.filter(({ id }) => !removeIdList.includes(id));

  randomLayerList.forEach(({ layer }) => {
    if (!layer.avaiableColorGroups?.length) return;
    layer.color = getRandomValueInArr(layer.avaiableColorGroups, 'weight', random).value;
  });

  randomLayerList.forEach(({ layer }) => {
    if (!layer.colorNotSameAs?.length || !layer.color?.length) return;
    const currentColor = layer.color[0];

    layer.colorNotSameAs.forEach((targetId) => {
      const target = randomLayerList.find((item) => item.id === targetId);
      if (!target?.layer.avaiableColorGroups?.length) return;

      let tried = 0;
      while (target.layer.color?.[0] === currentColor && tried < 10) {
        target.layer.color = getRandomValueInArr(target.layer.avaiableColorGroups, 'weight', random).value;
        tried += 1;
      }
    });
  });

  randomLayerList.forEach(({ layer }) => {
    if (!layer.colorSameAs) return;
    const target = randomLayerList.find((item) => item.id === layer.colorSameAs);
    if (target?.layer.color?.length) {
      layer.color = [...target.layer.color];
    }
  });

  return randomLayerList;
}

function replaceSvgColors(svgRaw: string, colors: string[] = []) {
  return svgRaw.replace(/{{color\[(\d+)\]}}/g, (_, indexValue) => {
    const index = Number.parseInt(indexValue, 10);
    return colors[index] ?? colors[0] ?? '#000000';
  });
}

async function readAsset(dir: string, filename: string) {
  return fs.readFile(path.join(assetRoot, dir, `${filename}.svg`), 'utf8');
}

async function buildAvatarSvg(gender: AvatarGender, seed: string) {
  const randomLayerList = pickRandomLayers(gender, seed);
  const groups = await Promise.all(
    randomLayerList.map(async ({ dir, layer }) => {
      const svgRaw = await readAsset(dir, layer.filename || '');
      const innerSvg = replaceSvgColors(svgRaw, layer.color).replace(/<svg.*(?=>)>/, '').replace('</svg>', '');
      return `<g id="triangle-avatar-${dir}">${innerSvg}</g>`;
    }),
  );

  return `<svg width="280" height="280" viewBox="0 0 380 380" fill="none" xmlns="http://www.w3.org/2000/svg">${groups.join('')}</svg>`;
}

async function main() {
  const genders: AvatarGender[] = ['male', 'female', 'other'];
  await fs.mkdir(outputRoot, { recursive: true });

  for (const gender of genders) {
    const genderDir = path.join(outputRoot, gender);
    await fs.mkdir(genderDir, { recursive: true });

    for (let index = 1; index <= 10; index += 1) {
      const svg = await buildAvatarSvg(gender, `triangle-avatar-default-${gender}-${index}`);
      const filename = `avatar-${String(index).padStart(2, '0')}.svg`;
      await fs.writeFile(path.join(genderDir, filename), `${svg}\n`, 'utf8');
    }
  }

  console.log('generated avatar-gen defaults');
}

await main();
