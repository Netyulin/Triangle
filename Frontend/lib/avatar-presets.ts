export const avatarPresets = Array.from({ length: 10 }, (_, index) => {
  const filename = `avatar-${String(index + 1).padStart(2, "0")}.png`
  return {
    id: index + 1,
    filename,
    src: `/avatars/defaults/${filename}`,
  }
})
