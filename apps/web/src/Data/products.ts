// src/data/products.ts

export interface Product {
  id: string
  name: string
  category: string
  categoryId: string
  price: number
  originalPrice?: number
  image: string
  images?: string[] // Multiple images for product gallery
  features: string[]
  description?: string
  keyFeatures?: string[]
  specifications?: Record<string, string>
  inStock?: boolean
  brand?: string
  sku?: string
}

export const products: Product[] = [
  // Cinema Line Products (categoryId: "1")
  {
    id: "c1",
    name: "Sony A7R V Digital Camera Body",
    category: "Cinema Camera",
    categoryId: "1",
    price: 198990,
    originalPrice: 225000,
    image: "/product/camera.png",
    images: ["/product/camera.png", "/product/camera.png", "/product/camera.png", "/product/camera.png"],
    features: [
      "Full frame (35.7 x 23.8 mm) back-illuminated Exmor R CMOS sensor",
      "AI-based recognition using Real-time Recognition AF",
      "In-body 5-axis image stabilization (IBIS)"
    ],
    description: "Self Timer, Type C and Mini HDMI, 9 point AF with 1 centre cross-type AF point, Standard ISO 100 - 25 Peak Experimental. Might not work as expected.",
    keyFeatures: [
      "24.1 Megapixel APS-C CMOS Sensor: This larger sensor size compared to smartphones allows for better image quality, especially in low light, and provides more control over DOF.",
      "DIGIC 4+ Image Processor: This processor handles image processing and contributes to overall image quality and camera performance."
    ],
    specifications: {
      "Sensor Type": "Full Frame Exmor R CMOS",
      "Resolution": "61.0 MP",
      "Video Recording": "8K 24p, 4K 60p",
      "Mount": "Sony E-mount",
      "Weight": "723g"
    },
    inStock: false,
    brand: "Sony",
    sku: "ILCE-7RM5"
  },
  {
    id: "c2",
    name: "Sony FX-6",
    category: "Cinema Camera",
    categoryId: "1",
    price: 145000,
    originalPrice: 155000,
    image: "/product/camera.png",
    images: ["/product/camera.png", "/product/camera.png", "/product/camera.png"],
    features: ["Full-frame 10.2MP Exmor R CMOS", "4K up to 120fps", "Dual base ISO"],
    description: "Professional cinema camera with advanced features for filmmaking.",
    keyFeatures: [
      "Full-frame 10.2MP Exmor R CMOS sensor for exceptional image quality",
      "Advanced 4K recording capabilities up to 120fps for slow motion"
    ],
    specifications: {
      "Sensor Type": "Full Frame Exmor R CMOS",
      "Resolution": "10.2 MP",
      "Video Recording": "4K 120p",
      "Mount": "Sony E-mount",
      "Weight": "890g"
    },
    inStock: true,
    brand: "Sony",
    sku: "ILME-FX6"
  },
  {
    id: "c3",
    name: "Canon C70",
    category: "Cinema Camera",
    categoryId: "1",
    price: 125000,
    originalPrice: 135000,
    image: "/product/camera.png",
    features: ["Super 35mm DGO sensor", "4K up to 120fps", "Dual Gain Output"],
    inStock: true
  },
  {
    id: "c4",
    name: "Blackmagic Pocket 6K",
    category: "Cinema Camera",
    categoryId: "1",
    price: 85000,
    originalPrice: 95000,
    image: "/product/camera.png",
    features: ["Super 35 sensor", "6K ProRes recording", "EF mount"],
    inStock: true
  },

  // Mirrorless Products (categoryId: "2")
  {
    id: "m1",
    name: "Sony A7 IV",
    category: "Mirrorless Camera",
    categoryId: "2",
    price: 89000,
    originalPrice: 95000,
    image: "/product/camera.png",
    features: ["33MP full-frame sensor", "4K 60p video", "Real-time Eye AF"],
    inStock: true
  },
  {
    id: "m2",
    name: "Canon EOS R5",
    category: "Mirrorless Camera",
    categoryId: "2",
    price: 125000,
    originalPrice: 135000,
    image: "/placeholder-pcbsd.png",
    features: ["45MP full-frame sensor", "8K video recording", "In-body stabilization"],
    inStock: true
  },
  {
    id: "m3",
    name: "Fujifilm X-T5",
    category: "Mirrorless Camera",
    categoryId: "2",
    price: 65000,
    originalPrice: 70000,
    image: "/sony-fx-3-professional-camera.png",
    features: ["40MP APS-C sensor", "6.2K video", "Film simulations"],
    inStock: true
  },
  {
    id: "m4",
    name: "Nikon Z9",
    category: "Mirrorless Camera",
    categoryId: "2",
    price: 145000,
    originalPrice: 155000,
    image: "/placeholder-nmr0b.png",
    features: ["45.7MP full-frame sensor", "8K video", "No mechanical shutter"],
    inStock: true
  },

  // Memory Cards Products (categoryId: "10")
  {
    id: "mc1",
    name: "SanDisk Extreme Pro 64GB",
    category: "SD Card",
    categoryId: "10",
    price: 1200,
    originalPrice: 1500,
    image: "/placeholder-x6nyq.png",
    features: ["64GB Storage Capacity", "Up to 170MB/s read speed", "V30 / U3 / Class 10"],
    inStock: true
  },
  {
    id: "mc2",
    name: "Lexar Professional 128GB",
    category: "SD Card",
    categoryId: "10",
    price: 2500,
    originalPrice: 2800,
    image: "/camera1.png",
    features: ["128GB Storage Capacity", "Up to 150MB/s read speed", "V60 / U3 / Class 10"],
    inStock: true
  },
  {
    id: "mc3",
    name: "Sony TOUGH 32GB",
    category: "SD Card",
    categoryId: "10",
    price: 800,
    originalPrice: 950,
    image: "/camera2.png",
    features: ["32GB Storage Capacity", "Up to 277MB/s read speed", "Waterproof & dustproof"],
    inStock: true
  },
  {
    id: "mc4",
    name: "CFexpress Type B 256GB",
    category: "CFexpress Card",
    categoryId: "10",
    price: 8500,
    originalPrice: 9500,
    image: "/placeholder-gifef.png",
    features: ["256GB Storage Capacity", "Up to 1700MB/s read speed", "Professional grade"],
    inStock: true
  },

  // Lens Products (categoryId: "6")
  {
    id: "l1",
    name: "Sony FE 24-70mm f/2.8 GM",
    category: "Standard Zoom Lens",
    categoryId: "6",
    price: 85000,
    originalPrice: 92000,
    image: "/product/camera.png",
    features: ["24-70mm focal range", "Constant f/2.8 aperture", "G Master optics"],
    inStock: true
  },
  {
    id: "l2",
    name: "Canon RF 70-200mm f/2.8L",
    category: "Telephoto Zoom Lens",
    categoryId: "6",
    price: 95000,
    originalPrice: 105000,
    image: "/product/camera.png",
    features: ["70-200mm focal range", "Constant f/2.8 aperture", "IS stabilization"],
    inStock: true
  },
  {
    id: "l3",
    name: "Sigma 85mm f/1.4 DG DN Art",
    category: "Prime Lens",
    categoryId: "6",
    price: 45000,
    originalPrice: 50000,
    image: "/product/camera.png",
    features: ["85mm focal length", "f/1.4 maximum aperture", "Art series quality"],
    inStock: true
  },
  {
    id: "l4",
    name: "Tamron 28-75mm f/2.8 Di III",
    category: "Standard Zoom Lens",
    categoryId: "6",
    price: 32000,
    originalPrice: 36000,
    image: "/product/camera.png",
    features: ["28-75mm focal range", "Constant f/2.8 aperture", "Compact design"],
    inStock: true
  },

  // DSLR Products (categoryId: "3")
  {
    id: "d1",
    name: "Canon EOS 5D Mark IV",
    category: "DSLR Camera",
    categoryId: "3",
    price: 78000,
    originalPrice: 85000,
    image: "/product/camera.png",
    features: ["30.4MP full-frame sensor", "4K video recording", "Dual Pixel AF"],
    inStock: true
  },
  {
    id: "d2",
    name: "Nikon D850",
    category: "DSLR Camera",
    categoryId: "3",
    price: 89000,
    originalPrice: 95000,
    image: "/product/camera.png",
    features: ["45.7MP full-frame sensor", "4K UHD video", "153-point AF system"],
    inStock: true
  }
]
