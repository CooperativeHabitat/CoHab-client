import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface BackgroundPreset {
  id: string
  url: string | null
  thumb: string | null
}

const PRESETS: BackgroundPreset[] = [
  { id: 'default', url: null, thumb: null },
  { id: 'mountains', url: 'https://picsum.photos/id/1015/1920/1080', thumb: 'https://picsum.photos/id/1015/160/90' },
  { id: 'canyon', url: 'https://picsum.photos/id/1016/1920/1080', thumb: 'https://picsum.photos/id/1016/160/90' },
  { id: 'peak', url: 'https://picsum.photos/id/1018/1920/1080', thumb: 'https://picsum.photos/id/1018/160/90' },
  { id: 'waterfall', url: 'https://picsum.photos/id/1039/1920/1080', thumb: 'https://picsum.photos/id/1039/160/90' },
  { id: 'lake', url: 'https://picsum.photos/id/1036/1920/1080', thumb: 'https://picsum.photos/id/1036/160/90' },
  { id: 'coast', url: 'https://picsum.photos/id/1050/1920/1080', thumb: 'https://picsum.photos/id/1050/160/90' }
]

const STORAGE_KEY = 'cohab-background'

const useBackgroundStore = defineStore('background', () => {
  const currentId = ref<string>(localStorage.getItem(STORAGE_KEY) || 'default')
  const presets = PRESETS

  function apply() {
    const preset = presets.find(p => p.id === currentId.value)
    if (preset?.url) {
      document.body.style.backgroundImage = `url(${preset.url})`
    } else {
      document.body.style.backgroundImage = ''
    }
    localStorage.setItem(STORAGE_KEY, currentId.value)
  }

  function setBackground(id: string) {
    currentId.value = id
    apply()
  }

  function init() {
    apply()
  }

  return { currentId, presets, setBackground, init }
})

export default useBackgroundStore
