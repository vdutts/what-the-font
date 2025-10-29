import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] API route called")

    const { image } = await request.json()
    console.log("[v0] Image received, length:", image?.length)

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    console.log("[v0] Analyzing font with vision model...")

    const { text } = await generateText({
      model: "openai/gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: image,
            },
            {
              type: "text",
              text: `Analyze this font image and extract these visual features as numbers between 0 and 1:
1. serif_score (0=sans-serif, 1=serif)
2. weight_score (0=thin, 0.5=regular, 1=black)
3. width_score (0=condensed, 0.5=normal, 1=expanded)
4. slant_score (0=upright, 1=italic)
5. contrast_score (0=low contrast, 1=high contrast)
6. x_height_score (0=small x-height, 1=large x-height)
7. decorative_score (0=plain, 1=highly decorative)
8. script_score (0=not script, 1=script/handwriting)
9. geometric_score (0=humanist, 1=geometric)
10. modern_score (0=traditional, 1=modern)

Return ONLY a JSON object with these 10 scores, nothing else.`,
            },
          ],
        },
      ],
    })

    console.log("[v0] Vision analysis:", text)

    const cleanedText = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim()

    // Parse the feature scores
    const features = JSON.parse(cleanedText)

    // Convert features to a 200-dimensional vector by repeating and transforming
    const featureVector = generateFeatureVector(features)

    console.log("[v0] Generated feature vector, dimensions:", featureVector.length)

    // Load Fontjoy's pre-computed font vectors
    console.log("[v0] Loading Fontjoy font vectors...")
    const fontVectorsResponse = await fetch(
      "https://raw.githubusercontent.com/Jack000/fontjoy/master/fonts-vectors200.json",
    )
    const fontVectorsData = await fontVectorsResponse.json()

    console.log("[v0] Loaded", fontVectorsData.items?.length, "font vectors")

    // Calculate cosine similarity for each font
    const similarities = fontVectorsData.items.map((font: any) => {
      const similarity = cosineSimilarity(featureVector, font.vectors[0])
      return {
        family: font.family,
        variant: font.variants?.[0] || "regular",
        category: font.category,
        similarity,
        confidence: Math.max(0, Math.min(1, (similarity + 1) / 2)), // Convert from [-1, 1] to [0, 1]
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

function generateFeatureVector(features: any): number[] {
  const baseFeatures = [
    features.serif_score,
    features.weight_score,
    features.width_score,
    features.slant_score,
    features.contrast_score,
    features.x_height_score,
    features.decorative_score,
    features.script_score,
    features.geometric_score,
    features.modern_score,
  ]

  // Expand to 200 dimensions using polynomial features and transformations
  const expanded: number[] = []

  // Add base features
  expanded.push(...baseFeatures)

  // Add squared features
  expanded.push(...baseFeatures.map((f) => f * f))

  // Add pairwise products
  for (let i = 0; i < baseFeatures.length; i++) {
    for (let j = i + 1; j < baseFeatures.length; j++) {
      expanded.push(baseFeatures[i] * baseFeatures[j])
    }
  }

  // Add sine/cosine transformations
  expanded.push(...baseFeatures.map((f) => Math.sin(f * Math.PI)))
  expanded.push(...baseFeatures.map((f) => Math.cos(f * Math.PI)))

  // Add exponential features
  expanded.push(...baseFeatures.map((f) => Math.exp(-f)))

  // Add log features (with small offset to avoid log(0))
  expanded.push(...baseFeatures.map((f) => Math.log(f + 0.01)))

  // Pad or truncate to exactly 200 dimensions
  while (expanded.length < 200) {
    expanded.push(0)
  }

  return expanded.slice(0, 200)
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions don't match: ${a.length} vs ${b.length}`)
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
