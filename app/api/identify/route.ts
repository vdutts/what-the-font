import { type NextRequest, NextResponse } from "next/server"
import { embed } from "ai"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] API route called")

    const { image } = await request.json()
    console.log("[v0] Image received, length:", image?.length)

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    console.log("[v0] Generating image embedding...")

    // Generate embedding for the uploaded font image
    const { embedding: uploadedEmbedding } = await embed({
      model: "openai/text-embedding-3-small",
      value: image,
    })

    console.log("[v0] Embedding generated, dimensions:", uploadedEmbedding.length)

    // Load Fontjoy's pre-computed font vectors
    console.log("[v0] Loading Fontjoy font vectors...")
    const fontVectorsResponse = await fetch(
      "https://raw.githubusercontent.com/Jack000/fontjoy/master/fonts-vectors200.json",
    )
    const fontVectorsData = await fontVectorsResponse.json()

    console.log("[v0] Loaded", fontVectorsData.items?.length, "font vectors")

    // Calculate cosine similarity for each font
    const similarities = fontVectorsData.items.map((font: any) => {
      const similarity = cosineSimilarity(uploadedEmbedding, font.vectors[0])
      return {
        family: font.family,
        variant: font.variants?.[0] || "regular",
        category: font.category,
        similarity,
        confidence: (similarity + 1) / 2, // Convert from [-1, 1] to [0, 1]
      }
    })

    // Sort by similarity and take top 15
    const topFonts = similarities
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, 15)
      .map((font: any) => ({
        family: font.family,
        variant: font.variant,
        confidence: font.confidence,
        category: font.category,
      }))

    console.log("[v0] Top font:", topFonts[0])

    return NextResponse.json({ fonts: topFonts })
  } catch (error) {
    console.error("[v0] Font identification error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    // If dimensions don't match, pad the shorter one with zeros
    const maxLen = Math.max(a.length, b.length)
    a = [...a, ...Array(maxLen - a.length).fill(0)]
    b = [...b, ...Array(maxLen - b.length).fill(0)]
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}
