const femaleTopTypes = [
  "LongHairBigHair",
  "LongHairBob",
  "LongHairBun",
  "LongHairCurly",
  "LongHairCurvy",
  "LongHairFrida",
  "LongHairFro",
  "LongHairMiaWallace",
  "LongHairStraight",
  "LongHairStraight2",
  "LongHairStraightStrand",
  "Hijab",
]

const maleTopTypes = [
  "ShortHairDreads01",
  "ShortHairDreads02",
  "ShortHairFrizzle",
  "ShortHairShortCurly",
  "ShortHairShortFlat",
  "ShortHairShortRound",
  "ShortHairShortWaved",
  "ShortHairSides",
  "ShortHairTheCaesar",
  "ShortHairTheCaesarSidePart",
  "NoHair",
  "Turban",
]

const accessoryTypes = ["Blank", "Prescription01", "Prescription02", "Round", "Wayfarers", "Kurt"]
const hairColors = ["Auburn", "Black", "Blonde", "BlondeGolden", "Brown", "BrownDark", "Red", "SilverGray"]
const facialHairTypes = ["Blank", "BeardLight", "BeardMedium", "BeardMajestic", "MoustacheFancy", "MoustacheMagnum"]
const clotheTypes = [
  "BlazerShirt",
  "BlazerSweater",
  "CollarSweater",
  "GraphicShirt",
  "Hoodie",
  "ShirtCrewNeck",
  "ShirtScoopNeck",
  "ShirtVNeck",
]
const clotheColors = ["Black", "Blue01", "Blue02", "Blue03", "Gray01", "Gray02", "PastelBlue", "PastelGreen", "Pink", "White"]
const eyeTypes = ["Default", "Happy", "Squint", "Wink", "Side", "Surprised", "Hearts"]
const eyebrowTypes = ["Default", "DefaultNatural", "RaisedExcited", "RaisedExcitedNatural", "UpDown", "UpDownNatural"]
const mouthTypes = ["Default", "Smile", "Twinkle", "Serious"]
const skinColors = ["Tanned", "Yellow", "Pale", "Light", "Brown", "DarkBrown"]

export type AvatarGender = "male" | "female" | "other"

function pickRandom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)]
}

function pickTopType(gender: AvatarGender) {
  if (gender === "female") return pickRandom(femaleTopTypes)
  if (gender === "male") return pickRandom(maleTopTypes)
  return pickRandom([...femaleTopTypes, ...maleTopTypes])
}

function pickFacialHair(gender: AvatarGender) {
  if (gender === "female") return "Blank"
  if (gender === "male") {
    return Math.random() < 0.55 ? pickRandom(facialHairTypes.filter((item) => item !== "Blank")) : "Blank"
  }
  return Math.random() < 0.3 ? pickRandom(facialHairTypes.filter((item) => item !== "Blank")) : "Blank"
}

export function createRandomAvatar(gender: AvatarGender = "other") {
  const facialHairType = pickFacialHair(gender)
  const params = new URLSearchParams({
    avatarStyle: "Circle",
    topType: pickTopType(gender),
    accessoriesType: pickRandom(accessoryTypes),
    hairColor: pickRandom(hairColors),
    facialHairType,
    facialHairColor: facialHairType === "Blank" ? "Black" : pickRandom(hairColors),
    clotheType: pickRandom(clotheTypes),
    clotheColor: pickRandom(clotheColors),
    eyeType: pickRandom(eyeTypes),
    eyebrowType: pickRandom(eyebrowTypes),
    mouthType: pickRandom(mouthTypes),
    skinColor: pickRandom(skinColors),
  })

  return `https://avataaars.io/?${params.toString()}`
}
