// src/data/categories.ts

export interface Category {
  id: string
  name: string
  description: string
  icon: string
  slug: string
}

export const categories: Category[] = [
  {
    id: "1",
    name: "Cinema Line",
    description: "Professional cinema cameras for filmmaking and video production",
    icon: "/product/camera.png",
    slug: "cinema-line"
  }, 
  {
    id: "2",
    name: "Mirrorless",
    description: "Compact mirrorless cameras with interchangeable lenses",
    icon: "/product/camera.png",
    slug: "mirrorless"
  },
  {
    id: "3",
    name: "DSLR",
    description: "Digital SLR cameras for photography enthusiasts",
    icon: "/product/camera.png",
    slug: "dslr"
  },
  {
    id: "4",
    name: "Action Camera",
    description: "Rugged cameras for adventure and sports photography",
    icon: "/product/camera.png",
    slug: "action-camera"
  },
  {
    id: "5",
    name: "Drone Cameras",
    description: "Aerial photography and videography equipment",
    icon: "/product/camera.png",
    slug: "drone-cameras"
  },
  {
    id: "6",
    name: "Lens",
    description: "High-quality lenses for various photography needs",
    icon: "/product/camera.png",
    slug: "lens"
  },
  {
    id: "7",
    name: "Microphones",
    description: "Professional microphones for video and audio recording",
    icon: "/product/camera.png",
    slug: "microphones"
  },
  {
    id: "8",
    name: "Pro Lighting",
    description: "Professional lighting equipment for studios and shoots",
    icon: "/product/camera.png",
    slug: "pro-lighting"
  },
  {
    id: "9",
    name: "Creator / TikTok Lights",
    description: "Compact lighting solutions for content creators",
    icon: "/product/camera.png",
    slug: "creator-lights"
  },
  {
    id: "10",
    name: "Memory Cards & Storage",
    description: "High-speed memory cards and storage solutions",
    icon: "/product/camera.png",
    slug: "memory-cards"
  },
  {
    id: "11",
    name: "Filters (ND, Polarizer, UV)",
    description: "Camera filters for enhanced photography",
    icon: "/product/camera.png",
    slug: "filters"
  },
  {
    id: "12",
    name: "Gimbals & Stabilizers",
    description: "Camera stabilization equipment for smooth footage",
    icon: "/product/camera.png",
    slug: "gimbals"
  },
  {
    id: "13",
    name: "Camera Cages & Rigs",
    description: "Professional camera rigging and mounting systems",
    icon: "/product/camera.png",
    slug: "camera-cages"
  },
  {
    id: "14",
    name: "Batteries & Chargers",
    description: "Power solutions for cameras and equipment",
    icon: "/product/camera.png",
    slug: "batteries"
  }
]
